'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import MessageComposer from './MessageComposer';
import { useCreateMessage, useUploadSubmissionAttachment } from '@/hooks/useSubmissions';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { TaskSubmissionStatus } from '@/lib/schemas/task-submissions.schema';
import { FEATURES } from '@/lib/features';

/**
 * What a reviewer does about a submission: reply, ask for a revision, or accept
 * it. A reviewer is an admin or the teacher who owns the course.
 *
 * ## Why the decision rides on the message rather than being its own button
 *
 * `POST /api/submissions/:id/messages` takes an optional `status` alongside the
 * body, and a status change with no message would leave a student staring at
 * "Potrebna izmjena" with nothing saying what to fix. Making the decision a
 * property of the message means every outcome comes with its explanation, and
 * it is one request rather than two that can half-fail.
 */
type Decision = 'reply' | 'needs_revision' | 'approved';

const SUBMIT_LABEL: Record<Decision, string> = {
  reply: 'Pošalji poruku',
  needs_revision: 'Traži izmjenu',
  approved: 'Prihvati rješenje',
};

/**
 * Thrown when the reviewer backs out of the approval dialog.
 *
 * `<MessageComposer>` clears itself when `onSend` resolves and leaves the text
 * alone when it throws, so backing out has to be a throw. Compared by identity
 * so it is never mistaken for a real failure and reported as one.
 */
const CANCELLED = new Error('approval cancelled');

export default function SubmissionReview({
  submissionId,
  status,
}: {
  submissionId: string;
  status: TaskSubmissionStatus;
}) {
  const [decision, setDecision] = React.useState<Decision>('reply');
  const [confirming, setConfirming] = React.useState(false);

  const createMessage = useCreateMessage();
  const uploadFile = useUploadSubmissionAttachment();

  /**
   * Approving is irreversible — it closes the thread, and nothing in the UI can
   * reopen it — so the send waits on a confirmation.
   *
   * The dialog cannot simply wrap the button: `<MessageComposer>` owns the
   * button, and the answer has to travel back into the `onSend` call already in
   * flight. A stored resolver is what carries it — `askForConfirmation()` opens
   * the dialog and returns a promise that the dialog's own buttons settle.
   */
  const resolveConfirmation = React.useRef<((confirmed: boolean) => void) | null>(null);

  function askForConfirmation() {
    setConfirming(true);
    return new Promise<boolean>((resolve) => {
      resolveConfirmation.current = resolve;
    });
  }

  function settleConfirmation(confirmed: boolean) {
    setConfirming(false);
    resolveConfirmation.current?.(confirmed);
    resolveConfirmation.current = null;
  }

  async function handleSend(body: string, file: File | null) {
    if (decision === 'approved' && !(await askForConfirmation())) throw CANCELLED;

    /*
     * Upload first, then post — the same order the student's replies use, and
     * for the same reason: the submission already exists, so its attachment
     * folder is writable, and a failed upload leaves no message at all rather
     * than a message whose file never arrived.
     */
    let attachmentPath: string | undefined;
    if (file) {
      const { path } = await uploadFile.mutateAsync({ submissionId, file });
      attachmentPath = path;
    }

    const result = await createMessage.mutateAsync({
      submissionId,
      body: {
        body,
        ...(attachmentPath ? { attachment_path: attachmentPath } : {}),
        // Omitted for a plain reply, so the endpoint leaves the status alone.
        ...(decision === 'reply' ? {} : { status: decision }),
      },
    });

    if (result.submission_status !== 'approved') {
      toast.success(decision === 'needs_revision' ? 'Zatražena je izmjena.' : 'Poruka je poslana.');
      return;
    }

    // The response says what the approval set off, so the reviewer learns it
    // here instead of having to go and check the student's progress.
    if (result.certificate_issued && FEATURES.certificates) {
      toast.success('Rješenje je prihvaćeno. Student je završio obuku i dobio certifikat.');
    } else if (result.module_completed) {
      toast.success('Rješenje je prihvaćeno. Modul je završen.');
    } else {
      toast.success('Rješenje je prihvaćeno.');
    }

    setDecision('reply');
  }

  if (status === 'approved') {
    return (
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          Prepiska je zatvorena jer je rješenje prihvaćeno. Nove poruke nisu moguće — ni za
          studenta, ni za predavača.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ p: 2.5 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">Odluka</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={decision}
          // `null` arrives when the active button is clicked again; keeping the
          // current decision is better than dropping to no selection at all.
          onChange={(_event, next: Decision | null) => next && setDecision(next)}
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="reply">Samo odgovor</ToggleButton>
          <ToggleButton value="needs_revision">Traži izmjenu</ToggleButton>
          <ToggleButton value="approved">Prihvati</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {decision === 'approved' ? (
        <Alert severity="warning">
          <AlertTitle>Prihvatanje je konačno</AlertTitle>
          Zadatak se označava kao završen, a prepiska se zatvara — nijedna strana više ne može
          poslati poruku. Ako je studentu potrebna ispravka, izaberite „Traži izmjenu”.
        </Alert>
      ) : null}

      <MessageComposer
        label={decision === 'approved' ? 'Komentar uz prihvatanje' : 'Poruka studentu'}
        placeholder={
          decision === 'needs_revision'
            ? 'Objasnite što treba ispraviti…'
            : 'Napišite poruku studentu…'
        }
        submitLabel={SUBMIT_LABEL[decision]}
        rows={4}
        pending={createMessage.isPending || uploadFile.isPending}
        onSend={async (body, file) => {
          try {
            await handleSend(body, file);
          } catch (error) {
            // Backing out of the dialog is not a failure; it just leaves the
            // composer as it was.
            if (error !== CANCELLED) toast.error(errorMessage(error));
            throw error;
          }
        }}
      />

      <ConfirmDialog
        open={confirming}
        title="Prihvatiti rješenje?"
        description="Zadatak će biti označen kao završen za ovog studenta, a prepiska se zatvara. Ova radnja se ne može poništiti kroz aplikaciju."
        confirmLabel="Prihvati rješenje"
        severity="primary"
        onCancel={() => settleConfirmation(false)}
        onConfirm={() => settleConfirmation(true)}
      />
    </Stack>
  );
}
