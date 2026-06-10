// Helpers for turning raw calendar events into the normalized Meeting shape,
// plus small formatters shared by the background worker and the React UIs.

import type { Meeting } from './types';

const URL_PATTERNS: RegExp[] = [
  /https?:\/\/[a-z0-9-]+\.zoom\.us\/[^\s<>"')]+/i,
  /https?:\/\/(?:[a-z0-9-]+\.)?meet\.google\.com\/[^\s<>"')]+/i,
  /https?:\/\/teams\.microsoft\.com\/[^\s<>"')]+/i,
  /https?:\/\/teams\.live\.com\/[^\s<>"')]+/i,
  /https?:\/\/[a-z0-9-]+\.webex\.com\/[^\s<>"')]+/i,
  /https?:\/\/meet\.jit\.si\/[^\s<>"')]+/i,
  /https?:\/\/[a-z0-9-]+\.whereby\.com\/[^\s<>"')]+/i,
];

// A loose shape for the bits of a Google Calendar event we read.
interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  hangoutLink?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ self?: boolean; responseStatus?: string }>;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
}

export function extractMeetingUrl(event: GoogleEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;

  const entryPoints = event.conferenceData?.entryPoints;
  if (Array.isArray(entryPoints)) {
    const video = entryPoints.find((e) => e.entryPointType === 'video' && e.uri);
    if (video?.uri) return video.uri;
  }

  const haystack = `${event.location ?? ''}\n${event.description ?? ''}`;
  for (const re of URL_PATTERNS) {
    const m = haystack.match(re);
    if (m) return m[0];
  }
  return null;
}

// Returns a normalized Meeting, or null if the event isn't a joinable, timed,
// non-declined meeting.
export function normalizeGoogleEvent(
  event: GoogleEvent,
  calendarName = 'Google Calendar',
): Meeting | null {
  if (event.status === 'cancelled') return null;

  const startISO = event.start?.dateTime; // all-day events use `date`, which we skip
  if (!startISO) return null;

  const self = (event.attendees ?? []).find((a) => a.self);
  if (self && self.responseStatus === 'declined') return null;

  const meetingUrl = extractMeetingUrl(event);
  if (!meetingUrl) return null;

  return {
    id: event.id,
    title: event.summary || '(no title)',
    startTime: new Date(startISO).getTime(),
    endTime: event.end?.dateTime ? new Date(event.end.dateTime).getTime() : null,
    meetingUrl,
    calendarName,
  };
}

export function formatRelative(startTime: number, now = Date.now()): string {
  const mins = Math.round((startTime - now) / 60000);
  if (mins > 1) return `Starts in ${mins} min`;
  if (mins === 1) return 'Starts in 1 min';
  if (mins === 0) return 'Starting now';
  if (mins === -1) return 'Started 1 min ago';
  return `Started ${Math.abs(mins)} min ago`;
}

export function formatClock(startTime: number): string {
  try {
    return new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}
