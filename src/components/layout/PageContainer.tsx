import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

/**
 * Outermost wrapper for a page's content. Owns the max width and the vertical
 * rhythm between a page's top-level blocks, so individual pages never set their
 * own margins and end up subtly misaligned with each other.
 *
 *   <PageContainer>
 *     <PageHeader title="Obuke" />
 *     <ContentCard>…</ContentCard>
 *   </PageContainer>
 *
 * `maxWidth="form"` narrows the column for pages that are mostly a single
 * form — long text inputs stretched to 1400px are unpleasant to scan.
 */
const MAX_WIDTHS = {
  /** Dense pages: tables, dashboards, grids. */
  wide: 1400,
  /** Reading/editing a single record. */
  form: 840,
} as const;

export default function PageContainer({
  children,
  maxWidth = 'wide',
}: {
  children: React.ReactNode;
  maxWidth?: keyof typeof MAX_WIDTHS;
}) {
  return (
    <Box sx={{ width: '100%', maxWidth: MAX_WIDTHS[maxWidth], mx: 'auto' }}>
      <Stack spacing={3}>{children}</Stack>
    </Box>
  );
}
