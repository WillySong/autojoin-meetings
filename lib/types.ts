// Shared, provider-agnostic types.

// A normalized, joinable meeting. Times are epoch milliseconds.
export interface Meeting {
  id: string;
  title: string;
  startTime: number;
  endTime: number | null;
  meetingUrl: string;
  calendarName: string;
}

export interface Account {
  email: string;
  name: string;
}

export interface Settings {
  enabled: boolean;
  leadTimeMin: number; // show the prompt this many minutes before start
  graceMin: number; // keep showing it until this many minutes after start
  googleClientId?: string; // OAuth client id, pasted into the options page
}

// Every calendar backend implements this. The background worker and UI only ever
// talk to a CalendarProvider, never to Google (or Outlook, etc.) directly.
export interface CalendarProvider {
  id: string;
  name: string;
  /** True once the user has supplied the credentials this provider needs. */
  isConfigured(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  /** Interactive sign-in. Must run from a user gesture on an extension page. */
  connect(): Promise<Account>;
  disconnect(): Promise<void>;
  getAccount(): Promise<Account>;
  listUpcomingEvents(opts?: { withinMs?: number }): Promise<Meeting[]>;

  // Optional runtime configuration for OAuth providers — e.g. a client id pasted
  // into the options page. Providers needing no user config can omit these.
  getClientId?(): Promise<string>;
  setClientId?(id: string): Promise<void>;
  getRedirectUri?(): string;
}
