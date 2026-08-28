import { isTauri } from "@tauri-apps/api/core";

export function isDesktop(): boolean {
  return isTauri();
}

const DEVICE_KEY = "hevai:device-id";

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}
