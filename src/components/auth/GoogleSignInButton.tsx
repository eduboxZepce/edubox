'use client';

import * as React from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createClient } from '@/lib/supabase/client';
import { landingPathForRole, useAuthStore, type AuthProfile } from '@/store/useAuthStore';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/** Inlined at build time. Required: Google Identity Services cannot start without it. */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Google refuses to draw the button wider than this, and narrower looks broken. */
const MAX_BUTTON_WIDTH = 400;
const MIN_BUTTON_WIDTH = 200;

const ERROR_MESSAGE = 'Prijava putem Google naloga nije uspjela. Pokušaj ponovo.';
const UNAVAILABLE_MESSAGE = 'Prijava putem Google naloga trenutno nije dostupna.';

/**
 * "Sign in with Google", through Google Identity Services.
 *
 * ## Why not `signInWithOAuth`
 *
 * The redirect flow sends the browser to Google with Supabase as the OAuth
 * client, so Google's consent screen said "continue to
 * `<project>.supabase.co`" — a domain a visitor has never heard of, on the one
 * screen where trust is the whole question. Here Google's own script runs on
 * our page, the popup names our origin, and the result is an ID token that
 * `signInWithIdToken` trades for a Supabase session directly. No redirect, so
 * `/auth/callback` plays no part in Google sign-in any more.
 *
 * ## The nonce
 *
 * Google embeds whatever nonce it is given into the ID token; Supabase hashes
 * the nonce it is given and compares. So Google gets the **SHA-256 hex hash**
 * and Supabase gets the **raw** value — swap them and every sign-in fails with
 * a nonce mismatch. A fresh one is made for every `initialize`, so a captured
 * token cannot be replayed.
 *
 * ## Configuration
 *
 * Google sign-in is always on; there is no flag for it. The one input is
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — without it Google's script has nothing to
 * initialise, so this renders nothing rather than a dead button. It must be the one listed in Supabase → Authentication → Providers → Google, or
 * Supabase rejects the token's audience; the page's origin must be an
 * authorised JavaScript origin in Google Cloud, or the button never appears.
 */
export default function GoogleSignInButton({
  text = 'signin_with',
  redirectTo,
  disabled = false,
}: {
  /** Google's own wording; the button text is drawn by Google, not by us. */
  text?: google.accounts.id.GsiButtonConfiguration['text'];
  /**
   * Lets a form hold the button back, e.g. until its consent box is ticked.
   * Google's button has no disabled state, so this blocks clicks over it.
   */
  disabled?: boolean;
  /** Path to land on after sign-in; defaults to the role landing page. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const hostRef = React.useRef<HTMLDivElement>(null);

  // `onReady` covers a later mount (the script is already on the page and its
  // load event will not fire again); the initialiser covers a client-side
  // navigation back to this page, where the global already exists.
  const [scriptReady, setScriptReady] = React.useState(
    () => typeof window !== 'undefined' && !!window.google?.accounts?.id,
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const enabled = !!CLIENT_ID;

  // An effect event, so the effect below does not re-initialise Google every
  // time the parent re-renders with a new `redirectTo` or router instance, yet
  // Google's callback still sees the latest ones.
  const finishSignIn = React.useEffectEvent(async (credential: string, rawNonce: string) => {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
      nonce: rawNonce,
    });

    if (signInError) {
      // The usual causes are configuration (audience, nonce) rather than
      // anything the user did, so the detail goes to the console, not the screen.
      console.error('Google sign-in failed:', signInError);
      setError(ERROR_MESSAGE);
      setPending(false);
      return;
    }

    // Same landing as the password form: seed the store so the next page does
    // not flash signed-out, then honour `redirectTo` or land by role.
    const res = await fetch('/api/me', { cache: 'no-store' });
    const profile: AuthProfile | null = res.ok ? ((await res.json()).profile ?? null) : null;
    if (profile) setProfile(profile);

    router.replace(
      redirectTo && redirectTo.startsWith('/') ? redirectTo : landingPathForRole(profile?.role),
    );
    router.refresh();
  });

  React.useEffect(() => {
    const host = hostRef.current;
    if (!enabled || !scriptReady || !host || !CLIENT_ID) return;
    const clientId = CLIENT_ID;

    // `initialize` is global state inside Google's script. Strict Mode and
    // fast remounts run this effect twice; the flag makes the superseded run
    // stop before it initialises, so each mount initialises exactly once and
    // the callback always pairs with the nonce Google was actually given.
    let cancelled = false;

    void (async () => {
      const { raw, hashed } = await createNonce();
      if (cancelled) return;

      google.accounts.id.initialize({
        client_id: clientId,
        nonce: hashed,
        use_fedcm_for_prompt: true,
        context: text === 'signup_with' ? 'signup' : 'signin',
        callback: ({ credential }) => void finishSignIn(credential, raw),
      });

      host.replaceChildren();
      google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text,
        locale: 'bs',
        width: Math.max(MIN_BUTTON_WIDTH, Math.min(MAX_BUTTON_WIDTH, host.offsetWidth)),
      });
    })().catch((e: unknown) => {
      console.error('Google sign-in could not start:', e);
      if (!cancelled) setError(UNAVAILABLE_MESSAGE);
    });

    return () => {
      cancelled = true;
      google.accounts.id.cancel();
    };
  }, [enabled, scriptReady, text]);

  // Rendering a provider button that cannot work is worse than not offering it,
  // so the whole block is opt-in.
  if (!enabled) return null;

  return (
    <Stack spacing={2}>
      <Script
        src={GSI_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        // Blocked by an extension or a network filter, most often.
        onError={() => setError(UNAVAILABLE_MESSAGE)}
      />

      <Divider>
        <Typography variant="caption" color="text.secondary">
          ili
        </Typography>
      </Divider>

      <Box
        aria-disabled={disabled || pending || undefined}
        sx={{
          position: 'relative',
          // Holds the large button's height while the script loads, so the
          // card does not jump when it appears.
          minHeight: 44,
          display: 'flex',
          justifyContent: 'center',
          opacity: disabled || pending ? 0.5 : 1,
          transition: 'opacity 150ms',
          // Google's button is a cross-origin iframe with no disabled state;
          // switching off pointer events is the only way to hold it back.
          pointerEvents: disabled || pending ? 'none' : 'auto',
        }}
      >
        <Box ref={hostRef} sx={{ width: '100%', maxWidth: MAX_BUTTON_WIDTH }} />
      </Box>

      {pending ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Prijavljivanje…
        </Typography>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}

/** A random raw nonce and its SHA-256 hex digest — see "The nonce" above. */
async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return { raw, hashed };
}
