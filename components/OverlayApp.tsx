import { useState } from 'react';
import { MeetingPromptCard } from './MeetingPromptCard';
import { useActivePrompt } from './useActivePrompt';
import { useColorScheme } from './useColorScheme';
import { useNow } from './useNow';

// Rendered inside the content script's shadow root on every page. Shows the
// prompt card when the background worker sets `activePrompt`, nothing otherwise.
// The `dark` / data-theme wrapper makes HeroUI's theme variables resolve inside
// the shadow tree.
export function OverlayApp() {
  const prompt = useActivePrompt();
  const now = useNow(30000);
  const scheme = useColorScheme();
  const [joining, setJoining] = useState(false);

  if (!prompt) return null;

  const join = () => {
    setJoining(true);
    void chrome.runtime.sendMessage({
      type: 'ACCEPT',
      id: prompt.id,
      meetingUrl: prompt.meetingUrl,
    });
  };
  const decline = () => {
    void chrome.runtime.sendMessage({ type: 'DECLINE', id: prompt.id });
  };

  return (
    <div
      className={`${scheme} fixed right-5 top-5 z-[2147483647] text-foreground`}
      data-theme={scheme}
      style={{ colorScheme: scheme }}
    >
      <MeetingPromptCard
        meeting={prompt}
        now={now}
        onJoin={join}
        onDecline={decline}
        onClose={decline}
        joining={joining}
      />
    </div>
  );
}
