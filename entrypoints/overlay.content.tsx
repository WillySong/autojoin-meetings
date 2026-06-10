import { defineContentScript, createShadowRootUi } from '#imports';
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { enableShadowDOM } from 'react-stately/private/flags/flags';
import { OverlayApp } from '@/components/OverlayApp';
import '@/assets/tailwind.css';

// HeroUI is built on React Aria, whose press/focus handling reads `event.target`
// — which, for an event inside a shadow root, is the shadow *host*, not the inner
// button. So without this, clicks on the overlay's Join/Decline/Close buttons are
// silently ignored. This opt-in flag makes React Aria use composedPath() instead,
// so events inside the shadow root resolve correctly. Must run before render.
// See HeroUI #5295 / react-spectrum #2040.
enableShadowDOM();

// Injected on every http(s) page. The UI lives in a shadow root so the host
// page's CSS can never touch it; WXT injects our Tailwind + HeroUI styles into
// that shadow root (cssInjectionMode: 'ui').
export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi<Root>(ctx, {
      name: 'autojoin-overlay',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount(container) {
        const root = createRoot(container);
        root.render(
          <StrictMode>
            <OverlayApp />
          </StrictMode>,
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
