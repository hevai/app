import { useLocation, useNavigate } from "react-router-dom";
import { Home, Plus } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { useIdentity } from "@/hooks/use-identity";
import { useLocale } from "@/hooks/use-locale";
import { templateIcon } from "@/lib/utils";
import { Icon } from "./icon";
import { Logo } from "./logo";

interface RailProps {
  onCreate: () => void;
}

export function Rail({ onCreate }: RailProps) {
  const { projects } = useProjects();
  const { isConnected } = useIdentity();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "";

  return (
    <aside className="rail">
      <button
        type="button"
        className="rail-logo"
        data-active={isHome || undefined}
        onClick={() => navigate("/")}
        aria-label={t("rail.logoAria")}
        title={t("rail.logoTitle")}
      >
        <Logo size={36} />
      </button>

      <div className="rail-items">
        <button
          type="button"
          className="rail-item"
          data-active={isHome || undefined}
          onClick={() => navigate("/")}
          aria-label={t("rail.home")}
          title={t("rail.home")}
        >
          <Home size={18} />
        </button>

        {projects.map((project) => {
          const active = location.pathname === `/project/${project.id}`;
          return (
            <button
              key={project.id}
              type="button"
              className="rail-item"
              data-active={active || undefined}
              onClick={() => navigate(`/project/${project.id}`)}
              aria-label={project.name}
              title={project.name}
            >
              {project.image ? (
                <img
                  src={project.image}
                  alt=""
                  style={{ width: 24, height: 24, borderRadius: "var(--r-sm)", objectFit: "cover" }}
                />
              ) : (
                <Icon name={templateIcon(project.template)} size={18} />
              )}
            </button>
          );
        })}
      </div>

      {isConnected ? (
        <button type="button" className="rail-plus" onClick={onCreate} aria-label={t("rail.create")} title={t("rail.create")}>
          <Plus size={20} />
        </button>
      ) : null}

      <div className="rail-spacer" />
    </aside>
  );
}
