import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Invite, Member, Org, Role } from "@/types";
import { uid } from "@/schema";
import { api } from "@/lib/api";
import { useIdentity } from "./identity";

interface ScopeValue {
  orgs: Org[];
  getOrg: (id: string) => Org | undefined;
  createOrg: (name: string) => Org;
  updateOrg: (id: string, patch: Partial<Org>) => void;
  deleteOrg: (id: string) => void;
  invites: Invite[];
  createInvite: (orgId: string, role: Role) => Invite;
  revokeInvite: (id: string) => void;
}

const ScopeContext = createContext<ScopeValue | null>(null);

const ORG_PREFIX = "hevai:orgs";
const INVITE_PREFIX = "hevai:invites";

function normalize(org: Org): Org {
  return {
    ...org,
    image: org.image ?? "",
    members: org.members ?? [],
    created: org.created ?? 0,
    updated: org.updated ?? 0,
  };
}

function loadOrgs(address: string): Org[] {
  try {
    const raw = localStorage.getItem(`${ORG_PREFIX}:${address.toLowerCase()}`);
    const parsed = raw ? (JSON.parse(raw) as Org[]) : [];
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

function loadInvites(address: string): Invite[] {
  try {
    const raw = localStorage.getItem(`${INVITE_PREFIX}:${address.toLowerCase()}`);
    const parsed = raw ? (JSON.parse(raw) as Invite[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeOrgs(local: Org[], remote: Org[]): Org[] {
  const byId = new Map<string, Org>();
  for (const org of remote) byId.set(org.id, org);
  for (const org of local) {
    const existing = byId.get(org.id);
    if (!existing || org.updated >= existing.updated) byId.set(org.id, org);
  }
  return Array.from(byId.values()).sort((a, b) => b.updated - a.updated);
}

const hasBackend = Boolean((import.meta.env.VITE_API_URL ?? "").trim());

export function ScopeProvider({ children }: { children: ReactNode }) {
  const identity = useIdentity();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const orgsRef = useRef<Org[]>([]);

  useEffect(() => {
    const next = identity.address ? loadOrgs(identity.address) : [];
    orgsRef.current = next;
    setOrgs(next);
    setInvites(identity.address ? loadInvites(identity.address) : []);
    if (!identity.address || !hasBackend) return;
    let active = true;
    const wallet = identity.address;
    api
      .listOrgs(wallet)
      .then((remote) => {
        if (!active) return;
        const merged = mergeOrgs(orgsRef.current, remote);
        orgsRef.current = merged;
        setOrgs(merged);
        localStorage.setItem(`${ORG_PREFIX}:${wallet.toLowerCase()}`, JSON.stringify(merged));
        const remoteById = new Map(remote.map((org) => [org.id, org]));
        for (const org of merged) {
          const remoteCopy = remoteById.get(org.id);
          if (!remoteCopy) {
            api.createOrg(org).catch((error) => console.warn("[hevai] org sync failed", error));
          } else if (remoteCopy.updated !== org.updated) {
            api.updateOrg(org.id, org).catch((error) => console.warn("[hevai] org sync failed", error));
          }
        }
      })
      .catch((error) => {
        console.warn("[hevai] org load failed", error);
      });
    return () => {
      active = false;
    };
  }, [identity.address]);

  const commit = useCallback(
    (next: Org[], sync?: { upsert?: Org[]; removed?: string[] }) => {
      orgsRef.current = next;
      setOrgs(next);
      if (identity.address) {
        localStorage.setItem(`${ORG_PREFIX}:${identity.address.toLowerCase()}`, JSON.stringify(next));
      }
      if (identity.address && hasBackend && sync) {
        for (const org of sync.upsert ?? []) {
          api.createOrg(org).catch((error) => console.warn("[hevai] org sync failed", error));
        }
        for (const id of sync.removed ?? []) {
          api.deleteOrg(id).catch((error) => console.warn("[hevai] org delete failed", error));
        }
      }
    },
    [identity.address],
  );

  const getOrg = useCallback((id: string) => orgs.find((org) => org.id === id), [orgs]);

  const createOrg = useCallback(
    (name: string) => {
      if (!identity.address) throw new Error("Connect before creating an organization");
      const ownerId = identity.address;
      const now = Date.now();
      const org: Org = {
        id: uid(),
        name,
        owner: ownerId,
        image: "",
        members: [{ id: ownerId, name: "You", role: "owner" } as Member],
        created: now,
        updated: now,
      };
      commit([...orgsRef.current, org], { upsert: [org] });
      return org;
    },
    [commit, identity.address],
  );

  const updateOrg = useCallback(
    (id: string, patch: Partial<Org>) => {
      let changed: Org | undefined;
      const next = orgsRef.current.map((org) => {
        if (org.id !== id) return org;
        changed = { ...org, ...patch, updated: Date.now() };
        return changed;
      });
      commit(next, { upsert: changed ? [changed] : [] });
    },
    [commit],
  );

  const deleteOrg = useCallback(
    (id: string) => {
      commit(orgsRef.current.filter((org) => org.id !== id), { removed: [id] });
      setInvites((current) => {
        const next = current.filter((invite) => invite.org !== id);
        if (identity.address) {
          localStorage.setItem(`${INVITE_PREFIX}:${identity.address.toLowerCase()}`, JSON.stringify(next));
        }
        return next;
      });
    },
    [commit, identity.address],
  );

  const createInvite = useCallback((orgId: string, role: Role) => {
    if (!identity.address) throw new Error("Connect before creating an invite");
    const invite: Invite = {
      id: uid(),
      org: orgId,
      code: uid(),
      role,
      expires: Date.now() + 7 * 24 * 3_600_000,
    };
    setInvites((current) => {
      const next = [invite, ...current];
      localStorage.setItem(`${INVITE_PREFIX}:${identity.address!.toLowerCase()}`, JSON.stringify(next));
      return next;
    });
    return invite;
  }, [identity.address]);

  const revokeInvite = useCallback((id: string) => {
    setInvites((current) => {
      const next = current.filter((invite) => invite.id !== id);
      if (identity.address) {
        localStorage.setItem(`${INVITE_PREFIX}:${identity.address.toLowerCase()}`, JSON.stringify(next));
      }
      return next;
    });
  }, [identity.address]);

  const value = useMemo(
    () => ({
      orgs,
      getOrg,
      createOrg,
      updateOrg,
      deleteOrg,
      invites,
      createInvite,
      revokeInvite,
    }),
    [orgs, getOrg, createOrg, updateOrg, deleteOrg, invites, createInvite, revokeInvite],
  );

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): ScopeValue {
  const value = useContext(ScopeContext);
  if (!value) throw new Error("useScope must be used within a ScopeProvider");
  return value;
}
