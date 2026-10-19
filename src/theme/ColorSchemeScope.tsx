'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useColorScheme } from '@mui/material/styles';
import { useAuthStore } from '@/store/useAuthStore';
import { DARK_CLASS, LIGHT_CLASS, followsUserScheme, hasSessionCookie } from './colorSchemeRules';

/**
 * Holds public and auth pages in the light scheme, whatever the viewer's OS or
 * stored preference. Only the platform itself — and, for a signed-in user, the
 * course catalogue and course pages — follows the user's scheme.
 *
 * The rule and the reasoning live in `colorSchemeRules.ts`; this is the half
 * that survives client-side navigation. The inline script in the root layout
 * covers the first paint of a hard load — a route change re-renders the tree
 * without re-running any script, so this takes over from there.
 *
 * ## Why a MutationObserver rather than just setting the class
 *
 * `<html>`'s class belongs to MUI: its provider re-asserts it whenever the
 * colour scheme changes, and it does so from an effect in an **ancestor** of
 * this component. React runs child effects before parent ones, so writing the
 * class from here would simply be overwritten a moment later — most visibly
 * when `<ThemeSync>` applies a signed-in user's stored `dark` after the
 * preferences query resolves, mid-visit, on a public page.
 *
 * Observing the attribute inverts that: whoever writes last, this has the final
 * word. The callback runs as a microtask, so the correction lands before the
 * browser gets a chance to paint the wrong scheme.
 *
 * ## Why not `setMode('light')`
 *
 * Because that is the *user's* setting, and it persists — to localStorage
 * immediately and, through `<ThemeToggle>`, to `user_preferences`. Visiting the
 * landing page must not rewrite someone's chosen theme. Nothing here touches
 * MUI's state at all; it only overrides how this one page is painted, which is
 * why leaving for a gated page can restore the scheme exactly.
 *
 * Renders nothing. Deliberately separate from `<ThemeSync>`: that one applies
 * the account's saved preference, this one decides whether the current page
 * listens to it.
 */
export default function ColorSchemeScope() {
  const pathname = usePathname();
  const { colorScheme } = useColorScheme();
  const profile = useAuthStore((s) => s.profile);
  const authLoading = useAuthStore((s) => s.loading);
  // Until `/api/me` answers, go by the session cookie — the same signal the
  // first-paint script used — so the page does not flip while auth resolves.
  const signedIn = authLoading ? hasSessionCookie() : profile !== null;
  const themed = followsUserScheme(pathname, signedIn);

  // Read at cleanup, not at setup, so leaving a public page restores whatever
  // MUI believes now — including a preference that arrived during the visit.
  // A ref rather than an effect dependency: re-running the whole subscription
  // on every scheme change would tear down and rebuild it for no reason. The
  // write is in its own effect because a ref may not be assigned during render.
  const colorSchemeRef = React.useRef(colorScheme);
  React.useEffect(() => {
    colorSchemeRef.current = colorScheme;
  }, [colorScheme]);

  React.useEffect(() => {
    if (themed) return;

    const html = document.documentElement;

    const forceLight = () => {
      // Guarded so the observer does not see its own write and recurse.
      if (html.classList.contains(DARK_CLASS) || !html.classList.contains(LIGHT_CLASS)) {
        html.classList.remove(DARK_CLASS);
        html.classList.add(LIGHT_CLASS);
      }
    };

    forceLight();

    const observer = new MutationObserver(forceLight);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      // Hand the document back in the state MUI's own store believes in. It
      // never stopped believing it — nothing here wrote to it — so this is a
      // restore, not a guess. `colorScheme` is only undefined before the
      // provider has read storage, which cannot be true by the time a mounted
      // effect is cleaned up.
      const restore = colorSchemeRef.current === DARK_CLASS ? DARK_CLASS : LIGHT_CLASS;
      html.classList.remove(LIGHT_CLASS, DARK_CLASS);
      html.classList.add(restore);
    };
  }, [themed]);

  return null;
}
