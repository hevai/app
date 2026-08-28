import { clsx, type ClassValue } from "clsx";
import type { Block, Component } from "@/types";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function shortAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function timeAgo(timestamp: number): string {
  const delta = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (delta < minute) return "just now";
  if (delta < hour) return `${Math.floor(delta / minute)}m ago`;
  if (delta < day) return `${Math.floor(delta / hour)}h ago`;
  return `${Math.floor(delta / day)}d ago`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hasContent(block: Block, component?: Component): boolean {
  if (!component) return false;
  return component.fields.some((field) => {
    const value = block.data[field.name];
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return value !== 0;
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  });
}
