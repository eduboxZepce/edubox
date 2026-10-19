'use client';

import * as React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingOverlay from '@/components/feedback/LoadingOverlay';
import { useModuleQuiz, useSubmitQuizAttempt } from '@/hooks/useQuizzes';
import { useCourseProgress } from '@/hooks/useProgress';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { QuizAttemptResult } from '@/lib/schemas/quizzes.schema';
import { FEATURES } from '@/lib/features';

/**
 * A student taking a module's quiz.
 *
 * ## The answer key is not here, and cannot be
 *
 * `/api/modules/:id/quiz` returns questions and answer *text* only — correctness
 * lives in `answer_keys`, a table with no student RLS policy at all. So this
 * component could not reveal the right answers even if it tried, and scoring
 * happens server-side in `/quiz/attempt`. That is why the result below reports a
 * score rather than marking individual questions: the client genuinely does not
 * know which ones were wrong.
 *
 * ## One radio group per question
 *
 * The database allows exactly one correct answer per question, and the attempt
 * payload is one `answer_id` per `question_id`. A radio group is the control
 * that matches that shape — there is no state in which two answers are picked.
 *
 * Local state rather than react-hook-form: there are no field-level rules to
 * express, just "every question needs an answer", and the submit button says so
 * by staying disabled.
 */
export default function QuizTaker({
  courseId,
  courseSlug,
  courseName,
  moduleId,
  moduleTitle,
}: {
  courseId: string;
  courseSlug: string;
  courseName: string;
  moduleId: string;
  moduleTitle: string;
}) {
  const quiz = useModuleQuiz(moduleId);
  const progress = useCourseProgress(courseId);
  const submitAttempt = useSubmitQuizAttempt();

  // A passed quiz is final — the API refuses a second attempt (409), so the
  // form must not be offered at all. `result` takes precedence so the score is
  // still shown on the attempt that just passed, rather than the page flipping
  // straight to the summary.
  const alreadyPassed =
    progress.data?.modules.find((m) => m.module_id === moduleId)?.quiz_done ?? false;

  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<QuizAttemptResult | null>(null);

  const moduleHref = `/courses/${courseSlug}/modules/${moduleId}`;

  async function handleSubmit(questionIds: string[]) {
    try {
      const { data } = await submitAttempt.mutateAsync({
        moduleId,
        body: { answers: questionIds.map((id) => ({ question_id: id, answer_id: answers[id] })) },
      });
      setResult(data);
      // Scroll back up so the result is the first thing seen on a long quiz.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <PageContainer maxWidth="form">
      <PageHeader
        breadcrumbs={[
          // The catalogue crumb goes with the catalogue; the course is still a
          // reachable page for anyone who can open this one.
          ...(FEATURES.catalog ? [{ label: 'Obuke', href: '/courses' }] : []),
          { label: courseName, href: `/courses/${courseSlug}` },
          { label: moduleTitle, href: moduleHref },
          { label: 'Kviz' },
        ]}
        title="Kviz"
        description={`Provjera znanja za modul „${moduleTitle}”.`}
      />

      <QueryState
        query={quiz}
        errorTitle="Kviz nije moguće učitati"
        empty={<EmptyState title="Ovaj modul nema kviz" />}
      >
        {(data) => {
          const questionIds = data.questions.map((q) => q.id);
          const allAnswered = questionIds.every((id) => answers[id]);

          if (!result && alreadyPassed) {
            return (
              <Stack spacing={3}>
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <AlertTitle>Kviz je položen</AlertTitle>
                  Ovaj kviz ste već položili, pa se ne radi ponovo.
                </Alert>

                <Button
                  href={moduleHref}
                  variant="contained"
                  startIcon={<ArrowBackIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Nazad na modul
                </Button>
              </Stack>
            );
          }

          if (result) {
            return (
              <Stack spacing={3}>
                <Alert
                  severity={result.passed ? 'success' : 'warning'}
                  icon={result.passed ? <CheckCircleIcon /> : <HighlightOffIcon />}
                >
                  <AlertTitle>
                    {result.passed ? 'Položili ste kviz' : 'Kviz nije položen'}
                  </AlertTitle>
                  Tačnih odgovora: {result.correct_count} od {result.question_count} — rezultat{' '}
                  {result.score}%. Potrebno je {result.passing_score}%.
                </Alert>

                {result.module_completed ? (
                  <Alert severity="success">Modul je završen. Sljedeći modul je otključan.</Alert>
                ) : null}

                {result.certificate_issued && FEATURES.certificates ? (
                  <Alert severity="success" icon={<WorkspacePremiumOutlinedIcon />}>
                    <AlertTitle>Čestitamo — obuka je završena</AlertTitle>
                    Certifikat je izdan i čeka vas na kontrolnoj ploči.
                  </Alert>
                ) : null}

                <Stack direction="row" spacing={1.5}>
                  <Button href={moduleHref} variant="contained" startIcon={<ArrowBackIcon />}>
                    Nazad na modul
                  </Button>

                  {/* Only a failed attempt can be retried — a pass locks the
                      quiz, in the API as well as here. */}
                  {!result.passed ? (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setResult(null);
                        setAnswers({});
                      }}
                    >
                      Pokušaj ponovo
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            );
          }

          return (
            <Box sx={{ position: 'relative' }}>
              <LoadingOverlay open={submitAttempt.isPending} label="Slanje odgovora…" />

              <Stack spacing={3}>
                <ContentCard disablePadding>
                  <Stack divider={<Divider />}>
                    {data.questions.map((question, index) => (
                      <Stack key={question.id} spacing={1} sx={{ px: 3, py: 2.5 }}>
                        <Typography variant="subtitle2">
                          {index + 1}. {question.text}
                        </Typography>

                        <RadioGroup
                          value={answers[question.id] ?? ''}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                        >
                          {question.answers.map((answer) => (
                            <FormControlLabel
                              key={answer.id}
                              value={answer.id}
                              control={<Radio />}
                              label={answer.text}
                            />
                          ))}
                        </RadioGroup>
                      </Stack>
                    ))}
                  </Stack>
                </ContentCard>

                <Stack
                  direction={{ xs: 'column-reverse', sm: 'row' }}
                  spacing={1.5}
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Za prolaz je potrebno {data.passing_score}% tačnih odgovora.
                  </Typography>

                  <Button
                    variant="contained"
                    size="large"
                    // Disabled rather than validated on click: the only rule is
                    // "answer everything", and the helper text below says so.
                    disabled={!allAnswered || submitAttempt.isPending}
                    onClick={() => void handleSubmit(questionIds)}
                  >
                    {allAnswered
                      ? 'Predaj odgovore'
                      : `Odgovorite na sva pitanja (${questionIds.filter((id) => answers[id]).length}/${questionIds.length})`}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
