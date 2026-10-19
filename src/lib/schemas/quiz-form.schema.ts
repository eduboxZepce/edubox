import { z } from 'zod';
import type { DefaultValues } from 'react-hook-form';
import type { AdminQuiz, CreateQuizRequest, UpdateQuizRequest } from './quizzes.schema';

/**
 * The quiz authoring form.
 *
 * ## The one modelling decision worth reading
 *
 * The API represents correctness as `is_correct` on **each answer**. This form
 * represents it as a single `correctIndex` on the **question**.
 *
 * That is not a cosmetic difference. The database enforces "at most one correct
 * answer per question" (`one_correct_answer_per_question`, a partial unique
 * index) and the API schema demands exactly one — but a list of independent
 * booleans can express *two* correct answers or *none*, so every edit would
 * need validating against a rule the shape itself permits breaking. An index
 * cannot represent either mistake: it points at exactly one answer, always.
 *
 * It is also what a radio group naturally is, so the control and the data agree.
 * `toQuizPayload` converts back at the boundary.
 *
 * The one thing an index *can* get wrong is pointing past the end of the list —
 * delete the answer that was marked correct and it dangles — so that is what
 * the refinement below checks.
 */
export const quizQuestionFormSchema = z
  .object({
    text: z
      .string({ error: 'Tekst pitanja je obavezan.' })
      .trim()
      .min(1, 'Tekst pitanja je obavezan.')
      .max(2000, 'Pitanje može imati najviše 2000 znakova.'),

    answers: z
      .array(
        z.object({
          text: z
            .string({ error: 'Tekst odgovora je obavezan.' })
            .trim()
            .min(1, 'Tekst odgovora je obavezan.')
            .max(500, 'Odgovor može imati najviše 500 znakova.'),
        }),
      )
      .min(2, 'Pitanje mora imati barem dva odgovora.'),

    /** Index into `answers` of the single correct option. */
    correctIndex: z.number({ error: 'Označite tačan odgovor.' }).int().min(0),
  })
  .refine((question) => question.correctIndex < question.answers.length, {
    // Fires when the answer that was marked correct has since been removed.
    error: 'Označite tačan odgovor.',
    path: ['correctIndex'],
  });

export const quizFormSchema = z.object({
  passing_score: z
    .number({ error: 'Unesite prag prolaznosti.' })
    .int('Prag mora biti cijeli broj.')
    .min(0, 'Prag ne može biti manji od 0.')
    .max(100, 'Prag ne može biti veći od 100.'),

  questions: z.array(quizQuestionFormSchema).min(1, 'Kviz mora imati barem jedno pitanje.'),
});

export type QuizFormValues = z.output<typeof quizFormSchema>;
export type QuizFormInput = z.input<typeof quizFormSchema>;
export type QuizQuestionFormValues = z.output<typeof quizQuestionFormSchema>;

/** A blank question: two empty answers, the first marked correct. */
export const emptyQuestion = () => ({
  text: '',
  answers: [{ text: '' }, { text: '' }],
  correctIndex: 0,
});

/**
 * A blank quiz. 60% is a convention, not a rule — it is just a starting value
 * the author can change, chosen so the field is never empty on create.
 */
export const emptyQuizFormValues: DefaultValues<QuizFormInput> = {
  passing_score: 60,
  questions: [emptyQuestion()],
};

/** Loads an existing quiz into the form, converting the answer key to an index. */
export function quizToFormValues(quiz: AdminQuiz): QuizFormInput {
  return {
    passing_score: quiz.passing_score,
    questions: quiz.questions.map((question) => {
      const correctIndex = question.answers.findIndex((answer) => answer.is_correct);
      return {
        text: question.text,
        answers: question.answers.map((answer) => ({ text: answer.text })),
        // A quiz saved through this form always has one; falling back to 0 keeps
        // a hand-edited row from rendering with nothing selected.
        correctIndex: correctIndex === -1 ? 0 : correctIndex,
      };
    }),
  };
}

/** Form questions → the nested shape both create and update accept. */
function toQuestionsPayload(values: QuizFormValues) {
  return values.questions.map((question) => ({
    text: question.text,
    answers: question.answers.map((answer, index) => ({
      text: answer.text,
      is_correct: index === question.correctIndex,
    })),
  }));
}

/**
 * Form values → `POST /api/admin/quizzes` body.
 *
 * `module_id` is not a form field — it comes from the URL, because a quiz only
 * ever exists inside one module.
 */
export function toCreateQuizPayload(values: QuizFormValues, moduleId: string): CreateQuizRequest {
  return {
    module_id: moduleId,
    passing_score: values.passing_score,
    questions: toQuestionsPayload(values),
  };
}

/**
 * Form values → `PATCH /api/admin/quizzes/:id` body.
 *
 * Sends the whole question set every time. That is not laziness: the endpoint
 * replaces the set wholesale, because the authoring UI has no stable ids to
 * diff against and a partial merge would silently re-pair answers with the
 * wrong questions.
 */
export function toUpdateQuizPayload(values: QuizFormValues): UpdateQuizRequest {
  return {
    passing_score: values.passing_score,
    questions: toQuestionsPayload(values),
  };
}
