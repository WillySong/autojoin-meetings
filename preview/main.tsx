import './chromeStub'; // MUST be first — installs the chrome.* + fetch stubs
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { enableShadowDOM } from 'react-stately/private/flags/flags';
import appCss from '@/assets/tailwind.css?inline';
import '@/assets/tailwind.css';
import { OverlayStack } from '@/components/OverlayStack';
import { applyScheme, getPreferredScheme, watchScheme } from '@/lib/theme';
import type { Meeting } from '@/lib/types';
import PopupApp from '@/entrypoints/popup/App';
import OptionsApp from '@/entrypoints/options/App';

// Same fix the content script applies — makes React Aria (HeroUI) press events
// work inside the shadow-root demo below.
enableShadowDOM();

const now = Date.now();
const DEMO_URL = 'https://meet.google.com/abc-defg-hij';
type Mode = 'system' | 'light' | 'dark';

const sampleMeetings = (): Meeting[] => [
  { id: 's1', title: 'Standup', startTime: now, endTime: now + 30 * 60_000, meetingUrl: DEMO_URL, calendarName: 'Work' },
  { id: 's2', title: 'Design review with the product team', startTime: now + 2 * 60_000, endTime: now + 32 * 60_000, meetingUrl: DEMO_URL, calendarName: 'Work' },
  { id: 's3', title: '1:1 with Alex', startTime: now + 5 * 60_000, endTime: now + 35 * 60_000, meetingUrl: DEMO_URL, calendarName: 'Work' },
  { id: 's4', title: 'Roadmap sync', startTime: now + 8 * 60_000, endTime: now + 38 * 60_000, meetingUrl: DEMO_URL, calendarName: 'Work' },
];

function Section({ title, width, children }: { title: string; width?: number; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h2>
      <div style={width ? { width } : undefined} className="overflow-hidden rounded-2xl border border-border">
        {children}
      </div>
    </div>
  );
}

// The stack as it renders in-page: scrolls past ~2.5 cards with a fade.
function StackDemo({ onAction }: { onAction?: (msg: string) => void }) {
  const [meetings, setMeetings] = useState(sampleMeetings);
  const remove = (m: Meeting, verb: string) => {
    onAction?.(`✓ ${verb} fired for “${m.title}”`);
    setMeetings((list) => list.filter((x) => x.id !== m.id));
  };
  if (!meetings.length) {
    return (
      <div className="flex flex-col items-start gap-2 p-4 text-sm">
        <span>All dismissed.</span>
        <button type="button" className="text-link hover:underline" onClick={() => setMeetings(sampleMeetings())}>
          Reset
        </button>
      </div>
    );
  }
  return (
    <div className="p-4">
      <OverlayStack
        meetings={meetings}
        now={now}
        onJoin={(m) => {
          window.open(m.meetingUrl, '_blank', 'noopener');
          remove(m, 'Join');
        }}
        onDecline={(m) => remove(m, 'Decline')}
        onClose={(m) => remove(m, 'Close')}
      />
    </div>
  );
}

// Mounts the stack inside a real shadow root — the exact condition the content
// script runs in — to verify scrolling and Join/Decline/Close fire there.
function ShadowStackTest() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState('No clicks yet — scroll the stack and try a card.');

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
    root.render(<StackDemo onAction={setResult} />);
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
        <Section title="Overlay — meeting stack (scrolls past 2.5)">
          <StackDemo />
        </Section>

        <Section title="Popup" width={340}>
          <PopupApp />
        </Section>

        <Section title="Options" width={620}>
          <OptionsApp />
        </Section>

        <Section title="Stack in a shadow root (interaction check)" width={400}>
          <ShadowStackTest />
        </Section>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
