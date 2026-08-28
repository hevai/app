import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Block, Component, Project } from "@/types";
import { componentByName, templateComponents, uid } from "@/schema";
import { api } from "@/lib/api";
import { useIdentity } from "./identity";

interface ProjectsValue {
  projects: Project[];
  getProject: (id: string) => Project | undefined;
  createProject: (input: {
    name: string;
    description: string;
    template: string;
    components?: string[];
    blocks?: Block[];
    image?: string;
  }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addBlock: (projectId: string, componentName: string) => void;
  removeBlock: (projectId: string, blockId: string) => void;
  updateBlock: (projectId: string, blockId: string, patch: Partial<Block>) => void;
  reorderBlocks: (projectId: string, orderedIds: string[]) => void;
}

const Projects = createContext<ProjectsValue | null>(null);

const STORAGE_PREFIX = "hevai:projects";

export function defaultData(component: Component | undefined): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (!component) return data;
  for (const field of component.fields) {
    switch (field.kind) {
      case "bars": {
        const names = field.name === "slices" ? ["Build", "Marketing", "Ops"] : ["One", "Two", "Three"];
        const share = Math.floor(100 / names.length);
        const slices = names.map((name, index) => ({
          name,
          value: index === names.length - 1 ? 100 - share * (names.length - 1) : share,
        }));
        data[field.name] = slices;
        break;
      }
      case "roles":
        data[field.name] = [];
        break;
      case "list":
      case "tags":
        data[field.name] = [];
        break;
      default:
        data[field.name] = "";
    }
  }
  return data;
}

