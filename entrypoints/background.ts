import { defineBackground } from '#imports';
import { CONFIG, KEYS } from '@/lib/config';
import { getActiveProvider } from '@/lib/providers';
import {
  getSettings,
  getActivePrompt,
  setActivePrompt,
  getHandled,
  markHandled,
  pruneHandled,
  type EventCache,
} from '@/lib/storage';

// The brain of the extension. On a 1-minute alarm it asks the active provider
// for upcoming meetings, decides whether one is inside its show window
// (leadTime before start .. grace after start) and not already handled, and
// writes that to storage.local `activePrompt`. Every page's content script
// watches that key, so the overlay appears/disappears everywhere at once.

export default defineBackground(() => {
  const ALARM = 'tick';

  const ensureAlarm = () =>
    chrome.alarms.create(ALARM, { periodInMinutes: CONFIG.TICK_PERIOD_MIN });

  chrome.runtime.onInstalled.addListener(() => {
    ensureAlarm();
    void tick();
  });

  chrome.runtime.onStartup.addListener(() => {
    ensureAlarm();
    void tick();
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM) void tick();
  });

  // Re-evaluate immediately when the user changes settings.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[KEYS.SETTINGS]) void tick();
  });

  // Messages from the overlay buttons and the popup.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        switch (msg?.type) {
          case 'ACCEPT':
            await markHandled(msg.id, 'joined');
            await setActivePrompt(null);
            if (msg.meetingUrl) await chrome.tabs.create({ url: msg.meetingUrl });
            return sendResponse({ ok: true });
          case 'DECLINE':
            await markHandled(msg.id, 'dismissed');
            await setActivePrompt(null);
            return sendResponse({ ok: true });
          case 'CHECK_NOW':
            await chrome.storage.local.remove(KEYS.EVENT_CACHE); // force a refetch
            await tick();
            return sendResponse({ ok: true });
          default:
            return sendResponse({ ok: false, error: 'unknown message' });
        }
      } catch (e) {
        return sendResponse({ ok: false, error: String((e as Error)?.message ?? e) });
      }
    })();
    return true; // keep the channel open for the async response
  });

  async function loadCache(): Promise<EventCache> {
    const { [KEYS.EVENT_CACHE]: c } = await chrome.storage.local.get(KEYS.EVENT_CACHE);
    const cache = c as EventCache | undefined;
    return cache && Array.isArray(cache.events) ? cache : { fetchedAt: 0, events: [] };
  }

  async function tick(): Promise<void> {
    const settings = await getSettings();
    await pruneHandled(Date.now() - 24 * 60 * 60 * 1000);

    if (!settings.enabled) return setActivePrompt(null);

    const provider = getActiveProvider();
    if (!provider.isConfigured()) return setActivePrompt(null);

    let connected = false;
    try {
      connected = await provider.isConnected();
    } catch {
      connected = false;
    }
    if (!connected) return setActivePrompt(null);

    // Re-fetch periodically; otherwise re-use the cached list and re-check the
    // clock. The cache lives in storage so it survives worker shutdowns.
    let cache = await loadCache();
    const now = Date.now();
    if (now - cache.fetchedAt > CONFIG.FETCH_INTERVAL_MS || cache.events.length === 0) {
      try {
        const events = await provider.listUpcomingEvents({ withinMs: CONFIG.LOOKAHEAD_MS });
        cache = { fetchedAt: now, events };
        await chrome.storage.local.set({ [KEYS.EVENT_CACHE]: cache });
      } catch {
        if (cache.events.length === 0) return; // transient error, nothing cached
        // else keep working from the stale cache
      }
    }

    const handled = await getHandled();
    const leadMs = settings.leadTimeMin * 60000;
    const graceMs = settings.graceMin * 60000;

    // Soonest-starting meeting in its window and not yet handled wins.
    let chosen: (typeof cache.events)[number] | null = null;
    for (const ev of cache.events) {
      if (handled[ev.id]) continue;
      const showAt = ev.startTime - leadMs;
      const hideAt = ev.startTime + graceMs;
      if (now >= showAt && now <= hideAt && (!chosen || ev.startTime < chosen.startTime)) {
        chosen = ev;
      }
    }

    const current = await getActivePrompt();
    if (chosen) {
      if (!current || current.id !== chosen.id) await setActivePrompt(chosen);
    } else if (current) {
      await setActivePrompt(null);
    }
  }
});
