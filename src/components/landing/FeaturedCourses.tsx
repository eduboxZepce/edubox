'use client';

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import QueryState from '@/components/feedback/QueryState';
import CourseCard from '@/components/courses/CourseCard';
import Reveal from '@/components/landing/Reveal';
import Section from '@/components/landing/Section';
import { useCourses } from '@/hooks/useCourses';
import { useCategoryOptions } from '@/hooks/useCategories';

/**
 * "Šta trenutno možeš upisati" — the featured-courses grid on the landing page.
 *
 * Pulls the first 6 courses from `GET /api/courses`. There is no "featured"
 * flag on a course, so this is simply whatever the API returns first.
 *
 * A Client Component: `useCourses` / `useCategoryOptions` are client hooks.
 * Unlike `<Hero>` and `<StatsBar>`, which are server-rendered.
 *
 * It sits on the `paper` band — white against the page's grey — because it is
 * the one section made of cards, and cards need a surface to sit on that is not
 * the same colour as they are.
 *
 * The cards arrive staggered rather than together: six identical tiles fading
 * in at once reads as a flash, 60ms apart reads as a list being dealt out.
 */
export default function FeaturedCourses() {
  const courses = useCourses({ pageSize: 6 });
  const categories = useCategoryOptions();

  return (
    <QueryState
      query={courses}
      errorTitle="Kurseve nije moguće učitati"
      isEmpty={(page) => page.data.length === 0}
      empty={null}
    >
      {(page) => (
        <Section tone="paper">
          <Reveal>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, mb: 5 }}
            >
              <Stack spacing={1}>
                <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
                  Istaknuti kursevi
                </Typography>
                <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 38 } }}>
                  Šta trenutno možeš upisati
                </Typography>
              </Stack>

              <Button
                href="/courses"
                size="small"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, flexShrink: 0 }}
              >
                Svi kursevi
              </Button>
            </Stack>
          </Reveal>

          <Grid container spacing={3}>
            {page.data.map((course, index) => (
              <Grid key={course.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Reveal delay={index * 60} sx={{ height: '100%' }}>
                  <CourseCard
                    course={course}
                    href={`/courses/${course.slug}`}
                    categoryName={
                      course.category_id ? categories.names.get(course.category_id) : undefined
                    }
                  />
                </Reveal>
              </Grid>
            ))}
          </Grid>
        </Section>
      )}
    </QueryState>
  );
}
