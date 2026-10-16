import 'server-only';

import { Resend } from 'resend';

/**
 * The one place that talks to Resend.
 *
 * ## Not being configured is a normal state, not a failure
 *
 * There is no Resend account yet, so `RESEND_API_KEY` is empty and every send
 * short-circuits into a log line. That is deliberate and it is the whole
 * arrangement: everything upstream — preferences, templates, recipients, the
 * call sites — is wired as though mail were already going out, and plugging in
 * a real key is the only remaining step.
 *
 * It also means the same code path runs in development without anyone
 * accidentally emailing real students while clicking around the seeded data.
 *
 * ## This never throws
 *
 * A send failure must not turn a successful purchase approval into a 500. The
 * caller gets an outcome to log, not an exception to handle — see
 * `src/lib/services/notifications.ts`, which is already running after the
 * response has gone out.
 */
export type EmailResult =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim();

/**
 * Built once, lazily. Constructing it at module scope would run in every
 * process that so much as imports this file, including ones that never send.
 */
let client: Resend | null = null;

function getClient(): Resend | null {
  if (!apiKey) return null;
  client ??= new Resend(apiKey);
  return client;
}

/** Whether mail can actually go out. Surfaced in the UI so nobody is misled. */
export const isEmailConfigured = Boolean(apiKey && from);

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Only for mail whose natural reply goes to someone else — the contact form,
   * where it is the visitor. Everything else goes out with no Reply-To on
   * purpose: the sender address is send-only and nobody reads it.
   */
  replyTo?: string;
}): Promise<EmailResult> {
  const resend = getClient();

  if (!resend || !from) {
    const missing = [!apiKey && 'RESEND_API_KEY', !from && 'EMAIL_FROM'].filter(Boolean).join(', ');

    // Logged rather than silent: without this line a developer wondering why no
    // mail arrived has nothing at all to go on.
    console.info(`[email] not sent to ${input.to} — ${missing} not set. Subject: ${input.subject}`);
    return { status: 'skipped', reason: `missing ${missing}` };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      // Sent alongside the HTML, not instead of it. Some clients prefer it, and
      // a plain-text part measurably helps deliverability.
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    if (error) {
      console.error(`[email] Resend rejected the send to ${input.to}: ${error.message}`);
      return { status: 'failed', reason: error.message };
    }

    return { status: 'sent', id: data?.id ?? null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[email] send to ${input.to} threw: ${reason}`);
    return { status: 'failed', reason };
  }
}
