'use client';

import * as React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import StatusChip from '@/components/data/StatusChip';
import IssueThread from '@/components/issues/IssueThread';
import { useCreateIssueMessage, useIssue } from '@/hooks/useIssues';
import { errorMessage, isStatus } from '@/lib/api/errorMessage';
import { formatDateTime } from '@/lib/format';
import { ISSUE_STATUS } from '@/lib/status';
import { toast } from '@/store/useToastStore';

/**
 * One issue, from the reporter's side.
 *
 * ## Replying to a closed issue re-opens it
 *
 * Deliberate, and the opposite of an approved submission. "Closed" is the
 * admin's judgement that the matter is dealt with, and the person best placed
 * to disagree is the one who raised it — so the composer stays available and
 * the server flips the status back to `open`. A support channel that cannot be
 * re-opened only teaches people to file a second ticket.
 */
export default function IssueDetailPage(props: PageProps<'/issues/[id]'>) {
  const { id } = React.use(props.params);

  const issue = useIssue(id);
  const send = useCreateIssueMessage();
  const [body, setBody] = React.useState('');

  async function reply() {
    try {
      await send.mutateAsync({ issueId: id, body: { body: body.trim() } });
      setBody('');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (issue.isError && isStatus(issue.error, 404)) {
    return (
      <PageContainer maxWidth="form">
        <ContentCard>
          <EmptyState
            title="Zahtjev nije pronađen"
            description="Ovaj zahtjev ne postoji ili nemate pristup njemu."
            action={
              <Button href="/issues" variant="contained">
                Podrška
              </Button>
            }
          />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="form">
      <QueryState query={issue} errorTitle="Zahtjev nije moguće učitati">
        {(row) => (
          <>
            <PageHeader
              breadcrumbs={[{ label: 'Podrška', href: '/issues' }, { label: row.subject }]}
              title={row.subject}
              description={`Poslano ${formatDateTime(row.created_at)}`}
              actions={<StatusChip {...ISSUE_STATUS[row.status]} size="medium" />}
            />

            {row.status === 'closed' ? (
              <Alert severity="info">
                Ovaj zahtjev je zatvoren. Ako problem i dalje postoji, odgovorite ispod i zahtjev se
                ponovo otvara.
              </Alert>
            ) : null}

            <ContentCard title="Prepiska" disablePadding>
              <IssueThread issueId={row.id} reporterId={row.reporter_id} />

              <Divider />

              <Stack spacing={1.5} sx={{ p: 2.5 }}>
                <TextField
                  label="Odgovor"
                  placeholder="Dopunite zahtjev ili odgovorite administratoru…"
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
                    {send.isPending ? 'Slanje…' : 'Pošalji'}
                  </Button>
                </Stack>
              </Stack>
            </ContentCard>

            <Stack direction="row">
              <Button href="/issues" color="inherit" startIcon={<ArrowBackIcon />}>
                Svi zahtjevi
              </Button>
            </Stack>
          </>
        )}
      </QueryState>
    </PageContainer>
  );
}
