// Light/dark theming driven by Chrome's color scheme (prefers-color-scheme).
// HeroUI reads its theme from a `.light` / `.dark` class + `data-theme` attribute,
// so we mirror the system preference onto the relevant element and keep it in sync.

export type ColorScheme = 'light' | 'dark';

const QUERY = '(prefers-color-scheme: dark)';

export function getPreferredScheme(): ColorScheme {
  return globalThis.matchMedia?.(QUERY).matches ? 'dark' : 'light';
}

export function applyScheme(el: HTMLElement, scheme: ColorScheme): void {
  el.classList.remove('light', 'dark');
  el.classList.add(scheme);
  el.setAttribute('data-theme', scheme);
  el.style.colorScheme = scheme; // native form controls, scrollbars, etc.
}

// Subscribe to system color-scheme changes. Returns an unsubscribe function.
export function watchScheme(cb: (scheme: ColorScheme) => void): () => void {
  const mq = globalThis.matchMedia(QUERY);
  const handler = () => cb(mq.matches ? 'dark' : 'light');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

// For full-page surfaces (popup/options): follow Chrome's scheme on <html>.
export function initSystemTheme(): void {
  const root = document.documentElement;
  applyScheme(root, getPreferredScheme());
  watchScheme((scheme) => applyScheme(root, scheme));
}
