// DEV-ONLY standalone Vite config for the UI preview (preview/). WXT uses
// wxt.config.ts and ignores this file. Run: vite --config vite.preview.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(root, 'preview'),
  resolve: { alias: { '@': root } },
  plugins: [react(), tailwindcss()],
});
