'use client';

import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import PaginationBar from '@/components/data/PaginationBar';
import StatusChip from '@/components/data/StatusChip';
import { useCertificates } from '@/hooks/useCertificates';
import { useListParams } from '@/hooks/useListParams';
import { formatDate } from '@/lib/format';
import { deliveryStatus } from '@/lib/status';

/**
 * The certificates this student has earned.
 *
 * Issued automatically — the existence of the row *is* the "course completed"
 * signal, written by whichever route completed the final module. Nothing on
 * this page creates one; it only lists them.
 *
 * Each row links by `readable_id` rather than uuid, so the URL is the same one
 * that appears in the completion notification and the same one the student
 * would read out. The certificate page itself is signed-in only, and admits the
 * student, an admin, and the teacher who owns the course.
 */
export default function StudentCertificatesPage() {
  const list = useListParams({}, { pageSize: 20 });
  const certificates = useCertificates(list.queryParams);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Kontrolna ploča', href: '/dashboard' }, { label: 'Certifikati' }]}
        title="Certifikati"
        description="Izdaju se automatski kada završite sve module obuke."
      />

      <ContentCard disablePadding>
        <QueryState
          query={certificates}
          errorTitle="Certifikate nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            <EmptyState
              icon={<WorkspacePremiumOutlinedIcon />}
              title="Još nemate certifikate"
              description="Završite sve module jedne obuke i certifikat stiže sam."
              action={
                <Button href="/dashboard/courses" variant="contained">
                  Moje obuke
                </Button>
              }
            />
          }
        >
          {(page) => (
            <>
              <Stack divider={<Divider />}>
                {page.data.map((certificate) => (
                  <Stack
                    key={certificate.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1, sm: 2 }}
                    sx={{ px: 3, py: 2, alignItems: { sm: 'center' } }}
                  >
                    <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {certificate.courses?.name ?? 'Obuka više ne postoji'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Broj: {certificate.readable_id} · {formatDate(certificate.created_at)}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: 'center', flexShrink: 0 }}
                    >
                      <StatusChip
                        {...deliveryStatus(
                          certificate.requested_delivery,
                          certificate.delivered_at,
                        )}
                        size="small"
                      />
                      <Button
                        href={`/certificates/${certificate.readable_id}`}
                        size="small"
                        variant="outlined"
                      >
                        Otvori
                      </Button>
                    </Stack>
                  </Stack>
                ))}
              </Stack>

              <PaginationBar meta={page.meta} onChange={list.setPage} />
            </>
          )}
        </QueryState>
      </ContentCard>
    </PageContainer>
  );
}
