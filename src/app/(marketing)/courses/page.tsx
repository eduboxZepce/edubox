import { Suspense } from 'react';
import CourseCatalogue from '@/components/courses/CourseCatalogue';
import { CardGridSkeleton } from '@/components/feedback/Skeletons';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { pageMetadata } from '@/lib/seo';
import { SITE } from '@/lib/siteConfig';

/*
 * The canonical is `/courses` for every search, filter and page of the list,
 * so `?categoryId=…&page=3` is never indexed as a page of its own.
 */
export const metadata = pageMetadata({
  title: 'Online kursevi',
  description: `Pregled svih kurseva na platformi ${SITE.name}: video lekcije, materijali, zadaci s povratnom informacijom predavača i certifikat po završetku.`,
  path: '/courses',
});

/**
 * `/courses` — a Server Component shell, so the route can export metadata. The
 * interactive catalogue is `<CourseCatalogue>`.
 *
 * The heading lives here, not in the catalogue: `<CourseCatalogue>` reads
 * `useSearchParams()`, which makes everything up to the nearest `<Suspense>`
 * render only in the browser. Rendered here, above that boundary, the page's
 * `<h1>` is in the server HTML a crawler reads.
 */
export default function CourseCataloguePage() {
  return (
    <PageContainer>
      <PageHeader title="Kursevi" description="Izaberi kurs i pošalji zahtjev za pristup." />
      <Suspense fallback={<CardGridSkeleton />}>
        <CourseCatalogue />
      </Suspense>
    </PageContainer>
  );
}
