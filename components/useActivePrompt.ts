import { useEffect, useState } from 'react';
import { KEYS } from '@/lib/config';
import type { ActivePrompt } from '@/lib/storage';

// Subscribe to the `activePrompt` key the background worker writes. Returns the
// meeting to prompt for, or null. Updates live across every tab at once.
export function useActivePrompt(): ActivePrompt | null {
  const [prompt, setPrompt] = useState<ActivePrompt | null>(null);

  useEffect(() => {
    let alive = true;
    chrome.storage.local.get(KEYS.ACTIVE_PROMPT).then(({ [KEYS.ACTIVE_PROMPT]: p }) => {
      if (alive) setPrompt((p as ActivePrompt | undefined) ?? null);
    });

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && changes[KEYS.ACTIVE_PROMPT]) {
        setPrompt((changes[KEYS.ACTIVE_PROMPT].newValue as ActivePrompt | undefined) ?? null);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  return prompt;
}
