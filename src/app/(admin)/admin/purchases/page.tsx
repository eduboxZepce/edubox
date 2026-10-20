'use client';

import * as React from 'react';

import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import PaginationBar from '@/components/data/PaginationBar';
import DataTable from '@/components/data/DataTable';
import SearchField from '@/components/data/SearchField';
import FilterSelect from '@/components/data/FilterSelect';
import StatusChip from '@/components/data/StatusChip';
import PaymentReference from '@/components/purchases/PaymentReference';
import PurchaseActions from '@/components/purchases/PurchaseActions';
import { useAdminPurchases } from '@/hooks/usePurchases';
import { useListParams } from '@/hooks/useListParams';
import { formatDateTime, formatPrice } from '@/lib/format';
import { PURCHASE_STATUS } from '@/lib/status';
import type { AdminPurchase } from '@/lib/schemas/purchases.schema';

/**
 * Purchase requests, with approve/deny inline.
 *
 * Defaults to the `requested` filter: this page exists to clear a queue, and
 * opening it on "everything" would bury the rows that actually need a decision.
 * The filter is still visible and changeable, so nothing is hidden.
 *
 * No search box — the endpoint's `search` param has nothing sensible to match
 * on a purchase row. Filtering is by status instead.
 */
export default function AdminPurchasesPage(props: PageProps<'/admin/purchases'>) {
  /*
   * Scoped to one course when arrived at from that course's overview page.
   * Read from the URL rather than held in state so the link is shareable and
   * the back button behaves — and so the StatCard that points here is telling
   * the truth about what it will show.
   */
  const { courseId } = React.use(props.searchParams);
  const scopedCourseId = typeof courseId === 'string' ? courseId : undefined;
  const list = useListParams({ status: 'requested' }, { pageSize: 20 });
  const purchases = useAdminPurchases({
    ...list.queryParams,
    ...(scopedCourseId ? { courseId: scopedCourseId } : {}),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Zahtjevi za kupovinu"
        description="Odobravanje pristupa obukama. Odobrite tek nakon što je uplata potvrđena."
      />

      <ContentCard disablePadding>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5, alignItems: { md: 'center' } }}
        >
          <Stack sx={{ flex: 1, minWidth: 0, maxWidth: { md: 280 } }}>
            <SearchField
              value={list.search}
              onChange={list.setSearch}
              placeholder="Pretraži po pozivu na broj"
            />
          </Stack>

          <FilterSelect
            label="Status"
            value={list.filters.status}
            onChange={(value) => list.setFilter('status', value)}
            allLabel="Svi statusi"
            options={[
              { value: 'requested', label: 'Na čekanju' },
              { value: 'approved', label: 'Odobreni' },
              { value: 'denied', label: 'Odbijeni' },
              { value: 'revoked', label: 'Opozvani' },
            ]}
          />

          {/* A filter the bar cannot clear would look like a bug, so the
              scope announces itself and offers the way out. */}
          {scopedCourseId ? (
            <Chip
              label="Filtrirano po obuci"
              size="small"
              variant="outlined"
              onDelete={undefined}
              // `component`/`href` is safe on Chip — it is ButtonBase-based, so
              // the theme swaps in NextLink on its own.
              component="a"
              href="/admin/purchases"
              clickable
            />
          ) : null}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: { md: 'auto' }, flexShrink: 0 }}
          >
            {purchases.data ? `Ukupno: ${purchases.data.meta.total}` : null}
          </Typography>
        </Stack>

        <QueryState
          skeleton="table"
          query={purchases}
          errorTitle="Zahtjeve nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            list.filters.status === 'requested' ? (
              <EmptyState
                title="Nema zahtjeva na čekanju"
                description="Svi zahtjevi su obrađeni. Promijenite filter da vidite ranije odluke."
              />
            ) : (
              <EmptyState
                title="Nema zahtjeva"
                description="Nijedan zahtjev ne odgovara izabranom filteru."
              />
            )
          }
        >
          {(page) => (
            <>
              <DataTable<AdminPurchase>
                rows={page.data}
                getRowId={(row) => row.id}
                onRowClick={(row) => `/admin/purchases/${row.id}`}
                columns={[
                  {
                    id: 'reference',
                    header: 'Poziv na broj',
                    // Stops the copy button from also triggering the row's
                    // navigation to the detail page.
                    cell: (row) => (
                      <Box onClick={(event) => event.stopPropagation()}>
                        <PaymentReference readableId={row.readable_id} variant="inline" />
                      </Box>
                    ),
                  },
                  {
                    id: 'student',
                    header: 'Student',
                    cell: (row) => (
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.profiles?.full_name ?? 'Nepoznat korisnik'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.profiles?.email ?? '—'}
                        </Typography>
                      </Stack>
                    ),
                  },
                  {
                    id: 'course',
                    header: 'Obuka',
                    cell: (row) => (
                      <Typography variant="body2">{row.courses?.name ?? '—'}</Typography>
                    ),
                  },
                  {
                    id: 'price',
                    header: 'Cijena',
                    align: 'right',
                    cell: (row) => (
                      <Typography variant="body2">{formatPrice(row.price)}</Typography>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row) => <StatusChip {...PURCHASE_STATUS[row.status]} />,
                  },
                  {
                    id: 'created',
                    header: 'Poslan',
                    cell: (row) => (
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(row.created_at)}
                      </Typography>
                    ),
                  },
                  {
                    id: 'actions',
                    header: '',
                    align: 'right',
                    width: 220,
                    cell: (row) => (
                      // Stops a click on an action from also navigating to
                      // the detail page via the row's own click handler.
                      <Stack
                        direction="row"
                        sx={{ justifyContent: 'flex-end' }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <PurchaseActions purchase={row} />
                      </Stack>
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
