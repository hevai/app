import { useLocation } from "react-router-dom";
import { useProjects } from "@/contexts/projects";
import { useScope } from "@/contexts/scope";
import { useIdentity } from "@/contexts/identity";
import { Connector } from "./connector";
import { SessionControl } from "./session";
import { NetworkSelector } from "./network-selector";

export function Topbar() {
  const location = useLocation();
  const { getProject } = useProjects();
  const { getOrg } = useScope();
  const { user, isConnected } = useIdentity();

  const projectMatch = location.pathname.match(/^\/project\/([^/]+)/);
  const orgMatch = location.pathname.match(/^\/org\/([^/]+)/);
  const project = projectMatch ? getProject(projectMatch[1]) : undefined;
  const orgId = orgMatch?.[1];
  const org = orgId ? getOrg(orgId) : undefined;

  let title = "hevai";
  let sub = isConnected
    ? user?.name || user?.email || "Your projects"
    : "Connect to start building";
  if (project) {
    title = project.name;
    sub = project.description || "Project";
  } else if (orgId === "new") {
    title = "New organization";
    sub = "Create a shared space for your team";
  } else if (org) {
    title = org.name;
    sub = "Manage members and invites";
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
      <Connector />
    </header>
  );
}
