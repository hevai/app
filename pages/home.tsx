import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "@/contexts/projects";
import { useIdentity } from "@/contexts/identity";
import { Empty } from "@/components/empty";
import { Confirm } from "@/components/confirm";
import { Icon, templateIcon } from "@/components/icon";
import { timeAgo } from "@/lib/utils";

interface HomeProps {
  onCreate: () => void;
}

export function Home({ onCreate }: HomeProps) {
  const { projects, deleteProject } = useProjects();
  const { isConnected } = useIdentity();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleting = projects.find((project) => project.id === deleteTarget);

  if (!isConnected) {
    return (
      <Empty
        icon="lightbulb"
        title="Connect to view your projects"
        description="Your projects and organizations appear after your wallet is connected."
      />
    );
  }

  if (projects.length === 0) {
    return (
      <Empty
        icon="lightbulb"
        title="Build your first project"
        description={
          isConnected
            ? "Pick a template or start from scratch, then shape it with drag-and-drop components."
            : "Connect, then pick a template or start from scratch to build a project dashboard."
        }
        action={
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            <Plus size={15} />
            New project
          </button>
        }
      />
    );
  }

  return (
    <>
      <div className="grid">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            className="card"
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={() => navigate(`/project/${project.id}`)}
          >
            <div className="card-head">
              {project.image ? (
                <img
                  src={project.image}
                  alt=""
                  style={{ width: 22, height: 22, borderRadius: "var(--r-sm)", objectFit: "cover" }}
                />
              ) : (
                <span className="card-icon">
                  <Icon name={templateIcon(project.template)} size={16} />
                </span>
              )}
              <span className="card-title">{project.name}</span>
              <span
                className="card-actions"
                onClick={(event) => event.stopPropagation()}
              >
                <span
                  className="card-tool"
                  role="button"
                  aria-label="Delete project"
                  onClick={() => setDeleteTarget(project.id)}
                >
                  <Trash2 size={14} />
                </span>
              </span>
            </div>
            <div className="card-body">
              {project.description || "No description yet."}
            </div>
            <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "auto" }}>
              <span className="chip">{project.template}</span>
              <span className="chip">{project.blocks.length} components</span>
              <span className="hint" style={{ marginLeft: "auto", alignSelf: "center" }}>
                {timeAgo(project.updated)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <Confirm
        open={Boolean(deleting)}
        title="Delete project"
        description={
          deleting
            ? `"${deleting.name}" and all of its sections will be permanently deleted. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete project"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteProject(deleteTarget);
            toast.success("Project deleted");
          }
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
