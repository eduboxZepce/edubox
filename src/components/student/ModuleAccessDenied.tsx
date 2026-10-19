import Button from '@mui/material/Button';
import ContentCard from '@/components/layout/ContentCard';
import PageContainer from '@/components/layout/PageContainer';
import EmptyState from '@/components/feedback/EmptyState';
import type { ModulePageAccess } from '@/lib/auth/modulePageAccess';
import { FEATURES } from '@/lib/features';

/**
 * The two ways `checkModulePageAccess` can say no, rendered the same on every
 * page under `/courses/[slug]/modules/…`.
 *
 * Kept beside the guard so the wording cannot drift between the module, quiz and
 * task screens — three near-identical "you can't see this" states written three
 * times is how they end up saying three different things.
 */
export default function ModuleAccessDenied({
  reason,
  slug,
}: {
  reason: Extract<ModulePageAccess, { ok: false }>['reason'];
  slug: string;
}) {
  return (
    <PageContainer>
      <ContentCard>
        {reason === 'course-not-found' ? (
          <EmptyState
            title="Obuka nije pronađena"
            description="Obuka ne postoji ili trenutno nije objavljena."
            action={
              // Module pages are signed-in only, so with the catalogue off the
              // student's own list is the sensible way back.
              FEATURES.catalog ? (
                <Button href="/courses" variant="contained">
                  Sve obuke
                </Button>
              ) : (
                <Button href="/dashboard/courses" variant="contained">
                  Moje obuke
                </Button>
              )
            }
          />
        ) : (
          <EmptyState
            title="Nemate pristup ovom sadržaju"
            description="Dostupan je tek nakon što administrator odobri vaš zahtjev za pristup obuci."
            action={
              <Button href={`/courses/${slug}`} variant="contained">
                Nazad na obuku
              </Button>
            }
          />
        )}
      </ContentCard>
    </PageContainer>
  );
}
