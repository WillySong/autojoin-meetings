// DEV-ONLY: fakes the chrome.* extension APIs + the Google Calendar fetch so the
// real popup/options/overlay components can render in a plain browser tab for a
// visual preview. Not part of the extension build.

const now = Date.now();

const mockEvents = {
  items: [
    {
      id: 'evt1',
      status: 'confirmed',
      summary: 'Design Sync',
      start: { dateTime: new Date(now + 60_000).toISOString() },
      end: { dateTime: new Date(now + 30 * 60_000).toISOString() },
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
      attendees: [{ self: true, responseStatus: 'accepted' }],
    },
  ],
};

(globalThis as any).chrome = {
  runtime: {
    id: 'previewextensionidmock00000000abcd',
    lastError: undefined,
    getManifest: () => ({
      oauth2: { client_id: 'mock-client-id.apps.googleusercontent.com', scopes: [] },
    }),
    openOptionsPage: () => {},
    sendMessage: async () => ({ ok: true }),
  },
  identity: {
    getAuthToken: (_opts: unknown, cb: (t: string) => void) => cb('mock-token'),
    removeCachedAuthToken: (_o: unknown, cb?: () => void) => cb && cb(),
    clearAllCachedAuthTokens: (cb?: () => void) => cb && cb(),
  },
  storage: {
    local: { get: async () => ({}), set: async () => {}, remove: async () => {} },
    sync: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {}, removeListener: () => {} },
  },
  tabs: { create: async () => {} },
};

const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes('/calendars/primary/events')) {
    return new Response(JSON.stringify(mockEvents), { status: 200 });
  }
  if (url.includes('/calendars/primary')) {
    return new Response(JSON.stringify({ id: 'you@example.com', summary: 'you@example.com' }), {
      status: 200,
    });
  }
  return realFetch(input, init);
}) as typeof fetch;
