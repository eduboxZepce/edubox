'use client';

import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCourseProgress } from '@/hooks/useProgress';
import { pluralBs } from '@/lib/format';
import { courseThumbnailUrl } from '@/lib/storage';

/**
 * One enrolled course on the student dashboard, with how far through it they are.
 *
 * ## Why the card fetches its own progress
 *
 * Progress is course-scoped (`/api/courses/:id/progress`) — there is no endpoint
 * that returns it for several courses at once. Hooks cannot run in a loop, so
 * the dashboard renders one of these per course and each asks for its own. With
 * a handful of enrolments that is a handful of parallel requests, all cached by
 * React Query.
 *
 * If a student ever has dozens of courses, that is the point to add a batched
 * endpoint — not to restructure this.
 *
 * The card stays useful while progress is loading: the title, image and link all
 * come from the purchase, so only the bar is deferred.
 */
export default function StudentCourseCard({
  course,
}: {
  course: { id: string; name: string; slug: string; thumbnail_path: string | null };
}) {
  const progress = useCourseProgress(course.id);

  const thumbnail = courseThumbnailUrl(course.thumbnail_path);
  const data = progress.data;

  const completed = data?.completed_count ?? 0;
  const total = data?.module_count ?? 0;
  // Guard the divide: a course with no modules yet would otherwise be NaN%.
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const started = completed > 0;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          aspectRatio: '16 / 9',
          bgcolor: 'action.hover',
          display: 'grid',
          placeItems: 'center',
          color: 'text.disabled',
          overflow: 'hidden',
        }}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ImageOutlinedIcon sx={{ fontSize: 40 }} />
        )}
      </Box>

      <Stack spacing={1.5} sx={{ p: 2.5, flex: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="subtitle1" sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
            {course.name}
          </Typography>

          {data?.course_completed ? (
            <Chip label="Završeno" size="small" color="success" variant="outlined" />
          ) : null}
        </Stack>

        <Box sx={{ flex: 1 }} />

        {progress.isPending ? (
          <Skeleton variant="rounded" height={22} />
        ) : progress.isError ? (
          <Typography variant="caption" color="text.secondary">
            Napredak trenutno nije dostupan.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {completed} / {total} {pluralBs(total, 'modul', 'modula', 'modula')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {percent}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={percent}
              color={data?.course_completed ? 'success' : 'primary'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Stack>
        )}

        <Button href={`/courses/${course.slug}`} variant="contained" fullWidth>
          {data?.course_completed ? 'Pregledaj obuku' : started ? 'Nastavi' : 'Započni'}
        </Button>
      </Stack>
    </Card>
  );
}
