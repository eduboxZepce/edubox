'use client';

import * as React from 'react';
import { useColorScheme } from '@mui/material/styles';
import { useMyPreferences } from '@/hooks/usePreferences';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Applies the signed-in user's saved colour scheme.
 *
 * ## Two layers, on purpose
 *
 * MUI already persists the mode to `localStorage`, which makes a toggle
 * instant and survives a reload. That is the *fast* layer and it is enough on
 * one device. This component is the *durable* layer: the preference is also a
 * row in `user_preferences`, so signing in on another machine brings the choice
 * along instead of reverting to the OS default.
 *
 * ## Why the database only ever wins once
 *
 * It applies the stored value when it arrives and then stays out of the way —
 * the effect depends on the fetched value, not on `mode`. If it re-asserted on
 * every render, toggling the switch would fight the last fetched value and snap
 * back. The toggle writes to both layers itself (see `<ThemeToggle>`), so after
 * the first application the two agree.
 *
 * Renders nothing. It sits inside the providers in the root layout because it
 * needs both `useColorScheme` and React Query.
 */
export default function ThemeSync() {
  const { setMode } = useColorScheme();
  const signedIn = useAuthStore((s) => s.profile !== null);

  // Signed-out visitors have no stored preference to fetch, and asking would
  // 401 on every public page load.
  const preferences = useMyPreferences({ enabled: signedIn });
  const stored = preferences.data?.theme;

  const applied = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!stored) return;
    // Apply a given stored value once. Without this guard the effect would
    // re-run after the user toggles (the query is still holding the old value
    // until the mutation resolves) and undo their click.
    if (applied.current === stored) return;
    applied.current = stored;
    setMode(stored);
  }, [stored, setMode]);

  // Signing out must not leave the next person on someone else's scheme.
  React.useEffect(() => {
    if (!signedIn) applied.current = null;
  }, [signedIn]);

  return null;
}
