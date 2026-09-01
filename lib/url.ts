import { isDesktop } from "@/lib/platform";
import type { Lang } from "@/lib/lang";

export const LOCALE_KEY = "hevai:locale";
const PREFIX = "/it";

export function pathLang(path: string): Lang {
  return path === PREFIX || path.startsWith(`${PREFIX}/`) ? "it" : "en";
}

export function stripLocale(path: string): string {
  if (path === PREFIX || path.startsWith(`${PREFIX}/`)) {
    const stripped = path.slice(PREFIX.length);
    return stripped || "/";
  }
  return path;
}

export function withLocale(path: string, lang: Lang): string {
  const stripped = stripLocale(path);
  if (lang === "en") return stripped;
  return stripped === "/" ? PREFIX : `${PREFIX}${stripped}`;
}

export function basenameFromPath(path: string): string | undefined {
  return pathLang(path) === "it" ? PREFIX : undefined;
}

export function primeLocale(): boolean {
  if (isDesktop()) return false;
  const path = window.location.pathname;
  if (pathLang(path) === "it") return false;
  let target: Lang = "en";
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === "it" || stored === "en") target = stored;
  else if (navigator.language?.toLowerCase().startsWith("it")) target = "it";
  if (target !== "it") return false;
  window.location.replace(
    withLocale(path, "it") + window.location.search + window.location.hash,
  );
  return true;
}
