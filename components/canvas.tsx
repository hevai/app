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
import { uid } from "@/schema";
import { defaultData, useProjects } from "@/contexts/projects";
import { useCatalog } from "@/contexts/catalog";
import { useIdentity } from "@/contexts/identity";
import { useSession } from "@/hooks/use-session";
import { useLocale } from "@/contexts/locale";
import { api } from "@/lib/api";
import { coerceData, executeAgent, SessionInvalidError } from "@/lib/compose";
import { BRIEF_WORDS, blockReady } from "@/lib/utils";
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

function SortableDraft({
  block,
  component,
  busy,
  onEdit,
  onRemove,
  onSpark,
}: {
  block: Block;
  component?: Component;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onSpark: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: block.id });
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
        busy={busy}
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
  const { templates, componentByName, templateComponents } = useCatalog();
  const { address } = useIdentity();
  const { session, refreshSession } = useSession();
  const { t, err, lang } = useLocale();
  const navigate = useNavigate();
  const [template, setTemplate] = useState("idea");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [drafts, setDrafts] = useState<Block[]>([]);
  const [editing, setEditing] = useState<Block | null>(null);
  const [dragTool, setDragTool] = useState<Component | null>(null);
  const [tried, setTried] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const toDraft = (componentName: string, order: number): Block => {
    const component = componentByName(componentName);
    return {
      id: uid(),
      component: componentName,
      title: component?.label ?? componentName,
      brief: "",
      data: defaultData(component, lang),
      options: {},
      order,
    };
  };

  useEffect(() => {
    if (open) {
      setTemplate("idea");
      setName("");
      setDescription("");
      setDrafts(templateComponents("idea").map((componentName, index) => toDraft(componentName, index)));
      setEditing(null);
      setAddingId(null);
      setDragTool(null);
      setTried(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const { setNodeRef: assemblyRef, isOver: assemblyOver } = useDroppable({ id: ASSEMBLY_ID });

  const selected = useMemo(() => new Set(drafts.map((draft) => draft.component)), [drafts]);

  const options = useMemo(
    () => [
      ...templates.map((tpl) => ({ name: tpl.name, label: tpl.label, description: tpl.description })),
      {
        name: "scratch",
        label: t("canvas.scratch"),
        description: t("canvas.scratchDesc"),
      },
    ],
    [templates, t],
  );

  if (!open) return null;

  const nameValid = name.trim().length > 0;
  const descriptionValid = description.trim().length > 0;

  const pickTemplate = (next: string) => {
    setTemplate(next);
    setDrafts(templateComponents(next).map((componentName, index) => toDraft(componentName, index)));
    setEditing(null);
    setAddingId(null);
  };

  const toggle = (componentName: string) => {
    const existing = drafts.find((draft) => draft.component === componentName);
    if (existing) {
      setDrafts(drafts.filter((draft) => draft.component !== componentName));
      if (addingId === existing.id) setAddingId(null);
      return;
    }
    const draft = toDraft(componentName, drafts.length);
    setDrafts([...drafts, draft]);
    setAddingId(draft.id);
    setEditing(draft);
  };

  const spark = async (block: Block) => {
    if (running) return;
    if (!name.trim() || !description.trim()) {
      toast.error(t("canvas.needProject"));
      return;
    }
    const component = componentByName(block.component);
    if (!component) return;
    if (!blockReady(block, component)) {
      toast.error(t("spark.readyHint", { count: BRIEF_WORDS }));
      return;
    }
    if (!address) {
      toast.error(t("spark.needAccount"));
      return;
    }
    if (!session.active || !session.token) {
      toast.error(t("spark.needSession"));
      return;
    }
    setRunning(block.id);
    try {
      const payload = await api.runBlock(block.component, {
        wallet: address,
        project: "draft",
        block: block.id,
        title: component.label,
        brief: block.brief,
        name,
        description,
        data: block.data,
        options: block.options ?? {},
        locale: lang,
      });
      const result = await executeAgent(payload);
      const data = coerceData(result.data, block.data, component);
      setDrafts((current) =>
        current.map((draft) => (draft.id === block.id ? { ...draft, data } : draft)),
      );
      toast.success(t("spark.completed", { component: component.label, model: result.model }));
      void refreshSession();
    } catch (cause) {
      if (cause instanceof SessionInvalidError) {
        toast.error(t("spark.sessionProblem"));
        void refreshSession();
      } else {
        toast.error(err(cause, "spark.failed"));
      }
    } finally {
      setRunning(null);
    }
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
      if (drafts.some((draft) => draft.component === componentName)) return;
      const draft = toDraft(componentName, drafts.length);
      let index = drafts.length;
      if (overId !== ASSEMBLY_ID) {
        const position = drafts.findIndex((entry) => entry.id === overId);
        if (position >= 0) index = position;
      }
      const next = [...drafts];
      next.splice(index, 0, draft);
      setDrafts(next);
      setAddingId(draft.id);
      setEditing(draft);
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
    setTried(true);
    if (!nameValid) {
      toast.error(t("canvas.needName"));
      return;
    }
    if (!descriptionValid) {
      toast.error(t("canvas.needDesc"));
      return;
    }
    const incomplete = drafts.find((draft) => !blockReady(draft, componentByName(draft.component)));
    if (incomplete) {
      toast.error(t("canvas.needBrief", { count: BRIEF_WORDS }));
      setEditing(incomplete);
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
            <span className="modal-title">{t("canvas.title")}</span>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t("common.close")}>
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

            <div className="canvas-fields">
              <div className="field-group">
                <label className="label" htmlFor="canvas-name">
                  <span className="req" aria-hidden="true">*</span>
                  {t("canvas.name")}
                </label>
                <input
                  id="canvas-name"
                  className="input"
                  value={name}
                  placeholder={t("canvas.namePlaceholder")}
                  aria-required="true"
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                />
                {tried && !nameValid ? <span className="hint hint-req">{t("common.required")}</span> : null}
              </div>
              <div className="field-group">
                <label className="label" htmlFor="canvas-description">
                  <span className="req" aria-hidden="true">*</span>
                  {t("canvas.description")}
                </label>
                <input
                  id="canvas-description"
                  className="input"
                  value={description}
                  placeholder={t("canvas.descPlaceholder")}
                  aria-required="true"
                  onChange={(e) => setDescription(e.target.value)}
                />
                {tried && !descriptionValid ? (
                  <span className="hint hint-req">{t("canvas.descRequired")}</span>
                ) : null}
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
                    {t("canvas.toolboxHint")}
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
                        {t("canvas.dropHint1")}
                        <br />
                        {t("canvas.dropHint2")}
                      </div>
                    ) : (
                      drafts.map((draft) => (
                        <SortableDraft
                          key={draft.id}
                          block={draft}
                          component={componentByName(draft.component)}
                          busy={running === draft.id}
                          onEdit={() => setEditing(draft)}
                          onRemove={() => toggle(draft.component)}
                          onSpark={() => spark(draft)}
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
              {t(drafts.length === 1 ? "canvas.foot.one" : "canvas.foot.many", { count: drafts.length })} ·{" "}
              <span className="req">*</span> {t("canvas.footRequired")}
            </span>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreate}>
              {t("canvas.create")}
            </button>
          </div>
        </div>
      </div>

      {editing ? (
        <Editor
          key={editing.id}
          block={editing}
          component={componentByName(editing.component)}
          open
          submitLabel={addingId === editing.id ? t("project.addComponent") : t("common.save")}
          onClose={() => {
            if (addingId === editing.id) {
              setDrafts((current) => current.filter((draft) => draft.id !== editing.id));
              setAddingId(null);
            }
            setEditing(null);
          }}
          onSave={(patch) => {
            setDrafts((current) =>
              current.map((draft) => (draft.id === editing.id ? { ...draft, ...patch } : draft)),
            );
            if (addingId === editing.id) setAddingId(null);
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}
