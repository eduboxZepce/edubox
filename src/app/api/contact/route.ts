import { NextResponse } from 'next/server';
import { badRequest, parseBody, withRoute } from '@/lib/api/errors';
import { sendEmail } from '@/lib/email/client';
import { contactRequestSchema } from '@/lib/schemas/contact.schema';
import { SITE } from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

/**
 * Post /api/contact - the public contact form.
 *
 * No auth guard: this is meant to be reachable by a signed-out visitor.
 * Not tied to any table - this only ever becomes one outbound email via
 * sendEmail(), sent to CONTACT_EMAIL_TO (falling back to the public
 * SITE.contact.email if that env var isn't set).
 *
 * sendEmail() never throws (see src/lib/email/client.ts) - it returns a
 * status instead. 'sent' is the only success case reported to the
 * visitor as 200; 'skipped' (no RESEND_API_KEY configured yet, the
 * expected state right now) and 'failed' both come back as a non-2xx
 * response on purpose, so <ContactForm> falls back to its "Posalji
 * email direktno" mailto link instead of claiming a message went out
 * that didn't.
 *
 * A basic HTML-escape is applied to the visitor's own text before it's
 * interpolated into the email's html body, since it's untrusted input
 * being placed into markup.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const POST = withRoute(async (req) => {
  const body = await parseBody(req, contactRequestSchema);

  const to = process.env.CONTACT_EMAIL_TO?.trim() || SITE.contact.email;

  const result = await sendEmail({
    to,
    subject: `Kontakt upit: ${body.subject}`,
    html: `
        <p><strong>Od:</strong> ${escapeHtml(body.name)} (${escapeHtml(body.email)})</p>
      <p><strong>Tema:</strong> ${escapeHtml(body.subject)}</p>
      <p><strong>Poruka:</strong></p>
      <p>${escapeHtml(body.message).replace(/\n/g, '<br>')}</p>
        `,
    text: `Od: ${body.name} (${body.email})\nTema: ${body.subject}\n\n${body.message}`,
    // The message arrives from the send-only address; this makes "Reply" in
    // the inbox answer the visitor instead of bouncing.
    replyTo: body.email,
  });

  if (result.status !== 'sent') {
    throw badRequest('Trenutno ne primamo poruke ovim putem.', { emailStatus: result.status });
  }

  return NextResponse.json({ data: { status: 'sent' } }, { status: 200 });
});
