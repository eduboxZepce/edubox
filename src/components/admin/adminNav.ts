import type { SvgIconComponent } from '@mui/icons-material';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import SupportOutlinedIcon from '@mui/icons-material/SupportOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';

import { FEATURES, type FeatureName } from '@/lib/features';
import type { UserRole } from '@/lib/auth/routes';

/** Roles that may reach the admin shell at all. */
export type StaffRole = Extract<UserRole, 'admin' | 'teacher'>;

export type AdminNavItem = {
  label: string;
  href: string;
  icon: SvgIconComponent;
  /**
   * Which roles see this link. Omitted means "both".
   *
   * This is presentation only — hiding a link is not access control. The pages
   * behind admin-only links are protected by `requireAdmin()` on their
   * endpoints and by RLS, so a teacher who types the URL still gets nothing.
   */
  roles?: StaffRole[];
  /**
   * Hidden entirely when its feature is switched off. Presentation only — the
   * routes are gated in `proxy.ts` and the endpoints are not gated at all.
   */
  feature?: FeatureName;
  /**
   * By default a link is highlighted when the URL is the link or sits below it,
   * so `/admin/courses` stays active on `/admin/courses/new`. Set this for
   * links whose path is a prefix of every other one — without it `/admin` would
   * be highlighted on every page.
   */
  exact?: boolean;
};

export type AdminNavSection = {
  /** Rendered as a small heading above the group; omit for the first group. */
  title?: string;
  items: AdminNavItem[];
};

/**
 * The admin sidebar, in one place. Adding a page means adding a line here and
 * creating the matching folder under `src/app/(admin)/admin/` — nothing else.
 *
 * Every href must start with `/admin`: `src/proxy.ts` gates on that prefix, and
 * the `(admin)` route group contributes nothing to the URL.
 */
export const ADMIN_NAV: AdminNavSection[] = [
  {
    // "Kontrolna ploča", matching `<AppHeader>`. It read "Pregled" here and
    // "Kontrolna ploča" in the top bar — one destination with two names, which
    // is exactly the ambiguity the course menu's "Pregled" was renamed for.
    items: [{ label: 'Kontrolna ploča', href: '/admin', icon: DashboardOutlinedIcon, exact: true }],
  },
  {
    title: 'Sadržaj',
    items: [
      { label: 'Obuke', href: '/admin/courses', icon: LibraryBooksOutlinedIcon },
      {
        label: 'Kategorije',
        href: '/admin/categories',
        icon: CategoryOutlinedIcon,
        roles: ['admin'],
      },
      {
        // Admin only: the blog speaks for the platform, not for a course author
        // (`blog_posts_admin_write`, migration 0035).
        label: 'Blog',
        href: '/admin/blog',
        icon: ArticleOutlinedIcon,
        roles: ['admin'],
        feature: 'blog',
      },
    ],
  },
  {
    title: 'Studenti',
    items: [
      {
        label: 'Zahtjevi za kupovinu',
        href: '/admin/purchases',
        icon: ReceiptLongOutlinedIcon,
        feature: 'purchases',
      },
      {
        label: 'Predani zadaci',
        href: '/admin/submissions',
        icon: AssignmentTurnedInOutlinedIcon,
        feature: 'tasks',
      },
      {
        label: 'Certifikati',
        href: '/admin/certificates',
        icon: WorkspacePremiumOutlinedIcon,
        feature: 'certificates',
      },
      { label: 'Korisnici', href: '/admin/users', icon: PeopleOutlinedIcon, roles: ['admin'] },
      {
        label: 'Podrška',
        href: '/admin/issues',
        feature: 'support',
        icon: SupportOutlinedIcon,
        // Admins only: an issue may be about a teacher, so teachers do not see
        // the queue. RLS enforces it regardless of what the nav shows.
        roles: ['admin'],
      },
    ],
  },
  {
    // Platform-wide configuration. All admin-only, and not because of the
    // sidebar — every endpoint behind these calls `requireAdmin()`, and the
    // matching RLS policies say the same. There is one seller and one set of
    // legal texts, and they belong to the platform rather than to a course
    // author.
    title: 'Postavke',
    items: [
      {
        label: 'Podaci za uplatu',
        href: '/admin/settings/payment',
        feature: 'purchases',
        icon: AccountBalanceOutlinedIcon,
        roles: ['admin'],
      },
      {
        label: 'Pravni dokumenti',
        href: '/admin/settings/legal',
        icon: GavelOutlinedIcon,
        roles: ['admin'],
      },
      {
        label: 'Newsletter',
        href: '/admin/settings/newsletter',
        feature: 'newsletter',
        icon: MarkEmailReadOutlinedIcon,
        roles: ['admin'],
      },
      {
        // Versions and release info. The page checks the role itself too, since
        // the /admin shell also admits teachers.
        label: 'O aplikaciji',
        href: '/admin/about',
        icon: InfoOutlinedIcon,
        roles: ['admin'],
      },
    ],
  },
];

/**
 * The nav as one role sees it, with empty sections dropped so a teacher never
 * gets a heading with nothing under it.
 */
export function navForRole(role: StaffRole): AdminNavSection[] {
  return ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (!item.roles || item.roles.includes(role)) && (!item.feature || FEATURES[item.feature]),
    ),
  })).filter((section) => section.items.length > 0);
}

/** Whether `href` should render as the active link for the current pathname. */
export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
