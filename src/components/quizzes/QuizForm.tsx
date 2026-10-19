'use client';

import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useFieldArray, type DefaultValues } from 'react-hook-form';
import ContentCard from '@/components/layout/ContentCard';
import Form from '@/components/form/Form';
import FormActions from '@/components/form/FormActions';
import FormNumberField from '@/components/form/FormNumberField';
import QuizQuestionFields from './QuizQuestionFields';
import { useZodForm } from '@/lib/forms/useZodForm';
import {
  emptyQuestion,
  quizFormSchema,
  type QuizFormInput,
  type QuizFormValues,
} from '@/lib/schemas/quiz-form.schema';

/**
 * The quiz authoring form: a pass mark and an ordered list of questions.
 *
 * Same contract as `CourseForm` / `ModuleForm` / `TaskForm` — the component owns
 * the fields and their validation, the page owns `onSubmit` — but this one is
 * the first with *nested* arrays, so two things differ:
 *
 *   - questions are a `useFieldArray` here, and each question owns a second
 *     field array for its answers inside `<QuizQuestionFields>` (hooks cannot be
 *     called in a loop, so that has to be a component);
 *   - the whole question set is submitted every time, because the endpoint
 *     replaces it wholesale rather than merging.
 *
 * `defaultValues` is read once at mount, so the page must render this only after
 * it knows whether a quiz exists.
 */
export default function QuizForm({
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
  pendingLabel,
}: {
  /**
   * A **deep** partial, not `Partial<>`: nested arrays mean every level can be
   * absent, and that is exactly what react-hook-form accepts.
   */
  defaultValues: DefaultValues<QuizFormInput>;
  onSubmit: (values: QuizFormValues) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
  pendingLabel?: string;
}) {
  const form = useZodForm(quizFormSchema, { defaultValues });
  const questions = useFieldArray({ control: form.control, name: 'questions' });

  // Surfaced separately because it belongs to the array itself, not to any
  // question inside it — react-hook-form has nowhere else to put it.
  const questionsError = form.formState.errors.questions?.root?.message;

  return (
    <Form form={form} onSubmit={onSubmit} pendingLabel={pendingLabel}>
      <ContentCard
        title="Prag prolaznosti"
        description="Postotak tačnih odgovora potreban da student položi kviz."
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <FormNumberField
              name="passing_score"
              label="Prag prolaznosti"
              suffix="%"
              min={0}
              max={100}
              step={5}
              helperText="Npr. 60 znači da je potrebno 60% tačnih odgovora."
              required
            />
          </Grid>
        </Grid>
      </ContentCard>

      <ContentCard
        title="Pitanja"
        description="Svako pitanje ima najmanje dva odgovora i tačno jedan tačan."
      >
        <Stack spacing={2}>
          {questionsError ? <Alert severity="error">{questionsError}</Alert> : null}

          {questions.fields.map((field, index) => (
            <QuizQuestionFields
              key={field.id}
              questionIndex={index}
              // The database has no "quiz must have questions" constraint, but a
              // quiz with none is meaningless, so the last one cannot be removed.
              canRemove={questions.fields.length > 1}
              onRemove={() => questions.remove(index)}
            />
          ))}

          <Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => questions.append(emptyQuestion())}
            >
              Dodaj pitanje
            </Button>
          </Box>
        </Stack>
      </ContentCard>

      <FormActions submitLabel={submitLabel} cancelHref={cancelHref} />
    </Form>
  );
}
