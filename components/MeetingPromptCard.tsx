import { Button, Card } from '@heroui/react';
import { formatClock, formatRelative } from '@/lib/meeting';
import type { Meeting } from '@/lib/types';

export interface MeetingPromptCardProps {
  meeting: Pick<Meeting, 'id' | 'title' | 'startTime' | 'meetingUrl'>;
  now: number;
  onJoin: () => void;
  onDecline: () => void;
  joining?: boolean;
}

// The shared visual for "you have a meeting" — a HeroUI Card with a red Decline
// and a green Join (Join is the primary button; the accent is themed green).
export function MeetingPromptCard({
  meeting,
  now,
  onJoin,
  onDecline,
  joining,
}: MeetingPromptCardProps) {
  const rel = formatRelative(meeting.startTime, now);
  const inProgress = rel.startsWith('Started');

  return (
    <Card className="w-[360px] max-w-[calc(100vw-40px)] shadow-overlay">
      <Card.Header>
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
              {inProgress ? 'Meeting in progress' : 'Meeting starting'}
            </div>
            <Card.Title className="truncate text-sm leading-tight">{meeting.title}</Card.Title>
            <Card.Description className="text-xs">
              {rel} · {formatClock(meeting.startTime)}
            </Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Footer className="gap-2">
        <Button variant="danger" className="flex-1" onPress={onDecline}>
          Decline
        </Button>
        <Button className="flex-1" onPress={onJoin} isPending={joining}>
          {({ isPending }: { isPending: boolean }) => (isPending ? 'Joining…' : 'Join')}
        </Button>
      </Card.Footer>
    </Card>
  );
}
