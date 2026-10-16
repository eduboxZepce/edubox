import 'server-only';
import { SITE } from '@/lib/siteConfig';

/**
 * The one email layout, rendered to HTML and plain text together.
 *
 * ## Why hand-written HTML with inline styles
 *
 * Email clients are not browsers. Outlook renders with Word, Gmail strips
 * `<style>` blocks in some contexts, and none of them run the CSS the app's
 * theme is built on. So this is deliberately plain: a table for the outer
 * layout, inline styles, web-safe fonts, no external assets. It is not meant to
 * match the app's design system, and trying to would break in half the clients
 * it is sent to.
 *
 * ## Both parts, always
 *
 * `text` is not a fallback nobody sees. Clients set to plain text render it,
 * and sending a multipart message measurably helps deliverability — a
 * HTML-only email looks like bulk mail to a spam filter.
 */
export type EmailContent = {
  /** The `<h1>`, and the first thing in the plain-text part. */
  heading: string;
  /**
   * One paragraph each. Plain text — anything HTML-ish is escaped.
   *
   * This is the shape every transactional message uses: a notification is one
   * or two sentences the app composed itself, and giving those a rich body
   * would be an invitation to put formatting where there is nothing to format.
   */
  lines?: string[];
  /**
   * A pre-rendered body, for the one case that needs real formatting: the
   * newsletter, written by a person in the Markdown editor.
   *
   * Supplied as `{ html, text }` rather than as Markdown, because the rendering
   * belongs to `renderMarkdownEmail` — this file owns the *frame* (the outer
   * table, the brand, the footer) and should not also learn to parse. Whatever
   * arrives here is trusted to be escaped already; nothing else in the app may
   * pass raw HTML through.
   */
  body?: { html: string; text: string };
  action?: { label: string; href: string };
  /**
   * Preview text: the grey line a client shows next to the subject. Without one
   * it grabs whatever the first words of the body happen to be.
   */
  preheader?: string;
  /**
   * Replaces the standard "you are getting this because of your settings"
   * footer. Marketing mail needs different wording — and an unsubscribe
   * pointer — from a transactional notification.
   */
  footer?: { lines: string[]; link?: { label: string; href: string } };
};

const BRAND = SITE.name;

/**
 * Escapes the four characters that can break out of HTML text or an attribute.
 *
 * Every interpolated value here is user-supplied somewhere upstream — a course
 * name, a student's name, the first line of a message — so none of it may be
 * trusted into markup. Two of these end up inside `href="…"`, which is why `"`
 * is on the list.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const { heading, lines = [], body, action, preheader, footer } = content;

  // `body` wins when both are given, but nothing passes both — the two are the
  // transactional and the authored case, and they are mutually exclusive.
  const paragraphs =
    body?.html ??
    lines
      .map(
        (line) =>
          `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(line)}</p>`,
      )
      .join('');

  const button = action
    ? `<p style="margin:24px 0 0;">
         <a href="${escapeHtml(action.href)}"
            style="display:inline-block;padding:11px 20px;border-radius:8px;background:#1f2937;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
           ${escapeHtml(action.label)}
         </a>
       </p>`
    : '';

  /*
   * The footer says why this message arrived, which differs by kind: a
   * notification points at the settings screen, a newsletter has to carry an
   * unsubscribe route. Getting that wrong on marketing mail is a compliance
   * problem, not a copy one.
   */
  const footerLines = [
    ...(footer?.lines ?? [
      'Ovo obavještenje ste dobili jer je uključeno u podešavanjima vašeg naloga.',
      'Možete ga isključiti na stranici „Obavještenja”.',
    ]),
    // The sender address is send-only, so a reply would go nowhere. Say so,
    // and say where a person actually reads mail.
    `Na ovu poruku nije moguće odgovoriti — pišite nam na ${SITE.contact.email}.`,
  ];
  const footerHtml = `<p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                  ${footerLines.map(escapeHtml).join('<br />')}
                  ${
                    footer?.link
                      ? `<br /><a href="${escapeHtml(footer.link.href)}" style="color:#6b7280;">${escapeHtml(footer.link.label)}</a>`
                      : ''
                  }
                </p>`;

  // Hidden from view but read by the inbox list. The zero-width joiners stop a
  // client from padding the preview with the beginning of the visible body.
  const preview = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}${'&#8204;'.repeat(60)}</div>`
    : '';

  const html = `<!doctype html>
<html lang="bs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    ${preview}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px 0;">
                <span style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.01em;">${BRAND}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#111827;">${escapeHtml(heading)}</h1>
                ${paragraphs}
                ${button}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    BRAND,
    '',
    heading,
    '',
    ...(body ? [body.text] : lines),
    ...(action ? ['', `${action.label}: ${action.href}`] : []),
    '',
    '—',
    ...footerLines,
    ...(footer?.link ? [`${footer.link.label}: ${footer.link.href}`] : []),
  ].join('\n');

  return { html, text };
}
