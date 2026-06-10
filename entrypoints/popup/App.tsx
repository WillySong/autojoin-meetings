import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Chip, Label, Spinner, Switch } from '@heroui/react';
import { getActiveProvider } from '@/lib/providers';
import { getAccount, getSettings, setAccount, setSettings } from '@/lib/storage';
import { formatRelative } from '@/lib/meeting';
import type { Account } from '@/lib/types';
import { DebugPanel } from './DebugPanel';

const DEBUG_CLICKS = 5;

const provider = getActiveProvider();
type Status = 'loading' | 'setup' | 'connect' | 'connected';

export default function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [account, setAccountState] = useState<Account | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [next, setNext] = useState('—');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [debug, setDebug] = useState(false);

  const handleLogoClick = () => {
    setLogoClicks((c) => {
      if (c + 1 >= DEBUG_CLICKS) {
        setDebug(true);
        return 0;
      }
      return c + 1;
    });
  };
  const hint = !debug && logoClicks >= 2 ? `${DEBUG_CLICKS - logoClicks} more…` : '';

  const refresh = useCallback(async () => {
    if (!(await provider.isConfigured())) return setStatus('setup');

    let connected = false;
    try {
      connected = await provider.isConnected();
    } catch {
      connected = false;
    }
    if (!connected) return setStatus('connect');

    let acct = await getAccount();
    if (!acct) {
      try {
        acct = await provider.getAccount();
        await setAccount(acct);
      } catch {
        acct = null;
      }
    }
    setAccountState(acct);

    const s = await getSettings();
    setEnabled(s.enabled);

    try {
      const events = await provider.listUpcomingEvents();
      setNext(
        events[0]
          ? `${events[0].title} · ${formatRelative(events[0].startTime)}`
          : 'No upcoming meetings with a join link',
      );
    } catch {
      setNext('—');
    }

    setStatus('connected');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const acct = await provider.connect();
      await setAccount(acct);
      void chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
      await refresh();
    } catch (e) {
      setError(`Could not connect: ${(e as Error)?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    await provider.disconnect();
    await setAccount(null);
    setAccountState(null);
    await refresh();
  };

  const checkNow = async () => {
    setBusy(true);
    await chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
    setTimeout(() => {
      setBusy(false);
      void refresh();
    }, 700);
  };

  const toggleEnabled = async (val: boolean) => {
    setEnabled(val);
    await setSettings({ enabled: val });
    void chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
  };

  return (
    <div className="w-[340px] p-4">
      <Header onLogoClick={handleLogoClick} hint={hint} />
      {status === 'loading' && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {status === 'setup' && <SetupNeeded />}
      {status === 'connect' && <Connect onConnect={connect} busy={busy} error={error} />}
      {status === 'connected' && account && (
        <Connected
          account={account}
          enabled={enabled}
          next={next}
          busy={busy}
          onToggle={toggleEnabled}
          onCheck={checkNow}
          onDisconnect={disconnect}
        />
      )}
      {debug && <DebugPanel />}
    </div>
  );
}

function Header({ onLogoClick, hint }: { onLogoClick: () => void; hint?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onLogoClick}
        aria-label="Autojoin Meetings"
        className="flex size-5 items-center justify-center rounded-md bg-accent"
      >
        <svg viewBox="0 0 24 24" className="size-3 fill-accent-foreground" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
      <h1 className="text-sm font-semibold">Autojoin Meetings</h1>
      {hint && <span className="ml-auto text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

function SetupNeeded() {
  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm">Setup needed</Card.Title>
        <Card.Description className="text-xs">
          Add your own Google OAuth client ID so the extension can read your calendar.
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button
          variant="secondary"
          className="w-full"
          onPress={() => chrome.runtime.openOptionsPage()}
        >
          Open setup guide
        </Button>
      </Card.Footer>
    </Card>
  );
}

function Connect({
  onConnect,
  busy,
  error,
}: {
  onConnect: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <Card.Header>
        <Card.Description className="text-xs">
          Connect your Google Calendar to start getting join prompts.
        </Card.Description>
      </Card.Header>
      <Card.Footer className="flex-col items-stretch gap-2">
        <Button className="w-full" onPress={onConnect} isPending={busy}>
          {({ isPending }: { isPending: boolean }) =>
            isPending ? 'Connecting…' : 'Connect Google Calendar'
          }
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </Card.Footer>
    </Card>
  );
}

function Connected({
  account,
  enabled,
  next,
  busy,
  onToggle,
  onCheck,
  onDisconnect,
}: {
  account: Account;
  enabled: boolean;
  next: string;
  busy: boolean;
  onToggle: (val: boolean) => void;
  onCheck: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Chip color="success">Connected</Chip>
        <span className="max-w-[200px] truncate text-xs text-muted">{account.email}</span>
      </div>

      <Card>
        <Card.Content className="py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted">Next meeting</div>
          <div className="mt-0.5 text-sm">{next}</div>
        </Card.Content>
      </Card>

      <Switch isSelected={enabled} onChange={onToggle}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Content>
          <Label className="text-sm">Show join prompts</Label>
        </Switch.Content>
      </Switch>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onPress={onCheck} isPending={busy}>
          {({ isPending }: { isPending: boolean }) => (isPending ? 'Checking…' : 'Check now')}
        </Button>
        <Button variant="ghost" className="flex-1" onPress={onDisconnect}>
          Disconnect
        </Button>
      </div>

      <button
        type="button"
        className="text-xs text-link hover:underline"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        Settings
      </button>
    </div>
  );
}
