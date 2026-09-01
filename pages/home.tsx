import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "@/hooks/use-projects";
import { useIdentity } from "@/hooks/use-identity";
import { useCatalog } from "@/hooks/use-catalog";
import { useLocale } from "@/hooks/use-locale";
import { Empty } from "@/components/empty";
import { Confirm } from "@/components/confirm";
import { templateIcon } from "@/lib/utils";
import { Icon } from "@/components/icon";

interface HomeProps {
  onCreate: () => void;
}

export function Home({ onCreate }: HomeProps) {
  const { projects, deleteProject } = useProjects();
  const { isConnected } = useIdentity();
  const { templateByName } = useCatalog();
  const { t, timeAgo } = useLocale();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleting = projects.find((project) => project.id === deleteTarget);

  if (!isConnected) {
    return (
      <Empty
        icon="lightbulb"
        title={t("home.connect.title")}
        description={t("home.connect.desc")}
      />
    );
  }

  if (projects.length === 0) {
    return (
      <Empty
        icon="lightbulb"
        title={t("home.empty.title")}
        description={t("home.empty.desc")}
        action={
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            <Plus size={15} />
            {t("home.empty.action")}
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
                  aria-label={t("project.deleteTitle")}
                  onClick={() => setDeleteTarget(project.id)}
                >
                  <Trash2 size={14} />
                </span>
              </span>
            </div>
            <div className="card-body">
              {project.description || t("home.noDescription")}
            </div>
            <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "auto" }}>
              <span className="chip">{templateByName(project.template)?.label ?? project.template}</span>
              <span className="chip">
                {t(
                  project.blocks.length === 1 ? "home.components.one" : "home.components.many",
                  { count: project.blocks.length },
                )}
              </span>
              <span className="hint" style={{ marginLeft: "auto", alignSelf: "center" }}>
                {timeAgo(project.updated)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <Confirm
        open={Boolean(deleting)}
        title={t("project.deleteTitle")}
        description={
          deleting
            ? t("project.deleteDesc", { name: deleting.name })
            : undefined
        }
        confirmLabel={t("project.deleteConfirm")}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteProject(deleteTarget);
            toast.success(t("project.deleted"));
          }
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
