import { createContext, useContext } from "react";
import type { Invite, Org, Role } from "@/types";

export interface ScopeValue {
  orgs: Org[];
  getOrg: (id: string) => Org | undefined;
  createOrg: (name: string) => Org;
  updateOrg: (id: string, patch: Partial<Org>) => void;
  deleteOrg: (id: string) => void;
  invites: Invite[];
  createInvite: (orgId: string, role: Role) => Promise<Invite>;
  revokeInvite: (code: string) => void;
  refresh: () => void;
}

export const ScopeContext = createContext<ScopeValue | null>(null);

export function useScope(): ScopeValue {
  const value = useContext(ScopeContext);
  if (!value) throw new Error("useScope must be used within a ScopeProvider");
  return value;
}
