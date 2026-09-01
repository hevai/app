import { createContext, useContext } from "react";
import type { Component, Template } from "@/types";

export interface CatalogValue {
  components: Component[];
  templates: Template[];
  ready: boolean;
  componentByName: (name: string) => Component | undefined;
  templateByName: (name: string) => Template | undefined;
  templateComponents: (name: string) => string[];
}

export const Catalog = createContext<CatalogValue | null>(null);

export function useCatalog(): CatalogValue {
  const value = useContext(Catalog);
  if (!value) throw new Error("useCatalog must be used within a CatalogProvider");
  return value;
}
