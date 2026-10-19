'use client';

import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * A single headline number, as used across the dashboard.
 *
 * It handles its own loading and error states because the alternative — a
 * `<QueryState>` per tile — would collapse the row's layout while any one
 * number is still arriving. Here the grid stays put and each tile fills in.
 *
 *   <StatCard
 *     label="Obuke"
 *     value={courses.data?.meta.total}
 *     icon={LibraryBooksOutlinedIcon}
 *     href="/admin/courses"
 *     loading={courses.isPending}
 *     error={courses.isError}
 *   />
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  href,
  loading = false,
  error = false,
  /** Draws attention to a number that means "someone is waiting on you". */
  highlight = false,
  caption,
}: {
  label: string;
  value: number | undefined;
  icon: SvgIconComponent;
  href?: string;
  loading?: boolean;
  error?: boolean;
  highlight?: boolean;
  /**
   * A line under the label, for tiles that need to say what the destination is
   * rather than only how many things are in it. The admin dashboard omits it —
   * "Obuke" needs no gloss — while the student hub uses it, since that screen
   * exists to be navigated rather than read.
   */
  caption?: string;
}) {
  /*
   * "Needs attention" means the tile is *flagged* and the number is non-zero.
   * A highlighted tile reading 0 is good news — an empty queue — so it must
   * look exactly like an ordinary tile.
   */
  const attention = highlight && !loading && !error && Boolean(value);

  const content = (
    <Stack spacing={2} sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 36,
            height: 36,
            borderRadius: 1.5,
            /*
             * A filled warning block for the icon read as an error state rather
             * than a queue — too loud for "three people are waiting". The
             * attention cue is now carried by the accent stripe on the card and
             * a coloured glyph, so the tile stays calm while still being the
             * first thing the eye lands on.
             */
            bgcolor: 'action.hover',
            color: attention ? 'warning.main' : 'text.secondary',
          }}
        >
          <Icon fontSize="small" />
        </Box>
        {href ? <ArrowForwardIcon fontSize="small" sx={{ color: 'text.disabled' }} /> : null}
      </Stack>

      <Stack spacing={0.25}>
        {loading ? (
          <Skeleton variant="text" width={64} sx={{ fontSize: '2rem' }} />
        ) : (
          <Typography
            variant="h2"
            component="p"
            sx={{ color: attention ? 'warning.main' : undefined }}
          >
            {/* An errored tile shows a dash, not a misleading 0. */}
            {error ? '—' : (value ?? 0)}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {caption ? (
          <Typography variant="caption" color="text.disabled" sx={{ pt: 0.5 }}>
            {caption}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );

  return (
    <Card
      sx={{
        height: '100%',
        // A 3px stripe down the leading edge. Cheap to scan across a row of
        // tiles, and it survives both colour schemes without needing an alpha
        // blend against an unknown background.
        borderLeftWidth: attention ? 3 : undefined,
        borderLeftStyle: attention ? 'solid' : undefined,
        borderLeftColor: attention ? 'warning.main' : undefined,
      }}
    >
      {href ? (
        <CardActionArea href={href} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}
