import LegalDocumentPage from '@/components/layout/LegalDocumentPage';
import { SITE } from '@/lib/siteConfig';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Uvjeti korištenja',
  description: `Uvjeti korištenja platforme ${SITE.name}: upis na obuku, plaćanje, pristup materijalima, certifikati i prava i obaveze korisnika.`,
  path: '/uvjeti-koristenja',
});

/**
 * Terms of service.
 *
 * The text lives in `legal_documents` (migration 0030) and is edited at
 * `/admin/settings/legal`, not in this file. It used to be a `<DraftPage>` with
 * a hardcoded outline — which meant correcting a legal document required a
 * deploy, the wrong trade for a text that changes in response to a lawyer or a
 * regulator.
 */
export default async function TermsPage() {
  return <LegalDocumentPage slug="terms" fallbackTitle="Uvjeti korištenja" />;
}
