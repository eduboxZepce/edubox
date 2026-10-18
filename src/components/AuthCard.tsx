'use client';

import * as React from 'react';
import Fade from '@mui/material/Fade';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * The card an auth page renders inside — title, optional subtitle, and the form.
 *
 * Centring it on an empty background is the job of `(auth)/layout.tsx`, not this
 * component, so anything else added to that group gets the same treatment
 * without wrapping itself in a copy of the shell.
 */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      // `relative` + `overflow: hidden` are what <AuthCardProgress> pins itself
      // to: it sits on the card's top edge, clipped to the rounded corners.
      sx={{
        p: 4,
        width: '100%',
        maxWidth: 420,
        border: 1,
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h2" component="h1">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
      {children}
    </Paper>
  );
}

/**
 * A moving bar along the top edge of the card while a request is in flight.
 *
 * A greyed-out button alone reads as "broken" rather than "working" — the
 * spinner inside it is small, and the wait after a successful sign-in (loading
 * the dashboard) has no request of its own to show. The bar is the signal that
 * is visible wherever the user is looking on the card.
 *
 * Rendered by the form rather than taken as an `AuthCard` prop, because on the
 * login page the form's state lives inside a Suspense boundary the card sits
 * outside of. Absolutely positioned, so appearing never shifts the layout.
 */
export function AuthCardProgress({ active }: { active: boolean }) {
  return (
    <Fade in={active} unmountOnExit>
      <LinearProgress
        aria-label="Učitavanje"
        sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }}
      />
    </Fade>
  );
}
