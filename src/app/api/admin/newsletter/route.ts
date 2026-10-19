import { NextResponse } from 'next/server';
import { parseBody, unwrapMany, withRoute } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { isEmailConfigured, sendEmail } from '@/lib/email/client';
import { renderEmail } from '@/lib/email/template';
import { renderMarkdownEmail } from '@/lib/email/markdown';
import { sendNewsletterSchema } from '@/lib/schemas/newsletter.schema';
import { publicEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * The newsletter: who has opted in, and sending to them.
 *
 * ## Opt-in is the user's, always
 *
 * `user_preferences.newsletter_opt_in` is writable only by its owner (0029) —
 * an admin may *read* the list, which is what makes this endpoint possible, but
 * cannot add anyone to it. That asymmetry is the whole point: nobody should be
 * able to subscribe someone else to marketing email.
 *
 * Deactivated accounts are excluded. Someone who has been shut out of the
 * platform should not keep receiving its marketing.
 */
async function recipients() {
  const supabase = await createClient();

  // Admins can read every preference row (policy) and every profile, so the
  // caller's own client is enough — no service-role escalation needed.
  const rows = unwrapMany(
    await supabase
      .from('user_preferences')
      .select('user_id, profiles!inner(id, full_name, email, deactivated_at)')
      .eq('newsletter_opt_in', true),
  );

  return rows
    .map((row) => row.profiles)
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
    .filter((profile) => !profile.deactivated_at)
    .map((profile) => ({ id: profile.id, full_name: profile.full_name, email: profile.email }));
}

/**
 * GET /api/admin/newsletter — the opted-in list.
 *
 * Returned in full rather than paginated: the point of the screen is to copy or
 * export the whole set, and a page of 20 would make that harder rather than
 * cheaper. `meta.email_configured` rides along so the UI can say plainly
 * whether sending from the app will do anything.
 */
export const GET = withRoute(async () => {
  await requireAdmin();
  const data = await recipients();

  return NextResponse.json({
    data,
    meta: { total: data.length, email_configured: isEmailConfigured },
  });
});

/**
 * POST /api/admin/newsletter — send to everyone opted in.
 *
 * ## Sent one message per recipient, not one with everyone in `to`
 *
 * A single message addressed to the whole list would expose every subscriber's
 * address to every other subscriber. Separate sends also mean one bad address
 * cannot fail the batch.
 *
 * ## Not `after()`, unlike notifications
 *
 * A notification is a side effect of an action that already succeeded, so it
 * must never fail the request. This *is* the action — the admin pressed "send"
 * and is owed the outcome, so it runs inline and reports how many went out.
 * That makes the request as slow as the list is long, which is the right trade
 * at this scale; a list in the thousands would want a queue instead.
 */
export const POST = withRoute(async (req) => {
  await requireAdmin();
  const body = await parseBody(req, sendNewsletterSchema);

  const list = await recipients();

  /*
   * Rendered once, outside the loop. The message is identical for every
   * recipient, and parsing the Markdown per address would do the same work N
   * times for nothing.
   */
  const rendered = renderMarkdownEmail(body.body);

  const { html, text } = renderEmail({
    heading: body.heading,
    body: rendered,
    preheader: body.preheader,
    ...(body.action_label && body.action_href
      ? { action: { label: body.action_label, href: body.action_href } }
      : {}),
    // Marketing mail, so the footer says so and points at the opt-out rather
    // than at the notification settings.
    footer: {
      lines: ['Ovaj email ste dobili jer ste se prijavili na newsletter.'],
      link: {
        label: 'Odjavite se u postavkama',
        href: `${publicEnv.siteUrl.replace(/\/$/, '')}/settings/newsletter`,
      },
    },
  });

  const results = await Promise.all(
    list.map(async (person) => {
      const result = await sendEmail({ to: person.email, subject: body.subject, html, text });
      return result.status;
    }),
  );

  const sent = results.filter((status) => status === 'sent').length;
  const skipped = results.filter((status) => status === 'skipped').length;
  const failed = results.length - sent - skipped;

  return NextResponse.json({
    data: { recipients: list.length, sent, skipped, failed },
    meta: { email_configured: isEmailConfigured },
  });
});
