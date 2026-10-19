import Hero from '@/components/landing/Hero';
import StatsBar from '@/components/landing/StatsBar';
import FeaturedCourses from '@/components/landing/FeaturedCourses';
import HowItWorks from '@/components/landing/HowItWorks';
import WhyUs from '@/components/landing/WhyUs';
import Faq from '@/components/landing/Faq';
import CtaBanner from '@/components/landing/CtaBanner';
import { SITE } from '@/lib/siteConfig';
import { FEATURES } from '@/lib/features';
import JsonLd from '@/components/seo/JsonLd';
import { absoluteUrl, pageMetadata } from '@/lib/seo';

/*
 * `<StatsBar>` reads live counts from the database. Without this the page is
 * prerendered once at build and the counts would freeze at deploy time.
 */
export const revalidate = 3600;

export const metadata = pageMetadata({
  title: `${SITE.name} — ${SITE.tagline}`,
  absoluteTitle: true,
  // Opens with the brand: for a search on the name, Google skips a description
  // that does not contain it and quotes the footer instead.
  description: `${SITE.name} — online obuke s video lekcijama, materijalima i zadacima koje pregleda predavač. Uči svojim tempom i dobij certifikat.`,
  path: '/',
});

/*
 * What the site is. Google uses it for the site name shown beside results. The
 * organisation it points at is rendered on every public page by the marketing
 * layout, so it is referenced here by `@id` rather than repeated.
 */
const SITE_JSON_LD = {
  '@type': 'WebSite',
  '@id': absoluteUrl('/#website'),
  name: SITE.name,
  // Google tries `name` first and falls back to these; without them it may
  // settle on the bare domain ("edubox-zepce.ba") as the site name.
  alternateName: [SITE.shortName, 'edubox-zepce.ba'],
  url: absoluteUrl('/'),
  inLanguage: 'bs',
  publisher: { '@id': absoluteUrl('/#organization') },
};

/**
 * The landing page — `/`.
 *
 * ## It used to redirect to /login, and that was the biggest hole in the app
 *
 * A visitor who typed the domain got a login form: no way to find out what the
 * platform was, and no route to the catalogue that had been public all along.
 * This replaces it with a real entry point.
 *
 * ## Structure now, copy later
 *
 * The sections below are the skeleton — a hero, what a course involves, and a
 * closing call to action. The wording is placeholder marketing text and is
 * expected to be rewritten; the *shape* is what was missing. Unlike the legal
 * pages it is not left empty, because a blank home page is worse than a
 * provisional one, and nothing here can mislead anybody the way invented terms
 * of service could.
 *
 * ## The sections are bands, not a column
 *
 * Every section is a full-width `<Section>` with a surface of its own, and the
 * tones alternate — plain, tint, paper, plain, paper, plain, brand. That
 * alternation is what gives the page a vertical rhythm; there are no dividers
 * between sections any more, because the edge of a band already separates it
 * from the next one. Add a section in the middle and pick the tone its
 * neighbours do not have.
 *
 * A Server Component: apart from `<FeaturedCourses>`, which needs a query, and
 * the reveal-on-scroll wrappers inside each section, the first page a stranger
 * sees is static and fully crawlable.
 *
 * Open question left for the owner: what a **signed-in** visitor should see
 * here — this page, or a redirect to `landingPathForRole`. Right now they get
 * this page, and the header already offers the way into their own area.
 */
export default function LandingPage() {
  return (
    <>
      <JsonLd data={SITE_JSON_LD} />
      <Hero />
      <StatsBar />
      {/* A grid of courses linking into a catalogue that is switched off
          would be a row of dead ends. */}
      {FEATURES.catalog ? <FeaturedCourses /> : null}
      <HowItWorks />
      <WhyUs />
      <Faq />
      <CtaBanner />
    </>
  );
}
