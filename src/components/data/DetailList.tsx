'use client';

// A Client Component even though it has no state: MUI's <Stack> clones its
// `divider` element, and an element created in a Server Component cannot be
// cloned there — SSR fails with "Element type is invalid … got: undefined" and
// React falls back to client rendering. Marking the boundary here keeps the
// component safe to use from either kind of page (/admin/about is a Server
// Component; every other caller is a client page). `items` stays serialisable:
// labels are strings and values are plain JSX.
import * as React from 'react';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type DetailItem = {
  label: string;
  /** Anything renderable — a chip, a link, formatted money. */
  value: React.ReactNode;
  /** Drop a row entirely when the underlying field is absent. */
  hidden?: boolean;
};

/**
 * Label/value rows for a detail screen.
 *
 * Renders a real `<dl>`, so the pairing between a label and its value is
 * carried by the markup rather than only by visual alignment.
 *
 *   <DetailList
 *     items={[
 *       { label: 'Student', value: purchase.profiles?.full_name ?? '—' },
 *       { label: 'Cijena', value: formatPrice(purchase.price) },
 *     ]}
 *   />
 */
export default function DetailList({
  items,
  dense = false,
}: {
  items: DetailItem[];
  /** Tighter rows and a narrower label column, for short reference blocks. */
  dense?: boolean;
}) {
  const visible = items.filter((item) => !item.hidden);

  return (
    <Stack component="dl" divider={<Divider />} sx={{ m: 0 }}>
      {visible.map((item) => (
        <Stack
          key={item.label}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.5, sm: 3 }}
          sx={{ py: dense ? 0.75 : 1.75, alignItems: { sm: 'baseline' } }}
        >
          <Typography
            component="dt"
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: dense ? 150 : 180, flexShrink: 0 }}
          >
            {item.label}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, minWidth: 0, flex: 1 }}>
            {item.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
