/**
 * Typed localStorage helpers for the draft (app info + per-screenshot designs).
 * Screenshot files themselves live in IndexedDB — see `lib/files.ts`.
 */

import {
  DEFAULT_DESIGN,
  deviceDefaults,
  getDevice,
  type AppInfo,
  type DesignConfig,
} from "./constants";
import { clearFiles } from "./files";

const K = {
  appInfo: "appshots:v2:appInfo",
  designs: "appshots:v2:designs",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — the editor keeps working in memory.
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ── App info ────────────────────────────────────────────────────────────────

export function saveAppInfo(info: AppInfo) { write(K.appInfo, info); }
export function loadAppInfo(): AppInfo | null { return read<AppInfo>(K.appInfo); }

// ── Designs ─────────────────────────────────────────────────────────────────

/** Partial overrides keyed by `designKey(deviceId, index)`. */
export type DesignMap = Record<string, Partial<DesignConfig>>;

export function designKey(deviceId: string, idx: number) {
  return `${deviceId}::${idx}`;
}

export function saveDesigns(designs: DesignMap) { write(K.designs, designs); }
export function loadDesigns(): DesignMap { return read<DesignMap>(K.designs) ?? {}; }

/** Full config for one screenshot: global defaults → device defaults → user edits. */
export function resolveDesign(designs: DesignMap, deviceId: string, idx: number): DesignConfig {
  const spec = getDevice(deviceId);
  return {
    ...DEFAULT_DESIGN,
    ...(spec ? deviceDefaults(spec) : {}),
    ...(designs[designKey(deviceId, idx)] ?? {}),
  };
}

// ── Draft lifecycle ─────────────────────────────────────────────────────────

export async function clearDraft() {
  Object.values(K).forEach(remove);
  await clearFiles();
}

export function hasDraft(): boolean {
  return Boolean(loadAppInfo()?.name);
}

// ── Anthropic API key (BYOK for AI auto-design) ─────────────────────────────
// A user setting, not draft data, so it survives "start fresh". Opt-in only:
// kept in sessionStorage unless the user ticks "remember on this device".

const API_KEY = "appshots:anthropicKey";

export function loadApiKey(): { key: string; remembered: boolean } {
  if (typeof window === "undefined") return { key: "", remembered: false };
  try {
    const remembered = localStorage.getItem(API_KEY);
    if (remembered) return { key: remembered, remembered: true };
    return { key: sessionStorage.getItem(API_KEY) ?? "", remembered: false };
  } catch {
    return { key: "", remembered: false };
  }
}

export function saveApiKey(key: string, remember: boolean) {
  try {
    localStorage.removeItem(API_KEY);
    sessionStorage.removeItem(API_KEY);
    if (!key) return;
    (remember ? localStorage : sessionStorage).setItem(API_KEY, key);
  } catch {
    // ignore
  }
}
