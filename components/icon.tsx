import {
  Users,
  PieChart,
  TrendingUp,
  Target,
  Map,
  Flag,
  AlertTriangle,
  Gauge,
  CheckSquare,
  Trophy,
  Lightbulb,
  Rocket,
  Building2,
  Sparkles,
  Pencil,
  GripVertical,
  Plus,
  MessageCircle,
  Search,
  Settings,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  piechart: PieChart,
  trending: TrendingUp,
  target: Target,
  map: Map,
  flag: Flag,
  alert: AlertTriangle,
  gauge: Gauge,
  check: CheckSquare,
  trophy: Trophy,
  lightbulb: Lightbulb,
  rocket: Rocket,
  building: Building2,
  sparkles: Sparkles,
  pencil: Pencil,
  grip: GripVertical,
  plus: Plus,
  chat: MessageCircle,
  search: Search,
  settings: Settings,
  trash: Trash2,
  x: X,
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Component = ICONS[name] ?? Lightbulb;
  return <Component size={size} aria-hidden="true" />;
}

export function templateIcon(name: string): string {
  if (name === "idea") return "lightbulb";
  if (name === "startup") return "rocket";
  if (name === "enterprise") return "building";
  return "sparkles";
}
