import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Autojoin Meetings',
    description:
      'Pops a Join / Decline prompt across any web page when a calendar meeting is about to start.',
    permissions: ['identity', 'storage', 'alarms'],
    host_permissions: ['https://www.googleapis.com/*'],
    // Replace client_id with your own Google OAuth client (type "Chrome Extension").
    // See the options page or README for the one-time setup.
    oauth2: {
      client_id: 'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    },
    icons: {
      16: '/icon/16.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
  },
});
