import { GripVertical, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { Block, Component, Slice } from "@/types";
import { Icon } from "./icon";
import { Bars } from "./bars";

interface CardProps {
  block: Block;
  component?: Component;
  dragging?: boolean;
  over?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onSpark?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function Body({ block, component }: { block: Block; component?: Component }) {
  if (!component || component.fields.length === 0) {
    return <div className="card-empty">Nothing here yet — use the pencil to add details.</div>;
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
              <div className="card-empty">No members yet.</div>
            ) : (
              members.map((member, index) => (
                <div className="row" key={`${member.name}-${index}`}>
                  <span className="row-dot" />
                  <span className="row-label">{member.name}</span>
                  <span className="chip" data-tone="accent">
                    {member.role}
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
              <div className="card-empty">No items yet.</div>
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
              <div className="card-empty">No tags yet.</div>
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
      default: {
        const text = typeof value === "string" ? value : "";
        parts.push(
          text ? (
            <div className="card-body" key={field.name}>
              {text}
            </div>
          ) : (
            <div className="card-empty" key={field.name}>
              No details yet.
            </div>
          ),
        );
      }
    }
  }
  return <>{parts}</>;
}

export function Card({ block, component, dragging, over, onEdit, onRemove, onSpark, dragHandleProps }: CardProps) {
  return (
    <div className="card" data-dragging={dragging || undefined} data-over={over || undefined}>
      <div className="card-head">
        <span className="card-icon">
          <Icon name={component?.icon ?? "sparkles"} size={16} />
        </span>
        <span className="card-title">{block.title}</span>
        <span className="card-actions">
          <button
            type="button"
            className="card-tool"
            data-drag="true"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical size={15} />
          </button>
          <button
            type="button"
            className="card-tool"
            aria-label="Edit component"
            onClick={onEdit}
          >
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
            <button
              type="button"
              className="card-tool"
              aria-label="Remove component"
              onClick={onRemove}
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </span>
      </div>
      <Body block={block} component={component} />
    </div>
  );
}
