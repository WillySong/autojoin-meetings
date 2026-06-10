# autojoin-meetings

A Chrome extension (Manifest V3) that watches your **Google Calendar** and, when a
meeting is about to start, drops a polished prompt onto whatever web page you're
looking at:

> 🟢 **Meeting starting · Design Sync · Starts in 1 min**
> [ **Decline** (red) ] [ **Join** (green) ]

- **Join** opens the meeting link (Google Meet / Zoom / Teams / Webex / Jitsi / Whereby) in a new tab.
- **Decline** dismisses the prompt for that meeting.

The UI is built with **React + [HeroUI](https://www.heroui.com) v3 + Tailwind CSS v4**,
bundled as an extension by **[WXT](https://wxt.dev)**. Calendar access sits behind a
small `CalendarProvider` interface, so support for other calendars (Outlook, iCloud,
CalDAV) can be added later without touching the UI or background logic.

## Tech stack

| | |
| --- | --- |
| Framework | [WXT](https://wxt.dev) (MV3, Vite, HMR) |
| UI | React 19, [HeroUI v3](https://www.heroui.com), Tailwind CSS v4 |
| Language | TypeScript |

## Project layout

```
entrypoints/
  background.ts          Service worker — polls the calendar, decides what to prompt
  overlay.content.tsx    Content script — mounts the React overlay in a shadow root
  popup/                 Toolbar popup (Connect + status)
  options/               Settings + setup guide
components/
  MeetingPromptCard.tsx  The Join/Decline card (shared)
  OverlayApp.tsx         Watches `activePrompt`, renders the card
  useActivePrompt.ts     Live subscription to the prompt state
lib/
  providers/             CalendarProvider interface + Google implementation
  storage.ts             Typed chrome.storage wrappers
  meeting.ts             Event normalization + meeting-link extraction
  config.ts / types.ts   Constants and shared types
assets/tailwind.css      Tailwind + HeroUI import + green-accent theme override
preview/                 Dev-only: render the UI in a normal browser tab
```

### How the overlay works

The background worker writes the meeting to prompt for into `chrome.storage.local`
(`activePrompt`). Every page's content script renders a React app inside a **shadow
root** (so the host page's CSS can't touch it; WXT injects the Tailwind + HeroUI
styles into that shadow root) and subscribes to that key — so the overlay appears
and disappears on every open tab at once, with no per-tab messaging.

## Develop

```bash
npm install
npm run dev          # launches a dev browser with the extension + HMR
npm run build        # production build → .output/chrome-mv3/
npm run preview      # render the popup/options/overlay in a normal browser tab
```

`npm run preview` is handy for iterating on the design without loading the extension —
it stubs the `chrome.*` APIs with mock calendar data (see `preview/`).

## Install & connect

Because the extension talks to Google directly from your browser, you supply your own
(free) OAuth client ID. One-time, ~5 minutes.

### 1. Build & load

```bash
npm install && npm run build
```

Then go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**,
and select **`.output/chrome-mv3`**. Copy the extension's **ID** from its card.

### 2. Create a Google OAuth client

1. Open the [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → **External** → add your Google address under **Test users**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   application type **Chrome Extension** → paste the extension **ID** from step 1 → **Create**.
5. Copy the generated **Client ID**.

### 3. Wire it up

In [`wxt.config.ts`](wxt.config.ts), set `manifest.oauth2.client_id` to your Client ID:

```ts
oauth2: {
  client_id: '1234567890-abc123.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
},
```

Then `npm run build`, **Reload** the extension on `chrome://extensions`, click the
toolbar icon → **Connect Google Calendar**.

The options page shows your live extension ID and these same steps.

> **Note:** the unpacked extension ID is tied to the `.output/chrome-mv3` path. If you
> move the project, the ID changes and you'll need to update the OAuth client.

## Settings

Open the extension's **Settings** page (link in the popup):

- **Show prompt this many minutes before start** — default `1`.
- **Keep showing it until this many minutes after start** — default `10`.
- **Show join prompts** — master on/off.

## Permissions

- `identity` — OAuth sign-in to Google.
- `storage` — settings + which meetings you've already handled.
- `alarms` — wake the worker each minute to check the clock.
- `host_permissions: https://www.googleapis.com/*` — read your calendar.
- The overlay content script runs on all pages (`*://*/*`) so the prompt can appear anywhere.
- Calendar scope is **read-only** — the extension never writes to your calendar.

## Customizing the icons

```bash
npm run icons   # regenerates public/icon/{16,48,128}.png
```

## Roadmap

- Per-calendar selection (currently watches your primary calendar).
- Additional providers (Outlook / Microsoft 365, iCloud) via `CalendarProvider`.
- Optional auto-join (open the link without asking) for chosen meetings.
- Optional "RSVP yes/no" on Join/Decline (needs a read-write calendar scope).
