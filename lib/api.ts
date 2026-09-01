import type {
  AgentPayload,
  Component,
  Invite,
  Org,
  Plugin,
  Preview,
  Profile,
  Project,
  Role,
  RunAssistantInput,
  RunBlockInput,
  Template,
} from "@/types";

const baseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore parse failure
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

type ProjectRow = Omit<Project, "created" | "updated" | "revision"> & {
  created: number | string;
  updated: number | string;
  revision: number | string;
};

type OrgRow = Omit<Org, "created" | "updated"> & {
  created: number | string;
  updated: number | string;
};

const toProject = (row: ProjectRow): Project => ({
  ...row,
  created: Number(row.created),
  updated: Number(row.updated),
  revision: Number(row.revision),
});

const toOrg = (row: OrgRow): Org => ({
  ...row,
  created: Number(row.created),
  updated: Number(row.updated),
});

export const api = {
  health: () => request<{ ok: boolean; uptime: number }>("GET", "/health"),

  // JWT mirror + profile live together in the users table: both sync
  // through PATCH /users/:wallet.
  syncIdentity: (wallet: string, jwt: string) =>
    request<Profile>("PATCH", `/users/${wallet}`, { jwt }),

  templates: () => request<Template[]>("GET", "/templates"),
  components: () => request<Component[]>("GET", "/components"),
  plugins: () => request<Plugin[]>("GET", "/plugins"),

  runBlock: (component: string, body: RunBlockInput) =>
    request<AgentPayload>("POST", `/${component}/run`, body),

  runAssistant: (body: RunAssistantInput) =>
    request<AgentPayload>("POST", "/assistant/run", body),

  profile: (wallet: string) => request<Profile>("GET", `/users/${wallet}`),
  updateProfile: (wallet: string, patch: Partial<Profile>) =>
    request<Profile>("PATCH", `/users/${wallet}`, patch),

  listProjects: async (wallet: string): Promise<Project[]> =>
    (await request<ProjectRow[]>("GET", `/projects/${wallet}`)).map(toProject),
  putProject: (wallet: string, project: Project) =>
    request<{ ok: boolean }>("PUT", `/projects/${wallet}`, project),
  deleteProject: (wallet: string, id: string) =>
    request<{ ok: boolean }>("DELETE", `/projects/${wallet}/${id}`),

  listOrgs: async (owner: string): Promise<Org[]> =>
    (await request<OrgRow[]>("GET", `/orgs/${owner}`)).map(toOrg),
  createOrg: (org: Org) => request<OrgRow>("POST", "/orgs", org).then(toOrg),
  updateOrg: (id: string, patch: Partial<Pick<Org, "name" | "image">>) =>
    request<OrgRow>("PATCH", `/orgs/${id}`, patch).then(toOrg),
  deleteOrg: (id: string) => request<{ ok: boolean }>("DELETE", `/orgs/${id}`),

  createInvite: (orgId: string, wallet: string, role: Role) =>
    request<Invite>("POST", `/orgs/${orgId}/invites`, { wallet, role }),
  listInvites: (orgId: string, wallet: string) =>
    request<Invite[]>(
      "GET",
      `/orgs/${orgId}/invites?wallet=${encodeURIComponent(wallet)}`,
    ),
  revokeInvite: (code: string) =>
    request<{ ok: boolean }>("DELETE", `/invites/${encodeURIComponent(code)}`),
  peekInvite: (code: string) =>
    request<Preview>("GET", `/invites/${encodeURIComponent(code)}`),
  acceptInvite: (code: string, wallet: string) =>
    request<OrgRow>(
      "POST",
      `/invites/${encodeURIComponent(code)}/accept`,
      { wallet },
    ).then(toOrg),

  upload: (data: string, name: string) =>
    request<{ cid: string; url: string }>("POST", "/upload", { data, name }),
};
