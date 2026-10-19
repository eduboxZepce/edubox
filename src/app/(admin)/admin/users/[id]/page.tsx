'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import DetailList from '@/components/data/DetailList';
import DataTable from '@/components/data/DataTable';
import StatusChip from '@/components/data/StatusChip';
import UserAccountActions from '@/components/users/UserAccountActions';
import { useAdminUser } from '@/hooks/useUsers';
import { useAdminPurchases } from '@/hooks/usePurchases';
import { useAdminCertificates } from '@/hooks/useCertificates';
import { formatDateTime, formatPrice } from '@/lib/format';
import { PURCHASE_STATUS, USER_ROLE, accountStatus, deliveryStatus } from '@/lib/status';
import { isStatus } from '@/lib/api/errorMessage';
import type { AdminPurchase } from '@/lib/schemas/purchases.schema';
import type { AdminCertificate } from '@/lib/schemas/certificates.schema';
import { FEATURES } from '@/lib/features';

/**
 * One user, with everything the platform knows about them in one place.
 *
 * There is no dedicated "user activity" endpoint, and there doesn't need to be:
 * both the purchases and the certificates list endpoints accept a `studentId`
 * filter, so the related sections are just those same hooks scoped to this id.
 * Reach for an existing filter before asking for a new endpoint.
 */
export default function AdminUserDetailPage(props: PageProps<'/admin/users/[id]'>) {
  const { id } = React.use(props.params);

  const user = useAdminUser(id);
  const purchases = useAdminPurchases(
    { studentId: id, pageSize: 50 },
    { enabled: FEATURES.purchases },
  );
  const certificates = useAdminCertificates(
    { studentId: id, pageSize: 50 },
    { enabled: FEATURES.certificates },
  );

  if (user.isError && isStatus(user.error, 404)) {
    return (
      <PageContainer>
        <ContentCard>
          <EmptyState title="Korisnik nije pronađen" description="Ovaj nalog ne postoji." />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <QueryState skeleton="detail" query={user} errorTitle="Korisnika nije moguće učitati">
        {(profile) => (
          <>
            <PageHeader
              breadcrumbs={[
                { label: 'Korisnici', href: '/admin/users' },
                { label: profile.full_name },
              ]}
              title={profile.full_name}
              description={profile.email}
              actions={<UserAccountActions profile={profile} />}
            />

            {profile.deactivated_at ? (
              <Alert severity="warning">
                Ovaj nalog je deaktiviran {formatDateTime(profile.deactivated_at)} i trenutno se ne
                može prijaviti. Podaci su sačuvani.
              </Alert>
            ) : null}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <ContentCard title="Podaci o nalogu">
                  <DetailList
                    items={[
                      { label: 'Ime i prezime', value: profile.full_name },
                      { label: 'Email', value: profile.email },
                      { label: 'Uloga', value: <StatusChip {...USER_ROLE[profile.role]} /> },
                      {
                        label: 'Status naloga',
                        value: <StatusChip {...accountStatus(profile.deactivated_at)} />,
                      },
                      { label: 'Registriran', value: formatDateTime(profile.created_at) },
                      { label: 'Posljednja izmjena', value: formatDateTime(profile.updated_at) },
                      {
                        label: 'ID',
                        value: <Typography variant="caption">{profile.id}</Typography>,
                      },
                    ]}
                  />
                </ContentCard>
              </Grid>

              <Grid size={{ xs: 12, lg: 5 }}>
                <ContentCard title="Uloge i prava">
                  <Alert severity="info">
                    Email adresu mijenja sam korisnik kroz svoj nalog — ovdje se ne može izmijeniti.
                    {FEATURES.teachers
                      ? ' Predavač uređuje isključivo obuke koje posjeduje; ako mu oduzmete tu ulogu, odmah gubi pristup njihovom sadržaju, ali obuke ostaju sačuvane.'
                      : null}
                  </Alert>
                </ContentCard>
              </Grid>
            </Grid>

            {FEATURES.purchases ? (
              <ContentCard title="Zahtjevi za kupovinu" disablePadding>
                <QueryState
                  query={purchases}
                  errorTitle="Zahtjeve nije moguće učitati"
                  isEmpty={(page) => page.data.length === 0}
                  empty={
                    <EmptyState
                      title="Nema zahtjeva"
                      description="Ovaj korisnik još nije zatražio nijednu obuku."
                    />
                  }
                >
                  {(page) => (
                    <DataTable<AdminPurchase>
                      rows={page.data}
                      getRowId={(row) => row.id}
                      onRowClick={(row) => `/admin/purchases/${row.id}`}
                      columns={[
                        {
                          id: 'course',
                          header: 'Obuka',
                          cell: (row) => row.courses?.name ?? '—',
                        },
                        {
                          id: 'price',
                          header: 'Cijena',
                          align: 'right',
                          cell: (row) => formatPrice(row.price),
                        },
                        {
                          id: 'status',
                          header: 'Status',
                          cell: (row) => <StatusChip {...PURCHASE_STATUS[row.status]} />,
                        },
                        {
                          id: 'created',
                          header: 'Poslan',
                          cell: (row) => formatDateTime(row.created_at),
                        },
                      ]}
                    />
                  )}
                </QueryState>
              </ContentCard>
            ) : null}

            {FEATURES.certificates ? (
              <ContentCard title="Certifikati" disablePadding>
                <QueryState
                  query={certificates}
                  errorTitle="Certifikate nije moguće učitati"
                  isEmpty={(page) => page.data.length === 0}
                  empty={
                    <EmptyState
                      title="Nema certifikata"
                      description="Korisnik još nije završio nijednu obuku."
                    />
                  }
                >
                  {(page) => (
                    <DataTable<AdminCertificate>
                      rows={page.data}
                      getRowId={(row) => row.id}
                      onRowClick={(row) => `/admin/certificates/${row.id}`}
                      columns={[
                        { id: 'readable', header: 'Broj', cell: (row) => row.readable_id },
                        { id: 'course', header: 'Obuka', cell: (row) => row.courses?.name ?? '—' },
                        {
                          id: 'delivery',
                          header: 'Dostava',
                          cell: (row) => (
                            <StatusChip
                              {...deliveryStatus(row.requested_delivery, row.delivered_at)}
                            />
                          ),
                        },
                        {
                          id: 'created',
                          header: 'Izdan',
                          cell: (row) => formatDateTime(row.created_at),
                        },
                      ]}
                    />
                  )}
                </QueryState>
              </ContentCard>
            ) : null}
          </>
        )}
      </QueryState>
    </PageContainer>
  );
}
