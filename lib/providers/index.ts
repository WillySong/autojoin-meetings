// Calendar provider registry.
//
// To add a new calendar (Outlook, iCloud, CalDAV, ...): implement CalendarProvider
// (see ../types.ts), register it below, and make getActiveProvider() honor a
// user-selected provider id from settings. Nothing else in the extension changes.

import { GoogleCalendarProvider } from './google';
import type { CalendarProvider } from '../types';

const PROVIDERS: Record<string, CalendarProvider> = {
  [GoogleCalendarProvider.id]: GoogleCalendarProvider,
};

export function getActiveProvider(): CalendarProvider {
  return GoogleCalendarProvider;
}

export function getProvider(id: string): CalendarProvider | null {
  return PROVIDERS[id] ?? null;
}

export function listProviders(): CalendarProvider[] {
  return Object.values(PROVIDERS);
}
