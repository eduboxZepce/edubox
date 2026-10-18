'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import type { SvgIconComponent } from '@mui/icons-material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import SupportOutlinedIcon from '@mui/icons-material/SupportOutlined';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { NavPending } from '@/components/feedback/NavProgress';
import { FEATURES } from '@/lib/features';
import { initials } from '@/lib/format';
import { SETTINGS_SECTIONS } from '@/lib/settingsSections';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useLogout } from '@/hooks/useLogout';
import Logo from '@/components/layout/Logo';
import { roleSurfaceSx, roleTint } from '@/components/layout/roleChrome';
import { useAuthStore } from '@/store/useAuthStore';
import { USER_ROLE } from '@/lib/status';
import type { UserRole } from '@/lib/auth/routes';

/**
 * The top bar for every signed-in page — student, staff and account pages, and
 * public pages viewed while signed in.
 *
 * ## One rule for the links
 *
 * **The bar always shows the role's top-level destinations, unless a sidebar on
 * the same screen already lists them.** That is the whole rule, and it is what
 * the earlier version lacked: links appeared on public pages only, so a student
 * saw "Kontrolna tabla · Moji kursevi" on the catalogue, nothing at all on the
 * dashboard, and nothing again on notifications — the same person, three bars.
 *
 * The one exception is the admin shell (`variant="shell"`), whose sidebar is
 * that list in full; repeating two of its entries in the bar would only make the
 * screen say the same thing twice.
 *
 * ## Public pages do not mix in
 *
 * A signed-in visitor on a public page gets this bar, never the marketing links
 * (Početna, Blog, Kontakt) — those live in the footer, which every public page
 * has. Mixing the two produced a bar that changed shape between `/courses` and
 * `/dashboard`. What a signed-in visitor genuinely needs from the public side is
 * the catalogue, so "Katalog" is one of the role links rather than a stray.
 *
 * ## The role is shown by colour, not a badge
 *
 * Admin bars are tinted purple, teacher bars blue, and the chip beside the logo
 * names the role. Students get the plain bar — see `roleChrome.ts`. The point is
 * that an admin browsing the public catalogue still knows, without reading,
 * that they are signed in as an admin.
 *
 * ## The account menu
 *
 * The avatar + chevron is what says "this opens something" — a name on its own
 * reads as a label. Everything that is about *this account* rather than a
 * section of the app lives in it: support, settings, signing out. On small
 * screens the role links join it too, since the bar has no room for them.
 *
 * ## Notifications is the bell
 *
 * It carries the unread badge and opens the recent list, with a way through to
 * the full page. A separate link beside it would be a second route to the same
 * place with less information on it.
 */
type NavLink = {
  label: string;
  href: string;
  icon: SvgIconComponent;
  /** Highlight only on the exact path — for links that prefix other links. */
  exact?: boolean;
};

function navForRole(role: UserRole): NavLink[] {
  const catalog: NavLink[] = FEATURES.catalog
    ? [
        {
          label: 'Katalog',
          href: '/courses',
          icon: StorefrontOutlinedIcon,
          // Exact: a course page and its modules sit under `/courses/…`, and an
          // enrolled student studying one is not "in the catalogue".
          exact: true,
        },
      ]
    : [];

  if (role === 'student') {
    // Purchases, certificates and issues are reached from the hub, each with
    // its own page — listing them here too would be the same destinations twice.
    return [
      { label: 'Kontrolna tabla', href: '/dashboard', icon: DashboardOutlinedIcon, exact: true },
      { label: 'Moji kursevi', href: '/dashboard/courses', icon: LibraryBooksOutlinedIcon },
      ...catalog,
    ];
  }

  return [
    { label: 'Kontrolna tabla', href: '/admin', icon: DashboardOutlinedIcon, exact: true },
    { label: 'Kursevi', href: '/admin/courses', icon: LibraryBooksOutlinedIcon },
    ...catalog,
  ];
}

/**
 * Where "Podrška" leads in the account menu. An admin gets the queue of
 * everybody's requests; anyone else their own, because `issues` grants a
 * teacher nothing more — a request may be about them.
 */
function supportHrefForRole(role: UserRole) {
  return role === 'admin' ? '/admin/issues' : '/issues';
}

