import 'server-only';
import { publicEnv } from '@/lib/env';
import { SITE } from '@/lib/siteConfig';

/**
 * The one email layout, rendered to HTML and plain text together.
 *
 * ## Why hand-written HTML with inline styles
 *
 * Email clients are not browsers. Outlook renders with Word, Gmail strips
 * `<style>` blocks in some contexts, and none of them run the CSS the app's
 * theme is built on. So this is deliberately plain: a table for the outer
 * layout, inline styles, web-safe fonts. It borrows the brand colour and the
 * logo and nothing else — matching the app's design system would break in
 * half the clients it is sent to.
 *
 * ## The one external asset is the logo, and it is allowed to fail
 *
 * `public/email-logo.png` — a PNG, because Gmail does not render SVG. Many
 * clients block remote images until the reader allows them, so the brand name
 * is set as text beside it rather than baked into the picture: with images off
 * the header still says who wrote. Its URL comes from `publicEnv.siteUrl`, so
 * mail sent from `next dev` points at localhost and shows a broken image —
 * expected, and harmless.
 *
 * ## Every message has the same frame
 *
 * Logo header → heading → greeting → body → button → sign-off → footer. The
 * greeting and the sign-off are what make a notification read as a letter from
 * someone rather than as a log line; call sites supply only the middle.
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
   * Who the message is addressed to, for the "Poštovani/a …," line. Omit it
   * for a message rendered once for many people (the newsletter), which then
   * goes out without a greeting rather than with a wrong one. An empty string
   * still greets, just without a name.
   */
  recipientName?: string;
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

/** `primary.main` from the light theme. Hex, because email has no variables. */
const BRAND_COLOR = '#2f5bea';
const HEADING_COLOR = '#111827';
const TEXT_COLOR = '#374151';
const MUTED_COLOR = '#6b7280';
const BORDER_COLOR = '#e5e7eb';

/** The sign-off under every message, worded once. */
const SIGNATURE = ['Srdačan pozdrav,', `Tim ${BRAND}`] as const;

/**
 * Escapes the four characters that can break out of HTML text or an attribute.
 *
 * Every interpolated value here is user-supplied somewhere upstream — a course
 * name, a student's name, the first line of a message — so none of it may be
 * trusted into markup. Several end up inside `href="…"`, which is why `"` is
 * on the list.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The last lines of every message: who sent it, and — once the client has
 * supplied them — the legal details. Empty company fields are skipped, the
 * same rule the site footer follows.
 */
function brandLines(siteUrl: string): string[] {
  const { legalName, address, idNumber } = SITE.company;
  const host = siteUrl.replace(/^https?:\/\//, '');
  return [
    `© ${new Date().getFullYear()} ${legalName || BRAND} · ${host}`,
    [address, idNumber && `ID broj: ${idNumber}`].filter(Boolean).join(' · '),
  ].filter(Boolean);
}

function paragraph(content: string, margin = '0 0 16px'): string {
  return `<p style="margin:${margin};font-size:15px;line-height:1.6;color:${TEXT_COLOR};">${content}</p>`;
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const { heading, recipientName, lines = [], body, action, preheader, footer } = content;
  const siteUrl = publicEnv.siteUrl;

  const greeting =
    recipientName === undefined
      ? null
      : recipientName.trim()
        ? `Poštovani/a ${recipientName.trim()},`
        : 'Poštovani/a,';

  // `body` wins when both are given, but nothing passes both — the two are the
  // transactional and the authored case, and they are mutually exclusive.
  const paragraphs = body?.html ?? lines.map((line) => paragraph(escapeHtml(line))).join('');

  const button = action
    ? `<p style="margin:24px 0 0;">
         <a href="${escapeHtml(action.href)}"
            style="display:inline-block;padding:12px 22px;border-radius:8px;background:${BRAND_COLOR};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
           ${escapeHtml(action.label)}
         </a>
       </p>`
    : '';

  const signature = paragraph(
    `${escapeHtml(SIGNATURE[0])}<br /><strong style="color:${HEADING_COLOR};">${escapeHtml(SIGNATURE[1])}</strong>`,
    '28px 0 0',
  );

  /*
   * The footer says why this message arrived, which differs by kind: a
   * notification points at the settings screen, a newsletter has to carry an
   * unsubscribe route. Getting that wrong on marketing mail is a compliance
   * problem, not a copy one.
   */
  const footerLines = [
    ...(footer?.lines ?? [
      'Ovo obavještenje ste dobili jer je uključeno u postavkama vašeg naloga.',
      'Možete ga isključiti na stranici „Obavještenja”.',
    ]),
    // The sender address is send-only, so a reply would go nowhere. Say so,
    // and say where a person actually reads mail.
    `Na ovu poruku nije moguće odgovoriti — pišite nam na ${SITE.contact.email}.`,
  ];
  const footerHtml = `<p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED_COLOR};">
                  ${footerLines.map(escapeHtml).join('<br />')}
                  ${
                    footer?.link
                      ? `<br /><a href="${escapeHtml(footer.link.href)}" style="color:${MUTED_COLOR};">${escapeHtml(footer.link.label)}</a>`
                      : ''
                  }
                </p>
                <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  ${brandLines(siteUrl).map(escapeHtml).join('<br />')}
                </p>`;

  // Hidden from view but read by the inbox list. The zero-width joiners stop a
  // client from padding the preview with the beginning of the visible body.
  const preview = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}${'&#8204;'.repeat(60)}</div>`
    : '';

  // The logo and the name are separate cells, not one image, so the header
  // still reads correctly in a client that blocks images.
  const header = `<a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;">
                        <img src="${escapeHtml(siteUrl)}/email-logo.png" width="32" height="29" alt="" style="display:block;border:0;" />
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:18px;font-weight:700;color:${BRAND_COLOR};letter-spacing:-0.01em;">${escapeHtml(BRAND)}</span>
                      </td>
                    </tr>
                  </table>
                </a>`;

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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid ${BORDER_COLOR};border-top:4px solid ${BRAND_COLOR};">
            <tr>
              <td style="padding:22px 28px 18px;border-bottom:1px solid ${BORDER_COLOR};">
                ${header}
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 32px;">
                <h1 style="margin:0 0 20px;font-size:21px;line-height:1.35;color:${HEADING_COLOR};">${escapeHtml(heading)}</h1>
                ${greeting ? paragraph(escapeHtml(greeting)) : ''}
                ${paragraphs}
                ${button}
                ${signature}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 24px;background:#f9fafb;border-top:1px solid ${BORDER_COLOR};border-radius:0 0 12px 12px;">
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
    ...(greeting ? [greeting, ''] : []),
    // A blank line between paragraphs, the way the HTML part spaces them.
    ...(body ? [body.text] : lines.flatMap((line, i) => (i === 0 ? [line] : ['', line]))),
    ...(action ? ['', `${action.label}: ${action.href}`] : []),
    '',
    ...SIGNATURE,
    '',
    '—',
    ...footerLines,
    ...(footer?.link ? [`${footer.link.label}: ${footer.link.href}`] : []),
    '',
    ...brandLines(siteUrl),
  ].join('\n');

  return { html, text };
}
