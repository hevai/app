import { GripVertical, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { Block, Component } from "@/types";
import { Icon } from "./icon";
import { Body } from "./card";

interface SectionProps {
  block: Block;
  component?: Component;
  dragging?: boolean;
  over?: boolean;
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
  onEdit,
  onRemove,
  onSpark,
  dragHandleProps,
  sectionRef,
}: SectionProps) {
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
          <span className="section-title">{block.title}</span>
          <span className="section-desc">{component?.description ?? ""}</span>
        </div>
        <span className="section-actions">
          <button
            type="button"
            className="card-tool"
            data-drag="true"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical size={15} />
          </button>
          <button type="button" className="card-tool" aria-label="Edit component" onClick={onEdit}>
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="card-tool"
            data-spark="true"
            aria-label="AI complete (coming soon)"
            title="AI completion arrives in the next iteration"
            onClick={onSpark}
          >
            <Sparkles size={14} />
          </button>
          {onRemove ? (
            <button type="button" className="card-tool" aria-label="Remove component" onClick={onRemove}>
              <Trash2 size={14} />
            </button>
          ) : null}
        </span>
      </div>
      <div className="section-body">
        <Body block={block} component={component} />
      </div>
    </section>
  );
}
