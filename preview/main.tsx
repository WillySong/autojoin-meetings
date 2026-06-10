import './chromeStub'; // MUST be first — installs the chrome.* + fetch stubs
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { enableShadowDOM } from 'react-stately/private/flags/flags';
import appCss from '@/assets/tailwind.css?inline';
import '@/assets/tailwind.css';
import { MeetingPromptCard } from '@/components/MeetingPromptCard';
import { applyScheme, getPreferredScheme, watchScheme } from '@/lib/theme';
import PopupApp from '@/entrypoints/popup/App';
import OptionsApp from '@/entrypoints/options/App';

// Same fix the content script applies — makes React Aria (HeroUI) press events
// work inside the shadow-root demo below.
enableShadowDOM();

const now = Date.now();
type Mode = 'system' | 'light' | 'dark';

function Section({ title, width, children }: { title: string; width?: number; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h2>
      <div
        style={width ? { width } : undefined}
        className="overflow-hidden rounded-2xl border border-border"
      >
        {children}
      </div>
    </div>
  );
}

const DEMO_URL = 'https://meet.google.com/abc-defg-hij';

// Mounts the real card inside an actual shadow root — the exact condition the
// content script runs in — to verify Join / Decline / Close fire there.
function ShadowCardTest() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState('No clicks yet — try the buttons.');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let shadow = host.shadowRoot;
    if (!shadow) {
      shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = appCss;
      shadow.appendChild(style);
      const wrapper = document.createElement('div');
      wrapper.className = 'dark';
      wrapper.setAttribute('data-theme', 'dark');
      shadow.appendChild(wrapper);
    }
    const wrapper = shadow.querySelector('div') as HTMLDivElement;
    const root = createRoot(wrapper);
    root.render(
      <MeetingPromptCard
        meeting={{ id: 'shadow', title: 'Inside a shadow root', startTime: now + 60_000, meetingUrl: DEMO_URL }}
        now={now}
        onJoin={() => setResult('✓ Join fired — onPress works in shadow DOM')}
        onDecline={() => setResult('✓ Decline fired')}
        onClose={() => setResult('✓ Close fired')}
      />,
    );
    return () => {
      setTimeout(() => root.unmount(), 0);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 p-4">
      <div ref={hostRef} />
      <p id="shadow-result" className="text-xs text-muted">
        {result}
      </p>
    </div>
  );
}

function Preview() {
  const [mode, setMode] = useState<Mode>('system');
  const [overlay, setOverlay] = useState<'show' | 'joined' | 'declined'>('show');

  // Mirror real behavior: apply the scheme to <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') {
      applyScheme(root, getPreferredScheme());
      return watchScheme((s) => applyScheme(root, s));
    }
    applyScheme(root, mode);
  }, [mode]);

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-semibold">Autojoin Meetings — UI preview</h1>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(['system', 'light', 'dark'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-sm capitalize transition-colors ${
                mode === m ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-10">
        <Section title="Overlay (in-page prompt)">
          <div className="p-4">
            {overlay === 'show' ? (
              <MeetingPromptCard
                meeting={{ id: 'e1', title: 'Design Sync', startTime: now + 60_000, meetingUrl: DEMO_URL }}
                now={now}
                onJoin={() => {
                  window.open(DEMO_URL, '_blank', 'noopener');
                  setOverlay('joined');
                }}
                onDecline={() => setOverlay('declined')}
                onClose={() => setOverlay('declined')}
              />
            ) : (
              <div className="flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-sm">
                <span>
                  {overlay === 'joined'
                    ? '✓ Join → opened the meeting link in a new tab'
                    : '✕ Decline → prompt dismissed'}
                </span>
                <button
                  type="button"
                  className="text-link hover:underline"
                  onClick={() => setOverlay('show')}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section title="Popup" width={340}>
          <PopupApp />
        </Section>

        <Section title="Options" width={620}>
          <OptionsApp />
        </Section>

        <Section title="Overlay in a shadow root (interaction check)" width={400}>
          <ShadowCardTest />
        </Section>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
