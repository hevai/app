import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isDesktop } from "@/lib/platform";
import { LOCALE_KEY, pathLang, withLocale } from "@/lib/url";
import { catalogIt, en, it, translate, type Lang, type TKey } from "@/lib/lang";
import { Locale } from "@/hooks/use-locale";
import type { Component, Role } from "@/types";

type Params = Record<string, string | number>;

const exactErrors: Record<string, TKey> = {
  "The model did not return valid JSON": "agent.badJson",
  "No models available for this block": "agent.noBlockModels",
  "No models available for this chat": "agent.noChatModels",
  "All model providers failed": "agent.allFailed",
  "Could not read the file": "media.read",
  "Only image files are allowed": "media.imageOnly",
  "Image is too large (max 8 MB)": "media.tooLarge",
  "Connect your account first": "sessionErr.account",
  "Session approval requires an EVM smart account": "sessionErr.evm",
  "Failed to create session": "sessionErr.failed",
  "Connect with Thirdweb on the web app first": "sessionErr.webFirst",
};

const prefixErrors: Array<[string, TKey, string, string?]> = [
  ["Session invalid: ", "agent.sessionInvalid", "reason"],
  ["Session approval is unavailable for ", "sessionErr.unavailable", "network"],
  ["Insufficient USDC balance. Available: ", "sessionErr.balance", "available"],
  ["Session creation failed (", "sessionErr.createFailed", "status", ")"],
  ["Request failed (", "api.failed", "status", ")"],
];

const suffixErrors: Array<[string, TKey, string]> = [
  [" failed to respond", "agent.noResponse", "model"],
  [" returned an empty response", "agent.emptyResponse", "model"],
  [" failed mid-response", "agent.midResponse", "model"],
];

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (!isDesktop()) return pathLang(window.location.pathname);
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "it" || stored === "en") return stored;
    return navigator.language?.toLowerCase().startsWith("it") ? "it" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: TKey, params?: Params) => translate(lang === "it" ? it : en, key, params),
    [lang],
  );

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(LOCALE_KEY, next);
    document.documentElement.lang = next;
    if (isDesktop()) {
      setLangState(next);
      return;
    }
    window.location.assign(
      withLocale(window.location.pathname, next) + window.location.search + window.location.hash,
    );
  }, []);

  const err = useCallback(
    (input: unknown, fallback?: TKey): string => {
      const message =
        input instanceof Error ? input.message : typeof input === "string" ? input : "";
      if (!message) return fallback ? t(fallback) : "";
      const exact = exactErrors[message];
      if (exact) return t(exact);
      for (const [prefix, key, param, strip] of prefixErrors) {
        if (message.startsWith(prefix)) {
          let rest = message.slice(prefix.length);
          if (strip && rest.endsWith(strip)) rest = rest.slice(0, -strip.length);
          return t(key, { [param]: rest });
        }
      }
      for (const [suffix, key, param] of suffixErrors) {
        if (message.endsWith(suffix)) {
          return t(key, { [param]: message.slice(0, -suffix.length) });
        }
      }
      return message;
    },
    [t],
  );

  const optionLabel = useCallback(
    (component: Component | undefined, value: string) => {
      if (lang !== "it" || !component) return value;
      return catalogIt.options[component.name]?.[value] ?? value;
    },
    [lang],
  );

  const roleLabel = useCallback(
    (role: string) => {
      if (lang !== "it") return role;
      return catalogIt.roles[role as Role] ?? role;
    },
    [lang],
  );

  const memberName = useCallback(
    (name: string) => (name === "You" ? t("seed.you") : name),
    [t],
  );

  const timeAgo = useCallback(
    (timestamp: number) => {
      const delta = Date.now() - timestamp;
      const minute = 60_000;
      const hour = 3_600_000;
      const day = 86_400_000;
      if (delta < minute) return t("time.now");
      if (delta < hour) return t("time.minutes", { count: Math.floor(delta / minute) });
      if (delta < day) return t("time.hours", { count: Math.floor(delta / hour) });
      return t("time.days", { count: Math.floor(delta / day) });
    },
    [t],
  );

  const formatDate = useCallback(
    (value: string) => {
      if (!value) return "";
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleDateString(lang, { month: "short", day: "numeric", year: "numeric" });
    },
    [lang],
  );

  const formatExpiry = useCallback(
    (expiresAt: number | null) => {
      if (!expiresAt) return t("expiry.none");
      const minutes = Math.max(0, Math.floor((expiresAt - Date.now()) / 60_000));
      if (minutes >= 1_440) {
        return t("expiry.dayHour", {
          d: Math.floor(minutes / 1_440),
          h: Math.floor((minutes % 1_440) / 60),
        });
      }
      if (minutes >= 60) {
        return t("expiry.hourMinute", { h: Math.floor(minutes / 60), m: minutes % 60 });
      }
      return minutes > 0 ? t("expiry.minute", { m: minutes }) : t("expiry.expired");
    },
    [t],
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      err,
      optionLabel,
      roleLabel,
      memberName,
      formatDate,
      timeAgo,
      formatExpiry,
    }),
    [lang, setLang, t, err, optionLabel, roleLabel, memberName, formatDate, timeAgo, formatExpiry],
  );

  return <Locale.Provider value={value}>{children}</Locale.Provider>;
}
