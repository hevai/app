import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { defaultData } from "@/lib/utils";
import { useProjects } from "@/hooks/use-projects";
import { useCatalog } from "@/hooks/use-catalog";
import { useIdentity } from "@/hooks/use-identity";
import { useSession } from "@/hooks/use-session";
import { useLocale } from "@/hooks/use-locale";
import { api } from "@/lib/api";
import { coerceData, executeAgent, SessionInvalidError } from "@/lib/compose";
import { BRIEF_WORDS, blockReady } from "@/lib/utils";
import { uid } from "@/schema";
import type { Block, Component } from "@/types";
import { Section } from "@/components/section";
import { Toolbox } from "@/components/toolbox";
import { Editor } from "@/components/editor";
import { Empty } from "@/components/empty";
import { Chat } from "@/components/chat";
import { Confirm } from "@/components/confirm";
import { ImagePicker } from "@/components/image-picker";
import { templateIcon } from "@/lib/utils";
import { Icon } from "@/components/icon";

function SortableSection({
  block,
  component,
  register,
  busy,
  onEdit,
  onRemove,
  onSpark,
}: {
  block: Block;
  component?: Component;
  register: (id: string, node: HTMLElement | null) => void;
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
      <Section
        block={block}
        component={component}
        dragging={isDragging}
        over={isOver}
        busy={busy}
        onEdit={onEdit}
        onRemove={onRemove}
        onSpark={onSpark}
        dragHandleProps={{ ...attributes, ...listeners }}
        sectionRef={(node) => register(block.id, node)}
      />
    </div>
  );
}

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, addBlock, removeBlock, updateBlock, reorderBlocks, updateProject, deleteProject } =
    useProjects();
  const { componentByName, templateByName } = useCatalog();
  const { address } = useIdentity();
  const { session, refreshSession } = useSession();
  const { t, err, lang, timeAgo } = useLocale();
  const project = id ? getProject(id) : undefined;

  const [editing, setEditing] = useState<Block | null>(null);
  const [heroOpen, setHeroOpen] = useState(false);
  const [heroName, setHeroName] = useState("");
  const [heroDesc, setHeroDesc] = useState("");
  const [heroTried, setHeroTried] = useState(false);
  const [active, setActive] = useState("overview");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const paneRef = useRef<HTMLDivElement | null>(null);
  const sectionNodes = useRef<Map<string, HTMLElement>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const blocks = useMemo(
    () => (project ? [...project.blocks].sort((a, b) => a.order - b.order) : []),
    [project],
  );

  const register = useCallback((blockId: string, node: HTMLElement | null) => {
    if (node) sectionNodes.current.set(blockId, node);
    else sectionNodes.current.delete(blockId);
  }, []);

  if (!project) {
    return <Empty icon="alert" title={t("project.notFound")} description={t("project.removed")} />;
  }

  const ready = blocks.filter((block) => blockReady(block, componentByName(block.component))).length;
  const templateLabel = templateByName(project.template)?.label ?? project.template;

  const spark = async (block: Block) => {
    if (running) return;
    if (!project.name.trim() || !project.description.trim()) {
      toast.error(t("spark.needProject"));
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
        project: project.id,
        block: block.id,
        title: component.label,
        brief: block.brief,
        name: project.name,
        description: project.description,
        data: block.data,
        options: block.options ?? {},
        locale: lang,
      });
      const result = await executeAgent(payload);
      const data = coerceData(result.data, block.data, component);
      updateBlock(project.id, block.id, { data });
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

  const scrollTo = (target: string) => {
    setActive(target);
    const pane = paneRef.current;
    if (!pane) return;
    if (target === "overview") {
      pane.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const node = sectionNodes.current.get(target);
    if (!node) return;
    const top = node.offsetTop - 8;
    pane.scrollTo({ top, behavior: "smooth" });
  };

  const handleScroll = () => {
    const pane = paneRef.current;
    if (!pane) return;
    const marker = pane.scrollTop + 12;
    let current = "overview";
    for (const block of blocks) {
      const node = sectionNodes.current.get(block.id);
      if (!node) continue;
      if (node.offsetTop - 12 <= marker) current = block.id;
    }
    setActive(current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;
    const ids = blocks.map((block) => block.id);
    const from = ids.indexOf(String(dragged.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    reorderBlocks(project.id, arrayMove(ids, from, to));
  };

  const handleAdd = (componentName: string) => {
    const component = componentByName(componentName);
    if (!component) return;
    setAdding(true);
    setEditing({
      id: uid(),
      component: componentName,
      title: component.label,
      brief: "",
      data: defaultData(component, lang),
      options: {},
      order: blocks.length,
    });
  };

  const openHero = () => {
    setHeroName(project.name);
    setHeroDesc(project.description);
    setHeroTried(false);
    setHeroOpen(true);
  };

  const saveHero = () => {
    setHeroTried(true);
    if (!heroName.trim()) {
      toast.error(t("project.needsName"));
      return;
    }
    updateProject(project.id, { name: heroName.trim(), description: heroDesc.trim() });
    setHeroOpen(false);
  };

  return (
    <div className="split">
      <div className="nav">
        <button
          type="button"
          className="nav-item"
          data-active={active === "overview" || undefined}
          onClick={() => scrollTo("overview")}
        >
          <Icon name="sparkles" size={15} />
          {t("project.overview")}
        </button>

        {blocks.length > 0 ? <div className="nav-label">{t("project.sections")}</div> : null}
        {blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            className="nav-item"
            data-active={active === block.id || undefined}
            onClick={() => scrollTo(block.id)}
          >
            <Icon name={componentByName(block.component)?.icon ?? "sparkles"} size={15} />
            {componentByName(block.component)?.label ?? block.title}
          </button>
        ))}

        <div className="divider" style={{ margin: "var(--sp-2) 0" }} />
        <Toolbox onAdd={handleAdd} />
        <div className="hint" style={{ marginTop: "auto", padding: "0 var(--sp-1)" }}>
          {t("project.reorderHint")}
        </div>
      </div>

      <div className="pane" ref={paneRef} onScroll={handleScroll}>
        <div className="hero">
          <div className="hero-top">
            <ImagePicker
              image={project.image}
              size={52}
              shape="rounded"
              label={t("project.changeLogo")}
              fallback={<Icon name={templateIcon(project.template)} size={24} />}
              onPick={(url) => {
                updateProject(project.id, { image: url });
                toast.success(t("project.logoUpdated"));
              }}
            />
            <div className="hero-titles">
              <span className="hero-name">{project.name}</span>
              {project.description ? (
                <span className="hero-desc">{project.description}</span>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={openHero}
              aria-label={t("project.editDetails")}
              title={t("project.editNameDesc")}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setDeleteOpen(true)}
              aria-label={t("project.deleteTitle")}
              title={t("project.deleteTitle")}
              style={{ color: "var(--danger)" }}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="hero-meta">
            <span className="chip" data-tone="accent">
              {templateLabel}
            </span>
            <span className="chip">
              {t(blocks.length === 1 ? "project.sections.one" : "project.sections.many", {
                count: blocks.length,
              })}
            </span>
            <span className="chip" data-done={(blocks.length > 0 && ready === blocks.length) || undefined}>
              {t("project.ready", { ready, total: blocks.length })}
            </span>
            <span className="hint">{t("project.updated", { time: timeAgo(project.updated) })}</span>
          </div>
        </div>

        {blocks.length === 0 ? (
          <Empty
            icon="sparkles"
            title={t("project.empty.title")}
            description={t("project.empty.desc")}
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              <div className="sections">
                {blocks.map((block) => (
                  <SortableSection
                    key={block.id}
                    block={block}
                    component={componentByName(block.component)}
                    register={register}
                    busy={running === block.id}
                    onEdit={() => setEditing(block)}
                    onRemove={() => removeBlock(project.id, block.id)}
                    onSpark={() => spark(block)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {editing ? (
        <Editor
          key={editing.id}
          block={editing}
          component={componentByName(editing.component)}
          open
          submitLabel={adding ? t("project.addComponent") : t("common.save")}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSave={(patch) => {
            if (adding) addBlock(project.id, editing.component, patch);
            else updateBlock(project.id, editing.id, patch);
            setEditing(null);
            setAdding(false);
          }}
        />
      ) : null}

      {heroOpen ? (
        <div className="overlay" onClick={() => setHeroOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">{t("project.edit")}</span>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setHeroOpen(false)}
                aria-label={t("common.close")}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field-group" style={{ marginBottom: "var(--sp-3)" }}>
                <label className="label" htmlFor="hero-name">
                  <span className="req" aria-hidden="true">*</span>
                  {t("project.name")}
                </label>
                <input
                  id="hero-name"
                  className="input"
                  value={heroName}
                  aria-required="true"
                  onChange={(e) => setHeroName(e.target.value)}
                />
                {heroTried && !heroName.trim() ? <span className="hint hint-req">{t("common.required")}</span> : null}
              </div>
              <div className="field-group">
                <label className="label" htmlFor="hero-description">
                  {t("project.description")}
                  <span className="opt">{t("common.optional")}</span>
                </label>
                <textarea
                  id="hero-description"
                  className="textarea"
                  value={heroDesc}
                  onChange={(e) => setHeroDesc(e.target.value)}
                />
                <span className="hint">{t("project.descHint")}</span>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setHeroOpen(false)}>
                {t("common.cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={saveHero}>
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Confirm
        open={deleteOpen}
        title={t("project.deleteTitle")}
        description={t("project.deleteDesc", { name: project.name })}
        confirmLabel={t("project.deleteConfirm")}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteProject(project.id);
          toast.success(t("project.deleted"));
          setDeleteOpen(false);
          navigate("/");
        }}
      />

      <Chat key={`${address ?? "anon"}:${project.id}`} project={project} />
    </div>
  );
}
