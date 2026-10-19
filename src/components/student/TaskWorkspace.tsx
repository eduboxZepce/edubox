'use client';

import * as React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import StatusChip from '@/components/data/StatusChip';
import { useModuleTask } from '@/hooks/useTasks';
import {
  useCreateMessage,
  useCreateSubmission,
  useSetMessageAttachment,
  useUploadSubmissionAttachment,
  useTaskSubmissions,
} from '@/hooks/useSubmissions';
import MessageComposer from '@/components/submissions/MessageComposer';
import MessageThread from '@/components/submissions/MessageThread';
import { errorMessage } from '@/lib/api/errorMessage';
import { displayFileName } from '@/lib/storage';
import { SUBMISSION_STATUS } from '@/lib/status';
import { toast } from '@/store/useToastStore';
import type { TaskSubmission } from '@/lib/schemas/task-submissions.schema';
import { FEATURES } from '@/lib/features';

/**
 * A student's view of a module's task: the brief, and the conversation about
 * their solution.
 *
 * ## A submission is a thread, not a file upload
 *
 * `task_submissions` holds status; `task_messages` holds the actual exchange.
 * Both sides post to the same message endpoint, and only a *reviewer's* `status`
 * is honoured — so this screen sends messages and reads status, never sets it.
 *
 * Approval closes the thread for everyone, this side included: the composer is
 * replaced by a note, and the endpoint refuses the write regardless.
 *
 * ## Only one open submission at a time
 *
 * The API rejects a second submission while one is `pending` or
 * `needs_revision` (409). So the screen offers *either* the "submit" form or the
 * thread, decided by whether an open submission exists, rather than letting a
 * student create a conflict and reading them the error.
 *
 * After `needs_revision` the student replies **in the existing thread** — that
 * is what a revision is. A genuinely new submission only makes sense once the
 * previous one was approved, which the module no longer needs.
 */
