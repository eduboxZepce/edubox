import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent, PhrasingContent } from 'mdast';
import { SITE } from '@/lib/siteConfig';
import { fillSiteTokens } from '@/lib/siteTokens';

/**
 * Markdown → email HTML.
 *
 * ## Why not reuse `<MarkdownContent>`
 *
 * That renders React with MUI components and a stylesheet. Email clients have
 * no stylesheet: Gmail strips `<style>` blocks in several contexts, and Outlook
 * renders with Word, which supports a fraction of CSS and no flexbox or grid at
 * all. **Every style has to be inline on the element it applies to**, which is
 * the opposite of how the app's components are built.
 *
 * So this walks the same mdast the preview parses — identical parser, identical
 * GFM extensions, so what an author sees is what gets sent — and emits its own
 * markup with the styles baked in.
 *
 * ## Everything is escaped
 *
 * Markdown allows raw HTML, and this deliberately does not honour it: an `html`
 * node is emitted as escaped text, matching `<MarkdownContent>`, which omits
 * `rehype-raw` for the same reason. An admin composing a newsletter cannot
 * paste markup that breaks the layout in Outlook or that a spam filter reads as
 * phishing.
 */

/** The four characters that can break out of HTML text or an attribute. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Only `http(s)` and `mailto`. A `javascript:` href is inert in every mail
 * client, but a link that survives into a web-based archive of the message is
 * not, and there is no reason a newsletter needs any other scheme.
 */
function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : null;
}

const STYLES = {
  p: 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;',
  h1: 'margin:24px 0 12px;font-size:20px;line-height:1.35;color:#111827;font-weight:700;',
  h2: 'margin:24px 0 12px;font-size:17px;line-height:1.4;color:#111827;font-weight:700;',
  h3: 'margin:20px 0 8px;font-size:15px;line-height:1.4;color:#111827;font-weight:700;',
  a: `color:${SITE.colors.primary.light};text-decoration:underline;`,
  li: 'margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;',
  list: 'margin:0 0 16px;padding-left:22px;',
  blockquote:
    'margin:0 0 16px;padding:8px 0 8px 14px;border-left:3px solid #d1d5db;color:#6b7280;font-style:italic;',
  code: 'background:#f3f4f6;padding:2px 5px;border-radius:4px;font-family:Consolas,Monaco,monospace;font-size:13px;',
  pre: 'margin:0 0 16px;padding:12px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;font-family:Consolas,Monaco,monospace;font-size:13px;line-height:1.5;overflow-x:auto;white-space:pre-wrap;color:#111827;',
  hr: 'border:none;border-top:1px solid #e5e7eb;margin:24px 0;',
  // `display:block` because clients otherwise leave the inline-image gap under
  // it; `max-width:100%` so a large paste does not blow the 560px column open.
  img: 'display:block;max-width:100%;height:auto;border-radius:8px;margin:0 0 16px;',
  table: 'border-collapse:collapse;width:100%;margin:0 0 16px;',
  th: 'border:1px solid #e5e7eb;padding:8px 10px;text-align:left;font-size:14px;background:#f9fafb;color:#111827;',
  td: 'border:1px solid #e5e7eb;padding:8px 10px;text-align:left;font-size:14px;color:#374151;',
} as const;

/** Inline nodes → HTML. */
function renderInline(nodes: PhrasingContent[]): string {
  return nodes
    .map((node): string => {
      switch (node.type) {
        case 'text':
          return escapeHtml(node.value);
        case 'strong':
          return `<strong>${renderInline(node.children)}</strong>`;
        case 'emphasis':
          return `<em>${renderInline(node.children)}</em>`;
        case 'delete':
          return `<s>${renderInline(node.children)}</s>`;
        case 'inlineCode':
          return `<code style="${STYLES.code}">${escapeHtml(node.value)}</code>`;
        case 'break':
          return '<br />';
        case 'link': {
          const href = safeHref(node.url);
          const inner = renderInline(node.children);
          // A rejected scheme keeps the link text — dropping it would silently
          // delete words the author wrote.
          return href ? `<a href="${escapeHtml(href)}" style="${STYLES.a}">${inner}</a>` : inner;
        }
        case 'image': {
          const src = safeHref(node.url);
          if (!src) return '';
          return `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.alt ?? '')}" style="${STYLES.img}" />`;
        }
        default:
          // `html` and anything unrecognised fall through to escaped text.
          return 'value' in node && typeof node.value === 'string' ? escapeHtml(node.value) : '';
      }
    })
    .join('');
}

