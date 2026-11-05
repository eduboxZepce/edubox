import Box from '@mui/material/Box';

/*
 * A trap field for form-filling bots: invisible to people, tempting to scripts.
 *
 * A bot that drives the page fills every input it finds, and a field called
 * "website" looks like one worth filling. A person never sees it, cannot tab
 * into it, and a screen reader skips it, so a value here means a machine
 * typed it. Check it on submit with `isHoneypotFilled()`.
 *
 * Why it is moved off-screen rather than `display: none`: smarter bots skip
 * inputs that are not rendered, and an off-screen one is still rendered.
 *
 * Why it is uncontrolled: there is nothing to keep in state. The submit
 * handler reads it straight off the form, which is also what a bot that sets
 * the DOM value directly (bypassing React) will have changed.
 *
 * What this does NOT stop: anything that skips the page. Sign-up talks to
 * Supabase straight from the browser with a public key, so a script can call
 * Supabase's sign-up endpoint directly and never meet this field. The answer
 * to that is a CAPTCHA enforced by Supabase itself (Auth → Bot and Abuse
 * Protection), not a cleverer honeypot.
 */

export const HONEYPOT_FIELD_NAME = 'website';

export default function HoneypotField() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      <label htmlFor={HONEYPOT_FIELD_NAME}>Ostavi ovo polje prazno</label>
      {/* autoComplete="off" so a browser's own autofill does not put a real
          person's homepage here and get them treated as a bot. */}
      <input
        id={HONEYPOT_FIELD_NAME}
        name={HONEYPOT_FIELD_NAME}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </Box>
  );
}

/** True when the trap field in `form` holds anything — i.e. a bot submitted it. */
export function isHoneypotFilled(form: HTMLFormElement): boolean {
  const value = new FormData(form).get(HONEYPOT_FIELD_NAME);
  return typeof value === 'string' && value.trim() !== '';
}
