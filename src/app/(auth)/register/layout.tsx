import { pageMetadata } from '@/lib/seo';
import { SITE } from '@/lib/siteConfig';

/*
 * Metadata only. The page is a Client Component (a form), and a client module
 * cannot export `metadata`, so this segment layout carries it instead.
 */
export const metadata = pageMetadata({
  title: 'Registracija',
  description: `Napravi besplatan nalog na platformi ${SITE.name} i pošalji zahtjev za upis na obuku. Uči svojim tempom i dobij certifikat po završetku.`,
  path: '/register',
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
