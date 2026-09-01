import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Invite, Member, Org, Role } from "@/types";
import { uid } from "@/schema";
import { api } from "@/lib/api";
import { useIdentity } from "@/hooks/use-identity";
import { ScopeContext } from "@/hooks/use-scope";

const ORG_PREFIX = "hevai:orgs";

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
  const [reload, setReload] = useState(0);
  const orgsRef = useRef<Org[]>([]);

  const refresh = useCallback(() => setReload((count) => count + 1), []);

  useEffect(() => {
    const next = identity.address ? loadOrgs(identity.address) : [];
    orgsRef.current = next;
    setOrgs(next);
    setInvites([]);
    if (!identity.address || !hasBackend) return;
    let active = true;
    const wallet = identity.address;
    api
      .listOrgs(wallet)
      .then((remote) => {
        if (!active) return undefined;
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
            api
              .updateOrg(org.id, { name: org.name, image: org.image })
              .catch((error) => console.warn("[hevai] org sync failed", error));
          }
        }
        return Promise.all(
          merged.map((org) => api.listInvites(org.id, wallet).catch(() => [] as Invite[])),
        );
      })
      .then((lists) => {
        if (!active || !lists) return;
        setInvites(lists.flat());
      })
      .catch((error) => {
        console.warn("[hevai] org load failed", error);
      });
    return () => {
      active = false;
    };
  }, [identity.address, reload]);

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
      commit(next);
      if (changed && hasBackend) {
        // members are server-managed (invites/accepts own the roster)
        api
          .updateOrg(id, { name: changed.name, image: changed.image })
          .catch((error) => console.warn("[hevai] org sync failed", error));
      }
    },
    [commit],
  );

  const deleteOrg = useCallback(
    (id: string) => {
      commit(orgsRef.current.filter((org) => org.id !== id), { removed: [id] });
      setInvites((current) => current.filter((invite) => invite.org !== id));
    },
    [commit],
  );

  const createInvite = useCallback(
    async (orgId: string, role: Role): Promise<Invite> => {
      if (!identity.address) throw new Error("Connect before creating an invite");
      if (!hasBackend) throw new Error("Invites need the backend");
      const invite = await api.createInvite(orgId, identity.address, role);
      setInvites((current) => [invite, ...current.filter((item) => item.id !== invite.id)]);
      return invite;
    },
    [identity.address],
  );

  const revokeInvite = useCallback((code: string) => {
    setInvites((current) => current.filter((invite) => invite.code !== code && invite.id !== code));
    if (hasBackend) {
      api.revokeInvite(code).catch((error) => console.warn("[hevai] invite revoke failed", error));
    }
  }, []);

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
      refresh,
    }),
    [orgs, getOrg, createOrg, updateOrg, deleteOrg, invites, createInvite, revokeInvite, refresh],
  );

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}
