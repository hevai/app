import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, Plus, Check } from "lucide-react";
import { COMPONENTS } from "@/schema";
import type { Component } from "@/types";
import { Icon } from "./icon";

interface ToolboxProps {
  selected?: Set<string>;
  onSelect?: (name: string) => void;
  onAdd?: (name: string) => void;
  draggable?: boolean;
}

function ToolItem({
  component,
  isSelected,
  draggable,
  onClick,
}: {
  component: Component;
  isSelected: boolean;
  draggable: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tool:${component.name}`,
    disabled: !draggable,
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className="tool"
      data-disabled={isDragging || undefined}
      title={component.description}
      onClick={onClick}
      {...(draggable ? { ...attributes, ...listeners } : {})}
    >
      <span className="tool-icon">
        <Icon name={component.icon} size={14} />
      </span>
      <span className="tool-name">{component.label}</span>
      <span style={{ marginLeft: "auto", color: isSelected ? "var(--accent)" : "var(--faint)" }}>
        {isSelected ? <Check size={14} /> : <Plus size={14} />}
      </span>
    </button>
  );
}

export function Toolbox({ selected, onSelect, onAdd, draggable = false }: ToolboxProps) {
  const [folded, setFolded] = useState(false);

  return (
    <div className="toolbox">
      <button
        type="button"
        className="toolbox-head"
        onClick={() => setFolded((f) => !f)}
        aria-expanded={!folded}
      >
        <ChevronDown
          size={15}
          style={{ transform: folded ? "rotate(-90deg)" : "none", transition: "transform var(--t-fast)" }}
        />
        Component toolbox
        <span className="hint" style={{ marginLeft: "auto" }}>
          {COMPONENTS.length}
        </span>
      </button>

      <div className="toolbox-body" data-folded={folded || undefined}>
        {COMPONENTS.map((component) => (
          <ToolItem
            key={component.name}
            component={component}
            isSelected={Boolean(selected?.has(component.name))}
            draggable={draggable}
            onClick={() => (onSelect ? onSelect(component.name) : onAdd?.(component.name))}
          />
        ))}
      </div>
    </div>
  );
}
