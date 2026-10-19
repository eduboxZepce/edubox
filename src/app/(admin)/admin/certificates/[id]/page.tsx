'use client';

import * as React from 'react';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import DetailList from '@/components/data/DetailList';
import StatusChip from '@/components/data/StatusChip';
import CertificateDeliveryActions from '@/components/certificates/CertificateDeliveryActions';
import { useAdminCertificate } from '@/hooks/useCertificates';
import { formatDateTime } from '@/lib/format';
import { deliveryStatus } from '@/lib/status';
import { isStatus } from '@/lib/api/errorMessage';

/**
 * One certificate, and the delivery decision on it.
 *
 * The delivery panel appears only once a student has actually asked for a
 * printed copy — `requested_delivery` is their half of the exchange, and
 * `delivered_at` (migration 0024) is the admin's answer to it.
 */
export default function AdminCertificateDetailPage(props: PageProps<'/admin/certificates/[id]'>) {
  const { id } = React.use(props.params);
  const certificate = useAdminCertificate(id);

  if (certificate.isError && isStatus(certificate.error, 404)) {
    return (
      <PageContainer>
        <ContentCard>
          <EmptyState title="Certifikat nije pronađen" description="Ovaj certifikat ne postoji." />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <QueryState skeleton="detail" query={certificate} errorTitle="Certifikat nije moguće učitati">
        {(row) => (
          <>
            <PageHeader
              breadcrumbs={[
                { label: 'Certifikati', href: '/admin/certificates' },
                { label: row.readable_id },
              ]}
              title={row.readable_id}
              description={row.courses?.name ?? undefined}
              actions={
                <StatusChip
                  {...deliveryStatus(row.requested_delivery, row.delivered_at)}
                  size="medium"
                />
              }
            />

            {row.requested_delivery ? (
              row.delivered_at ? (
                <Alert severity="success" icon={<LocalShippingOutlinedIcon fontSize="inherit" />}>
                  <AlertTitle>Štampani certifikat je poslan</AlertTitle>
                  Poslano {formatDateTime(row.delivered_at)}
                  {row.deliverer ? ` — označio/la ${row.deliverer.full_name}` : ''}. Student je
                  obaviješten.
                </Alert>
              ) : (
                <ContentCard
                  title="Zahtjev za štampani certifikat"
                  description="Student je zatražio da mu se certifikat pošalje poštom. Označite kada je pošiljka predana."
                >
                  <CertificateDeliveryActions certificate={row} size="medium" />
                </ContentCard>
              )
            ) : null}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <ContentCard title="Student">
                  <DetailList
                    items={[
                      {
                        label: 'Ime i prezime',
                        value: row.profiles ? (
                          <Link href={`/admin/users/${row.profiles.id}`} underline="hover">
                            {row.profiles.full_name}
                          </Link>
                        ) : (
                          '—'
                        ),
                      },
                      { label: 'Email', value: row.profiles?.email ?? '—' },
                    ]}
                  />
                </ContentCard>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <ContentCard title="Obuka">
                  <DetailList
                    items={[
                      {
                        label: 'Naziv',
                        value: row.courses ? (
                          <Link href={`/courses/${row.courses.slug}`} underline="hover">
                            {row.courses.name}
                          </Link>
                        ) : (
                          '—'
                        ),
                      },
                    ]}
                  />
                </ContentCard>
              </Grid>
            </Grid>

            <ContentCard title="Detalji certifikata">
              <DetailList
                items={[
                  { label: 'Broj certifikata', value: row.readable_id },
                  {
                    label: 'Zahtjev za dostavu',
                    value: (
                      <StatusChip {...deliveryStatus(row.requested_delivery, row.delivered_at)} />
                    ),
                  },
                  {
                    label: 'Poslano',
                    value: formatDateTime(row.delivered_at),
                    hidden: !row.delivered_at,
                  },
                  {
                    label: 'Poslao/la',
                    value: row.deliverer?.full_name ?? '—',
                    hidden: !row.delivered_at,
                  },
                  { label: 'Izdan', value: formatDateTime(row.created_at) },
                  { label: 'Posljednja izmjena', value: formatDateTime(row.updated_at) },
                  {
                    label: 'ID',
                    value: <Typography variant="caption">{row.id}</Typography>,
                  },
                ]}
              />
            </ContentCard>
          </>
        )}
      </QueryState>
    </PageContainer>
  );
}
