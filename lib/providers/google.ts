// Google Calendar implementation of the CalendarProvider contract.
//
// Auth uses chrome.identity.launchWebAuthFlow with the OAuth 2.0 implicit flow
// (response_type=token). This means:
//   - the OAuth client id is supplied at runtime (pasted into the options page),
//     not baked into the manifest — so no rebuild to change it,
//   - there is no client secret and no token-exchange step, so no backend,
//   - access tokens last ~1h and are cached in storage; when one expires we
//     silently re-mint it with interactive:false.
//
// A future provider (Outlook, iCloud, ...) implements the same surface; nothing
// outside this file changes.

import { normalizeGoogleEvent } from '../meeting';
import { CONFIG } from '../config';
import { getSettings, setSettings } from '../storage';
import type { Account, CalendarProvider, Meeting } from '../types';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const API_BASE = 'https://www.googleapis.com/calendar/v3';
const TOKEN_CACHE_KEY = 'google.token'; // chrome.storage.local

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

async function getStoredClientId(): Promise<string> {
  return (await getSettings()).googleClientId?.trim() || '';
}

async function readTokenCache(): Promise<TokenCache | null> {
  const { [TOKEN_CACHE_KEY]: t } = await chrome.storage.local.get(TOKEN_CACHE_KEY);
  return (t as TokenCache | undefined) ?? null;
}

async function writeTokenCache(t: TokenCache | null): Promise<void> {
  if (t) await chrome.storage.local.set({ [TOKEN_CACHE_KEY]: t });
  else await chrome.storage.local.remove(TOKEN_CACHE_KEY);
}

function parseTokenFromRedirect(redirectUrl: string): TokenCache {
  const frag = new URLSearchParams(new URL(redirectUrl).hash.replace(/^#/, ''));
  const error = frag.get('error');
  if (error) throw new Error(`OAuth error: ${error}`);
  const accessToken = frag.get('access_token');
  if (!accessToken) throw new Error('No access token returned');
  const expiresIn = Number(frag.get('expires_in') || '3600');
  return { accessToken, expiresAt: Date.now() + (expiresIn - 60) * 1000 }; // refresh ~1 min early
}

function launchAuth(interactive: boolean, clientId: string): Promise<string> {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('redirect_uri', chrome.identity.getRedirectURL());
  url.searchParams.set('scope', SCOPES.join(' '));
  if (!interactive) url.searchParams.set('prompt', 'none'); // attempt silent auth

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: url.toString(), interactive }, (redirect) => {
      if (chrome.runtime.lastError || !redirect) {
        reject(new Error(chrome.runtime.lastError?.message || 'Auth flow did not complete'));
      } else {
        resolve(redirect);
      }
    });
  });
}

async function getToken(interactive: boolean): Promise<string> {
  const cached = await readTokenCache();
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

  const clientId = await getStoredClientId();
  if (!clientId) throw new Error('No OAuth client ID configured');

  const token = parseTokenFromRedirect(await launchAuth(interactive, clientId));
  await writeTokenCache(token);
  return token.accessToken;
}

async function apiFetch<T = any>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let token = await getToken(false);
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (res.status === 401) {
    await writeTokenCache(null);
    token = await getToken(false); // silent re-auth
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }

  if (!res.ok) throw new Error(`Google Calendar API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const GoogleCalendarProvider: CalendarProvider = {
  id: 'google',
  name: 'Google Calendar',

  async isConfigured() {
    return (await getStoredClientId()).length > 0;
  },

  async isConnected() {
    try {
      await getToken(false);
      return true;
    } catch {
      return false;
    }
  },

  async connect() {
    await getToken(true);
    return this.getAccount();
  },

  async disconnect() {
    const cached = await readTokenCache();
    if (cached) {
      try {
        await fetch(`${REVOKE_ENDPOINT}?token=${cached.accessToken}`, { method: 'POST' });
      } catch {
        // best-effort revoke
      }
    }
    await writeTokenCache(null);
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

  // ---- Runtime configuration (used by the options page) --------------------

  async getClientId() {
    return getStoredClientId();
  },

  async setClientId(id: string) {
    await setSettings({ googleClientId: id.trim() });
    await writeTokenCache(null); // a new client id invalidates any cached token
  },

  // The URI to register as the OAuth client's authorized redirect URI:
  // https://<extension-id>.chromiumapp.org/
  getRedirectUri() {
    return chrome.identity.getRedirectURL();
  },
};
