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
    // The OAuth client id is supplied at runtime via the options page (no manifest
    // oauth2 block needed), so it can be changed without a rebuild.
    permissions: ['identity', 'storage', 'alarms'],
    host_permissions: ['https://www.googleapis.com/*', 'https://oauth2.googleapis.com/*'],
    icons: {
      16: '/icon/16.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
  },
});
