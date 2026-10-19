'use client';

import * as React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import CertificateDelivery from '@/components/certificates/CertificateDelivery';
import PdfViewer from '@/components/student/PdfViewer';
import { useCertificate } from '@/hooks/useCertificates';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate } from '@/lib/format';
import { isStatus } from '@/lib/api/errorMessage';
import { FEATURES } from '@/lib/features';
import { surnameOf, verificationHref } from '@/lib/certificateVerification';
import { toast } from '@/store/useToastStore';

/**
 * One certificate — the page a student is sent to when they finish a course,
 * and the page anyone else lands on when they check whether it is genuine.
 *
 * ## Signed in only
 *
 * This page was briefly public, as a verification surface anyone could check a
 * number against. That was reversed: a certificate is private to the student it
 * belongs to, an admin, and the teacher whose course it was earned on. RLS
 * enforces exactly that trio, so the page does no authorization of its own — a
 * certificate that is not yours 404s before this renders.
 *
 * It lives in `(account)` because all three roles reach it, the same reason
 * notifications and settings live there.
 *
 * Addressed by `readable_id` (CERT-YYYY-NNNN) for the same reason courses are
 * addressed by slug: it is the form a person reads out. The endpoint accepts
 * the uuid too, so older links keep working.
 *
 * ## The owner sees two things more
 *
 * Only the student may ask for a printed copy, so only they get that panel.
 * They also get the public check link (`/provjera-certifikata?broj=…&prezime=…`)
 * to put on a CV — this page stays private, the link is how someone else
 * confirms the certificate without an account.
 * Staff looking at the same page see the document and nothing to act on.
 * `request-delivery` checks ownership itself; hiding the panel is presentation.
 */
export default function CertificatePage(props: PageProps<'/certificates/[certificateId]'>) {
  const { certificateId } = React.use(props.params);

  const certificateQuery = useCertificate(certificateId);
  const myId = useAuthStore((s) => s.profile?.id);

  // A bad or unknown identifier is a 404 by design — "not a valid certificate"
  // rather than a failure worth retrying or apologising for.
  // 404 covers both "no such number" and "not yours" — deliberately
  // indistinguishable, since telling them apart would confirm the id is real.
  if (certificateQuery.isError && isStatus(certificateQuery.error, 404)) {
    return (
      <PageContainer maxWidth="form">
        <ContentCard>
          <EmptyState
            title="Certifikat nije pronađen"
            description="Ovaj certifikat ne postoji ili nemate pristup njemu."
            icon={<WorkspacePremiumOutlinedIcon />}
            action={
              FEATURES.catalog ? (
                <Button href="/courses" variant="contained">
                  Pogledaj obuke
                </Button>
              ) : undefined
            }
          />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="form">
      <QueryState query={certificateQuery} errorTitle="Certifikat nije moguće učitati">
        {(certificate) => (
          <Stack spacing={3}>
            <ContentCard>
              <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                  }}
                >
                  <WorkspacePremiumOutlinedIcon sx={{ fontSize: 40 }} />
                </Box>

                <Stack spacing={0.5}>
                  <Typography variant="overline" color="text.secondary">
                    Certifikat o završenoj obuci
                  </Typography>
                  <Typography variant="h4" component="h1">
                    {certificate.courses?.name ?? 'Obuka više ne postoji'}
                  </Typography>
                </Stack>

                <Divider flexItem />

                <Stack spacing={2} sx={{ width: '100%' }}>
                  <Stack spacing={0.25}>
                    <Typography variant="caption" color="text.secondary">
                      Izdan na ime
                    </Typography>
                    <Typography variant="h6" component="p">
                      {certificate.profiles?.full_name ?? '—'}
                    </Typography>
                  </Stack>

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 2, sm: 4 }}
                    sx={{ justifyContent: 'center' }}
                  >
                    <Stack spacing={0.25}>
                      <Typography variant="caption" color="text.secondary">
                        Broj certifikata
                      </Typography>
                      {/* Monospace because this is the string somebody reads
                          out or types into the verification box. */}
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {certificate.readable_id}
                      </Typography>
                    </Stack>

                    <Stack spacing={0.25}>
                      <Typography variant="caption" color="text.secondary">
                        Datum izdavanja
                      </Typography>
                      <Typography variant="body1">{formatDate(certificate.created_at)}</Typography>
                    </Stack>
                  </Stack>
                </Stack>

                <Chip
                  icon={<CheckCircleIcon />}
                  label="Certifikat je važeći"
                  color="success"
                  variant="outlined"
                />
              </Stack>
            </ContentCard>

            {/*
              The document itself, rendered from the same route the download
              button points at — one source, so what you see is exactly what you
              get.

              `<PdfViewer>` is reused here even though it was written for module
              materials, whose whole policy is "never handed over". That is not
              a contradiction: the viewer is neutral machinery for drawing a PDF
              onto a canvas, and the policy lives in the route's
              `Content-Disposition` and in whether a download button is offered
              beside it. Here both say the opposite — this one is meant to be
              taken away.
            */}
            <ContentCard
              title="Dokument"
              description="A4 format, spreman za štampu."
              disablePadding
              actions={
                <Button
                  href={`/api/certificates/${certificate.readable_id}/pdf?download`}
                  startIcon={<DownloadOutlinedIcon />}
                  variant="contained"
                  size="small"
                >
                  Preuzmi PDF
                </Button>
              }
            >
              <PdfViewer
                src={`/api/certificates/${certificate.readable_id}/pdf`}
                title={`Certifikat ${certificate.readable_id}`}
              />
            </ContentCard>

            {/* Only the holder shares the check link; staff have no use for it. */}
            {FEATURES.certificates &&
            certificate.student_id === myId &&
            certificate.profiles?.full_name ? (
              <ContentCard
                title="Provjera za poslodavce"
                description="Ova stranica je privatna. Podijeli link ispod — svako ko ga otvori vidi da je certifikat važeći, bez prijave."
                actions={
                  <Button
                    startIcon={<ContentCopyOutlinedIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const href = verificationHref(
                        certificate.readable_id,
                        surnameOf(certificate.profiles!.full_name),
                      );
                      navigator.clipboard
                        .writeText(`${window.location.origin}${href}`)
                        .then(() => toast.success('Link za provjeru je kopiran.'))
                        .catch(() => toast.error('Kopiranje nije uspjelo.'));
                    }}
                  >
                    Kopiraj link
                  </Button>
                }
              >
                <Typography variant="body2" color="text.secondary">
                  Link sadrži broj certifikata i tvoje prezime. Bez oba podatka provjera ne
                  prikazuje ništa.
                </Typography>
              </ContentCard>
            ) : null}

            {/* Only the student may request a printed copy. */}
            {certificate.student_id === myId ? (
              <ContentCard title="Štampani primjerak">
                <CertificateDelivery certificate={certificate} />
              </ContentCard>
            ) : null}

            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
              <Button
                href={
                  certificate.student_id === myId
                    ? '/dashboard/certificates'
                    : '/admin/certificates'
                }
                startIcon={<SchoolOutlinedIcon />}
                color="inherit"
              >
                {certificate.student_id === myId ? 'Moji certifikati' : 'Svi certifikati'}
              </Button>
            </Stack>
          </Stack>
        )}
      </QueryState>
    </PageContainer>
  );
}
