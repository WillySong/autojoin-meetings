// Typed wrappers around chrome.storage so callers never track which area a key
// lives in or how defaults are merged.

import { KEYS, CONFIG } from './config';
import type { Account, Meeting, Settings } from './types';

export interface ActivePrompt extends Meeting {}
export type HandledStatus = 'joined' | 'dismissed';
export interface HandledMap {
  [eventId: string]: { status: HandledStatus; at: number };
}
export interface EventCache {
  fetchedAt: number;
  events: Meeting[];
}

// ---- Settings (sync) -------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const { [KEYS.SETTINGS]: s } = await chrome.storage.sync.get(KEYS.SETTINGS);
  return { ...CONFIG.DEFAULTS, ...(s as Partial<Settings> | undefined) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.sync.set({ [KEYS.SETTINGS]: next });
  return next;
}

// ---- Active prompt (local) -------------------------------------------------

export async function getActivePrompt(): Promise<ActivePrompt | null> {
  const { [KEYS.ACTIVE_PROMPT]: p } = await chrome.storage.local.get(KEYS.ACTIVE_PROMPT);
  return (p as ActivePrompt | undefined) ?? null;
}

export async function setActivePrompt(prompt: ActivePrompt | null): Promise<void> {
  await chrome.storage.local.set({ [KEYS.ACTIVE_PROMPT]: prompt ?? null });
}

// ---- Handled meetings (local) ----------------------------------------------

export async function getHandled(): Promise<HandledMap> {
  const { [KEYS.HANDLED]: h } = await chrome.storage.local.get(KEYS.HANDLED);
  return (h as HandledMap | undefined) ?? {};
}

export async function markHandled(eventId: string, status: HandledStatus): Promise<void> {
  const h = await getHandled();
  h[eventId] = { status, at: Date.now() };
  await chrome.storage.local.set({ [KEYS.HANDLED]: h });
}

export async function pruneHandled(beforeMs: number): Promise<void> {
  const h = await getHandled();
  let changed = false;
  for (const [id, v] of Object.entries(h)) {
    if (!v || v.at < beforeMs) {
      delete h[id];
      changed = true;
    }
  }
  if (changed) await chrome.storage.local.set({ [KEYS.HANDLED]: h });
}

// ---- Connected account (local) ---------------------------------------------

export async function getAccount(): Promise<Account | null> {
  const { [KEYS.ACCOUNT]: a } = await chrome.storage.local.get(KEYS.ACCOUNT);
  return (a as Account | undefined) ?? null;
}

export async function setAccount(account: Account | null): Promise<void> {
  await chrome.storage.local.set({ [KEYS.ACCOUNT]: account ?? null });
}
