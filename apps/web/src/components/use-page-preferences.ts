"use client";

import { useEffect, useState } from "react";

const noCleanupKeys: readonly string[] = [];

type PagePreferencesOptions<T> = {
  page: string;
  defaults: T;
  normalize: (stored: unknown, defaults: T) => T;
  migrateFromKey?: string;
  cleanupKeys?: readonly string[];
};

/**
 * Keeps lightweight view, filter, and sorting preferences local to one page.
 * Callers own their schema through normalize so stale values never enter UI state.
 */
export function usePagePreferences<T>({
  page,
  defaults,
  normalize,
  migrateFromKey,
  cleanupKeys = noCleanupKeys,
}: PagePreferencesOptions<T>) {
  const [preferences, setPreferences] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const storageKey = `roleway:page-preferences:${page}:v1`;

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(storageKey) ??
        (migrateFromKey ? localStorage.getItem(migrateFromKey) : null);
      if (stored) setPreferences(normalize(JSON.parse(stored), defaults));
      if (migrateFromKey) localStorage.removeItem(migrateFromKey);
      for (const key of cleanupKeys) localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(storageKey);
    } finally {
      setLoaded(true);
    }
  }, [cleanupKeys, defaults, migrateFromKey, normalize, storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // Storage may be unavailable; current-session controls should remain usable.
    }
  }, [loaded, preferences, storageKey]);

  return { preferences, setPreferences, preferencesLoaded: loaded };
}