function buildProject(input: {
  name: string;
  description: string;
  template: string;
  components?: string[];
  blocks?: Block[];
  image?: string;
}): Project {
  const now = Date.now();
  let blocks: Block[];
  if (input.blocks && input.blocks.length > 0) {
    blocks = input.blocks.map((block, index) => ({ ...block, order: index }));
  } else {
    const names = input.components ?? templateComponents(input.template);
    blocks = names.map((componentName, index) => {
      const component = componentByName(componentName);
      return {
        id: uid(),
        component: componentName,
        title: component?.label ?? componentName,
        data: defaultData(component),
        order: index,
      };
    });
  }
  return {
    id: uid(),
    user: "",
    name: input.name,
    description: input.description,
    template: input.template,
    image: input.image ?? "",
    members: [],
    blocks,
    navigation: [{ label: "Overview", blocks: blocks.map((block) => block.id) }],
    plugins: [],
    revision: 1,
    created: now,
    updated: now,
  };
}

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}:${address.toLowerCase()}`;
}

function normalize(project: Project): Project {
  return { ...project, image: project.image ?? "" };
}

function load(address: string): Project[] {
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

function persist(address: string, projects: Project[]): void {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(projects));
  } catch {
    // non-fatal
  }
}

function mergeProjects(local: Project[], remote: Project[]): Project[] {
  const byId = new Map<string, Project>();
  for (const project of remote) byId.set(project.id, project);
  for (const project of local) {
    const existing = byId.get(project.id);
    if (!existing || project.updated >= existing.updated) byId.set(project.id, project);
  }
  return Array.from(byId.values()).sort((a, b) => b.updated - a.updated);
}

const hasBackend = Boolean((import.meta.env.VITE_API_URL ?? "").trim());

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { address } = useIdentity();
  const [projects, setProjects] = useState<Project[]>([]);
  const projectsRef = useRef(projects);

  useEffect(() => {
    const next = address ? load(address) : [];
    projectsRef.current = next;
    setProjects(next);
    if (!address || !hasBackend) return;
    let active = true;
    const wallet = address;
    api
      .listProjects(wallet)
      .then((remote) => {
        if (!active) return;
        const merged = mergeProjects(projectsRef.current, remote);
        projectsRef.current = merged;
        setProjects(merged);
        persist(wallet, merged);
        const remoteById = new Map(remote.map((project) => [project.id, project]));
        for (const project of merged) {
          const remoteCopy = remoteById.get(project.id);
          if (!remoteCopy || remoteCopy.updated !== project.updated) {
            api.putProject(wallet, project).catch((error) => {
              console.warn("[hevai] project sync failed", error);
            });
          }
        }
      })
      .catch((error) => {
        console.warn("[hevai] project load failed", error);
      });
    return () => {
      active = false;
    };
  }, [address]);

  const commit = useCallback(
    (next: Project[], sync?: { changed?: string[]; removed?: string[] }) => {
      projectsRef.current = next;
      setProjects(next);
      if (address) persist(address, next);
      if (address && hasBackend && sync) {
        for (const id of sync.changed ?? []) {
          const project = next.find((entry) => entry.id === id);
          if (project) {
            api.putProject(address, project).catch((error) => {
              console.warn("[hevai] project sync failed", error);
            });
          }
        }
        for (const id of sync.removed ?? []) {
          api.deleteProject(address, id).catch((error) => {
            console.warn("[hevai] project delete failed", error);
          });
        }
      }
    },
    [address],
  );

  const getProject = useCallback(
    (id: string) => projects.find((project) => project.id === id),
    [projects],
  );

  const createProject = useCallback(
    (input: {
      name: string;
      description: string;
      template: string;
      components?: string[];
      blocks?: Block[];
      image?: string;
    }) => {
      if (!address) throw new Error("Connect before creating a project");
      const project = { ...buildProject(input), user: address };
      commit([project, ...projectsRef.current], { changed: [project.id] });
      return project;
    },
    [address, commit],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      const next = projectsRef.current.map((project) =>
        project.id === id ? { ...project, ...patch, updated: Date.now() } : project,
      );
      commit(next, { changed: [id] });
    },
    [commit],
  );

  const deleteProject = useCallback(
    (id: string) => {
      commit(projectsRef.current.filter((project) => project.id !== id), { removed: [id] });
    },
    [commit],
  );

  const mutateBlocks = useCallback(
    (projectId: string, fn: (blocks: Block[]) => Block[]) => {
      const next = projectsRef.current.map((project) => {
        if (project.id !== projectId) return project;
        const blocks = fn(project.blocks);
        const navigation = project.navigation.map((page) => ({
          ...page,
          blocks: page.blocks.filter((blockId) => blocks.some((block) => block.id === blockId)),
        }));
        return { ...project, blocks, navigation, updated: Date.now() };
      });
      commit(next, { changed: [projectId] });
    },
    [commit],
  );

  const addBlock = useCallback(
    (projectId: string, componentName: string) => {
      const component = componentByName(componentName);
      const block: Block = {
        id: uid(),
        component: componentName,
        title: component?.label ?? componentName,
        data: defaultData(component),
        order: 0,
      };
      const next = projectsRef.current.map((project) => {
        if (project.id !== projectId) return project;
        const blocks = [...project.blocks, { ...block, order: project.blocks.length }];
        const navigation = project.navigation.map((page, index) =>
          index === 0 ? { ...page, blocks: [...page.blocks, block.id] } : page,
        );
        return { ...project, blocks, navigation, updated: Date.now() };
      });
      commit(next, { changed: [projectId] });
    },
    [commit],
  );

  const removeBlock = useCallback(
    (projectId: string, blockId: string) => {
      mutateBlocks(projectId, (blocks) => blocks.filter((block) => block.id !== blockId));
    },
    [mutateBlocks],
  );

  const updateBlock = useCallback(
    (projectId: string, blockId: string, patch: Partial<Block>) => {
      mutateBlocks(projectId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
      );
    },
    [mutateBlocks],
  );

  const reorderBlocks = useCallback(
    (projectId: string, orderedIds: string[]) => {
      mutateBlocks(projectId, (blocks) => {
        const byId = new Map(blocks.map((block) => [block.id, block]));
        const reordered: Block[] = [];
        orderedIds.forEach((id, index) => {
          const block = byId.get(id);
          if (block) reordered.push({ ...block, order: index });
        });
        for (const block of blocks) {
          if (!orderedIds.includes(block.id)) reordered.push({ ...block, order: reordered.length });
        }
        return reordered;
      });
    },
    [mutateBlocks],
  );

  const value = useMemo(
    () => ({
      projects,
      getProject,
      createProject,
      updateProject,
      deleteProject,
      addBlock,
      removeBlock,
      updateBlock,
      reorderBlocks,
    }),
    [
      projects,
      getProject,
      createProject,
      updateProject,
      deleteProject,
      addBlock,
      removeBlock,
      updateBlock,
      reorderBlocks,
    ],
  );

  return <Projects.Provider value={value}>{children}</Projects.Provider>;
}

export function useProjects(): ProjectsValue {
  const value = useContext(Projects);
  if (!value) throw new Error("useProjects must be used within a ProjectsProvider");
  return value;
}
