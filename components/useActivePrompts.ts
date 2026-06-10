import { useEffect, useState } from 'react';
import { KEYS } from '@/lib/config';
import type { Meeting } from '@/lib/types';

// Subscribe to the `activePrompt` array the background worker writes — the
// meetings to prompt for right now. Updates live across every tab at once.
export function useActivePrompts(): Meeting[] {
  const [prompts, setPrompts] = useState<Meeting[]>([]);

  useEffect(() => {
    let alive = true;
    chrome.storage.local.get(KEYS.ACTIVE_PROMPT).then(({ [KEYS.ACTIVE_PROMPT]: p }) => {
      if (alive) setPrompts(Array.isArray(p) ? (p as Meeting[]) : []);
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[KEYS.ACTIVE_PROMPT]) {
        const v = changes[KEYS.ACTIVE_PROMPT].newValue;
        setPrompts(Array.isArray(v) ? (v as Meeting[]) : []);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  return prompts;
}
