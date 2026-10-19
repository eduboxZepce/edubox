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
import { useAdminCertificates } from '@/hooks/useCertificates';
import { useListParams } from '@/hooks/useListParams';
import { formatDateTime } from '@/lib/format';
import { deliveryStatus } from '@/lib/status';
import CertificateDeliveryActions from '@/components/certificates/CertificateDeliveryActions';
import type { AdminCertificate } from '@/lib/schemas/certificates.schema';

/**
 * Issued certificates and physical-delivery requests.
 *
 * Fulfilment is tracked properly since migration 0024 added `delivered_at`.
 * Before that this screen was read-only and said so, because the flag it could
 * see (`requested_delivery`) is the *student's* and there was nowhere to record
 * an answer — the note is kept in the history rather than the code, but the
 * shape of the fix is worth remembering: a missing action was a missing column,
 * not a missing button.
 *
 * Defaults to the delivery queue — students waiting on a printed copy — for the
 * same reason purchases defaults to `requested`. Most rows here need nothing
 * doing, and showing them all buries the handful that do.
 *
 * Search matches `readable_id` (CERT-YYYY-NNNN) only; that's what the endpoint
 * filters on.
 */
export default function AdminCertificatesPage() {
  const list = useListParams({ requestedDelivery: 'true', delivered: 'false' }, { pageSize: 20 });
  const certificates = useAdminCertificates(list.queryParams);

  return (
    <PageContainer>
      <PageHeader
        title="Certifikati"
        description="Certifikati izdani po završetku obuke i zahtjevi za štampanu verziju."
      />

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
              placeholder="Pretraži po broju (CERT-…)"
            />
          </Stack>

          {/*
            Two database columns behind one control, because "asked for it but
            hasn't got it" is a single question to the person doing the work,
            and making them combine two dropdowns to ask it would be busywork.
          */}
          <FilterSelect
            label="Dostava"
            // Two columns behind one control: "asked for it but hasn't got it"
            // is a single question to whoever is doing the posting, and making
            // them combine two dropdowns to ask it would be busywork. Every
            // option is explicit, so there is no "all" entry.
            value={`${list.filters.requestedDelivery}:${list.filters.delivered}`}
            onChange={(value) => {
              const [requested, delivered] = value.split(':');
              list.setFilter('requestedDelivery', requested);
              list.setFilter('delivered', delivered);
            }}
            width={260}
            options={[
              { value: 'true:false', label: 'Čeka slanje' },
              { value: 'true:true', label: 'Poslano' },
              { value: 'true:', label: 'Svi sa zahtjevom' },
              { value: 'false:', label: 'Bez zahtjeva' },
              { value: ':', label: 'Svi certifikati' },
            ]}
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: { md: 'auto' }, flexShrink: 0 }}
          >
            {certificates.data ? `Ukupno: ${certificates.data.meta.total}` : null}
          </Typography>
        </Stack>

        <QueryState
          skeleton="table"
          query={certificates}
          errorTitle="Certifikate nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            list.filters.requestedDelivery === 'true' && list.filters.delivered === 'false' ? (
              <EmptyState
                title="Nema certifikata koji čekaju slanje"
                description="Svi zahtjevi za štampani primjerak su obrađeni. Promijenite filter da vidite ostale."
              />
            ) : list.hasActiveFilters ? (
              <EmptyState
                title="Nema rezultata"
                description="Nijedan certifikat ne odgovara zadanoj pretrazi i filteru."
              />
            ) : (
              <EmptyState
                title="Još nema izdanih certifikata"
                description="Certifikat se izdaje automatski kada student završi sve module obuke."
              />
            )
          }
        >
          {(page) => (
            <>
              <DataTable<AdminCertificate>
                rows={page.data}
                getRowId={(row) => row.id}
                onRowClick={(row) => `/admin/certificates/${row.id}`}
                columns={[
                  {
                    id: 'readable',
                    header: 'Broj certifikata',
                    cell: (row) => (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.readable_id}
                      </Typography>
                    ),
                  },
                  {
                    id: 'student',
                    header: 'Student',
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
                    id: 'course',
                    header: 'Obuka',
                    cell: (row) => (
                      <Typography variant="body2">{row.courses?.name ?? '—'}</Typography>
                    ),
                  },
                  {
                    id: 'delivery',
                    header: 'Dostava',
                    cell: (row) => (
                      <StatusChip {...deliveryStatus(row.requested_delivery, row.delivered_at)} />
                    ),
                  },
                  {
                    id: 'created',
                    header: 'Izdan',
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
                    width: 72,
                    // Only where there is something to fulfil. A certificate
                    // nobody asked to have posted has no delivery state worth
                    // setting, and a button on every row would say otherwise.
                    cell: (row) =>
                      row.requested_delivery ? (
                        // Stops the click from also following the row's own
                        // navigation to the detail page.
                        <Stack
                          direction="row"
                          sx={{ justifyContent: 'flex-end' }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <CertificateDeliveryActions certificate={row} compact />
                        </Stack>
                      ) : null,
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
