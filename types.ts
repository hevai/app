export type Role = "owner" | "admin" | "editor" | "viewer";

export type Kind = "text" | "number" | "select" | "bars" | "roles" | "tags" | "list";

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

export interface Field {
  name: string;
  label: string;
  kind: Kind;
  options?: string[];
  max?: number;
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
  data: Record<string, unknown>;
  order: number;
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
