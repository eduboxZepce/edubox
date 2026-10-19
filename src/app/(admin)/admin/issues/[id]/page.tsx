'use client';

import * as React from 'react';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import DetailList from '@/components/data/DetailList';
import StatusChip from '@/components/data/StatusChip';
import IssueThread from '@/components/issues/IssueThread';
import { useCreateIssueMessage, useIssue } from '@/hooks/useIssues';
import { errorMessage, isStatus } from '@/lib/api/errorMessage';
import { formatDateTime } from '@/lib/format';
import { ISSUE_STATUS } from '@/lib/status';
import { toast } from '@/store/useToastStore';
import type { IssueStatus } from '@/lib/schemas/issues.schema';

/** What the reply does to the request. `answered` is the ordinary case. */
const OUTCOMES: { value: IssueStatus; label: string }[] = [
  { value: 'answered', label: 'Odgovoreno' },
  { value: 'open', label: 'Ostavi otvoren' },
  { value: 'closed', label: 'Zatvori' },
];

/**
 * One issue, from the admin side: read it, answer it, decide what happens to it.
 *
 * ## The decision rides on the reply
 *
 * Same shape as `<SubmissionReview>`, and for the same reason: a status change
 * with no message leaves someone looking at "Zatvoren" with nothing saying
 * why. One request carries both.
 *
 * ## Closing is not final
 *
 * Unlike approving a submission, a closed issue can be replied to — by the
 * reporter, which re-opens it. So there is no confirmation dialog here: nothing
 * this button does is irreversible.
 */
export default function AdminIssueDetailPage(props: PageProps<'/admin/issues/[id]'>) {
  const { id } = React.use(props.params);

  const issue = useIssue(id);
  const send = useCreateIssueMessage();

  const [outcome, setOutcome] = React.useState<IssueStatus>('answered');
  const [body, setBody] = React.useState('');

  async function reply() {
    try {
      const result = await send.mutateAsync({
        issueId: id,
        body: { body: body.trim(), status: outcome },
      });
      setBody('');
      toast.success(
        result.issue_status === 'closed' ? 'Odgovoreno i zatvoreno.' : 'Odgovor je poslan.',
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (issue.isError && isStatus(issue.error, 404)) {
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
      <QueryState skeleton="detail" query={issue} errorTitle="Zahtjev nije moguće učitati">
        {(row) => (
          <>
            <PageHeader
              breadcrumbs={[{ label: 'Podrška', href: '/admin/issues' }, { label: row.subject }]}
              title={row.subject}
              description={`Poslao/la ${row.profiles?.full_name ?? 'nepoznat korisnik'}`}
              actions={<StatusChip {...ISSUE_STATUS[row.status]} size="medium" />}
            />

            {row.status === 'closed' ? (
              <Alert severity="info">
                Zahtjev je zatvoren{row.closed_at ? ` ${formatDateTime(row.closed_at)}` : ''}.
                Korisnik ga i dalje može ponovo otvoriti odgovorom.
              </Alert>
            ) : null}

            <ContentCard title="Korisnik">
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
                  { label: 'Poslano', value: formatDateTime(row.created_at) },
                  { label: 'Posljednja izmjena', value: formatDateTime(row.updated_at) },
                ]}
              />
            </ContentCard>

            <ContentCard title="Prepiska" description="Poruke obje strane." disablePadding>
              <IssueThread issueId={row.id} reporterId={row.reporter_id} />

              <Divider />

              <Stack spacing={2} sx={{ p: 2.5 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Nakon odgovora</Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={outcome}
                    // `null` arrives when the active button is clicked again;
                    // keeping the current choice beats dropping to none.
                    onChange={(_event, next: IssueStatus | null) => next && setOutcome(next)}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    {OUTCOMES.map((option) => (
                      <ToggleButton key={option.value} value={option.value}>
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>

                <TextField
                  label="Odgovor korisniku"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  multiline
                  rows={4}
                  disabled={send.isPending}
                />

                <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    disabled={body.trim().length === 0 || send.isPending}
                    onClick={() => void reply()}
                  >
                    {send.isPending ? 'Slanje…' : 'Pošalji odgovor'}
                  </Button>
                </Stack>
              </Stack>
            </ContentCard>
          </>
        )}
      </QueryState>
    </PageContainer>
  );
}
