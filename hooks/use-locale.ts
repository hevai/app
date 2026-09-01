import { createContext, useContext } from "react";
import type { Component } from "@/types";
import type { Lang, TKey } from "@/lib/lang";

type Params = Record<string, string | number>;

export interface LocaleValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, params?: Params) => string;
  err: (input: unknown, fallback?: TKey) => string;
  optionLabel: (component: Component | undefined, value: string) => string;
  roleLabel: (role: string) => string;
  memberName: (name: string) => string;
  formatDate: (value: string) => string;
  timeAgo: (timestamp: number) => string;
  formatExpiry: (expiresAt: number | null) => string;
}

export const Locale = createContext<LocaleValue | null>(null);

export function useLocale(): LocaleValue {
  const value = useContext(Locale);
  if (!value) throw new Error("useLocale must be used within a LocaleProvider");
  return value;
}
