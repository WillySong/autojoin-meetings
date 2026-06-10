import { useEffect, useState } from 'react';
import { Button, Card } from '@heroui/react';
import { getActiveProvider } from '@/lib/providers';
import { KEYS } from '@/lib/config';
import { setActivePrompts } from '@/lib/storage';

const provider = getActiveProvider();
const TOKEN_KEY = 'google.token'; // mirrors the provider's token cache key

// Hidden test tools — revealed by clicking the popup logo 5 times.
export function DebugPanel() {
  const [diag, setDiag] = useState('Loading…');
  const [note, setNote] = useState('');

  const refreshDiag = async () => {
    try {
      const local = await chrome.storage.local.get([
        KEYS.EVENT_CACHE,
        KEYS.HANDLED,
        KEYS.ACTIVE_PROMPT,
        TOKEN_KEY,
      ]);
      const cache = local[KEYS.EVENT_CACHE] as { fetchedAt?: number; events?: unknown[] } | undefined;
      const token = local[TOKEN_KEY] as { expiresAt?: number } | undefined;
      const active = local[KEYS.ACTIVE_PROMPT] as unknown[] | undefined;

      let connected = false;
      try {
        connected = await provider.isConnected();
      } catch {
        connected = false;
      }

      let alarmTime: number | undefined;
      try {
        alarmTime = (await chrome.alarms?.get?.('tick'))?.scheduledTime;
      } catch {
        alarmTime = undefined;
      }

      const t = (ms?: number) => (ms ? new Date(ms).toLocaleTimeString() : '—');
      setDiag(
        [
          `connected:     ${connected}`,
          `client id:     ${(await provider.getClientId?.()) ? 'set' : 'missing'}`,
          `cached events: ${cache?.events?.length ?? 0}`,
          `last fetch:    ${t(cache?.fetchedAt)}`,
          `token expires: ${t(token?.expiresAt)}`,
          `handled:       ${Object.keys((local[KEYS.HANDLED] as object) ?? {}).length}`,
          `active prompts: ${Array.isArray(active) ? active.length : 0}`,
          `next tick:     ${t(alarmTime)}`,
          `ext id:        ${chrome.runtime.id}`,
          `redirect uri:  ${provider.getRedirectUri?.() ?? '—'}`,
        ].join('\n'),
      );
    } catch (e) {
      setDiag(`diagnostics error: ${String((e as Error)?.message ?? e)}`);
    }
  };

  useEffect(() => {
    void refreshDiag();
  }, []);

  const fireTest = async () => {
    const base = Date.now();
    const mk = (n: number, title: string, offsetMin: number) => ({
      id: `debug-${base}-${n}`,
      title,
      startTime: base + offsetMin * 60_000,
      endTime: base + (offsetMin + 30) * 60_000,
      meetingUrl: 'https://example.com',
      calendarName: 'Debug',
    });
    await setActivePrompts([
      mk(1, 'Standup', 0),
      mk(2, 'Design review', 2),
      mk(3, '1:1 with Alex', 5),
      mk(4, 'Roadmap sync', 8),
    ]);
    setNote('4 test cards set — close the popup to see the scrollable stack. Clears on the next poll.');
  };

  const forceRefresh = async () => {
    await chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
    setNote('Forced a calendar refresh.');
    void refreshDiag();
  };

  const clearHandled = async () => {
    await chrome.storage.local.remove(KEYS.HANDLED);
    setNote('Cleared handled meetings — dismissed/joined ones can prompt again.');
    void refreshDiag();
  };

  const resetLocal = async () => {
    await chrome.storage.local.remove([KEYS.EVENT_CACHE, KEYS.HANDLED, KEYS.ACTIVE_PROMPT]);
    setNote('Cleared cache, handled, and any active prompt.');
    void refreshDiag();
  };

  return (
    <Card className="mt-3 border-warning/40">
      <Card.Header>
        <Card.Title className="text-sm">Debug</Card.Title>
        <Card.Description className="text-xs">Test tools — hidden from normal use.</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onPress={fireTest}>
            Fire test prompt
          </Button>
          <Button variant="secondary" onPress={forceRefresh}>
            Force refresh
          </Button>
          <Button variant="secondary" onPress={clearHandled}>
            Clear handled
          </Button>
          <Button variant="danger" onPress={resetLocal}>
            Reset local state
          </Button>
        </div>

        {note && <p className="text-xs text-success">{note}</p>}

        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-muted">Diagnostics</span>
          <button type="button" className="text-xs text-link hover:underline" onClick={() => void refreshDiag()}>
            Refresh
          </button>
        </div>
        <pre className="overflow-x-auto rounded-md bg-surface p-2 text-[11px] leading-relaxed text-muted">
          {diag}
        </pre>
      </Card.Content>
    </Card>
  );
}
