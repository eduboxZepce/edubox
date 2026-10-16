import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AnimatedNumber from '@/components/landing/AnimatedNumber';
import Section from '@/components/landing/Section';
import { SITE } from '@/lib/siteConfig';

/**
 * Row of headline stats, shown directly under the hero.
 *
 * The figures come from `SITE.stats` in `src/lib/siteConfig.ts`. An empty
 * list renders nothing, which is how to hide the band until there are real
 * numbers to show.
 *
 * ## It used to be invisible
 *
 * The strip was painted `grey.50` (#fafafa) on a `background.default` page
 * (#f7f8fa). Those are the same colour to any eye, so what was meant to read as
 * a band read as four numbers loose on the page — and with only `pt` set, the
 * band ended flush against the bottom of the labels. It is now a `tint`
 * `<Section>`: a faint wash of the brand colour, which is the one place on the
 * page that gets it, and hairline rules between the figures so the four read as
 * a set rather than as a row of unrelated facts.
 *
 * Used once, directly after `<Hero />` in `(marketing)/page.tsx`.
 */
export default function StatsBar() {
  if (SITE.stats.length === 0) return null;

  // Four figures share a desktop row; fewer spread to fill it.
  const mdSize = 12 / Math.min(SITE.stats.length, 4);

  return (
    <Section tone="tint" py={{ xs: 5, md: 6 }}>
      <Grid container spacing={{ xs: 4, sm: 3 }}>
        {SITE.stats.map((stat, index) => (
          <Grid key={stat.label} size={{ xs: 6, md: mdSize }}>
            <Stack
              spacing={0.75}
              sx={{
                /*
                 * A rule to the left of every figure but the first. On mobile
                 * the grid is two columns, so the rule would land in the middle
                 * of the row for items 1 and 3 — hence the breakpoint. Drawn as
                 * a border rather than a <Divider> so it stretches with the
                 * cell instead of needing a fixed height.
                 */
                pl: { xs: 0, md: index === 0 ? 0 : 3 },
                borderLeft: { xs: 0, md: index === 0 ? 0 : 1 },
                borderColor: { md: 'divider' },
              }}
            >
              <Typography
                variant="h1"
                // Display size only: the page's one <h1> is the hero headline.
                component="p"
                color="primary"
                sx={{ fontWeight: 700, fontSize: { xs: 34, md: 44 }, lineHeight: 1 }}
              >
                <AnimatedNumber
                  target={stat.value}
                  suffix={stat.suffix ?? ''}
                  thousands={stat.value >= 1000}
                />
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ letterSpacing: 0.5, fontWeight: 600 }}
              >
                {stat.label}
              </Typography>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}
