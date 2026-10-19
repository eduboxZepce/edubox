'use client';

import AddIcon from '@mui/icons-material/Add';
import SupportOutlinedIcon from '@mui/icons-material/SupportOutlined';
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
import { useIssues } from '@/hooks/useIssues';
import { useListParams } from '@/hooks/useListParams';
import { formatRelativeTime } from '@/lib/format';
import { ISSUE_STATUS } from '@/lib/status';

/**
 * "My issues" — every question or problem this person has raised.
 *
 * The same endpoint the admin queue uses; RLS narrows it to the caller's own
 * rows, so there is no separate student-scoped route to keep in step.
 *
 * Lives in `(account)` because every role can raise one, including admins and
 * teachers — the same reason notifications and settings live there.
 */
export default function MyIssuesPage() {
  const list = useListParams({ status: '' }, { pageSize: 20 });
  const issues = useIssues(list.queryParams);

  return (
    <PageContainer>
      <PageHeader
        title="Podrška"
        description="Pitanja i problemi koje ste poslali administratorima."
        actions={
          <Button href="/issues/new" variant="contained" startIcon={<AddIcon />}>
            Novi zahtjev
          </Button>
        }
      />

      <ContentCard disablePadding>
        <QueryState
          skeleton="table"
          query={issues}
          errorTitle="Zahtjeve nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            <EmptyState
              icon={<SupportOutlinedIcon />}
              title="Nemate nijedan zahtjev"
              description="Ako naiđete na problem ili imate pitanje, javite nam se — odgovaramo u istoj prepisci."
              action={
                <Button href="/issues/new" variant="contained" startIcon={<AddIcon />}>
                  Novi zahtjev
                </Button>
              }
            />
          }
        >
          {(page) => (
            <>
              <Stack divider={<Divider />}>
                {page.data.map((issue) => (
                  <Stack
                    key={issue.id}
                    component="a"
                    href={`/issues/${issue.id}`}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1, sm: 2 }}
                    sx={{
                      px: 3,
                      py: 2,
                      alignItems: { sm: 'center' },
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {issue.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Poslano {formatRelativeTime(issue.created_at)}
                        {issue.message_count ? ` · ${issue.message_count} poruka` : ''}
                      </Typography>
                    </Stack>
                    <StatusChip {...ISSUE_STATUS[issue.status]} size="small" />
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
