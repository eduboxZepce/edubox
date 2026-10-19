'use client';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import { useSubmissionMessages } from '@/hooks/useSubmissions';
import { useAuthStore } from '@/store/useAuthStore';
import { displayFileName } from '@/lib/storage';
import { formatDateTime } from '@/lib/format';

/**
 * The conversation on one submission, rendered the same way for both sides.
 *
 * It is genuinely one component rather than a near-twin per side: a thread has
 * exactly two participants and the same three things to show for each message —
 * who wrote it, what they said, and what they attached. The student screen and
 * the review screen differ in what they can *do* about it, and that lives in
 * their composers, not here.
 *
 * (Contrast `<TaskFiles>` / `<ModuleMaterials>`, which look alike and must stay
 * apart because they encode opposite policies. Nothing of the sort applies to
 * a list of messages.)
 *
 * Fetches its own messages, so a caller passes an id rather than plumbing a
 * query through. `pageSize: 100` because a submission thread is a handful of
 * messages — if that ever stops being true this needs real pagination, not a
 * bigger number.
 */
export default function MessageThread({
  submissionId,
  studentId,
  studentName = 'Student',
  reviewerLabel = 'Predavač',
}: {
  submissionId: string;
  /** Whose messages count as the student's — the other side is the reviewer. */
  studentId: string;
  studentName?: string;
  reviewerLabel?: string;
}) {
  const myId = useAuthStore((s) => s.profile?.id);
  const messages = useSubmissionMessages(submissionId, { pageSize: 100 });

  return (
    <QueryState
      query={messages}
      errorTitle="Poruke nije moguće učitati"
      loading={<LoadingState minHeight={120} />}
      isEmpty={(page) => page.data.length === 0}
      empty={<EmptyState title="Nema poruka" description="U ovoj prepisci još nema poruka." />}
    >
      {(page) => (
        <Stack spacing={2} sx={{ p: 3 }}>
          {page.data.map((message) => {
            // Sides are decided by the submission's student, not by role: an
            // admin and the owning teacher may both reply, and both are "the
            // reviewer" as far as the reader is concerned.
            //
            // "Vi" wins over either name, so the same component reads correctly
            // for a student looking at their own thread and for a reviewer
            // looking at the reply they just sent.
            const mine = message.sender_id === myId;
            const author = mine
              ? 'Vi'
              : message.sender_id === studentId
                ? studentName
                : reviewerLabel;

            return (
              <Stack
                key={message.id}
                sx={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  px: 2,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: mine ? 'primary.main' : 'action.hover',
                  color: mine ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.75, fontWeight: 600, mb: 0.25 }}>
                  {author}
                </Typography>

                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {message.body}
                </Typography>

                {/* A real download, unlike module materials: the reviewer needs
                    to open the student's actual work, and the student needs the
                    reviewer's marked-up file back. */}
                {/* Removed by the cleanup a week after approval: keep the name, so
                    the thread still says what was handed in, but no dead link. */}
                {message.attachment_path && message.attachment_deleted_at ? (
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.75 }}
                  >
                    <AttachFileIcon fontSize="inherit" />
                    {displayFileName(message.attachment_path)} — uklonjeno nakon odobrenja
                  </Typography>
                ) : message.attachment_path ? (
                  <Button
                    href={`/api/messages/${message.id}/attachment`}
                    size="small"
                    startIcon={<AttachFileIcon />}
                    variant="outlined"
                    sx={{
                      mt: 1,
                      alignSelf: 'flex-start',
                      color: 'inherit',
                      borderColor: 'currentColor',
                    }}
                  >
                    {displayFileName(message.attachment_path)}
                  </Button>
                ) : null}

                <Typography variant="caption" sx={{ opacity: 0.7, alignSelf: 'flex-end', mt: 0.5 }}>
                  {formatDateTime(message.created_at)}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </QueryState>
  );
}
