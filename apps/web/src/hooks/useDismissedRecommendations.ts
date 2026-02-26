'use client';

import { useCallback, useSyncExternalStore } from 'react';

interface DismissedEntry {
  tipo: string;
  dismissedAt: number;
}

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function getKey(hijoId: string) {
  return `zetaread:dismissed-recs:${hijoId}`;
}

function readStore(hijoId: string): DismissedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getKey(hijoId));
    if (!raw) return [];
    const entries: DismissedEntry[] = JSON.parse(raw);
    const now = Date.now();
    return entries.filter(e => now - e.dismissedAt < TTL_MS);
  } catch {
    return [];
  }
}

function writeStore(hijoId: string, entries: DismissedEntry[]) {
  try {
    localStorage.setItem(getKey(hijoId), JSON.stringify(entries));
  } catch {
    // storage full or unavailable
  }
}

// Per-hijoId listeners for useSyncExternalStore
const listeners = new Map<string, Set<() => void>>();

function notify(hijoId: string) {
  const set = listeners.get(hijoId);
  if (set) set.forEach(fn => fn());
}

export function useDismissedRecommendations(hijoId: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let set = listeners.get(hijoId);
      if (!set) {
        set = new Set();
        listeners.set(hijoId, set);
      }
      set.add(onStoreChange);
      return () => {
        set!.delete(onStoreChange);
        if (set!.size === 0) listeners.delete(hijoId);
      };
    },
    [hijoId],
  );

  const getSnapshot = useCallback(() => {
    const entries = readStore(hijoId);
    // Return a stable reference via JSON string (entries are small, max ~6)
    return JSON.stringify(entries);
  }, [hijoId]);

  const getServerSnapshot = useCallback(() => '[]', []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dismissed: DismissedEntry[] = JSON.parse(raw);

  const dismiss = useCallback(
    (tipo: string) => {
      const current = readStore(hijoId);
      if (current.some(e => e.tipo === tipo)) return;
      const next = [...current, { tipo, dismissedAt: Date.now() }];
      writeStore(hijoId, next);
      notify(hijoId);
    },
    [hijoId],
  );

  const isDismissed = useCallback(
    (tipo: string) => dismissed.some(e => e.tipo === tipo),
    [dismissed],
  );

  return { dismissed, dismiss, isDismissed };
}
