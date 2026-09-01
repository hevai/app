import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Component, Template } from "@/types";
import { api } from "@/lib/api";
import { translateCatalog } from "@/lib/lang";
import { useLocale } from "@/hooks/use-locale";
import { Catalog } from "@/hooks/use-catalog";

const STORAGE_KEY = "hevai:catalog";
const STORAGE_KEY_LEGACY = "***";

try {
  localStorage.removeItem(STORAGE_KEY_LEGACY);
} catch {
  // non-fatal
}

interface Cached {
  components: Component[];
  templates: Template[];
}

function loadCache(): Cached | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!Array.isArray(parsed.components) || !Array.isArray(parsed.templates)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { lang } = useLocale();
  const cached = useMemo(loadCache, []);
  const [rawComponents, setRawComponents] = useState<Component[]>(cached?.components ?? []);
  const [rawTemplates, setRawTemplates] = useState<Template[]>(cached?.templates ?? []);
  const [ready, setReady] = useState(Boolean(cached));

  useEffect(() => {
    let active = true;
    Promise.all([api.components(), api.templates()])
      .then(([componentRows, templateRows]) => {
        if (!active) return;
        setRawComponents(componentRows);
        setRawTemplates(templateRows);
        setReady(true);
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ components: componentRows, templates: templateRows }),
          );
        } catch {
          // non-fatal
        }
      })
      .catch((error) => {
        console.warn("[hevai] catalog load failed", error);
      });
    return () => {
      active = false;
    };
  }, []);

  const { components, templates } = useMemo(
    () =>
      lang === "it"
        ? translateCatalog(rawComponents, rawTemplates)
        : { components: rawComponents, templates: rawTemplates },
    [lang, rawComponents, rawTemplates],
  );

  const componentByName = useCallback(
    (name: string) => components.find((entry) => entry.name === name),
    [components],
  );

  const templateByName = useCallback(
    (name: string) => templates.find((entry) => entry.name === name),
    [templates],
  );

  const templateComponents = useCallback(
    (name: string) => {
      if (name === "scratch") return [];
      const match = templates.find((entry) => entry.name === name);
      if (!match) return [];
      return Array.from(new Set([...match.base, ...match.specific]));
    },
    [templates],
  );

  const value = useMemo(
    () => ({ components, templates, ready, componentByName, templateByName, templateComponents }),
    [components, templates, ready, componentByName, templateByName, templateComponents],
  );

  return <Catalog.Provider value={value}>{children}</Catalog.Provider>;
}
