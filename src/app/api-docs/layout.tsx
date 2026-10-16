import { NO_INDEX } from '@/lib/seo';

/*
 * Metadata only (the page is a Client Component). The API reference is public
 * to reach but is developer tooling, not content: kept out of search results.
 */
export const metadata = { title: 'API dokumentacija', robots: NO_INDEX };

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
