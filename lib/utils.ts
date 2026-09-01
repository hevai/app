import { clsx, type ClassValue } from "clsx";
import type { Block, Component, Dated, Field, Pair, Rank } from "@/types";
import { barSeeds, type Lang } from "@/lib/lang";

export const BRIEF_WORDS = 10;

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function shortAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function toPair(row: unknown): Pair {
  if (typeof row === "string") return { label: row, value: "" };
  const entry = (row ?? {}) as Record<string, unknown>;
  const label = typeof entry.label === "string" ? entry.label : typeof entry.name === "string" ? entry.name : "";
  const value = typeof entry.value === "string" ? entry.value : entry.value == null ? "" : String(entry.value);
  return { label, value };
}

export function toRank(row: unknown): Rank {
  if (typeof row === "string") return { label: row, level: "" };
  const entry = (row ?? {}) as Record<string, unknown>;
  return {
    label: typeof entry.label === "string" ? entry.label : "",
    level: typeof entry.level === "string" ? entry.level : "",
  };
}

export function toDated(row: unknown): Dated {
  if (typeof row === "string") return { label: row, date: "", level: "" };
  const entry = (row ?? {}) as Record<string, unknown>;
  return {
    label: typeof entry.label === "string" ? entry.label : "",
    date: typeof entry.date === "string" ? entry.date : "",
    level: typeof entry.level === "string" ? entry.level : "",
  };
}

// Builds the standard skeleton for a field from its catalog defaults, so a
// fresh block always opens pre-structured (never an empty generic box).
export function seedValue(field: Field, lang: Lang = "en"): unknown {
  switch (field.kind) {
    case "bars": {
      const names =
        field.defaults && field.defaults.length > 0
          ? field.defaults.map((entry) => (typeof entry === "string" ? entry : entry.label))
          : barSeeds[lang];
      const share = Math.floor(100 / names.length);
      return names.map((name, index) => ({
        name,
        value: index === names.length - 1 ? 100 - share * (names.length - 1) : share,
      }));
    }
    case "pairs": {
      return (field.defaults ?? []).map((entry) =>
        typeof entry === "string" ? { label: entry, value: "" } : { label: entry.label, value: entry.value ?? "" },
      );
    }
    case "ranked": {
      return (field.defaults ?? []).map((entry) =>
        typeof entry === "string" ? { label: entry, level: "" } : { label: entry.label, level: entry.level ?? "" },
      );
    }
    case "dated": {
      return (field.defaults ?? []).map((entry) =>
        typeof entry === "string"
          ? { label: entry, date: "", level: field.options?.[0] ?? "" }
          : { label: entry.label, date: entry.date ?? "", level: entry.level ?? field.options?.[0] ?? "" },
      );
    }
    case "number": {
      return 0;
    }
    case "select": {
      const first = field.defaults?.[0];
      return (typeof first === "string" ? first : "") || field.options?.[0] || "";
    }
    default: {
      return "";
    }
  }
}

// Coerces stored field values to their current shape (legacy blocks saved
// before a kind existed — or with simpler rows — keep rendering/editing).
// Empty row fields are re-seeded with the standard skeleton so a block can
// never sit as an empty generic box.
export function normalizeData(
  data: Record<string, unknown>,
  component?: Component,
  lang: Lang = "en",
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...data };
  if (!component) return next;
  for (const field of component.fields) {
    const value = next[field.name];
    if (field.kind === "pairs" || field.kind === "ranked" || field.kind === "dated") {
      if (!Array.isArray(value) || value.length === 0) {
        const seeded = seedValue(field, lang);
        if (Array.isArray(seeded) && seeded.length > 0) {
          next[field.name] = seeded;
          continue;
        }
      }
    }
    if (!Array.isArray(value)) continue;
    if (field.kind === "pairs") next[field.name] = value.map(toPair);
    else if (field.kind === "ranked") next[field.name] = value.map(toRank);
    else if (field.kind === "dated") next[field.name] = value.map(toDated);
  }
  return next;
}

export function fieldFilled(field: Field, value: unknown): boolean {
  if (field.kind === "pairs") {
    return (
      Array.isArray(value) &&
      value.some((row) => toPair(row).value.trim().length > 0)
    );
  }
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export function hasContent(block: Block, component?: Component): boolean {
  if (!component) return false;
  return component.fields.some((field) => fieldFilled(field, block.data[field.name]));
}

export function blockProgress(block: Block, component?: Component): { filled: number; total: number } {
  if (!component) return { filled: 0, total: 0 };
  const total = component.fields.length;
  const filled = component.fields.filter((field) => fieldFilled(field, block.data[field.name])).length;
  return { filled, total };
}

export function blockReady(block: Block, component?: Component): boolean {
  return Boolean(component) && countWords(block.brief ?? "") >= BRIEF_WORDS;
}
