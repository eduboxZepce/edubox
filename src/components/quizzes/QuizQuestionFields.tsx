'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useController, useFieldArray, useFormContext } from 'react-hook-form';
import FormTextField from '@/components/form/FormTextField';
import type { QuizFormInput } from '@/lib/schemas/quiz-form.schema';

/**
 * One question: its text, its answers, and which answer is correct.
 *
 * ## Why this is its own component
 *
 * Each question owns a nested `useFieldArray` for its answers, and hooks cannot
 * be called in a loop. Rendering the questions inline in `<QuizForm>` would mean
 * one `useFieldArray` for all of them, which cannot express per-question adds
 * and removes. So the outer form arrays over questions and this component owns
 * the answers of exactly one.
 *
 * ## The radio is bound to an index, not to each answer
 *
 * `correctIndex` lives on the question (see `quiz-form.schema.ts`), so the radio
 * group is a single controlled field. Selecting one answer deselects the others
 * for free — there is no state in which two are correct, because the shape
 * cannot represent it.
 *
 * Removing an answer has to move that index: dropping an option *before* the
 * correct one would otherwise silently shift which answer is marked right.
 */
export default function QuizQuestionFields({
  questionIndex,
  onRemove,
  canRemove,
}: {
  questionIndex: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { control } = useFormContext<QuizFormInput>();

  const answers = useFieldArray({ control, name: `questions.${questionIndex}.answers` });

  const correct = useController({ control, name: `questions.${questionIndex}.correctIndex` });
  const correctIndex = correct.field.value ?? 0;

  function handleRemoveAnswer(answerIndex: number) {
    answers.remove(answerIndex);

    // Keep the marked answer pointing at the same *option*, not the same slot.
    if (answerIndex === correctIndex) {
      // The correct one is gone; fall back to the first remaining option rather
      // than leaving the index dangling past the end of the list.
      correct.field.onChange(0);
    } else if (answerIndex < correctIndex) {
      correct.field.onChange(correctIndex - 1);
    }
  }

  return (
    <Box sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" sx={{ pt: 2, flexShrink: 0, width: 28 }}>
            {questionIndex + 1}.
          </Typography>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormTextField
              name={`questions.${questionIndex}.text`}
              label="Pitanje"
              placeholder="npr. Što znači skraćenica HTTP?"
              multiline
              rows={2}
              required
            />
          </Box>

          <Tooltip title={canRemove ? 'Obriši pitanje' : 'Kviz mora imati barem jedno pitanje'}>
            {/* A disabled IconButton fires no events, so the tooltip needs a
                wrapper to stay hoverable on the last remaining question. */}
            <span>
              <IconButton
                size="small"
                sx={{ mt: 1 }}
                disabled={!canRemove}
                onClick={onRemove}
                aria-label={`Obriši pitanje ${questionIndex + 1}`}
              >
                <DeleteOutlinedIcon fontSize="small" color={canRemove ? 'error' : 'disabled'} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack spacing={1} sx={{ pl: { sm: 5.5 } }}>
          <Typography variant="caption" color="text.secondary">
            Označite tačan odgovor.
          </Typography>

          {answers.fields.map((field, answerIndex) => (
            <Stack key={field.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <Radio
                checked={correctIndex === answerIndex}
                onChange={() => correct.field.onChange(answerIndex)}
                value={answerIndex}
                name={`correct-${questionIndex}`}
                sx={{ mt: 0.5 }}
                // MUI v9 renamed `inputProps` — see docs/project-context.md §2.
                slotProps={{
                  input: { 'aria-label': `Odgovor ${answerIndex + 1} je tačan` },
                }}
              />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormTextField
                  name={`questions.${questionIndex}.answers.${answerIndex}.text`}
                  label={`Odgovor ${answerIndex + 1}`}
                  required
                />
              </Box>

              <Tooltip
                title={
                  answers.fields.length > 2 ? 'Obriši odgovor' : 'Potrebna su barem dva odgovora'
                }
              >
                <span>
                  <IconButton
                    size="small"
                    sx={{ mt: 0.5 }}
                    disabled={answers.fields.length <= 2}
                    onClick={() => handleRemoveAnswer(answerIndex)}
                    aria-label={`Obriši odgovor ${answerIndex + 1}`}
                  >
                    <DeleteOutlinedIcon
                      fontSize="small"
                      color={answers.fields.length > 2 ? 'error' : 'disabled'}
                    />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ))}

          {/* The "exactly one correct answer" error belongs to the question, not
              to any single field, so it is surfaced here rather than under an input. */}
          {correct.fieldState.error ? (
            <FormHelperText error>{correct.fieldState.error.message}</FormHelperText>
          ) : null}

          <Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => answers.append({ text: '' })}
            >
              Dodaj odgovor
            </Button>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
