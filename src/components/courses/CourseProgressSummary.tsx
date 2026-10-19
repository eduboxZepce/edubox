'use client';

import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import { progressPercent } from '@/lib/courseAccess';
import { FEATURES } from '@/lib/features';

/**
 * How far through the course this student is. Replaces the price panel once
 * they own the course — the useful number changes from "what does it cost" to
 * "how much is left".
 */
export default function CourseProgressSummary({
  completedCount,
  moduleCount,
  courseCompleted,
  certificateReadableId,
}: {
  completedCount: number;
  moduleCount: number;
  courseCompleted: boolean;
  /**
   * Present once the certificate for this course exists. Optional because the
   * panel renders long before there is one, and for the moment between the
   * final module completing and the certificate query catching up.
   */
  certificateReadableId?: string;
}) {
  const percent = progressPercent(completedCount, moduleCount);

  return (
    <ContentCard>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Tvoj napredak
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
            <Typography variant="h2" component="p">
              {percent}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completedCount} od {moduleCount} modula
            </Typography>
          </Stack>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={percent}
          // Announced by screen readers as a labelled progress bar rather than
          // an anonymous one.
          aria-label="Napredak kroz obuku"
          sx={{ height: 8, borderRadius: 4 }}
        />

        {courseCompleted ? (
          <Alert
            severity="success"
            icon={<WorkspacePremiumOutlinedIcon fontSize="inherit" />}
            // The link only appears once the certificate is actually there, so
            // the alert never offers a button that would 404.
            action={
              FEATURES.certificates && certificateReadableId ? (
                <Button
                  href={`/certificates/${certificateReadableId}`}
                  size="small"
                  color="inherit"
                >
                  Otvori
                </Button>
              ) : undefined
            }
          >
            Svi moduli su završeni.
            {FEATURES.certificates ? ' Certifikat je izdan na tvoje ime.' : null}
          </Alert>
        ) : null}
      </Stack>
    </ContentCard>
  );
}
