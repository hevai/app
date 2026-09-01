import { GripVertical, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { Block, Component, Slice } from "@/types";
import { BRIEF_WORDS, blockReady, countWords, toDated, toPair, toRank } from "@/lib/utils";
import { softLower } from "@/lib/lang";
import { useLocale } from "@/contexts/locale";
import { Icon } from "./icon";
import { Bars } from "./bars";

interface CardProps {
  block: Block;
  component?: Component;
  dragging?: boolean;
  over?: boolean;
  busy?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onSpark?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function Body({ block, component }: { block: Block; component?: Component }) {
  const { t, optionLabel, formatDate } = useLocale();
  if (!component || component.fields.length === 0) {
    return <div className="card-empty">{t("block.empty")}</div>;
  }

  const parts: React.ReactNode[] = [];
  for (const field of component.fields) {
    const value = block.data[field.name];
    switch (field.kind) {
      case "bars": {
        const slices = Array.isArray(value) ? (value as Slice[]) : [];
        parts.push(<Bars key={field.name} slices={slices} />);
        break;
      }
      case "roles": {
        const members = Array.isArray(value) ? (value as { name: string; role: string }[]) : [];
        parts.push(
          <div className="rows" key={field.name}>
            {members.length === 0 ? (
              <div className="card-empty">{t("block.noMembers")}</div>
            ) : (
              members.map((member, index) => (
                <div className="row" key={`${member.name}-${index}`}>
                  <span className="row-dot" />
                  <span className="row-label">{member.name}</span>
                  <span className="chip" data-tone="accent">
                    {optionLabel(component, member.role)}
                  </span>
                </div>
              ))
            )}
          </div>,
        );
        break;
      }
      case "list": {
        const items = Array.isArray(value) ? (value as string[]) : [];
        parts.push(
          <div className="rows" key={field.name}>
            {items.length === 0 ? (
              <div className="card-empty">{t("block.noItems")}</div>
            ) : (
              items.map((item, index) => (
                <div className="row" key={index}>
                  <span className="row-dot" />
                  <span className="row-label">{item}</span>
                </div>
              ))
            )}
          </div>,
        );
        break;
      }
      case "tags": {
        const tags = Array.isArray(value) ? (value as string[]) : [];
        parts.push(
          <div className="tags" key={field.name}>
            {tags.length === 0 ? (
              <div className="card-empty">{t("block.noTags")}</div>
            ) : (
              tags.map((tag, index) => (
                <span className="chip" key={index}>
                  {tag}
                </span>
              ))
            )}
          </div>,
        );
        break;
      }
      case "pairs": {
        const rows = (Array.isArray(value) ? value : []).map(toPair);
        parts.push(
          <div className="rows" key={field.name}>
            {rows.length === 0 ? (
              <div className="card-empty">{t("block.noField", { label: softLower(field.label) })}</div>
            ) : (
              rows.map((row, index) => (
                <div className="row" key={index}>
                  <span className="row-dot" />
                  <span className="row-label">{row.label}</span>
                  <span className="row-value">{row.value || "—"}</span>
                </div>
              ))
            )}
          </div>,
        );
        break;
      }
      case "ranked": {
        const rows = (Array.isArray(value) ? value : []).map(toRank);
        parts.push(
          <div className="rows" key={field.name}>
            {rows.length === 0 ? (
              <div className="card-empty">{t("block.noField", { label: softLower(field.label) })}</div>
            ) : (
              rows.map((row, index) => (
                <div className="row" key={index}>
                  <span className="row-dot" />
                  <span className="row-label">{row.label}</span>
                  {row.level ? <span className="chip">{optionLabel(component, row.level)}</span> : null}
                </div>
              ))
            )}
          </div>,
        );
        break;
      }
      case "dated": {
        const rows = (Array.isArray(value) ? value : []).map(toDated);
        parts.push(
          <div className="rows" key={field.name}>
            {rows.length === 0 ? (
              <div className="card-empty">{t("block.noField", { label: softLower(field.label) })}</div>
            ) : (
              rows.map((row, index) => (
                <div className="row" key={index}>
                  <span className="row-dot" />
                  <span className="row-label">{row.label}</span>
                  {row.date ? <span className="row-date">{formatDate(row.date)}</span> : null}
                  {row.level ? <span className="chip">{optionLabel(component, row.level)}</span> : null}
                </div>
              ))
            )}
          </div>,
        );
        break;
      }
      default: {
        const text = typeof value === "string" ? value : "";
        parts.push(
          text ? (
            <div className="card-body" key={field.name}>
              {text}
            </div>
          ) : (
            <div className="card-empty" key={field.name}>
              {t("block.noDetails")}
            </div>
          ),
        );
      }
    }
  }
  return <>{parts}</>;
}

export function Card({ block, component, dragging, over, busy, onEdit, onRemove, onSpark, dragHandleProps }: CardProps) {
  const { t } = useLocale();
  const ready = blockReady(block, component);
  const words = Math.min(countWords(block.brief ?? ""), BRIEF_WORDS);
  return (
    <div className="card" data-dragging={dragging || undefined} data-over={over || undefined}>
      <div className="card-head">
        <span className="card-icon">
          <Icon name={component?.icon ?? "sparkles"} size={16} />
        </span>
        <span className="card-title">{component?.label ?? block.title}</span>
        <span className="chip chip-progress" data-done={ready || undefined}>
          {t("block.words", { words, max: BRIEF_WORDS })}
        </span>
        <span className="card-actions">
          <button
            type="button"
            className="card-tool"
            data-drag="true"
            aria-label={t("block.drag")}
            {...dragHandleProps}
          >
            <GripVertical size={15} />
          </button>
          <button
            type="button"
            className="card-tool"
            aria-label={t("block.edit")}
            onClick={onEdit}
          >
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
            <button
              type="button"
              className="card-tool"
              aria-label={t("block.remove")}
              onClick={onRemove}
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </span>
      </div>
      <div className="card-content" data-editable={onEdit ? true : undefined} onClick={onEdit}>
        <Body block={block} component={component} />
      </div>
    </div>
  );
}
