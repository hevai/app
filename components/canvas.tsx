import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES, componentByName, templateComponents, uid } from "@/schema";
import { defaultData, useProjects } from "@/contexts/projects";
import type { Block, Component } from "@/types";
import { Icon, templateIcon } from "./icon";
import { Toolbox } from "./toolbox";
import { Card } from "./card";
import { Editor } from "./editor";

interface CanvasProps {
  open: boolean;
  onClose: () => void;
}

const ASSEMBLY_ID = "assembly";
const TOOL_PREFIX = "tool:";

function toDraft(componentName: string, order: number): Block {
  const component = componentByName(componentName);
  return {
    id: uid(),
    component: componentName,
    title: component?.label ?? componentName,
    data: defaultData(component),
    order,
  };
}

function SortableDraft({
  block,
  onEdit,
  onRemove,
  onSpark,
}: {
  block: Block;
  onEdit: () => void;
  onRemove: () => void;
  onSpark: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: block.id });
  const component = componentByName(block.component);
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        minWidth: 0,
      }}
    >
      <Card
        block={block}
        component={component}
        dragging={isDragging}
        over={isOver}
        onEdit={onEdit}
        onRemove={onRemove}
        onSpark={onSpark}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function Canvas({ open, onClose }: CanvasProps) {
  const { createProject } = useProjects();
  const navigate = useNavigate();
  const [template, setTemplate] = useState("idea");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [drafts, setDrafts] = useState<Block[]>([]);
  const [editing, setEditing] = useState<Block | null>(null);
  const [dragTool, setDragTool] = useState<Component | null>(null);

  useEffect(() => {
    if (open) {
      setTemplate("idea");
      setName("");
      setDescription("");
      setDrafts(templateComponents("idea").map((componentName, index) => toDraft(componentName, index)));
      setEditing(null);
      setDragTool(null);
    }
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const { setNodeRef: assemblyRef, isOver: assemblyOver } = useDroppable({ id: ASSEMBLY_ID });

  const selected = useMemo(() => new Set(drafts.map((draft) => draft.component)), [drafts]);

  const options = useMemo(
    () => [
      ...TEMPLATES.map((t) => ({ name: t.name, label: t.label, description: t.description })),
      {
        name: "scratch",
        label: "Start from scratch",
        description: "A blank project. Add only the components you need.",
      },
    ],
    [],
  );

  if (!open) return null;

  const pickTemplate = (next: string) => {
    setTemplate(next);
    setDrafts(templateComponents(next).map((componentName, index) => toDraft(componentName, index)));
  };

  const toggle = (componentName: string) => {
    setDrafts((current) => {
      if (current.some((draft) => draft.component === componentName)) {
        return current.filter((draft) => draft.component !== componentName);
      }
      return [...current, toDraft(componentName, current.length)];
    });
  };

  const spark = () => {
    if (!name.trim() || !description.trim()) {
      toast.error("Add a name and a description first — then AI can complete components for you.");
      return;
    }
    toast.info("AI completion arrives in the next iteration.");
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith(TOOL_PREFIX)) {
      setDragTool(componentByName(activeId.slice(TOOL_PREFIX.length)) ?? null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragTool(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (activeId.startsWith(TOOL_PREFIX)) {
      if (!overId) return;
      const componentName = activeId.slice(TOOL_PREFIX.length);
      setDrafts((current) => {
        if (current.some((draft) => draft.component === componentName)) return current;
        const draft = toDraft(componentName, current.length);
        let index = current.length;
        if (overId !== ASSEMBLY_ID) {
          const position = current.findIndex((entry) => entry.id === overId);
          if (position >= 0) index = position;
        }
        const next = [...current];
        next.splice(index, 0, draft);
        return next;
      });
      return;
    }

    if (!overId || overId === activeId) return;
    setDrafts((current) => {
      const ids = current.map((draft) => draft.id);
      const from = ids.indexOf(activeId);
      const to = overId === ASSEMBLY_ID ? ids.length - 1 : ids.indexOf(overId);
      if (from < 0 || to < 0) return current;
      return arrayMove(current, from, to);
    });
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Give your project a name first.");
      return;
    }
    const project = createProject({
      name: name.trim(),
      description: description.trim(),
      template,
      blocks: drafts,
    });
    onClose();
    navigate(`/project/${project.id}`);
  };

  return (
    <>
      <div className="overlay" onClick={onClose}>
        <div className="modal modal-wide" onClick={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <span className="modal-title">Create a project</span>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="modal-body">
            <div className="canvas-templates" style={{ marginBottom: "var(--sp-4)" }}>
              {options.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className="template"
                  data-active={template === option.name || undefined}
                  onClick={() => pickTemplate(option.name)}
                >
                  <span className="template-icon">
                    <Icon name={templateIcon(option.name)} size={18} />
                  </span>
                  <span className="template-name">{option.label}</span>
                  <span className="template-desc">{option.description}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
              <div className="field-group">
                <label className="label">Project name</label>
                <input
                  className="input"
                  value={name}
                  placeholder="e.g. Apollo"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="label">Description</label>
                <input
                  className="input"
                  value={description}
                  placeholder="What is this project about?"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setDragTool(null)}
            >
              <div className="canvas-layout">
                <div className="canvas-side">
                  <Toolbox selected={selected} onSelect={toggle} draggable />
                  <span className="hint">
                    Click a component to add or remove it. Drag it into the canvas to place it.
                  </span>
                </div>

                <SortableContext items={drafts.map((draft) => draft.id)} strategy={rectSortingStrategy}>
                  <div
                    ref={assemblyRef}
                    className="canvas-assembly"
                    data-over={assemblyOver || undefined}
                  >
                    {drafts.length === 0 ? (
                      <div className="canvas-drop-hint">
                        Drag components here from the toolbox — or click them to add.
                        <br />
                        Use the pencil on a component to customize it before creating.
                      </div>
                    ) : (
                      drafts.map((draft) => (
                        <SortableDraft
                          key={draft.id}
                          block={draft}
                          onEdit={() => setEditing(draft)}
                          onRemove={() => toggle(draft.component)}
                          onSpark={spark}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {dragTool ? (
                    <div className="tool" style={{ width: 170, cursor: "grabbing" }}>
                      <span className="tool-icon">
                        <Icon name={dragTool.icon} size={14} />
                      </span>
                      <span className="tool-name">{dragTool.label}</span>
                    </div>
                  ) : null}
                </DragOverlay>
              </div>
            </DndContext>
          </div>

          <div className="modal-foot">
            <span className="hint" style={{ marginRight: "auto" }}>
              {drafts.length} component{drafts.length === 1 ? "" : "s"} in the project
            </span>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreate}>
              Create project
            </button>
          </div>
        </div>
      </div>

      {editing ? (
        <Editor
          block={editing}
          component={componentByName(editing.component)}
          open
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            setDrafts((current) =>
              current.map((draft) => (draft.id === editing.id ? { ...draft, ...patch } : draft)),
            );
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}
