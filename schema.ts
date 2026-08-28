import { z } from "zod";
import type { Component, Template } from "./types";

export const role = z.enum(["owner", "admin", "editor", "viewer"]);

export const member = z.object({
  id: z.string(),
  name: z.string(),
  role,
});

export const field = z.object({
  name: z.string(),
  label: z.string(),
  kind: z.enum(["text", "number", "select", "bars", "roles", "tags", "list"]),
  options: z.array(z.string()).optional(),
  max: z.number().optional(),
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

export const block = z.object({
  id: z.string(),
  component: z.string(),
  title: z.string(),
  data: z.record(z.string(), z.unknown()),
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

export const COMPONENTS: Component[] = [
  {
    name: "team",
    label: "Team",
    icon: "users",
    description: "People and their roles in the project.",
    view: "list",
    fields: [
      { name: "members", label: "Members", kind: "roles" },
    ],
  },
  {
    name: "budget",
    label: "Budget",
    icon: "piechart",
    description: "How funds are distributed. Slices always total 100.",
    view: "chart",
    fields: [
      { name: "slices", label: "Allocation", kind: "bars", max: 100 },
    ],
  },
  {
    name: "market",
    label: "Market",
    icon: "trending",
    description: "Target market, segments and positioning.",
    view: "card",
    fields: [
      { name: "summary", label: "Overview", kind: "text" },
      { name: "segments", label: "Segments", kind: "tags" },
    ],
  },
  {
    name: "priorities",
    label: "Priorities",
    icon: "target",
    description: "What matters most, ranked.",
    view: "list",
    fields: [
      { name: "items", label: "Priorities", kind: "list" },
    ],
  },
  {
    name: "roadmap",
    label: "Roadmap",
    icon: "map",
    description: "Phases of delivery over time.",
    view: "list",
    fields: [
      { name: "phases", label: "Phases", kind: "list" },
    ],
  },
  {
    name: "milestones",
    label: "Milestones",
    icon: "flag",
    description: "Dated checkpoints and deadlines.",
    view: "list",
    fields: [
      { name: "items", label: "Milestones", kind: "list" },
    ],
  },
  {
    name: "risks",
    label: "Risks",
    icon: "alert",
    description: "Threats, likelihood and mitigations.",
    view: "list",
    fields: [
      { name: "items", label: "Risks", kind: "list" },
    ],
  },
  {
    name: "metrics",
    label: "Metrics",
    icon: "gauge",
    description: "KPIs that measure health.",
    view: "chart",
    fields: [
      { name: "kpis", label: "KPIs", kind: "bars", max: 100 },
    ],
  },
  {
    name: "tasks",
    label: "Tasks",
    icon: "check",
    description: "Actionable to-dos.",
    view: "list",
    fields: [
      { name: "items", label: "Tasks", kind: "list" },
    ],
  },
  {
    name: "goals",
    label: "Goals",
    icon: "trophy",
    description: "Objectives and desired outcomes.",
    view: "card",
    fields: [
      { name: "summary", label: "Objective", kind: "text" },
      { name: "outcomes", label: "Outcomes", kind: "tags" },
    ],
  },
];

export const TEMPLATES: Template[] = [
  {
    name: "idea",
    label: "Idea",
    description: "Capture and validate an early concept.",
    base: ["priorities", "goals", "tasks"],
    specific: ["market", "risks", "metrics"],
  },
  {
    name: "startup",
    label: "Startup",
    description: "Plan a venture from team to launch.",
    base: ["priorities", "goals", "tasks"],
    specific: ["team", "budget", "market", "roadmap", "milestones", "metrics"],
  },
  {
    name: "enterprise",
    label: "Enterprise",
    description: "Coordinate a large, multi-team initiative.",
    base: ["priorities", "goals", "tasks"],
    specific: ["team", "budget", "roadmap", "risks", "metrics", "milestones"],
  },
];

export const componentByName = (name: string): Component | undefined =>
  COMPONENTS.find((entry) => entry.name === name);

export const templateByName = (name: string): Template | undefined =>
  TEMPLATES.find((entry) => entry.name === name);

export const templateComponents = (name: string): string[] => {
  if (name === "scratch") return [];
  const match = templateByName(name);
  if (!match) return [];
  return Array.from(new Set([...match.base, ...match.specific]));
};

export const uid = (): string =>
  globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
