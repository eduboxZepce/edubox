'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import FilterSelect from '@/components/data/FilterSelect';
import PaginationBar from '@/components/data/PaginationBar';
import DataTable from '@/components/data/DataTable';
import SearchField from '@/components/data/SearchField';
import StatusChip from '@/components/data/StatusChip';
import { useIssues } from '@/hooks/useIssues';
import { useListParams } from '@/hooks/useListParams';
import { formatRelativeTime, pluralBs } from '@/lib/format';
import { ISSUE_STATUS } from '@/lib/status';
import type { Issue } from '@/lib/schemas/issues.schema';

/**
 * The support queue.
 *
 * Defaults to `open` for the same reason purchases defaults to `requested` and
 * submissions to `pending` — this is a list to clear, and starting on
 * "everything" buries what needs answering under everything already settled.
 *
 * Admin-only, and that is a database rule rather than a nav one: `issues`
 * grants SELECT to the reporter and to admins, nobody else. A teacher who typed
 * this URL would see an empty list, because an issue may be about them.
 *
 * Same endpoint as the user-facing "my issues" screen; RLS is what makes it
 * return everything here and only your own there.
 */
export default function AdminIssuesPage() {
  const list = useListParams({ status: 'open' }, { pageSize: 20 });
  const issues = useIssues(list.queryParams);

  return (
    <PageContainer>
      <PageHeader title="Podrška" description="Pitanja i problemi koje su korisnici poslali." />

      <ContentCard disablePadding>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5, alignItems: { md: 'center' } }}
        >
          <Stack sx={{ flex: 1, minWidth: 0, maxWidth: { md: 320 } }}>
            <SearchField
              value={list.search}
              onChange={list.setSearch}
              placeholder="Pretraži po naslovu"
            />
          </Stack>

          <FilterSelect
            label="Status"
            value={list.filters.status}
            onChange={(value) => list.setFilter('status', value)}
            allLabel="Svi zahtjevi"
            options={[
              { value: 'open', label: 'Otvoreni' },
              { value: 'answered', label: 'Odgovoreni' },
              { value: 'closed', label: 'Zatvoreni' },
            ]}
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: { md: 'auto' }, flexShrink: 0 }}
          >
            {issues.data ? `Ukupno: ${issues.data.meta.total}` : null}
          </Typography>
        </Stack>

        <QueryState
          skeleton="table"
          query={issues}
          errorTitle="Zahtjeve nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            list.filters.status === 'open' ? (
              <EmptyState
                title="Nema otvorenih zahtjeva"
                description="Sve je obrađeno. Promijenite filter da vidite ranije zahtjeve."
              />
            ) : (
              <EmptyState
                title="Nema zahtjeva"
                description="Nijedan zahtjev ne odgovara zadanoj pretrazi i filteru."
              />
            )
          }
        >
          {(page) => (
            <>
              <DataTable<Issue>
                rows={page.data}
                getRowId={(row) => row.id}
                onRowClick={(row) => `/admin/issues/${row.id}`}
                columns={[
                  {
                    id: 'subject',
                    header: 'Naslov',
                    cell: (row) => (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.subject}
                      </Typography>
                    ),
                  },
                  {
                    id: 'reporter',
                    header: 'Korisnik',
                    cell: (row) => (
                      <Stack spacing={0.25}>
                        <Typography variant="body2">
                          {row.profiles?.full_name ?? 'Nepoznat korisnik'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.profiles?.email ?? '—'}
                        </Typography>
                      </Stack>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row) => <StatusChip {...ISSUE_STATUS[row.status]} />,
                  },
                  {
                    id: 'messages',
                    header: 'Poruke',
                    align: 'right',
                    cell: (row) => (
                      <Typography variant="body2" color="text.secondary">
                        {row.message_count ?? 0}{' '}
                        {pluralBs(row.message_count ?? 0, 'poruka', 'poruke', 'poruka')}
                      </Typography>
                    ),
                  },
                  {
                    id: 'created',
                    header: 'Poslano',
                    cell: (row) => (
                      <Typography variant="body2" color="text.secondary">
                        {formatRelativeTime(row.created_at)}
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