/** Block nodes → HTML. */
function renderBlocks(nodes: RootContent[]): string {
  return nodes
    .map((node): string => {
      switch (node.type) {
        case 'paragraph': {
          const inner = renderInline(node.children);
          /*
           * A paragraph holding nothing but an image must not wrap it in a
           * `<p>`: several clients apply their own paragraph spacing and the
           * image ends up with a stray gap under it. The image already carries
           * its own margin.
           */
          const onlyImage = node.children.length === 1 && node.children[0].type === 'image';
          return onlyImage ? inner : `<p style="${STYLES.p}">${inner}</p>`;
        }
        case 'heading': {
          const level = Math.min(node.depth, 3) as 1 | 2 | 3;
          const style = level === 1 ? STYLES.h1 : level === 2 ? STYLES.h2 : STYLES.h3;
          return `<h${level} style="${style}">${renderInline(node.children)}</h${level}>`;
        }
        case 'list': {
          const tag = node.ordered ? 'ol' : 'ul';
          const items = node.children
            .map((item) => `<li style="${STYLES.li}">${renderBlocksInline(item.children)}</li>`)
            .join('');
          return `<${tag} style="${STYLES.list}">${items}</${tag}>`;
        }
        case 'blockquote':
          return `<blockquote style="${STYLES.blockquote}">${renderBlocks(node.children)}</blockquote>`;
        case 'code':
          return `<pre style="${STYLES.pre}">${escapeHtml(node.value)}</pre>`;
        case 'thematicBreak':
          return `<hr style="${STYLES.hr}" />`;
        case 'html':
          /*
           * Raw HTML at block level is escaped and shown as text, not dropped.
           *
           * Dropping it is equally safe, but it would diverge from
           * `<MarkdownContent>`, which escapes it — and the preview pane *is*
           * that component. An author who pasted a stray tag would see it in
           * the preview and then find it silently missing from the email,
           * which is exactly the kind of quiet disagreement the shared-renderer
           * arrangement exists to prevent.
           */
          return `<p style="${STYLES.p}">${escapeHtml(node.value)}</p>`;
        case 'table': {
          const [head, ...body] = node.children;
          const headRow = head
            ? `<tr>${head.children.map((c) => `<th style="${STYLES.th}">${renderInline(c.children)}</th>`).join('')}</tr>`
            : '';
          const bodyRows = body
            .map(
              (row) =>
                `<tr>${row.children.map((c) => `<td style="${STYLES.td}">${renderInline(c.children)}</td>`).join('')}</tr>`,
            )
            .join('');
          return `<table role="presentation" style="${STYLES.table}">${headRow}${bodyRows}</table>`;
        }
        default:
          return '';
      }
    })
    .join('');
}

/**
 * List items contain blocks, but a single-paragraph item should not gain a
 * `<p>`'s margin inside its bullet — that is what makes a tight list look
 * double-spaced in Outlook.
 */
function renderBlocksInline(nodes: RootContent[]): string {
  if (nodes.length === 1 && nodes[0].type === 'paragraph') {
    return renderInline(nodes[0].children);
  }
  return renderBlocks(nodes);
}

/** Markdown → plain text, for the multipart alternative. */
function renderText(nodes: RootContent[], depth = 0): string {
  return nodes
    .map((node): string => {
      switch (node.type) {
        case 'paragraph':
          return `${textInline(node.children)}\n\n`;
        case 'heading':
          return `${textInline(node.children).toUpperCase()}\n\n`;
        case 'list':
          return `${node.children
            .map((item, index) => {
              const marker = node.ordered ? `${index + 1}.` : '-';
              return `${'  '.repeat(depth)}${marker} ${renderText(item.children, depth + 1).trim()}`;
            })
            .join('\n')}\n\n`;
        case 'blockquote':
          return `${renderText(node.children, depth)
            .trim()
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n')}\n\n`;
        case 'code':
          return `${node.value}\n\n`;
        case 'thematicBreak':
          return '---\n\n';
        case 'html':
          // Echoed, like the HTML part escapes it, so the two alternatives
          // describe the same document. Harmless here — this half is served as
          // `text/plain` and nothing interprets it.
          return `${node.value}\n\n`;
        case 'table':
          return `${node.children
            .map((row) => row.children.map((c) => textInline(c.children)).join(' | '))
            .join('\n')}\n\n`;
        default:
          return '';
      }
    })
    .join('');
}

function textInline(nodes: PhrasingContent[]): string {
  return nodes
    .map((node): string => {
      switch (node.type) {
        case 'text':
        case 'inlineCode':
          return node.value;
        case 'strong':
        case 'emphasis':
        case 'delete':
          return textInline(node.children);
        case 'break':
          return '\n';
        case 'link': {
          const label = textInline(node.children);
          const href = safeHref(node.url);
          // The URL is spelled out: a plain-text reader cannot follow a link
          // whose destination is hidden behind its label.
          return href && href !== label ? `${label} (${href})` : label;
        }
        case 'image':
          return node.alt ? `[${node.alt}]` : '';
        default:
          return '';
      }
    })
    .join('');
}

/**
 * Parses once and returns both representations, so the HTML and the plain-text
 * part can never describe different content.
 *
 * The parser is `remark-parse` + `remark-gfm` — the same pair
 * `<MarkdownContent>` uses, which is what makes the composer's preview an
 * honest picture of the email rather than an approximation.
 */
export function renderMarkdownEmail(markdown: string): { html: string; text: string } {
  // `{{site.name}}` and friends are filled in first, as in `<MarkdownContent>`.
  const tree = unified().use(remarkParse).use(remarkGfm).parse(fillSiteTokens(markdown)) as Root;

  return {
    html: renderBlocks(tree.children),
    text: renderText(tree.children).trim(),
  };
}
