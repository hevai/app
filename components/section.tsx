import { GripVertical, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { Block, Component } from "@/types";
import { BRIEF_WORDS, blockReady, countWords } from "@/lib/utils";
import { useLocale } from "@/contexts/locale";
import { Icon } from "./icon";
import { Body } from "./card";

interface SectionProps {
  block: Block;
  component?: Component;
  dragging?: boolean;
  over?: boolean;
  busy?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onSpark?: () => void;
  dragHandleProps?: Record<string, unknown>;
  sectionRef?: (node: HTMLElement | null) => void;
}

export function Section({
  block,
  component,
  dragging,
  over,
  busy,
  onEdit,
  onRemove,
  onSpark,
  dragHandleProps,
  sectionRef,
}: SectionProps) {
  const { t } = useLocale();
  const ready = blockReady(block, component);
  const words = Math.min(countWords(block.brief ?? ""), BRIEF_WORDS);
  return (
    <section
      ref={sectionRef}
      className="section"
      data-dragging={dragging || undefined}
      data-over={over || undefined}
    >
      <div className="section-head">
        <span className="section-icon">
          <Icon name={component?.icon ?? "sparkles"} size={17} />
        </span>
        <div className="section-titles">
          <span className="section-title">
            {component?.label ?? block.title}
            <span className="chip chip-progress" data-done={ready || undefined}>
              {t("block.words", { words, max: BRIEF_WORDS })}
            </span>
          </span>
          <span className="section-desc">{component?.description ?? ""}</span>
        </div>
        <span className="section-actions">
          <button
            type="button"
            className="card-tool"
            data-drag="true"
            aria-label={t("block.drag")}
            {...dragHandleProps}
          >
            <GripVertical size={15} />
          </button>
          <button type="button" className="card-tool" aria-label={t("block.edit")} onClick={onEdit}>
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="card-tool"
            data-spark="true"
            data-ready={ready || undefined}
            data-busy={busy || undefined}
            disabled={busy || undefined}
            aria-label={
              busy
                ? t("spark.busyAria")
                : ready
                  ? t("spark.goAria")
                  : t("spark.blockedAria")
            }
            title={
              busy
                ? t("spark.busyTitle")
                : ready
                  ? t("spark.goTitle")
                  : t("spark.readyHint", { count: BRIEF_WORDS })
            }
            onClick={onSpark}
          >
            {busy ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
          </button>
          {onRemove ? (
            <button type="button" className="card-tool" aria-label={t("block.remove")} onClick={onRemove}>
              <Trash2 size={14} />
            </button>
          ) : null}
        </span>
      </div>
      <div className="section-progress" aria-hidden="true">
        <div className="section-progress-fill" style={{ width: `${(words / BRIEF_WORDS) * 100}%` }} />
      </div>
      <div className="section-body" data-editable={onEdit ? true : undefined} onClick={onEdit}>
        <Body block={block} component={component} />
      </div>
    </section>
  );
}
