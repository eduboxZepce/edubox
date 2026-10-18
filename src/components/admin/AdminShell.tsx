'use client';

import * as React from 'react';
import NextLink from 'next/link';
import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AdminNavList from './AdminNavList';
import type { StaffRole } from './adminNav';
import AppHeader from '@/components/layout/AppHeader';
import { LogoMark, LogoName } from '@/components/layout/Logo';
import { roleSurfaceSx } from '@/components/layout/roleChrome';

const SIDEBAR_WIDTH = 264;

/**
 * Chrome for every admin page: fixed sidebar on desktop, a temporary drawer on
 * mobile, and a top bar carrying the user menu.
 *
 * A client component because the drawer holds open/closed state and the nav
 * highlights the current route. The auth check stays in the server layout that
 * renders this — no authorization decision is made here.
 */
export default function AdminShell({
  profile,
  children,
}: {
  profile: { full_name: string; email: string; role: StaffRole };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const brand = (
    <Stack
      component={NextLink}
      href="/admin"
      direction="row"
      sx={{
        alignItems: 'center',
        gap: 1,
        height: 64,
        px: 3,
        flexShrink: 0,
        textDecoration: 'none',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
        // Level with the top bar and tinted like it, so the role colour reads as
        // one band across the screen. The role *label* lives in the bar.
        ...roleSurfaceSx(profile.role),
      }}
    >
      <Typography
        variant="h5"
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}
      >
        <LogoMark />
        <LogoName />
      </Typography>
    </Stack>
  );

  const sidebar = (
    <>
      {brand}
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <AdminNavList role={profile.role} onNavigate={() => setMobileOpen(false)} />
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      {/* Desktop: always visible, part of the layout flow. */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {sidebar}
      </Drawer>

      {/* Mobile: overlays the content, closes on navigation. */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        // Keeps the DOM mounted between opens, which makes the first open on a
        // phone noticeably faster.
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {sidebar}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/*
          The same bar every signed-in page gets, in its `shell` form: the
          sidebar already lists every destination, so the bar carries none of
          its own. The drawer toggle goes in its `leading` slot — it used to be
          laid over the bar from a wrapper Box, which also stopped the sticky
          bar from sticking (sticky is bounded by its parent, and the wrapper
          was exactly the bar's height).
        */}
        <AppHeader
          profile={profile}
          variant="shell"
          leading={
            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Otvori navigaciju"
              edge="start"
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          }
        />

        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3, lg: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
