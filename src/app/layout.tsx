import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import './globals.css';
import ThemeRegistry from '@/theme/ThemeRegistry';
import ThemeSync from '@/theme/ThemeSync';
import ColorSchemeScope from '@/theme/ColorSchemeScope';
import { colorSchemeScopeScript } from '@/theme/colorSchemeRules';
import QueryProvider from '@/lib/query/QueryProvider';
import AuthProvider from '@/components/AuthProvider';
import ToastHost from '@/components/feedback/ToastHost';
import { NavProgressBar } from '@/components/feedback/NavProgress';
import { SITE } from '@/lib/siteConfig';
import { publicEnv } from '@/lib/env';
import { DEFAULT_OG_IMAGE, NO_INDEX, TITLE_SUFFIX } from '@/lib/seo';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/*
 * Defaults for every page. Public pages override all of this through
 * `pageMetadata()` in `src/lib/seo.ts`; these cover the rest.
 *
 * - `template` appends the brand to every title, so a page declares only its
 *   own name (`title: 'Kontakt'` → "Kontakt — Edubox"). The suffix is the short
 *   name; the full one is already in the home page's title and in every
 *   description.
 * - `metadataBase` turns relative canonical and image paths into absolute URLs,
 *   which both require.
 * - `robots` blocks indexing on Vercel preview deployments. A page cannot turn
 *   it back on: `pageMetadata()` never emits `robots` unless it is blocking too.
 */
export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  applicationName: SITE.name,
  title: { default: SITE.name, template: `%s${TITLE_SUFFIX}` },
  description: SITE.description,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: 'bs_BA',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', images: [DEFAULT_OG_IMAGE.url] },
  ...(!publicEnv.isIndexable && { robots: NO_INDEX }),
};

/*
 * The browser chrome colour on mobile (address bar, task switcher): the brand
 * blue, or the dark background for a dark-scheme device. Matches
 * `theme_color` in `manifest.ts` and the palettes in `theme.ts`.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2f5bea' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0f13' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bs"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/*
          Must be the first child of <body>, and must match the theme's
          `colorSchemeSelector: 'class'`.

          It writes a tiny blocking script that reads the saved mode and stamps
          the class on <html> *before* the first paint. Without it a user on the
          dark scheme sees a white flash on every full page load, because the
          server has no way to know their choice — it lives in localStorage.

          `suppressHydrationWarning` on <html> goes with it: the script mutates
          the element before React hydrates, so the server and client markup
          legitimately disagree on that one attribute.
        */}
        <InitColorSchemeScript defaultMode="system" attribute="class" />
        {/*
          Runs immediately after the one above and partly undoes it: that script
          applies the saved scheme, this one takes it back off when the page is
          public. Order matters — it must overwrite, not be overwritten — and
          both have to land before the first paint, or a dark-mode visitor
          watches the landing page flip to light.

          Same class on the same element, so the `suppressHydrationWarning`
          already on <html> covers this too. See `colorSchemeRules.ts`.
        */}
        <script dangerouslySetInnerHTML={{ __html: colorSchemeScopeScript }} />
        <ThemeRegistry>
          <QueryProvider>
            <AuthProvider>
              {/* Applies the signed-in user's saved scheme once it loads.
                  Renders nothing; needs both the theme and the query client. */}
              <ThemeSync />
              {/* Decides whether this page listens to that preference at all:
                  public pages are always light. Renders nothing. */}
              <ColorSchemeScope />
              {/* Fixed to the top of the viewport, above everything. Covers the
                  gap between clicking a nav link and the destination's
                  `loading.tsx` appearing. */}
              <NavProgressBar />
              {children}
              {/* Mounted once, app-wide. Anything can raise a toast from
                  anywhere via `toast.success(...)` — see @/store/useToastStore. */}
              <ToastHost />
            </AuthProvider>
          </QueryProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
