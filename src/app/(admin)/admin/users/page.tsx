'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import SearchField from '@/components/data/SearchField';
import FilterSelect from '@/components/data/FilterSelect';
import PaginationBar from '@/components/data/PaginationBar';
import DataTable from '@/components/data/DataTable';
import StatusChip from '@/components/data/StatusChip';
import { useAdminUsers } from '@/hooks/useUsers';
import { useListParams } from '@/hooks/useListParams';
import { formatDate } from '@/lib/format';
import { USER_ROLE, accountStatus } from '@/lib/status';
import type { Profile } from '@/lib/schemas/users.schema';
import { FEATURES } from '@/lib/features';

/**
 * Registered users. Read-only by design — see the note on the page itself.
 *
 * Structurally identical to the other admin list screens: `useListParams` for
 * state, `<QueryState>` for the four states, `<DataTable>` for the rows.
 */
export default function AdminUsersPage() {
  const list = useListParams({ role: '', deactivated: '' }, { pageSize: 20 });
  const users = useAdminUsers(list.queryParams);

  return (
    <PageContainer>
      <PageHeader title="Korisnici" description="Svi registrirani korisnici platforme." />

      <ContentCard disablePadding>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5, alignItems: { md: 'center' } }}
        >
          <Stack sx={{ flex: 1, minWidth: 0, maxWidth: { md: 360 } }}>
            <SearchField
              value={list.search}
              onChange={list.setSearch}
              placeholder="Pretraži po imenu ili email adresi…"
            />
          </Stack>

          <FilterSelect
            label="Uloga"
            value={list.filters.role}
            onChange={(value) => list.setFilter('role', value)}
            allLabel="Sve uloge"
            width={200}
            options={[
              { value: 'student', label: 'Studenti' },
              ...(FEATURES.teachers ? [{ value: 'teacher', label: 'Predavači' }] : []),
              { value: 'admin', label: 'Administratori' },
            ]}
          />

          <FilterSelect
            label="Status"
            value={list.filters.deactivated}
            onChange={(value) => list.setFilter('deactivated', value)}
            allLabel="Svi nalozi"
            width={200}
            options={[
              { value: 'false', label: 'Aktivni' },
              { value: 'true', label: 'Deaktivirani' },
            ]}
          />
        </Stack>

        <QueryState
          skeleton="table"
          query={users}
          errorTitle="Korisnike nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            list.hasActiveFilters ? (
              <EmptyState
                title="Nema rezultata"
                description="Nijedan korisnik ne odgovara zadanoj pretrazi."
              />
            ) : (
              <EmptyState
                title="Još nema registriranih korisnika"
                description="Korisnici se pojavljuju ovdje nakon registracije."
              />
            )
          }
        >
          {(page) => (
            <>
              <DataTable<Profile>
                rows={page.data}
                getRowId={(user) => user.id}
                onRowClick={(user) => `/admin/users/${user.id}`}
                columns={[
                  {
                    id: 'name',
                    header: 'Ime',
                    cell: (user) => (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {user.full_name}
                      </Typography>
                    ),
                  },
                  {
                    id: 'email',
                    header: 'Email',
                    cell: (user) => (
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    ),
                  },
                  {
                    id: 'role',
                    header: 'Uloga',
                    cell: (user) => <StatusChip {...USER_ROLE[user.role]} />,
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (user) => <StatusChip {...accountStatus(user.deactivated_at)} />,
                  },
                  {
                    id: 'created',
                    header: 'Registriran',
                    cell: (user) => (
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(user.created_at)}
                      </Typography>
                    ),
                  },
                ]}
              />

              <PaginationBar meta={page.meta} onChange={list.setPage} />
            </>
          )}
        </QueryState>
      </ContentCard>
    </PageContainer>
  );
}
