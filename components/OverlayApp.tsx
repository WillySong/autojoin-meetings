import { useState } from 'react';
import { OverlayStack } from './OverlayStack';
import { useActivePrompts } from './useActivePrompts';
import { useColorScheme } from './useColorScheme';
import { useNow } from './useNow';
import type { Meeting } from '@/lib/types';

// Rendered inside the content script's shadow root on every page. Shows the
// stack of meeting prompts the background worker has queued (or nothing). The
// `dark`/`light` wrapper makes HeroUI's theme variables resolve in the shadow tree.
export function OverlayApp() {
  const prompts = useActivePrompts();
  const now = useNow(30000);
  const scheme = useColorScheme();
  const [joiningId, setJoiningId] = useState<string | null>(null);

  if (prompts.length === 0) return null;

  const join = (m: Meeting) => {
    setJoiningId(m.id);
    void chrome.runtime.sendMessage({ type: 'ACCEPT', id: m.id, meetingUrl: m.meetingUrl });
  };
  const decline = (m: Meeting) => {
    void chrome.runtime.sendMessage({ type: 'DECLINE', id: m.id });
  };

  return (
    <div
      className={`${scheme} fixed right-5 top-5 z-[2147483647] text-foreground`}
      data-theme={scheme}
      style={{ colorScheme: scheme }}
    >
      <OverlayStack
        meetings={prompts}
        now={now}
        joiningId={joiningId}
        onJoin={join}
        onDecline={decline}
        onClose={decline}
      />
    </div>
  );
}