export default function TaskWorkspace({
  courseSlug,
  courseName,
  moduleId,
  moduleTitle,
}: {
  courseSlug: string;
  courseName: string;
  moduleId: string;
  moduleTitle: string;
}) {
  const task = useModuleTask(moduleId);
  const taskId = task.data?.id;
  const submissions = useTaskSubmissions(taskId);

  const moduleHref = `/courses/${courseSlug}/modules/${moduleId}`;

  return (
    <PageContainer maxWidth="form">
      <PageHeader
        breadcrumbs={[
          // The catalogue crumb goes with the catalogue; the course is still a
          // reachable page for anyone who can open this one.
          ...(FEATURES.catalog ? [{ label: 'Obuke', href: '/courses' }] : []),
          { label: courseName, href: `/courses/${courseSlug}` },
          { label: moduleTitle, href: moduleHref },
          { label: 'Zadatak' },
        ]}
        title="Zadatak"
        description={`Zadatak za modul „${moduleTitle}”.`}
      />

      <QueryState
        query={task}
        errorTitle="Zadatak nije moguće učitati"
        empty={<EmptyState title="Ovaj modul nema zadatak" />}
      >
        {(data) => (
          <Stack spacing={3}>
            <ContentCard title="Što treba uraditi">
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {data.text}
              </Typography>
            </ContentCard>

            {data.task_files.length > 0 ? (
              <ContentCard title="Prilozi" description="Datoteke uz zadatak." disablePadding>
                <Stack divider={<Divider />}>
                  {data.task_files.map((file) => (
                    <Stack
                      key={file.id}
                      direction="row"
                      spacing={2}
                      sx={{ px: 3, py: 1.5, alignItems: 'center' }}
                    >
                      <AttachFileIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                        {file.file_name ?? displayFileName(file.file_path)}
                      </Typography>
                      {/* A real download, unlike module materials: the brief
                          may say "start from the attached file", so the student
                          has to be able to open it in whatever edits it. */}
                      <Button
                        href={`/api/task-files/${file.id}/content`}
                        size="small"
                        startIcon={<DownloadOutlinedIcon />}
                        sx={{ flexShrink: 0 }}
                      >
                        Preuzmi
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </ContentCard>
            ) : null}

            <QueryState query={submissions} errorTitle="Predaju nije moguće učitati">
              {(page) => {
                // Newest first from the endpoint, so the first row is current.
                const current = page.data[0];
                const isOpen =
                  current && (current.status === 'pending' || current.status === 'needs_revision');

                if (!current) {
                  return <NewSubmission taskId={data.id} />;
                }

                return <SubmissionThread submission={current} canReply={Boolean(isOpen)} />;
              }}
            </QueryState>

            <Box>
              <Button href={moduleHref} startIcon={<ArrowBackIcon />} color="inherit">
                Nazad na modul
              </Button>
            </Box>
          </Stack>
        )}
      </QueryState>
    </PageContainer>
  );
}

/** The first submission for a task — creates the thread. */
function NewSubmission({ taskId }: { taskId: string }) {
  const createSubmission = useCreateSubmission();
  const uploadFile = useUploadSubmissionAttachment();
  const setAttachment = useSetMessageAttachment();

  /**
   * Three steps, and the order is forced by storage.
   *
   * A message attachment lives at `{submission_id}/…`, and the storage policy
   * checks ownership of that folder — so nothing can be uploaded until the
   * submission exists. Create first, upload second, attach third.
   *
   * Partial failure is handled the way `courses/new` handles a thumbnail: the
   * submission is already in, so a failed upload warns rather than throws.
   * Throwing would invite a retry that hits the "one open submission" conflict.
   */
  async function handleSend(body: string, file: File | null) {
    const { data: created } = await createSubmission.mutateAsync({ taskId, body: { body } });

    if (file) {
      try {
        const { path } = await uploadFile.mutateAsync({ submissionId: created.id, file });
        await setAttachment.mutateAsync({
          messageId: created.message.id,
          body: { attachment_path: path },
        });
      } catch (error) {
        toast.warning(`Rješenje je predano, ali prilog nije dodan: ${errorMessage(error)}`);
        return;
      }
    }

    toast.success('Rješenje je predano. Predavač će ga pregledati.');
  }

  return (
    <ContentCard
      title="Predaj rješenje"
      description="Opišite što ste uradili i po potrebi priložite datoteku. Predavač odgovara u istoj prepisci."
    >
      <MessageComposer
        label="Vaše rješenje"
        placeholder="Opišite rješenje, dodajte link ka radu…"
        submitLabel="Predaj rješenje"
        rows={6}
        pending={createSubmission.isPending || uploadFile.isPending || setAttachment.isPending}
        onSend={async (body, file) => {
          try {
            await handleSend(body, file);
          } catch (error) {
            toast.error(errorMessage(error));
            throw error;
          }
        }}
      />
    </ContentCard>
  );
}

/** An existing submission and its conversation. */
function SubmissionThread({
  submission,
  canReply,
}: {
  submission: TaskSubmission;
  canReply: boolean;
}) {
  const createMessage = useCreateMessage();
  const uploadFile = useUploadSubmissionAttachment();

  /**
   * Two steps, and unlike the first message the order is the easy one: the
   * submission already exists, so its attachment folder is writable and the
   * upload can happen *before* the message. That means a failed upload leaves
   * no message at all — nothing half-sent, and a retry is safe.
   */
  async function handleSend(body: string, file: File | null) {
    let attachmentPath: string | undefined;

    if (file) {
      const { path } = await uploadFile.mutateAsync({ submissionId: submission.id, file });
      attachmentPath = path;
    }

    await createMessage.mutateAsync({
      submissionId: submission.id,
      body: { body, ...(attachmentPath ? { attachment_path: attachmentPath } : {}) },
    });
  }

  return (
    <ContentCard
      title="Vaša predaja"
      description="Prepiska sa predavačem o vašem rješenju."
      disablePadding
      actions={<StatusChip {...SUBMISSION_STATUS[submission.status]} />}
    >
      {submission.status === 'needs_revision' ? (
        <Box sx={{ px: 3, pt: 2.5 }}>
          <Alert severity="info">
            <AlertTitle>Potrebna je izmjena</AlertTitle>
            Pročitajte komentar predavača, ispravite rješenje i odgovorite u ovoj prepisci.
          </Alert>
        </Box>
      ) : null}

      {submission.status === 'approved' ? (
        <Box sx={{ px: 3, pt: 2.5 }}>
          <Alert severity="success">Rješenje je prihvaćeno — zadatak je završen.</Alert>
        </Box>
      ) : null}

      <MessageThread submissionId={submission.id} studentId={submission.student_id} />

      <Divider />

      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        {canReply ? (
          <MessageComposer
            label="Poruka"
            submitLabel="Pošalji"
            rows={3}
            pending={createMessage.isPending || uploadFile.isPending}
            onSend={async (body, file) => {
              try {
                await handleSend(body, file);
              } catch (error) {
                toast.error(errorMessage(error));
                throw error;
              }
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Prepiska je zatvorena jer je rješenje prihvaćeno.
          </Typography>
        )}
      </Stack>
    </ContentCard>
  );
}
