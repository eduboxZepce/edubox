'use client';

import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import PaginationBar from '@/components/data/PaginationBar';
import FilterSelect from '@/components/data/FilterSelect';
import StatusChip from '@/components/data/StatusChip';
import PaymentReference from '@/components/purchases/PaymentReference';
import { usePurchases } from '@/hooks/usePurchases';
import { useListParams } from '@/hooks/useListParams';
import { formatDate, formatPrice } from '@/lib/format';
import { PURCHASE_STATUS } from '@/lib/status';
import { FEATURES } from '@/lib/features';

/**
 * Every request this student has made, and where each one stands.
 *
 * ## Denied requests are shown here, unlike on the old dashboard
 *
 * The dashboard hid them deliberately: a rejected row on a home screen is a
 * standing reminder with nothing attached to it. On a page that exists to *be*
 * the history, hiding them would be the wrong call — this is where a student
 * comes to ask "what happened to that one", and the answer has to include the
 * ones that were turned down. They can request again from the course page; the
 * unique index in migration 0009 excludes denied rows precisely so they can.
 *
 * ## The payment reference is the reason this page matters
 *
 * Payment happens outside the app. `readable_id` is what the student quotes on
 * the transfer, so a pending request without its reference visible is a request
 * they cannot actually pay for.
 */
export default function StudentPurchasesPage() {
  const list = useListParams({ status: '' }, { pageSize: 20 });
  const purchases = usePurchases(list.queryParams);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Kontrolna ploča', href: '/dashboard' }, { label: 'Kupovine' }]}
        title="Kupovine"
        description="Zahtjevi za pristup obukama i status svakog od njih."
      />

      <ContentCard disablePadding>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5, alignItems: { md: 'center' } }}
        >
          <FilterSelect
            label="Status"
            value={list.filters.status}
            onChange={(value) => list.setFilter('status', value)}
            allLabel="Sve kupovine"
            options={[
              { value: 'requested', label: 'Na čekanju' },
              { value: 'approved', label: 'Odobrene' },
              { value: 'denied', label: 'Odbijene' },
              { value: 'revoked', label: 'Opozvane' },
            ]}
          />
        </Stack>

        <QueryState
          query={purchases}
          errorTitle="Kupovine nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            <EmptyState
              title="Još niste zatražili nijednu obuku"
              description={
                FEATURES.catalog
                  ? 'Pronađite obuku u katalogu i pošaljite zahtjev za pristup.'
                  : undefined
              }
              action={
                FEATURES.catalog ? (
                  <Button href="/courses" variant="contained" startIcon={<ExploreOutlinedIcon />}>
                    Pregledaj obuke
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(page) => (
            <>
              <Stack divider={<Divider />}>
                {page.data.map((purchase) => (
                  <Stack key={purchase.id} spacing={1.5} sx={{ px: 3, py: 2.5 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 1, sm: 2 }}
                      sx={{ alignItems: { sm: 'center' } }}
                    >
                      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {purchase.courses ? (
                            <Link href={`/courses/${purchase.courses.slug}`} underline="hover">
                              {purchase.courses.name}
                            </Link>
                          ) : (
                            'Obuka više ne postoji'
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatPrice(purchase.price)} · {formatDate(purchase.created_at)}
                        </Typography>
                      </Stack>

                      <StatusChip {...PURCHASE_STATUS[purchase.status]} />
                    </Stack>

                    {/* Only while it is still waiting to be paid. Once approved
                        the reference has done its job, and on a denied request
                        it would invite a transfer against a request nobody is
                        going to honour. */}
                    {purchase.status === 'requested' ? (
                      <PaymentReference readableId={purchase.readable_id} />
                    ) : null}

                    {purchase.status === 'denied' ? (
                      <Alert severity="warning">
                        Ovaj zahtjev je odbijen. Možete poslati novi sa stranice obuke.
                      </Alert>
                    ) : null}

                    {purchase.status === 'revoked' ? (
                      <Alert severity="warning">
                        Pristup ovoj obuci je opozvan. Vaš napredak je sačuvan; za pomoć se javite
                        podršci.
                      </Alert>
                    ) : null}
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
