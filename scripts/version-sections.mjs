/**
 * Which part of the app a file belongs to, for per-section versioning.
 *
 * Read by `scripts/versions.mjs`, which the pre-commit hook runs. Every staged
 * file is classified twice:
 *
 *   1. **Section** — the first entry in `SECTIONS` whose `match` hits the path.
 *      Order matters: specific features come before broad ones, so
 *      `QuizTaker.tsx` is a quiz change, not a course change, even though it
 *      lives under a course URL. Anything unmatched falls to `core`.
 *   2. **Layer** — `backend` if `BACKEND` matches, otherwise `frontend`.
 *
 * Files matching `IGNORED` never bump anything (docs, tooling, the version file
 * itself). To move a file to another section, add a pattern above the one
 * that currently claims it — there is no other configuration.
 *
 * Labels are Bosnian because they are shown on `/admin/about`; keys are
 * English and must never change, since the version file is keyed by them.
 */

/** @type {{ key: string; label: string; description: string; match: RegExp; backendOnly?: boolean }[]} */
export const SECTIONS = [
  {
    key: 'database',
    label: 'Baza podataka',
    description: 'Shema, RLS politike, okidači i migracije',
    match: /^supabase\//,
    backendOnly: true,
  },
  {
    key: 'quizzes',
    label: 'Kvizovi',
    description: 'Izrada kvizova i polaganje',
    match: /quiz/i,
  },
  {
    key: 'modules',
    label: 'Moduli i materijali',
    description: 'Moduli, video, PDF materijali i završavanje modula',
    match: /module|PdfViewer|youtube/i,
  },
  {
    key: 'support',
    label: 'Podrška',
    description: 'Zahtjevi za podršku',
    match: /issue/i,
  },
  {
    // Support threads also have `messages` routes, so support is matched first.
    key: 'tasks',
    label: 'Zadaci i pregled',
    description: 'Zadaci, predaje, poruke i ocjenjivanje',
    match: /task|submission|\/messages\/|Message(Thread|Composer)/i,
  },
  {
    key: 'purchases',
    label: 'Kupovine i plaćanje',
    description: 'Zahtjevi za pristup, odobravanje i podaci za uplatu',
    match: /purchase|payment/i,
  },
  {
    key: 'certificates',
    label: 'Certifikati',
    description: 'Izdavanje, stranica certifikata, PDF i dostava',
    match: /certificate|lib\/pdf\//i,
  },
  {
    key: 'notifications',
    label: 'Obavještenja',
    description: 'Obavještenja u aplikaciji i email',
    match: /notification|lib\/email\//i,
  },
  {
    key: 'users',
    label: 'Korisnici i uloge',
    description: 'Upravljanje korisnicima, ulogama i aktivacijom',
    match: /users/i,
  },
  {
    key: 'categories',
    label: 'Kategorije',
    description: 'Kategorije obuka',
    match: /categor/i,
  },
  {
    key: 'settings',
    label: 'Postavke',
    description: 'Pravni dokumenti, newsletter, izgled i korisničke postavke',
    match: /settings|legal|newsletter|preference|ThemeToggle|ThemeSync|colorScheme/i,
  },
  {
    key: 'auth',
    label: 'Prijava i nalozi',
    description: 'Registracija, prijava, lozinke i zaštita ruta',
    match:
      /\(auth\)|app\/auth\/|src\/proxy\.ts|lib\/auth\/|lib\/supabase\/|AuthProvider|AuthCard|useAuthStore|GoogleSignIn/,
  },
  {
    key: 'public',
    label: 'Javni sajt',
    description: 'Naslovna, blog, kontakt, SEO i javno zaglavlje',
    match:
      /\(marketing\)\/(page|layout|blog|kontakt|uvjeti|politika)|components\/(landing|blog|contact|seo|markdown)\/|lib\/(blog|seo|siteConfig)\.|app\/(sitemap|robots)\.ts|app\/og\/|api\/contact|PublicHeader|PublicFooter|Logo\.tsx|^public\/|[Bb]log/,
  },
  {
    key: 'courses',
    label: 'Obuke',
    description: 'Katalog, stranica obuke, izrada i pregled obuka',
    match: /course/i,
  },
  {
    key: 'core',
    label: 'Jezgro',
    description: 'Zajedničke komponente, tema, rasporedi i infrastruktura',
    match: /.*/,
  },
];

/** Files that are not part of the shipped app. */
export const IGNORED =
  /^(docs\/|scripts\/|\.githooks\/|\.claude\/|\.vscode\/|\.github\/)|\.md$|^src\/lib\/appVersions\.json$|^package-lock\.json$|^\.(gitignore|prettierrc|prettierignore|env\.example)$|^(eslint\.config\.mjs|tsconfig\.json|postcss\.config\.mjs|next-env\.d\.ts)$/;

/**
 * Server side: API routes, the database, and the libraries only they import.
 * `lib/api/client.ts` and `errorMessage.ts` are the browser's half of
 * `lib/api/`, so they stay frontend.
 */
export const BACKEND =
  /^supabase\/|^src\/app\/api\/|^src\/app\/auth\/|^src\/app\/(sitemap|robots)\.ts$|^src\/app\/og\/|^src\/proxy\.ts$|^src\/lib\/(schemas|services|server|supabase|auth|pdf|email|openapi|notifications)\/|^src\/lib\/api\/(?!client\.ts|errorMessage\.ts)|^src\/lib\/env\.ts$|^src\/types\/|^package\.json$|^next\.config\.ts$/;

/** `{ section, layer }` for a path, or `null` if it doesn't count. */
export function classify(path) {
  if (IGNORED.test(path)) return null;
  const section = SECTIONS.find((s) => s.match.test(path));
  const layer = section.backendOnly || BACKEND.test(path) ? 'backend' : 'frontend';
  return { section: section.key, layer };
}
