import type { Settings } from './types';

export const CONFIG = {
  // How often the service worker wakes to re-evaluate upcoming meetings (minutes).
  // Chrome clamps alarm periods to a 1-minute minimum in production.
  TICK_PERIOD_MIN: 1,

  // How often we actually re-fetch events from the calendar API (ms). Between
  // fetches we re-use the cached event list and only re-check the clock.
  FETCH_INTERVAL_MS: 2 * 60 * 1000,

  // How far ahead to look when fetching events (ms).
  LOOKAHEAD_MS: 60 * 60 * 1000,

  DEFAULTS: {
    enabled: true,
    leadTimeMin: 1,
    graceMin: 10,
  } satisfies Settings,
} as const;

// chrome.storage keys. Settings live in `sync`; runtime state in `local`.
export const KEYS = {
  SETTINGS: 'settings',
  ACTIVE_PROMPT: 'activePrompt',
  HANDLED: 'handled',
  EVENT_CACHE: 'eventCache',
  ACCOUNT: 'account',
} as const;
