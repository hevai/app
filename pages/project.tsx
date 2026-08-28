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
import { useProjects } from "@/contexts/projects";
import { componentByName, templateByName } from "@/schema";
import type { Block } from "@/types";
import { Section } from "@/components/section";
import { Toolbox } from "@/components/toolbox";
import { Editor } from "@/components/editor";
import { Empty } from "@/components/empty";
import { Chat } from "@/components/chat";
import { Confirm } from "@/components/confirm";
import { ImagePicker } from "@/components/image-picker";
import { Icon, templateIcon } from "@/components/icon";
import { hasContent, timeAgo } from "@/lib/utils";

function SortableSection({
  block,
  register,
  onEdit,
  onRemove,
  onSpark,
}: {
  block: Block;
  register: (id: string, node: HTMLElement | null) => void;
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
      <Section
        block={block}
        component={component}
        dragging={isDragging}
        over={isOver}
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
  const project = id ? getProject(id) : undefined;

  const [editing, setEditing] = useState<Block | null>(null);
  const [heroOpen, setHeroOpen] = useState(false);
  const [heroName, setHeroName] = useState("");
  const [heroDesc, setHeroDesc] = useState("");
  const [active, setActive] = useState("overview");
  const [deleteOpen, setDeleteOpen] = useState(false);

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
    return <Empty icon="alert" title="Project not found" description="It may have been removed." />;
  }

  const filled = blocks.filter((block) => hasContent(block, componentByName(block.component))).length;
  const templateLabel = templateByName(project.template)?.label ?? project.template;

  const spark = () => {
    if (!project.name.trim() || !project.description.trim()) {
      toast.error("Add a name and a description to this project first — then AI can complete it.");
      return;
    }
    toast.info("AI completion arrives in the next iteration.");
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

  const openHero = () => {
    setHeroName(project.name);
    setHeroDesc(project.description);
    setHeroOpen(true);
  };

  const saveHero = () => {
    if (!heroName.trim()) {
      toast.error("The project needs a name.");
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
          Overview
        </button>

        {blocks.length > 0 ? <div className="nav-label">Sections</div> : null}
        {blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            className="nav-item"
            data-active={active === block.id || undefined}
            onClick={() => scrollTo(block.id)}
          >
            <Icon name={componentByName(block.component)?.icon ?? "sparkles"} size={15} />
            {block.title}
          </button>
        ))}

        <div className="divider" style={{ margin: "var(--sp-2) 0" }} />
        <Toolbox onAdd={(componentName) => addBlock(project.id, componentName)} />
        <div className="hint" style={{ marginTop: "auto", padding: "0 var(--sp-1)" }}>
          Drag sections to reorder. Use the pencil to customize.
        </div>
      </div>

      <div className="pane" ref={paneRef} onScroll={handleScroll}>
        <div className="hero">
          <div className="hero-top">
            <ImagePicker
              image={project.image}
              size={52}
              shape="rounded"
              label="Change project logo"
              fallback={<Icon name={templateIcon(project.template)} size={24} />}
              onPick={(url) => {
                updateProject(project.id, { image: url });
                toast.success("Project logo updated");
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
              aria-label="Edit project details"
              title="Edit name and description"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete project"
              title="Delete project"
              style={{ color: "var(--danger)" }}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="hero-meta">
            <span className="chip" data-tone="accent">
              {templateLabel}
            </span>
            <span className="chip">{blocks.length} section{blocks.length === 1 ? "" : "s"}</span>
            <span className="chip">{filled} with content</span>
            <span className="hint">updated {timeAgo(project.updated)}</span>
          </div>
        </div>

        {blocks.length === 0 ? (
          <Empty
            icon="sparkles"
            title="Nothing here yet"
            description="Add components from the toolbox on the left to start building this project."
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              <div className="sections">
                {blocks.map((block) => (
                  <SortableSection
                    key={block.id}
                    block={block}
                    register={register}
                    onEdit={() => setEditing(block)}
                    onRemove={() => removeBlock(project.id, block.id)}
                    onSpark={spark}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {editing ? (
        <Editor
          block={editing}
          component={componentByName(editing.component)}
          open
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateBlock(project.id, editing.id, patch);
            setEditing(null);
          }}
        />
      ) : null}

      {heroOpen ? (
        <div className="overlay" onClick={() => setHeroOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Edit project</span>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setHeroOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field-group" style={{ marginBottom: "var(--sp-3)" }}>
                <label className="label">Name</label>
                <input className="input" value={heroName} onChange={(e) => setHeroName(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  value={heroDesc}
                  onChange={(e) => setHeroDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setHeroOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveHero}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Confirm
        open={deleteOpen}
        title="Delete project"
        description={`"${project.name}" and all of its sections will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete project"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteProject(project.id);
          toast.success("Project deleted");
          setDeleteOpen(false);
          navigate("/");
        }}
      />

      <Chat />
    </div>
  );
}
