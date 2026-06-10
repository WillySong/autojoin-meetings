import { useLayoutEffect, useRef, useState } from 'react';
import { ScrollShadow } from '@heroui/react';
import { MeetingPromptCard } from './MeetingPromptCard';
import type { Meeting } from '@/lib/types';

const GAP_PX = 10; // matches gap-2.5 between cards
const VISIBLE_CARDS = 2.5; // show 2.5 cards, then scroll with a fade

export interface OverlayStackProps {
  meetings: Meeting[];
  now: number;
  joiningId?: string | null;
  onJoin: (m: Meeting) => void;
  onDecline: (m: Meeting) => void;
  onClose: (m: Meeting) => void;
}

// A vertical stack of meeting cards. Past ~2.5 cards it scrolls, with HeroUI's
// fade ScrollShadow indicating there's more above/below.
export function OverlayStack({ meetings, now, joiningId, onJoin, onDecline, onClose }: OverlayStackProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>();

  // Cap the viewport at 2.5 card-heights (+ the 2 gaps that are fully visible).
  useLayoutEffect(() => {
    const first = listRef.current?.firstElementChild as HTMLElement | null;
    if (first) setMaxHeight(Math.round(VISIBLE_CARDS * first.offsetHeight + 2 * GAP_PX));
  }, [meetings.length]);

  return (
    <ScrollShadow
      hideScrollBar
      size={36}
      className="w-[376px] max-w-[calc(100vw-40px)] px-2 py-1"
      style={{ maxHeight }}
    >
      <div ref={listRef} className="flex flex-col gap-2.5">
        {meetings.map((m) => (
          <MeetingPromptCard
            key={m.id}
            meeting={m}
            now={now}
            onJoin={() => onJoin(m)}
            onDecline={() => onDecline(m)}
            onClose={() => onClose(m)}
            joining={joiningId === m.id}
          />
        ))}
      </div>
    </ScrollShadow>
  );
}
