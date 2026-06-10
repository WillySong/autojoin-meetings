import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Chip, Label, NumberField, Switch } from '@heroui/react';
import { getActiveProvider } from '@/lib/providers';
import { getAccount, getSettings, setAccount, setSettings } from '@/lib/storage';
import { CONFIG } from '@/lib/config';
import type { Account } from '@/lib/types';

const provider = getActiveProvider();
const manifest = chrome.runtime.getManifest() as chrome.runtime.Manifest & {
  oauth2?: { client_id?: string };
};
const CLIENT_ID = manifest.oauth2?.client_id ?? '(not set)';

export default function App() {
  const [configured] = useState(provider.isConfigured());
  const [connected, setConnected] = useState(false);
  const [account, setAccountState] = useState<Account | null>(null);
  const [enabled, setEnabled] = useState<boolean>(CONFIG.DEFAULTS.enabled);
  const [lead, setLead] = useState<number>(CONFIG.DEFAULTS.leadTimeMin);
  const [grace, setGrace] = useState<number>(CONFIG.DEFAULTS.graceMin);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    let isConnected = false;
    try {
      isConnected = await provider.isConnected();
    } catch {
      isConnected = false;
    }
    setConnected(isConnected);

    if (isConnected) {
      let acct = await getAccount();
      if (!acct) {
        acct = await provider.getAccount().catch(() => null);
        if (acct) await setAccount(acct);
      }
      setAccountState(acct);
    } else {
      setAccountState(null);
    }

    const s = await getSettings();
    setEnabled(s.enabled);
    setLead(s.leadTimeMin);
    setGrace(s.graceMin);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    try {
      const acct = await provider.connect();
      await setAccount(acct);
      void chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
    } catch (e) {
      alert(`Connect failed: ${(e as Error)?.message ?? e}`);
    }
    await load();
  };

  const disconnect = async () => {
    await provider.disconnect();
    await setAccount(null);
    await load();
  };

  const save = async () => {
    await setSettings({ enabled, leadTimeMin: lead, graceMin: grace });
    void chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="mb-5 text-xl font-semibold">Autojoin Meetings</h1>

      {!configured && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          No OAuth client ID is set yet. Follow the setup steps below, then reload the extension.
        </div>
      )}

      {/* Connection */}
      <Card className="mb-4">
        <Card.Header>
          <Card.Title className="text-base">Calendar connection</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Chip color={connected ? 'success' : 'default'}>
                {connected ? 'Connected' : 'Not connected'}
              </Chip>
              {account && <span className="text-sm text-muted">{account.email}</span>}
            </div>
            {connected ? (
              <Button variant="ghost" onPress={disconnect}>
                Disconnect
              </Button>
            ) : (
              <Button onPress={connect}>Connect Google Calendar</Button>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Behavior */}
      <Card className="mb-4">
        <Card.Header>
          <Card.Title className="text-base">Prompt behavior</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-5">
          <Switch isSelected={enabled} onChange={setEnabled}>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Content>
              <Label className="text-sm">Show join prompts</Label>
            </Switch.Content>
          </Switch>

          <NumberField value={lead} onChange={setLead} minValue={0} maxValue={60}>
            <Label className="text-sm">Show prompt this many minutes before start</Label>
            <NumberField.Group className="mt-1.5 w-40">
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>

          <NumberField value={grace} onChange={setGrace} minValue={1} maxValue={120}>
            <Label className="text-sm">Keep showing it until this many minutes after start</Label>
            <NumberField.Group className="mt-1.5 w-40">
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>

          <div className="flex items-center gap-3">
            <Button onPress={save}>Save settings</Button>
            {saved && <span className="text-sm text-success">Saved ✓</span>}
          </div>
        </Card.Content>
      </Card>

      {/* Setup guide */}
      <Card>
        <Card.Header>
          <Card.Title className="text-base">One-time Google setup</Card.Title>
          <Card.Description className="text-sm">
            The extension talks to your calendar directly from your browser, so you supply your own
            free OAuth client ID.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
            <li>
              Open the{' '}
              <a
                className="text-link hover:underline"
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noreferrer"
              >
                Google Cloud Console
              </a>{' '}
              and create or pick a project.
            </li>
            <li>
              In <strong>APIs &amp; Services → Library</strong>, enable the{' '}
              <strong>Google Calendar API</strong>.
            </li>
            <li>
              In <strong>OAuth consent screen</strong>, choose <em>External</em> and add your Google
              address under <strong>Test users</strong>.
            </li>
            <li>
              In <strong>Credentials → Create credentials → OAuth client ID</strong>, choose type{' '}
              <strong>Chrome Extension</strong> and paste this extension&rsquo;s ID:
              <CopyId />
            </li>
            <li>
              Put the generated <strong>Client ID</strong> into <code className="rounded bg-surface px-1.5 py-0.5 text-xs">wxt.config.ts</code>{' '}
              under <code className="rounded bg-surface px-1.5 py-0.5 text-xs">manifest.oauth2.client_id</code>{' '}
              (currently <span className="text-muted">{CLIENT_ID}</span>), then rebuild and reload.
            </li>
            <li>Click <strong>Connect Google Calendar</strong> above.</li>
          </ol>
        </Card.Content>
      </Card>
    </main>
  );
}

function CopyId() {
  const id = chrome.runtime.id;
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="mt-1.5 block rounded bg-surface px-2 py-1 font-mono text-xs text-accent hover:brightness-110"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 1000);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {copied ? 'Copied ✓' : id}
    </button>
  );
}
