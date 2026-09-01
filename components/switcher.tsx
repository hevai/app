import { useLocale } from "@/hooks/use-locale";
import { LANGS, type Lang } from "@/lib/lang";

export function Switcher() {
  const { lang, setLang, t } = useLocale();

  return (
    <div className="switcher" role="group" aria-label={t("switcher.label")}>
      {LANGS.map((code: Lang) => (
        <button
          key={code}
          type="button"
          className="switcher-item"
          data-active={lang === code || undefined}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
