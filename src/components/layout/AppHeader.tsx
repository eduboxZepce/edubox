'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import { SETTINGS_SECTIONS } from '@/lib/settingsSections';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useLogout } from '@/hooks/useLogout';
import Logo from '@/components/layout/Logo';
import { useAuthStore } from '@/store/useAuthStore';
import { USER_ROLE } from '@/lib/status';
import type { UserRole } from '@/lib/auth/routes';

/**
 * The top bar for every signed-in page.
 *
 * ## One bar, everywhere
 *
 * There used to be four: the admin shell's, the student layout's, the account
 * pages', and the public header's signed-in variant. They carried different
 * links, in a different order, with the identity shown differently — so moving
 * between sections felt like moving between applications. This replaces all of
 * them.
 *
 * **What it contains never changes.** The only thing that varies is where the
 * links point, and that is decided by role — not by which page is open. A
 * teacher sees the same bar on the course editor as on their notifications.
 *
 * ## The links, and why the two roles are not identical
 *
 * A student gets their hub and the courses they are enrolled in — nothing else,
 * because everything else (purchases, certificates, issues) is reached *from*
 * the hub, and listing them here as well would be the same destinations twice.
 *
 * Staff get their control panel, the courses they manage, and the issue queue,
 * which has no other entry point in their shell.
 *
 * ## …but only on public pages (`showNav`)
 *
 * Inside the app the section's own navigation (the admin sidebar, the student
 * hub) already covers these destinations, so the bar stays bare there. On a
 * public page a signed-in visitor has no other way back into the app, so
 * `<PublicHeader>` turns the links on.
 *
 * ## Notifications is the bell
 *
 * It carries the unread badge and opens the recent list, with a way through to
 * the full page. A separate "Obavještenja" link beside it would be a second
 * route to the same place with less information on it.
 */
type NavLink = { label: string; href: string };

function navForRole(role: UserRole): NavLink[] {
  if (role === 'student') {
    // Two links, deliberately. The dashboard is a hub — purchases, certificates
    // and issues are reached from it, each with its own page — so putting them
    // in the bar as well would be the same destinations twice.
    return [
      { label: 'Kontrolna tabla', href: '/dashboard' },
      { label: 'Moji kursevi', href: '/dashboard/courses' },
    ];
  }

  return [
    { label: 'Kontrolna tabla', href: '/admin' },
    { label: 'Kursevi', href: '/admin/courses' },
    // An admin gets the queue of everybody's issues; a teacher only their own,
    // because `issues` grants them nothing else — one may be about them.
    //
    // Dropped rather than relocated when support is switched off: it has no
    // other entry point in the staff shell, so there is nowhere else for it to
    // live.
    ...(FEATURES.support
      ? [{ label: 'Podrška', href: role === 'admin' ? '/admin/issues' : '/issues' }]
      : []),
  ];
}

/** Highlights the section you are in, so the bar says where you are. */
function isActive(href: string, pathname: string) {
  if (href === '/admin' || href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppHeader({
  profile,
  showNav = false,
}: {
  /**
   * Supplied by the server layouts that already know who is signed in, so the
   * bar paints with the right name on the first frame. The public header has no
   * such luxury and falls back to the store.
   */
  profile?: { full_name: string; email: string; role: UserRole };
  /** Show the brand and role links. Only the public header sets it. */
  showNav?: boolean;
}) {
  const storeProfile = useAuthStore((s) => s.profile);
  const pathname = usePathname();
  const { logout, pending } = useLogout();

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const close = () => setAnchorEl(null);

  const current = profile ?? storeProfile;
  if (!current) return null;

  const role = current.role as UserRole;
  const links = showNav ? navForRole(role) : [];

  return (
    <AppBar position="sticky" color="inherit" sx={{ bgcolor: 'background.paper' }}>
      <Toolbar sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 64, sm: 64 } }}>
        {links.length > 0 ? (
          <>
            <Typography variant="h5" component="div" color="text.primary" sx={{ flexShrink: 0 }}>
              {/* Leads to the role's home rather than `/`: signed in, that is
                  where "home" is. */}
              <Logo href={links[0].href} />
            </Typography>

            {/* Collapsed on small screens; the same links live in the user menu
                below, so nothing becomes unreachable on a phone. */}
            <Stack
              direction="row"
              spacing={2.5}
              sx={{ ml: 2, display: { xs: 'none', md: 'flex' } }}
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  variant="body2"
                  underline="hover"
                  color={isActive(link.href, pathname) ? 'text.primary' : 'text.secondary'}
                  sx={{ fontWeight: isActive(link.href, pathname) ? 600 : 400 }}
                >
                  {link.label}
                  {/* Feeds the top progress bar; renders nothing. Must sit inside
                      the link — see `<NavPending>`. */}
                  <NavPending />
                </Link>
              ))}
            </Stack>
          </>
        ) : null}

        <Box sx={{ flex: 1 }} />

        {FEATURES.notifications ? <NotificationBell /> : null}

        <Button
          onClick={(event) => setAnchorEl(event.currentTarget)}
          color="inherit"
          sx={{ textTransform: 'none', minWidth: 0, px: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Stack sx={{ alignItems: 'flex-end', display: { xs: 'none', sm: 'flex' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {current.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                {USER_ROLE[role].label}
              </Typography>
            </Stack>
            <Chip
              label={USER_ROLE[role].label}
              color={USER_ROLE[role].color}
              size="small"
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            />
          </Stack>
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={close}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 240, mt: 1 } } }}
        >
          <Stack sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {current.full_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {current.email}
            </Typography>
          </Stack>

          <Divider />

          {/* Mobile only — on desktop these are already in the bar. */}
          {links.map((link) => (
            <MenuItem
              key={link.href}
              // `component={NextLink}` is mandatory on MenuItem and only on
              // MenuItem: it overrides ButtonBase's root to 'li', so a bare
              // `href` renders a dead `<li href>`. Every other MUI link
              // component picks NextLink up from the theme by itself.
              component={NextLink}
              href={link.href}
              onClick={close}
              sx={{ display: { xs: 'flex', md: 'none' } }}
            >
              <Typography variant="body2">{link.label}</Typography>
            </MenuItem>
          ))}

          {/*
            One entry for one screen. There were two — appearance and
            notifications — which made a single settings page look like two
            unrelated destinations. `/settings` lands on the first tab.
          */}
          {/* Every settings tab belongs to a feature flag; with all of them off
              there is no settings screen to open. */}
          {SETTINGS_SECTIONS.length > 0 ? (
            <MenuItem component={NextLink} href="/settings" onClick={close}>
              <ListItemIcon>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Podešavanja</Typography>
            </MenuItem>
          ) : null}

          {SETTINGS_SECTIONS.length > 0 ? <Divider /> : null}

          {/*
            The only way out, at every width. It used to be a button in the bar
            as well, on the reasoning that signing out is one of the things the
            bar is for — but that put the same action in two places and spent
            bar space on something people do once a day. It sits under
            Podešavanja because both are "this account", and last because it is
            the destructive one.
          */}
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
