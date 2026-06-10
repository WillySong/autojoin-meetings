import './chromeStub'; // MUST be first — installs the chrome.* + fetch stubs
import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/assets/tailwind.css';
import { MeetingPromptCard } from '@/components/MeetingPromptCard';
import { applyScheme, getPreferredScheme, watchScheme } from '@/lib/theme';
import PopupApp from '@/entrypoints/popup/App';
import OptionsApp from '@/entrypoints/options/App';

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

function Preview() {
  const [mode, setMode] = useState<Mode>('system');

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
            <MeetingPromptCard
              meeting={{
                id: 'e1',
                title: 'Design Sync',
                startTime: now + 60_000,
                meetingUrl: 'https://meet.google.com/abc-defg-hij',
              }}
              now={now}
              onJoin={() => {}}
              onDecline={() => {}}
            />
          </div>
        </Section>

        <Section title="Popup" width={340}>
          <PopupApp />
        </Section>

        <Section title="Options" width={620}>
          <OptionsApp />
        </Section>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
