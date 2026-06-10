// Google Calendar implementation of the CalendarProvider contract.
//
// Auth uses chrome.identity.getAuthToken, which keeps Google token refresh inside
// Chrome. A future provider (Outlook, iCloud, ...) can instead use
// chrome.identity.launchWebAuthFlow without touching anything outside this file.

import { normalizeGoogleEvent } from '../meeting';
import { CONFIG } from '../config';
import type { Account, CalendarProvider, Meeting } from '../types';

const manifest = chrome.runtime.getManifest() as chrome.runtime.Manifest & {
  oauth2?: { client_id?: string; scopes?: string[] };
};
const CLIENT_ID = manifest.oauth2?.client_id ?? '';
const API_BASE = 'https://www.googleapis.com/calendar/v3';

function getAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || 'No auth token'));
      } else {
        resolve(token as string);
      }
    });
  });
}

function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => chrome.identity.removeCachedAuthToken({ token }, () => resolve()));
}

async function apiFetch<T = any>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let token = await getAuthToken(false);
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (res.status === 401) {
    await removeCachedToken(token);
    token = await getAuthToken(false);
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }

  if (!res.ok) throw new Error(`Google Calendar API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const GoogleCalendarProvider: CalendarProvider = {
  id: 'google',
  name: 'Google Calendar',

  isConfigured() {
    return Boolean(CLIENT_ID) && !CLIENT_ID.includes('YOUR_OAUTH_CLIENT_ID');
  },

  async isConnected() {
    try {
      await getAuthToken(false);
      return true;
    } catch {
      return false;
    }
  },

  async connect() {
    await getAuthToken(true);
    return this.getAccount();
  },

  async disconnect() {
    try {
      const token = await getAuthToken(false);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' });
      await removeCachedToken(token);
    } catch {
      // Wasn't connected.
    }
    await new Promise<void>((resolve) => chrome.identity.clearAllCachedAuthTokens(() => resolve()));
  },

  // The primary calendar's id is the account email, so no extra scope is needed.
  async getAccount(): Promise<Account> {
    const cal = await apiFetch<{ id: string; summary?: string }>('calendars/primary');
    return { email: cal.id, name: cal.summary || cal.id };
  },

  async listUpcomingEvents({ withinMs = CONFIG.LOOKAHEAD_MS } = {}): Promise<Meeting[]> {
    const now = Date.now();
    const data = await apiFetch<{ items?: any[] }>('calendars/primary/events', {
      timeMin: new Date(now).toISOString(),
      timeMax: new Date(now + withinMs).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '20',
      conferenceDataVersion: '1',
    });

    const meetings: Meeting[] = [];
    for (const ev of data.items ?? []) {
      const m = normalizeGoogleEvent(ev, this.name);
      if (m) meetings.push(m);
    }
    return meetings;
  },
};
