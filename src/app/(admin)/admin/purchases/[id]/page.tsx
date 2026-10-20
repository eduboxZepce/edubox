'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
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
import PaymentReference from '@/components/purchases/PaymentReference';
import PurchaseActions from '@/components/purchases/PurchaseActions';
import { useAdminPurchase } from '@/hooks/usePurchases';
import { formatDateTime, formatPrice } from '@/lib/format';
import { PURCHASE_STATUS } from '@/lib/status';
import { isStatus } from '@/lib/api/errorMessage';

/**
 * One purchase request.
 *
 * Reachable from the list, from the user detail page, and as a shareable link —
 * which is the point of it existing alongside the inline row actions: an admin
 * can send a colleague a URL for a specific decision.
 */
export default function AdminPurchaseDetailPage(props: PageProps<'/admin/purchases/[id]'>) {
  const { id } = React.use(props.params);
  const purchase = useAdminPurchase(id);

  if (purchase.isError && isStatus(purchase.error, 404)) {
    return (
      <PageContainer>
        <ContentCard>
          <EmptyState title="Zahtjev nije pronađen" description="Ovaj zahtjev ne postoji." />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <QueryState skeleton="detail" query={purchase} errorTitle="Zahtjev nije moguće učitati">
        {(row) => {
          const studentName = row.profiles?.full_name ?? 'Nepoznat korisnik';

          return (
            <>
              <PageHeader
                breadcrumbs={[
                  { label: 'Zahtjevi za kupovinu', href: '/admin/purchases' },
                  { label: studentName },
                ]}
                title={row.courses?.name ?? 'Zahtjev za kupovinu'}
                description={`Zahtjev korisnika ${studentName}`}
                actions={<StatusChip {...PURCHASE_STATUS[row.status]} size="medium" />}
              />

              {row.status === 'requested' ? (
                <ContentCard
                  title="Odluka"
                  description="Odobravanje odmah otvara pristup svim modulima obuke."
                >
                  <PurchaseActions purchase={row} size="medium" />
                </ContentCard>
              ) : row.status === 'denied' ? (
                <Alert severity="info">
                  Zahtjev je odbijen. Student može poslati novi zahtjev za istu obuku.
                </Alert>
              ) : (
                <ContentCard
                  title="Pristup"
                  description={
                    row.status === 'approved'
                      ? 'Pristup je odobren. Student može otvarati module ove obuke.'
                      : 'Pristup je opozvan. Student ne može otvarati module, ali napredak i certifikati su sačuvani.'
                  }
                >
                  <PurchaseActions purchase={row} size="medium" />
                </ContentCard>
              )}

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
                        {
                          label: 'Cijena u trenutku zahtjeva',
                          value: formatPrice(row.price),
                        },
                      ]}
                    />
                  </ContentCard>
                </Grid>
              </Grid>

              <ContentCard title="Detalji zahtjeva">
                <DetailList
                  items={[
                    {
                      label: 'Poziv na broj',
                      value: <PaymentReference readableId={row.readable_id} variant="inline" />,
                    },
                    { label: 'Status', value: <StatusChip {...PURCHASE_STATUS[row.status]} /> },
                    { label: 'Zahtjev poslan', value: formatDateTime(row.created_at) },
                    { label: 'Posljednja izmjena', value: formatDateTime(row.updated_at) },
                    {
                      label: 'ID zahtjeva',
                      value: <Typography variant="caption">{row.id}</Typography>,
                    },
                  ]}
                />
              </ContentCard>
            </>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
