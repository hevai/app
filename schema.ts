import { z } from "zod";

// Zod mirrors of the domain types. The component catalog itself lives in
// the backend (components database) and is fetched at runtime — see
// contexts/catalog.tsx. Nothing component-specific is hardcoded here.

export const role = z.enum(["owner", "admin", "editor", "viewer"]);

export const member = z.object({
  id: z.string(),
  name: z.string(),
  role,
});

export const seed = z.object({
  label: z.string(),
  value: z.string().optional(),
  level: z.string().optional(),
  date: z.string().optional(),
});

export const field = z.object({
  name: z.string(),
  label: z.string(),
  kind: z.enum([
    "text",
    "number",
    "select",
    "bars",
    "roles",
    "tags",
    "list",
    "pairs",
    "ranked",
    "dated",
  ]),
  options: z.array(z.string()).optional(),
  max: z.number().optional(),
  open: z.boolean().optional(),
  defaults: z.array(z.union([z.string(), seed])).optional(),
});

export const component = z.object({
  name: z.string(),
  label: z.string(),
  icon: z.string(),
  description: z.string(),
  fields: z.array(field),
  view: z.enum(["card", "list", "chart"]),
});

export const template = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string(),
  base: z.array(z.string()),
  specific: z.array(z.string()),
});

export const pair = z.object({
  label: z.string(),
  value: z.string(),
});

export const rank = z.object({
  label: z.string(),
  level: z.string(),
});

export const dated = z.object({
  label: z.string(),
  date: z.string(),
  level: z.string(),
});

export const block = z.object({
  id: z.string(),
  component: z.string(),
  title: z.string(),
  brief: z.string(),
  data: z.record(z.string(), z.unknown()),
  options: z.record(z.string(), z.array(z.string())),
  order: z.number(),
});

export const navigation = z.object({
  label: z.string(),
  blocks: z.array(z.string()),
});

export const project = z.object({
  id: z.string(),
  user: z.string(),
  name: z.string(),
  description: z.string(),
  template: z.string(),
  image: z.string(),
  members: z.array(member),
  blocks: z.array(block),
  navigation: z.array(navigation),
  plugins: z.array(z.string()),
  revision: z.number(),
  created: z.number(),
  updated: z.number(),
});

export const plugin = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string(),
  service: z.string(),
  price: z.number(),
  enabled: z.boolean(),
});

export const invite = z.object({
  id: z.string(),
  org: z.string(),
  code: z.string(),
  role,
  expires: z.number(),
});

export const uid = (): string =>
  globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
