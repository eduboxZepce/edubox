'use client';

import * as React from 'react';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * The "nothing here (yet)" state.
 *
 * Distinguish the two flavours when you use it — "you haven't created anything"
 * deserves a call to action, "your filter matched nothing" deserves advice to
 * loosen the filter. Both go through this component; only the copy differs.
 */
export default function EmptyState({
  title,
  description,
  icon,
  action,
  titleComponent = 'h5',
}: {
  title: string;
  /**
   * The heading element. `h1` when the empty state *is* the page — the 404 —
   * so the page still has its one top-level heading.
   */
  titleComponent?: React.ElementType;
  description?: string;
  /** Defaults to a generic empty-inbox glyph. */
  icon?: React.ReactNode;
  /** Usually a `<Button>` — the thing to do about the emptiness. */
  action?: React.ReactNode;
}) {
  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 3,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 56,
          height: 56,
          borderRadius: 2,
          bgcolor: 'action.hover',
          color: 'text.secondary',
        }}
      >
        {icon ?? <InboxOutlinedIcon />}
      </Box>

      <Stack spacing={0.5} sx={{ maxWidth: 420 }}>
        <Typography variant="h5" component={titleComponent}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Stack>

      {action}
    </Stack>
  );
}