function isActive(link: NavLink, pathname: string) {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export default function AppHeader({
  profile,
  variant = 'standalone',
  leading,
}: {
  /**
   * Supplied by the server layouts that already know who is signed in, so the
   * bar paints with the right name on the first frame. The public header has no
   * such luxury and falls back to the store.
   */
  profile?: { full_name: string; email: string; role: UserRole };
  /**
   * `shell` — inside `<AdminShell>`, whose sidebar carries the brand and the
   * navigation. The bar then drops its links, and shows the logo only on small
   * screens, where the sidebar is a closed drawer.
   */
  variant?: 'standalone' | 'shell';
  /** Rendered first in the bar. The admin shell puts its drawer toggle here. */
  leading?: React.ReactNode;
}) {
  const storeProfile = useAuthStore((s) => s.profile);
  const pathname = usePathname();
  const { logout, pending } = useLogout();

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const close = () => setAnchorEl(null);

  const current = profile ?? storeProfile;
  if (!current) return null;

  const role = current.role as UserRole;
  const inShell = variant === 'shell';
  const links = inShell ? [] : navForRole(role);
  const home = role === 'student' ? '/dashboard' : '/admin';
  const tint = roleTint(role);
  const menuOpen = Boolean(anchorEl);

  const avatar = (size: number) => (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        fontWeight: 600,
        bgcolor: tint ? `${tint}.main` : 'action.selected',
        color: tint ? `${tint}.contrastText` : 'text.primary',
      }}
    >
      {initials(current.full_name)}
    </Avatar>
  );

  return (
    <AppBar position="sticky" color="inherit" sx={roleSurfaceSx(role)}>
      <Toolbar sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 64, sm: 64 } }}>
        {leading}

        <Typography
          variant="h5"
          component="div"
          color="text.primary"
          // In the shell the sidebar shows the brand on desktop; repeating it a
          // few pixels to the right would be the only thing on screen twice.
          sx={{ flexShrink: 0, display: inShell ? { xs: 'block', md: 'none' } : 'block' }}
        >
          {/* Leads to the role's home rather than `/`: signed in, that is where
              "home" is. The public landing page stays one click away in the
              footer of every public page. */}
          <Logo href={home} />
        </Typography>

        {tint ? (
          // Names what the tint means. Hidden on phones, where the bar has no
          // room for it — the tint and the avatar's colour still say it, and the
          // account menu spells it out.
          <Chip
            icon={
              role === 'admin' ? (
                <AdminPanelSettingsOutlinedIcon fontSize="small" />
              ) : (
                <SchoolOutlinedIcon fontSize="small" />
              )
            }
            label={USER_ROLE[role].label}
            color={tint}
            size="small"
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          />
        ) : null}

        {links.length > 0 ? (
          <Stack
            component="nav"
            aria-label="Glavna navigacija"
            direction="row"
            spacing={2.5}
            // Collapsed below md; the same links are in the account menu, so
            // nothing becomes unreachable on a phone.
            sx={{ ml: 2, display: { xs: 'none', md: 'flex' } }}
          >
            {links.map((link) => {
              const active = isActive(link, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  variant="body2"
                  underline="hover"
                  color={active ? 'text.primary' : 'text.secondary'}
                  aria-current={active ? 'page' : undefined}
                  sx={{ fontWeight: active ? 600 : 400 }}
                >
                  {link.label}
                  {/* Feeds the top progress bar; renders nothing. Must sit inside
                      the link — see `<NavPending>`. */}
                  <NavPending />
                </Link>
              );
            })}
          </Stack>
        ) : null}

        <Box sx={{ flex: 1 }} />

        {FEATURES.notifications ? <NotificationBell /> : null}

        <ButtonBase
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label="Korisnički meni"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          sx={{
            gap: 1,
            pl: 0.5,
            pr: { xs: 0.5, sm: 1 },
            py: 0.5,
            borderRadius: 999,
            '&:hover': { bgcolor: 'action.hover' },
            '&.Mui-focusVisible': { bgcolor: 'action.focus' },
          }}
        >
          {avatar(32)}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              display: { xs: 'none', sm: 'block' },
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {current.full_name}
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              color: 'text.secondary',
              display: { xs: 'none', sm: 'block' },
              transition: 'transform 150ms',
              transform: menuOpen ? 'rotate(180deg)' : 'none',
            }}
          />
        </ButtonBase>

        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={close}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 260, mt: 1 } } }}
        >
          <Stack direction="row" spacing={1.5} sx={{ px: 2, py: 1.5, alignItems: 'center' }}>
            {avatar(40)}
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {current.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {current.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: tint ? `${tint}.main` : 'text.secondary' }}
              >
                {USER_ROLE[role].label}
              </Typography>
            </Stack>
          </Stack>

          <Divider />

          {/* Below md only — on desktop these are already in the bar. */}
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <MenuItem
                key={link.href}
                // `component={NextLink}` is mandatory on MenuItem and only on
                // MenuItem: it overrides ButtonBase's root to 'li', so a bare
                // `href` renders a dead `<li href>`. Every other MUI link
                // component picks NextLink up from the theme by itself.
                component={NextLink}
                href={link.href}
                onClick={close}
                selected={isActive(link, pathname)}
                sx={{ display: { xs: 'flex', md: 'none' } }}
              >
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">{link.label}</Typography>
              </MenuItem>
            );
          })}
          {links.length > 0 ? <Divider sx={{ display: { xs: 'block', md: 'none' } }} /> : null}

          {/* Account-level, so it is here for every role rather than in one
              role's bar and another's sidebar. */}
          {FEATURES.support ? (
            <MenuItem component={NextLink} href={supportHrefForRole(role)} onClick={close}>
              <ListItemIcon>
                <SupportOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Podrška</Typography>
            </MenuItem>
          ) : null}

          {/* One entry for one screen; `/settings` lands on the first tab. Every
              tab belongs to a feature flag, so with all of them off there is no
              settings screen to open. */}
          {SETTINGS_SECTIONS.length > 0 ? (
            <MenuItem component={NextLink} href="/settings" onClick={close}>
              <ListItemIcon>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Podešavanja</Typography>
            </MenuItem>
          ) : null}

          {FEATURES.support || SETTINGS_SECTIONS.length > 0 ? <Divider /> : null}

          {/* The only way out, at every width — last, because it is the
              destructive one. */}
          <MenuItem onClick={() => void logout()} disabled={pending}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">{pending ? 'Odjavljivanje…' : 'Odjavi se'}</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
