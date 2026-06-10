import { defineContentScript, createShadowRootUi } from '#imports';
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayApp } from '@/components/OverlayApp';
import '@/assets/tailwind.css';

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
