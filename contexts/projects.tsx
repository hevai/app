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
import { uid } from "@/schema";
import { api } from "@/lib/api";
import { normalizeData, seedValue } from "@/lib/utils";
import { useIdentity } from "./identity";
import { useCatalog } from "./catalog";

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
  addBlock: (projectId: string, componentName: string, patch?: Partial<Block>) => Block | undefined;
  removeBlock: (projectId: string, blockId: string) => void;
  updateBlock: (projectId: string, blockId: string, patch: Partial<Block>) => void;
  reorderBlocks: (projectId: string, orderedIds: string[]) => void;
}

const Projects = createContext<ProjectsValue | null>(null);

const STORAGE_PREFIX = "hevai:projects";

export function defaultData(component: Component | undefined): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (!component) return data;
  for (const field of component.fields) data[field.name] = seedValue(field);
  return data;
}

function makeBlock(componentName: string, order: number, component?: Component): Block {
  return {
    id: uid(),
    component: componentName,
    title: component?.label ?? componentName,
    brief: "",
    data: defaultData(component),
    options: {},
    order,
  };
}

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}:${address.toLowerCase()}`;
}

// Backfills newer block properties on projects saved by older versions.
function normalizeBlock(block: Block): Block {
  return {
    ...block,
    brief: typeof block.brief === "string" ? block.brief : "",
    options:
      block.options && typeof block.options === "object" && !Array.isArray(block.options)
        ? block.options
        : {},
    data: block.data && typeof block.data === "object" ? block.data : {},
  };
}

function normalize(project: Project): Project {
  return {
    ...project,
    image: project.image ?? "",
    blocks: Array.isArray(project.blocks) ? project.blocks.map(normalizeBlock) : [],
  };
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
  for (const project of remote) byId.set(project.id, normalize(project));
  for (const project of local) {
    const existing = byId.get(project.id);
    if (!existing || project.updated >= existing.updated) byId.set(project.id, project);
  }
  return Array.from(byId.values()).sort((a, b) => b.updated - a.updated);
}

const hasBackend = Boolean((import.meta.env.VITE_API_URL ?? "").trim());

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { address } = useIdentity();
  const { componentByName, templateComponents } = useCatalog();
  const [projects, setProjects] = useState<Project[]>([]);
  const projectsRef = useRef(projects);
  const catalogRef = useRef({ componentByName, templateComponents });
  catalogRef.current = { componentByName, templateComponents };

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

  useEffect(() => {
    if (!address) return;
    const current = projectsRef.current;
    if (current.length === 0) return;
    const changed: string[] = [];
    const next = current.map((project) => {
      let blockTouched = false;
      const blocks = project.blocks.map((block) => {
        const component = componentByName(block.component);
        if (!component) return block;
        const data = normalizeData(block.data, component);
        if (JSON.stringify(data) === JSON.stringify(block.data)) return block;
        blockTouched = true;
        return { ...block, data };
      });
      if (!blockTouched) return project;
      changed.push(project.id);
      return { ...project, blocks };
    });
    if (changed.length > 0) commit(next, { changed });
  }, [address, componentByName, commit]);

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
      const { componentByName: byName, templateComponents: ofTemplate } = catalogRef.current;
      const now = Date.now();
      let blocks: Block[];
      if (input.blocks && input.blocks.length > 0) {
        blocks = input.blocks.map((block, index) => ({ ...normalizeBlock(block), order: index }));
      } else {
        const names = input.components ?? ofTemplate(input.template);
        blocks = names.map((componentName, index) =>
          makeBlock(componentName, index, byName(componentName)),
        );
      }
      const project: Project = {
        id: uid(),
        user: address,
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
    (projectId: string, componentName: string, patch?: Partial<Block>): Block | undefined => {
      const target = projectsRef.current.find((project) => project.id === projectId);
      if (!target) return undefined;
      const base = makeBlock(componentName, target.blocks.length, catalogRef.current.componentByName(componentName));
      const block: Block = {
        ...base,
        brief: patch?.brief ?? base.brief,
        data: patch?.data ?? base.data,
        options: patch?.options ?? base.options,
      };
      const next = projectsRef.current.map((project) => {
        if (project.id !== projectId) return project;
        const blocks = [...project.blocks, block];
        const navigation = project.navigation.map((page, index) =>
          index === 0 ? { ...page, blocks: [...page.blocks, block.id] } : page,
        );
        return { ...project, blocks, navigation, updated: Date.now() };
      });
      commit(next, { changed: [projectId] });
      return block;
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
