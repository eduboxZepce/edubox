'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SupportOutlinedIcon from '@mui/icons-material/SupportOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/data/StatCard';
import { usePurchases } from '@/hooks/usePurchases';
import { useCertificates } from '@/hooks/useCertificates';
import { useIssues } from '@/hooks/useIssues';
import { FEATURES } from '@/lib/features';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * The student's home screen — a way *to* things, not the things themselves.
 *
 * ## Why it is a hub and not a wall
 *
 * It used to stack enrolments, pending requests and certificates on one page.
 * Each of those grows independently, and a student with a dozen courses and
 * half a dozen certificates got a screen they had to scroll to navigate. Worse,
 * none of the three sections had a URL of its own, so nothing could be linked
 * to or bookmarked.
 *
 * ## Built from `<StatCard>`, like the admin dashboard
 *
 * The tiles were hand-rolled cards: icon, heading, a sentence, and a count
 * rendered as prose ("2 zahtjeva čeka"). Four of them side by side had no
 * visual hierarchy — every card was a wall of similar-weight text, so the eye
 * had nowhere to land and the numbers, which are the whole point, were the
 * least prominent thing on each one.
 *
 * They are now the same component the admin dashboard uses, which leads with
 * the number. Two things fall out of that: the screens look like one product
 * rather than two, and the near-duplicate card markup is gone.
 *
 * ## The counts are the point
 *
 * A menu of four identical cards tells you nothing; "2" versus "0" is what
 * decides whether you click. Each tile runs its own `pageSize: 1` query and
 * reads `meta.total` — the standing answer to needing a count rather than rows.
 */
export default function StudentDashboardPage() {
  const profile = useAuthStore((s) => s.profile);

  const enrolled = usePurchases({ status: 'approved', pageSize: 1 });
  const pending = usePurchases({ status: 'requested', pageSize: 1 });
  const certificates = useCertificates({ pageSize: 1 });
  const openIssues = useIssues({ status: 'open', pageSize: 1 });

  return (
    <PageContainer>
      <PageHeader
        title={profile ? `Zdravo, ${profile.full_name}` : 'Kontrolna ploča'}
        description="Sve na jednom mjestu — izaberite gdje želite nastaviti."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Moje obuke"
            caption="Pristup i napredak"
            value={enrolled.data?.meta.total}
            icon={LibraryBooksOutlinedIcon}
            href="/dashboard/courses"
            loading={enrolled.isPending}
            error={enrolled.isError}
          />
        </Grid>

        {FEATURES.purchases ? (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Zahtjevi na čekanju"
              caption="Uplate i pozivi na broj"
              value={pending.data?.meta.total}
              icon={ReceiptLongOutlinedIcon}
              href="/dashboard/purchases"
              loading={pending.isPending}
              error={pending.isError}
              // The one tile that means "something of yours is unresolved".
              highlight
            />
          </Grid>
        ) : null}

        {FEATURES.certificates ? (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Certifikati"
              caption="Završene obuke"
              value={certificates.data?.meta.total}
              icon={WorkspacePremiumOutlinedIcon}
              href="/dashboard/certificates"
              loading={certificates.isPending}
              error={certificates.isError}
            />
          </Grid>
        ) : null}

        {FEATURES.support ? (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Podrška"
              caption="Otvoreni zahtjevi"
              value={openIssues.data?.meta.total}
              icon={SupportOutlinedIcon}
              href="/issues"
              loading={openIssues.isPending}
              error={openIssues.isError}
            />
          </Grid>
        ) : null}
      </Grid>

      {/*
        The catalogue lives here and nowhere else. It used to sit in the header
        of every student page, where it was noise on the four screens you did
        not open to go shopping.

        Below the tiles rather than above them, and a slim banner rather than a
        block: a returning student is here for their own material, and the one
        link that leads *out* of it should not be the first or largest thing on
        the page.
      */}
      {FEATURES.catalog ? (
        <Card
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            backgroundImage: 'none',
            border: 'none',
          }}
        >
          <CardActionArea href="/courses" sx={{ px: 3, py: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <ExploreOutlinedIcon />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ color: 'inherit', fontWeight: 700 }}>
                  Pregledaj obuke
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Pronađite novu obuku u katalogu i zatražite pristup.
                </Typography>
              </Box>
              <ArrowForwardIcon fontSize="small" />
            </Stack>
          </CardActionArea>
        </Card>
      ) : null}
    </PageContainer>
  );
}
