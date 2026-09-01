import { useLocation } from "react-router-dom";
import { useProjects } from "@/hooks/use-projects";
import { useScope } from "@/hooks/use-scope";
import { useIdentity } from "@/hooks/use-identity";
import { useLocale } from "@/hooks/use-locale";
import { Connector } from "./connector";
import { SessionControl } from "./session";
import { NetworkSelector } from "./network-selector";
import { Switcher } from "./switcher";

export function Topbar() {
  const location = useLocation();
  const { getProject } = useProjects();
  const { getOrg } = useScope();
  const { user, isConnected } = useIdentity();
  const { t } = useLocale();

  const projectMatch = location.pathname.match(/^\/project\/([^/]+)/);
  const orgMatch = location.pathname.match(/^\/org\/([^/]+)/);
  const project = projectMatch ? getProject(projectMatch[1]) : undefined;
  const orgId = orgMatch?.[1];
  const org = orgId ? getOrg(orgId) : undefined;

  let title = "hevai";
  let sub = isConnected
    ? user?.name || user?.email || t("topbar.defaultSub")
    : t("topbar.connectSub");
  if (project) {
    title = project.name;
    sub = project.description || t("topbar.projectFallback");
  } else if (orgId === "new") {
    title = t("topbar.newOrg");
    sub = t("topbar.newOrgSub");
  } else if (org) {
    title = org.name;
    sub = t("topbar.orgSub");
  }

  return (
    <header className="topbar">
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span className="topbar-title">{title}</span>
        <span className="topbar-sub">{sub}</span>
      </div>
      <div className="topbar-spacer" />
      <NetworkSelector />
      <SessionControl />
      <Switcher />
      <Connector />
    </header>
  );
}
