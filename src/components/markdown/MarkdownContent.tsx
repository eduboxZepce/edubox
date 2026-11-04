import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { fillSiteTokens } from '@/lib/siteTokens';

/**
 * Renders Markdown. The single renderer for every piece of Markdown in the app:
 * blog posts, the terms and privacy documents, and the live preview inside
 * `<MarkdownEditor>`.
 *
 * ## Why one component and not three
 *
 * The editor's preview pane renders through this too (see `<MarkdownEditor>`,
 * which overrides the library's built-in preview). That is the whole point:
 * an author is looking at the same code path a visitor will, so "it looked
 * right in the editor" cannot diverge from what ships. A second renderer —
 * the library's own — would be a second set of styling decisions drifting
 * away from these.
 *
 * ## Deliberately not a Client Component
 *
 * No `'use client'`. In a Server Component page (the blog, the legal pages)
 * the Markdown is parsed **on the server**, so the whole article is in the
 * initial HTML rather than assembled after hydration. The blog exists to be
 * crawled; that is not negotiable. Imported into a Client Component — the
 * editor — it simply becomes part of that bundle instead, which is why the
 * same file can serve both.
 *
 * ## No raw HTML, on purpose
 *
 * `rehype-raw` is not installed, so HTML inside the content is escaped and
 * shown as text rather than rendered. The content is admin-authored and
 * therefore fairly trusted, but disabling it means a stray `<div>` cannot break
 * the page layout, and the component stays safe if content ever arrives from
 * somewhere less trusted. It also removes the need for a sanitiser.
 *
 * `remarkGfm` adds tables, strikethrough, task lists and bare-URL autolinking.
 *
 * ## `{{site.name}}` and other placeholders
 *
 * Filled in from `brand/config.ts` before parsing (`fillSiteTokens`), so the
 * legal texts can name the platform and the company without hard-coding one
 * client's details into the database.
 */
export default function MarkdownContent({ content }: { content: string }) {
  return (
    <Box
      sx={{
        // Block spacing lives here rather than on each mapped element, so the
        // vertical rhythm stays consistent whatever a document happens to use.
        '& > *:first-of-type': { mt: 0 },
        '& > *:last-child': { mb: 0 },
      }}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // `h1` is mapped to an `<h2>`: the page already renders the title as
          // its `<h1>`, and a second one is a real accessibility and SEO fault
          // rather than a style preference.
          h1: ({ children }) => (
            <Typography variant="h4" component="h2" sx={{ mt: 5, mb: 2 }}>
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
            <Typography variant="h5" component="h2" sx={{ mt: 5, mb: 2 }}>
              {children}
            </Typography>
          ),
          h3: ({ children }) => (
            <Typography variant="h6" component="h3" sx={{ mt: 4, mb: 1.5 }}>
              {children}
            </Typography>
          ),
          p: ({ children }) => (
            <Typography variant="body1" sx={{ my: 2, lineHeight: 1.8 }}>
              {children}
            </Typography>
          ),
          // `<Link>` picks up Next's Link from the theme, so internal hrefs
          // client-navigate. External ones get the usual safety rel.
          a: ({ href, children }) => {
            const external = Boolean(href && /^https?:\/\//.test(href));
            return (
              <Link
                href={href ?? '#'}
                underline="hover"
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {children}
              </Link>
            );
          },
          ul: ({ children }) => (
            <Box component="ul" sx={{ my: 2, pl: 3, '& li': { mb: 1 } }}>
              {children}
            </Box>
          ),
          ol: ({ children }) => (
            <Box component="ol" sx={{ my: 2, pl: 3, '& li': { mb: 1 } }}>
              {children}
            </Box>
          ),
          li: ({ children }) => (
            <Typography component="li" variant="body1" sx={{ lineHeight: 1.8 }}>
              {children}
            </Typography>
          ),
          blockquote: ({ children }) => (
            <Box
              component="blockquote"
              sx={{
                my: 3,
                mx: 0,
                pl: 2.5,
                borderLeft: 3,
                borderColor: 'primary.main',
                color: 'text.secondary',
                fontStyle: 'italic',
              }}
            >
              {children}
            </Box>
          ),
          /*
           * react-markdown v10 no longer passes an `inline` flag, so the two
           * cases are told apart by position: a fenced block arrives wrapped in
           * `<pre>`, inline code does not. `pre` therefore carries the shell and
           * resets the `code` inside it, which would otherwise draw its own
           * background on top.
           */
          pre: ({ children }) => (
            <Box
              component="pre"
              sx={{
                my: 3,
                p: 2,
                borderRadius: 1,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
                overflowX: 'auto',
                fontSize: '0.875rem',
                lineHeight: 1.7,
                '& code': { bgcolor: 'transparent', p: 0, fontSize: 'inherit' },
              }}
            >
              {children}
            </Box>
          ),
          code: ({ children }) => (
            <Box
              component="code"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: 'action.hover',
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '0.875em',
              }}
            >
              {children}
            </Box>
          ),
          hr: () => <Divider sx={{ my: 4 }} />,
          // A table can be wider than the column; the wrapper scrolls so the
          // page body never does.
          table: ({ children }) => (
            <Box sx={{ my: 3, overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  '& th, & td': {
                    border: 1,
                    borderColor: 'divider',
                    p: 1.25,
                    textAlign: 'left',
                    fontSize: '0.9375rem',
                  },
                  '& th': { bgcolor: 'action.hover', fontWeight: 600 },
                }}
              >
                {children}
              </Box>
            </Box>
          ),
          /*
           * A plain <img>, not next/image: Markdown carries no dimensions, and
           * next/image without them needs `fill` and a sized parent. The blog's
           * cover image, which does have dimensions, uses next/image on the page.
           */
          img: ({ src, alt }) => (
            <Box
              component="img"
              src={typeof src === 'string' ? src : ''}
              alt={alt ?? ''}
              loading="lazy"
              sx={{ display: 'block', width: '100%', height: 'auto', borderRadius: 1, my: 3 }}
            />
          ),
        }}
      >
        {fillSiteTokens(content)}
      </Markdown>
    </Box>
  );
}
