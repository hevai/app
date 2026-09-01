import { createContext, useContext } from "react";
import type { Block, Project } from "@/types";

export interface ProjectsValue {
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

export const Projects = createContext<ProjectsValue | null>(null);

export function useProjects(): ProjectsValue {
  const value = useContext(Projects);
  if (!value) throw new Error("useProjects must be used within a ProjectsProvider");
  return value;
}
