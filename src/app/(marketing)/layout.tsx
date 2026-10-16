import Box from '@mui/material/Box';
import JsonLd from '@/components/seo/JsonLd';
import { organizationJsonLd } from '@/lib/seo';
import PublicFooter from '@/components/layout/PublicFooter';
import PublicHeader from '@/components/layout/PublicHeader';
import { MARKETING_GUTTER } from '@/components/layout/marketingGutter';

/**
 * Chrome for every public-facing page: landing, course catalogue, individual
 * courses, blog, and the legal pages.
 *
 * ## Why `(marketing)` and `(auth)` are separate groups
 *
 * These pages and the auth pages are both public, and they used to share one
 * `(public)` group. But they need opposite chrome — marketing pages want a nav
 * bar, while login renders as a bare centred card — so the header could not
 * live at the group level and was scoped to `courses/` instead. Every new
 * public section would have had to repeat it.
 *
 * Splitting the group lets each side state its own chrome once. Route groups
 * contribute nothing to the URL, so `/login` and `/courses/…` are unchanged by
 * the move.
 *
 * The footer lives here for the same reason as the header: one place, every
 * public page, nothing to repeat. It is what makes the legal and contact pages
 * reachable at all — nobody navigates *to* a privacy policy.
 *
 * The gutter around `<main>` is a shared constant because the landing page
 * cancels it: its hero, stats strip and closing banner are full-width bands,
 * and `<Section>` undoes exactly this padding to get them there. See
 * `marketingGutter.ts`.
 *
 * The organisation's structured data is here too, so every public page says who
 * runs the site; pages add their own (`Course`, `BlogPosting`) and refer back to
 * it by `@id`.
 *
 * No auth check: these pages are public by design. What a signed-in visitor
 * sees differs per page (see `useCourseAccess`), not per layout.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <JsonLd data={organizationJsonLd()} />
      <PublicHeader />
      <Box component="main" sx={{ p: MARKETING_GUTTER }}>
        {children}
      </Box>
      <PublicFooter />
    </Box>
  );
}
