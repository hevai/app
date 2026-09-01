export type Role = "owner" | "admin" | "editor" | "viewer";

export type Kind =
  | "text"
  | "number"
  | "select"
  | "bars"
  | "roles"
  | "tags"
  | "list"
  | "pairs"
  | "ranked"
  | "dated";

export type View = "card" | "list" | "chart";

export interface User {
  id: string;
  wallet: string;
  name: string;
  email: string;
  image: string;
  orgs: string[];
}

export interface Member {
  id: string;
  name: string;
  role: Role;
}

export interface Org {
  id: string;
  name: string;
  owner: string;
  image: string;
  members: Member[];
  created: number;
  updated: number;
}

export interface Profile {
  name: string;
  email: string;
  image: string;
}

export interface Invite {
  id: string;
  org: string;
  code: string;
  role: Role;
  expires: number;
}

export interface Pair {
  label: string;
  value: string;
}

export interface Rank {
  label: string;
  level: string;
}

export interface Dated {
  label: string;
  date: string;
  level: string;
}

export interface Seed {
  label: string;
  value?: string;
  level?: string;
  date?: string;
}

export interface Field {
  name: string;
  label: string;
  kind: Kind;
  options?: string[];
  max?: number;
  open?: boolean;
  defaults?: Array<string | Seed>;
}

export interface Component {
  name: string;
  label: string;
  icon: string;
  description: string;
  fields: Field[];
  view: View;
}

export interface Template {
  name: string;
  label: string;
  description: string;
  base: string[];
  specific: string[];
}

export interface Slice {
  name: string;
  value: number;
}

export interface Block {
  id: string;
  component: string;
  title: string;
  brief: string;
  data: Record<string, unknown>;
  options: Record<string, string[]>;
  order: number;
}

// Prepared by the backend block agent; executed + paid for on the client
// through the compose.market SDK against the active session.
export interface AgentPayload {
  chain: string[];
  instructions: string;
  input: string;
  response_format: { type: string };
  max_output_tokens: number;
  temperature: number;
}

export interface RunBlockInput {
  wallet: string;
  project: string;
  block: string;
  title: string;
  brief: string;
  name: string;
  description: string;
  data: Record<string, unknown>;
  options: Record<string, string[]>;
  locale?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface RunAssistantInput {
  wallet: string;
  project: string;
  messages: ChatMessage[];
  locale?: string;
}

export interface Navigation {
  label: string;
  blocks: string[];
}

export interface Project {
  id: string;
  user: string;
  name: string;
  description: string;
  template: string;
  image: string;
  members: Member[];
  blocks: Block[];
  navigation: Navigation[];
  plugins: string[];
  revision: number;
  created: number;
  updated: number;
}

export interface Plugin {
  name: string;
  label: string;
  description: string;
  service: string;
  price: number;
  enabled: boolean;
}

export interface Identity {
  address: string;
  jwt: string;
}
