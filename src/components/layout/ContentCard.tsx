import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * A bordered panel with an optional titled header. The default container for
 * any self-contained block of a page: a form section, a table, a list.
 *
 *   <ContentCard title="Osnovni podaci" description="Naziv i opis obuke.">
 *     …fields…
 *   </ContentCard>
 *
 * `disablePadding` is for content that manages its own edges — a `<Table>` or a
 * full-bleed list looks wrong inset by 24px.
 */
export default function ContentCard({
  title,
  description,
  actions,
  children,
  disablePadding = false,
}: {
  title?: string;
  description?: string;
  /** Header-level controls: a filter toggle, an "add" button. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  disablePadding?: boolean;
}) {
  const hasHeader = Boolean(title || actions);

  return (
    // `relative` so a <LoadingOverlay /> dropped inside covers exactly this card.
    <Card sx={{ position: 'relative', overflow: 'hidden' }}>
      {hasHeader ? (
        <>
          <Stack
            direction="row"
            spacing={2}
            sx={{ px: 3, py: 2.5, justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <Stack spacing={0.25}>
              {title ? <Typography variant="h4">{title}</Typography> : null}
              {description ? (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              ) : null}
            </Stack>
            {actions ? (
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                {actions}
              </Stack>
            ) : null}
          </Stack>
          <Divider />
        </>
      ) : null}

      {disablePadding ? children : <CardContent>{children}</CardContent>}
    </Card>
  );
}
