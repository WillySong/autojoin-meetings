import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Chip, Label, NumberField, Switch } from '@heroui/react';
import { getActiveProvider } from '@/lib/providers';
import { getAccount, getSettings, setAccount, setSettings } from '@/lib/storage';
import { CONFIG } from '@/lib/config';
import type { Account } from '@/lib/types';

const provider = getActiveProvider();
const FIELD =
  'w-full rounded-field border border-field-border bg-field px-3 py-2 text-sm text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus';

export default function App() {
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [account, setAccountState] = useState<Account | null>(null);

  const [clientId, setClientId] = useState('');
  const [clientSaved, setClientSaved] = useState(false);
  const redirectUri = provider.getRedirectUri?.() ?? '';

  const [enabled, setEnabled] = useState<boolean>(CONFIG.DEFAULTS.enabled);
  const [lead, setLead] = useState<number>(CONFIG.DEFAULTS.leadTimeMin);
  const [grace, setGrace] = useState<number>(CONFIG.DEFAULTS.graceMin);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setClientId((await provider.getClientId?.()) ?? '');
    setConfigured(await provider.isConfigured());

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

  const saveClientId = async () => {
    await provider.setClientId?.(clientId);
    void chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
    setClientSaved(true);
    setTimeout(() => setClientSaved(false), 1500);
    await load();
  };

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

  const saveSettings = async () => {
    await setSettings({ enabled, leadTimeMin: lead, graceMin: grace });
    void chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="mb-5 text-xl font-semibold">Autojoin Meetings</h1>

      {/* Connection */}
      <Card className="mb-4">
        <Card.Header>
          <Card.Title className="text-base">Calendar connection</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Chip color={connected ? 'success' : 'default'}>
              {connected ? 'Connected' : 'Not connected'}
            </Chip>
            {account && <span className="text-sm text-muted">{account.email}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Google OAuth client ID</Label>
            <div className="flex gap-2">
              <input
                className={FIELD}
                placeholder="1234567890-abc123.apps.googleusercontent.com"
                value={clientId}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setClientId(e.target.value)}
              />
              <Button variant="secondary" onPress={saveClientId}>
                {clientSaved ? 'Saved ✓' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted">
              Don&rsquo;t have one yet? Follow the steps below — it takes a couple of minutes.
            </p>
          </div>

          <div className="flex gap-2">
            {connected ? (
              <Button variant="ghost" onPress={disconnect}>
                Disconnect
              </Button>
            ) : (
              <Button onPress={connect} isDisabled={!configured}>
                Connect Google Calendar
              </Button>
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
            <Button onPress={saveSettings}>Save settings</Button>
            {saved && <span className="text-sm text-success">Saved ✓</span>}
          </div>
        </Card.Content>
      </Card>

      {/* Setup guide */}
      <Card>
        <Card.Header>
          <Card.Title className="text-base">How to get an OAuth client ID</Card.Title>
          <Card.Description className="text-sm">
            The extension talks to your calendar directly from your browser, so you supply your own
            free OAuth client ID. No billing, no server.
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Authorized redirect URI (add this in step 5)</Label>
            <CopyField value={redirectUri} />
          </div>

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
              In <strong>Credentials → Create credentials → OAuth client ID</strong>, choose
              application type <strong>Web application</strong>.
            </li>
            <li>
              Under <strong>Authorized redirect URIs</strong>, add the URI shown above, then{' '}
              <strong>Create</strong>.
            </li>
            <li>
              Copy the generated <strong>Client ID</strong>, paste it into the field above, and
              click <strong>Save</strong>.
            </li>
            <li>
              Click <strong>Connect Google Calendar</strong> and approve the read-only access.
            </li>
          </ol>
        </Card.Content>
      </Card>
    </main>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <code className="flex-1 truncate rounded-field border border-field-border bg-field px-3 py-2 font-mono text-xs text-field-foreground">
        {value || '—'}
      </code>
      <Button
        variant="secondary"
        isDisabled={!value}
        onPress={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
          } catch {
            /* clipboard blocked */
          }
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </Button>
    </div>
  );
}
