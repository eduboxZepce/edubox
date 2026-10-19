/**
 * Development seed.
 *
 *   npm run db:seed
 *
 * Creates a small but complete slice of the platform: an admin, two teachers
 * who each own their own courses, two students, and enough purchases, progress
 * and submissions that every screen has something real to render.
 *
 * **Two teachers is the point.** One teacher proves nothing — the whole reason
 * ownership exists is that Ana must not be able to touch Marko's course, and
 * you can only test that with both present.
 *
 * Re-runnable: it deletes the accounts it owns (by email) and the content it
 * created (by name) before inserting, so running it twice is safe.
 *
 * Uses the service-role key, so it bypasses RLS entirely — that is what lets it
 * write `published`, `owner_id` and progress rows directly. Never import
 * anything from this file into the app.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

/* -------------------------------------------------------------------------- */
/* Setup                                                                       */
/* -------------------------------------------------------------------------- */

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Support issues the seed owns, keyed by subject so a re-run can clear exactly
 * the ones it made and nothing a human wrote while testing.
 */
const ISSUE_SUBJECTS = [
  'Ne mogu otvoriti drugi modul',
  'Pogrešno ime na certifikatu',
  'Da li postoji popust za studente?',
];

/** Every seeded account shares this password. Development only. */
const PASSWORD = 'Test1234!';

const log = (...args) => console.log(...args);

/** Throws on a Postgrest error instead of silently continuing with null data. */
function unwrap(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                    */
/* -------------------------------------------------------------------------- */

const ACCOUNTS = [
  { key: 'admin', email: 'admin@kursevi.test', name: 'Amra Kovačević', role: 'admin' },
  { key: 'ana', email: 'ana@kursevi.test', name: 'Ana Anić', role: 'teacher' },
  { key: 'marko', email: 'marko@kursevi.test', name: 'Marko Marković', role: 'teacher' },
  { key: 'lejla', email: 'lejla@kursevi.test', name: 'Lejla Begović', role: 'student' },
  { key: 'emir', email: 'emir@kursevi.test', name: 'Emir Hadžić', role: 'student' },
];

async function resetAccounts() {
  // listUsers is paginated; one page is plenty for a dev project.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);

  // The two students were renamed (jovana → lejla, nikola → emir) when the
  // copy moved to Bosnian; their old addresses are still removed so a re-seed
  // does not leave orphaned accounts behind.
  const seedEmails = new Set([
    ...ACCOUNTS.map((a) => a.email),
    'jovana@kursevi.test',
    'nikola@kursevi.test',
  ]);
  for (const user of data.users) {
    if (seedEmails.has(user.email)) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw new Error(`deleteUser ${user.email}: ${deleteError.message}`);
      log(`  removed existing ${user.email}`);
    }
  }
}

async function createAccounts() {
  const byKey = {};

  for (const account of ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: PASSWORD,
      // Skips the confirmation email — these accounts must be usable immediately.
      email_confirm: true,
      user_metadata: { full_name: account.name },
    });
    if (error) throw new Error(`createUser ${account.email}: ${error.message}`);

    // `handle_new_user` already inserted the profile with the default 'student'
    // role; only the role itself needs correcting.
    if (account.role !== 'student') {
      unwrap(
        await supabase.from('profiles').update({ role: account.role }).eq('id', data.user.id),
        `set role ${account.email}`,
      );
    }

    byKey[account.key] = data.user.id;
    log(`  ${account.role.padEnd(7)} ${account.email}`);
  }

  return byKey;
}

/* -------------------------------------------------------------------------- */
/* Content                                                                     */
/* -------------------------------------------------------------------------- */

const CATEGORY_NAMES = ['Programiranje', 'Dizajn'];
const COURSE_NAMES = [
  'Uvod u web programiranje',
  'Napredni JavaScript',
  'Osnove grafičkog dizajna',
  'Brza obuka: Git za početnike',
];

async function resetContent() {
  // Issues hang off profiles, not courses, so deleting the seeded accounts
  // already removes them — but the project owner's own account survives a
  // re-seed, and its seeded issues would otherwise accumulate.
  unwrap(await supabase.from('issues').delete().in('subject', ISSUE_SUBJECTS), 'delete issues');

  unwrap(await supabase.from('courses').delete().in('name', COURSE_NAMES), 'delete courses');
  unwrap(
    await supabase.from('categories').delete().in('name', CATEGORY_NAMES),
    'delete categories',
  );
}

async function seedContent(users) {
  const categories = unwrap(
    await supabase
      .from('categories')
      .insert(CATEGORY_NAMES.map((name) => ({ name })))
      .select(),
    'insert categories',
  );
  const categoryId = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  const courses = unwrap(
    await supabase
      .from('courses')
      .insert([
        {
          name: COURSE_NAMES[0],
          description:
            'Od nule do prve stranice na internetu. Kroz obuku gradimo HTML, CSS i osnovni JavaScript, korak po korak, bez pretpostavke o prethodnom znanju.',
          price: 100,
          published: true,
          category_id: categoryId['Programiranje'],
          owner_id: users.ana,
        },
        {
          name: COURSE_NAMES[1],
          description: 'Nastavak za one koji već pišu JavaScript. Još u pripremi.',
          price: 150,
          // Draft on purpose: proves the courses list "Nacrti" filter and that a
          // teacher can see their own unpublished work.
          published: false,
          category_id: categoryId['Programiranje'],
          owner_id: users.ana,
        },
        {
          name: COURSE_NAMES[2],
          description: 'Teorija boja, tipografija i kompozicija kroz praktične primjere.',
          price: 75,
          published: true,
          category_id: categoryId['Dizajn'],
          owner_id: users.marko,
        },
        {
          name: COURSE_NAMES[3],
          description: 'Kratka obuka s jednim modulom — dovoljno da naučite osnovne komande.',
          price: 0,
          published: true,
          category_id: categoryId['Programiranje'],
          owner_id: users.marko,
        },
      ])
      .select(),
    'insert courses',
  );
  const courseId = Object.fromEntries(courses.map((c) => [c.name, c.id]));

  const modules = unwrap(
    await supabase
      .from('modules')
      .insert([
        { course_id: courseId[COURSE_NAMES[0]], title: 'Kako radi internet', order: 0 },
        { course_id: courseId[COURSE_NAMES[0]], title: 'HTML i CSS osnove', order: 1 },
        { course_id: courseId[COURSE_NAMES[0]], title: 'Prvi koraci u JavaScriptu', order: 2 },
        { course_id: courseId[COURSE_NAMES[2]], title: 'Teorija boja', order: 0 },
        { course_id: courseId[COURSE_NAMES[2]], title: 'Tipografija', order: 1 },
        // No quiz and no task, and nobody has completed it — the case that used
        // to strand a student. It is here so the "Završi modul" button on the
        // module viewer has somewhere to be exercised.
        { course_id: courseId[COURSE_NAMES[2]], title: 'Kompozicija i raspored', order: 2 },
        // Single module, no quiz and no task — so a progress row makes it
        // complete, which is what lets the certificate below exist.
        { course_id: courseId[COURSE_NAMES[3]], title: 'Osnovne Git komande', order: 0 },
      ])
      .select(),
    'insert modules',
  );
  const moduleByTitle = Object.fromEntries(modules.map((m) => [m.title, m]));

  return { categoryId, courseId, moduleByTitle };
}

/* -------------------------------------------------------------------------- */
/* Quiz                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A quiz on module 1 of Ana's course.
 *
 * Worth seeding because the quiz is the most awkward shape in the schema: a
 * quiz owns questions, a question owns answers, and which answer is correct
 * lives in a *separate* `answer_keys` table that students are denied SELECT on.
 * That separation is the whole reason the quiz endpoint can't leak its own
 * answers — so having a real example to build the UI against matters.
 */
async function seedQuiz({ moduleByTitle }) {
  const quiz = unwrap(
    await supabase
      .from('quizzes')
      .insert({ module_id: moduleByTitle['Kako radi internet'].id, passing_score: 60 })
      .select()
      .single(),
    'insert quiz',
  );

  const questions = [
    {
      text: 'Što znači skraćenica HTTP?',
      answers: [
        { text: 'HyperText Transfer Protocol', correct: true },
        { text: 'HighTicket Transfer Process', correct: false },
        { text: 'Hyperlink Text Protocol', correct: false },
      ],
    },
    {
      text: 'Čemu služi DNS?',
      answers: [
        { text: 'Prevodi domen u IP adresu', correct: true },
        { text: 'Šifruje saobraćaj', correct: false },
        { text: 'Čuva kolačiće u pregledaču', correct: false },
      ],
    },
    {
      text: 'Koji port se podrazumijevano koristi za HTTPS?',
      answers: [
        { text: '443', correct: true },
        { text: '80', correct: false },
        { text: '8080', correct: false },
      ],
    },
  ];

  for (const q of questions) {
    const question = unwrap(
      await supabase.from('questions').insert({ quiz_id: quiz.id, text: q.text }).select().single(),
      'insert question',
    );

    const answers = unwrap(
      await supabase
        .from('answers')
        .insert(q.answers.map((a) => ({ question_id: question.id, text: a.text })))
        .select(),
      'insert answers',
    );

    // Do NOT insert answer_keys here. The `answers_ensure_answer_key` trigger
    // (migration 0007) already created one row per answer with
    // `is_correct = false`, precisely so that callers only ever have to flip a
    // flag rather than manage a second table. Inserting again violates the
    // unique index on answer_id.
    //
    // Note the partial unique index `one_correct_answer_per_question` enforces
    // the single-correct-answer rule in the database, so flipping a second
    // answer to true would be rejected — the radio buttons in the quiz editor
    // are a mirror of that constraint, not the source of it.
    const correctAnswer = answers[q.answers.findIndex((a) => a.correct)];
    unwrap(
      await supabase
        .from('answer_keys')
        .update({ is_correct: true })
        .eq('answer_id', correctAnswer.id),
      'mark correct answer',
    );
  }

  return quiz;
}

/* -------------------------------------------------------------------------- */
/* Files                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Uploads a real object and records the row that points at it.
 *
 * Seeding only the table row would give you a file list whose downloads 404.
 * The path shape is what the storage RLS policies parse for access, so it is
 * built exactly as `storagePath()` would: `{course_id}/{module_id}/{name}`.
 */
/**
 * A tiny, valid, single-page PDF — enough to seed a realistic module material.
 *
 * Written by hand rather than pulled in as a dependency: the seed needs one
 * throwaway document, and a PDF generator would be the heaviest thing in
 * `package.json` for the least reason.
 *
 * Offsets in the xref table are **byte** offsets, so they are measured with
 * `Buffer.byteLength`, not `String.length` — those differ the moment a
 * non-ASCII character appears and a reader will reject the file.
 *
 * Text is ASCII-only on purpose: the base-14 Helvetica used here is WinAnsi
 * encoded and has no glyphs for č/ć/š/ž/đ, so Serbian text would render as
 * mojibake. Seed content is transliterated instead.
 */
function minimalPdf(lines) {
  const escape = (text) => text.replace(/([\\()])/g, '\\$1');

  const content = lines
    .map((line, i) => `BT /F1 12 Tf 60 ${780 - i * 20} Td (${escape(line)}) Tj ET`)
    .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

async function uploadAndRecord({ bucket, folders, fileName, body, contentType, table, row }) {
  const path = `${folders.join('/')}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, new Blob([body], { type: contentType }), {
      contentType,
      upsert: true,
    });
  if (uploadError) throw new Error(`upload ${bucket}/${path}: ${uploadError.message}`);

  unwrap(
    await supabase.from(table).insert({ ...row, file_path: path, file_name: fileName }),
    `insert ${table}`,
  );

  return path;
}

async function seedFiles({ courseId, moduleByTitle }, task) {
  const htmlModule = moduleByTitle['HTML i CSS osnove'];

  await uploadAndRecord({
    bucket: 'module-files',
    folders: [courseId[COURSE_NAMES[0]], htmlModule.id],
    fileName: 'html-cheatsheet.pdf',
    // Module materials are PDF-only (see ACCEPTED_MODULE_FILE_TYPES), so the
    // seed produces a real PDF rather than a .txt the student viewer could not
    // render. ASCII only — see the note on minimalPdf.
    body: minimalPdf([
      'Osnovni HTML tagovi',
      '',
      '<h1>-<h6>   naslovi',
      '<p>         pasus',
      '<a href>    link',
      '<img>       slika',
    ]),
    contentType: 'application/pdf',
    table: 'module_files',
    row: { module_id: htmlModule.id },
  });

  await uploadAndRecord({
    bucket: 'task-files',
    folders: [courseId[COURSE_NAMES[0]], htmlModule.id],
    fileName: 'zadatak-primjer.txt',
    body: 'Primjer strukture koju trebate napraviti:\nindex.html\nstyle.css\n',
    // Task files are not restricted to PDF — only module materials are, because
    // only those are rendered in-page for students.
    contentType: 'text/plain',
    table: 'task_files',
    row: { task_id: task.id },
  });
}

/* -------------------------------------------------------------------------- */
/* Student activity                                                            */
/* -------------------------------------------------------------------------- */

async function seedActivity(users, { courseId, moduleByTitle }) {
  const purchases = unwrap(
    await supabase
      .from('purchases')
      .insert([
        // Approved: Lejla can actually open Ana's course.
        {
          student_id: users.lejla,
          course_id: courseId[COURSE_NAMES[0]],
          price: 100,
          status: 'approved',
        },
        // Pending: gives the admin purchases queue a row needing a decision.
        {
          student_id: users.emir,
          course_id: courseId[COURSE_NAMES[0]],
          price: 100,
          status: 'requested',
        },
        // Pending on Marko's course, so each teacher has something of their own.
        {
          student_id: users.lejla,
          course_id: courseId[COURSE_NAMES[2]],
          price: 75,
          status: 'requested',
        },
        // Approved on the one-module course, so a certificate can be earned.
        {
          student_id: users.lejla,
          course_id: courseId[COURSE_NAMES[3]],
          price: 0,
          status: 'approved',
        },
      ])
      .select(),
    'insert purchases',
  );

  // A task on module 2 of Ana's course, plus a submission thread for her to review.
  const task = unwrap(
    await supabase
      .from('tasks')
      .insert({
        module_id: moduleByTitle['HTML i CSS osnove'].id,
        text: 'Napravite jednostavnu HTML stranicu sa naslovom, pasusom i slikom, i stilizirajte je pomoću CSS-a. Pošaljite kod kao prilog.',
      })
      .select()
      .single(),
    'insert task',
  );

  const submission = unwrap(
    await supabase
      .from('task_submissions')
      .insert({ task_id: task.id, student_id: users.lejla, status: 'pending' })
      .select()
      .single(),
    'insert submission',
  );

  unwrap(
    await supabase.from('task_messages').insert([
      {
        submission_id: submission.id,
        sender_id: users.lejla,
        body: 'Poslala sam prvu verziju zadatka. Nisam sigurna da li sam dobro postavila slike.',
      },
    ]),
    'insert messages',
  );

  // A second thread, already bounced back, so the review UI has more than one
  // status to render.
  const revisionSubmission = unwrap(
    await supabase
      .from('task_submissions')
      .insert({ task_id: task.id, student_id: users.emir, status: 'needs_revision' })
      .select()
      .single(),
    'insert second submission',
  );

  unwrap(
    await supabase.from('task_messages').insert([
      {
        submission_id: revisionSubmission.id,
        sender_id: users.emir,
        body: 'Evo mog resenja zadatka.',
      },
      {
        submission_id: revisionSubmission.id,
        sender_id: users.ana,
        body: 'Dobar pocetak, ali nedostaje CSS datoteka. Dopunite i posaljite ponovo.',
      },
    ]),
    'insert revision messages',
  );

  // Progress: first module of Ana's course done, so the course page shows the
  // sequential unlock (module 1 complete, module 2 open, module 3 locked).
  unwrap(
    await supabase.from('module_progress').insert([
      // `quiz_done` matters: this module has a quiz, and the
      // `recompute_module_progress_completed` trigger only marks a module
      // complete once every piece it contains is done. Without the flag the row
      // would insert as incomplete and the student's unlock would not advance.
      {
        module_id: moduleByTitle['Kako radi internet'].id,
        student_id: users.lejla,
        quiz_done: true,
      },
      // Same keys as the row above, deliberately. In a multi-row insert
      // PostgREST unifies the columns across all objects and sends NULL for any
      // key a row omits — it does NOT fall back to the column default. Omitting
      // `quiz_done` here therefore fails the NOT NULL constraint rather than
      // defaulting to false.
      //
      // This module has neither quiz nor task, so the completion trigger marks
      // it done regardless, which is what makes the certificate below real.
      {
        module_id: moduleByTitle['Osnovne Git komande'].id,
        student_id: users.lejla,
        quiz_done: false,
      },
    ]),
    'insert module_progress',
  );

  // The Git course has exactly one module and it is now complete, so the
  // certificate is legitimate rather than invented.
  const certificate = unwrap(
    await supabase
      .from('certificates')
      .insert({
        course_id: courseId[COURSE_NAMES[3]],
        student_id: users.lejla,
        requested_delivery: true,
      })
      .select()
      .single(),
    'insert certificate',
  );

  return { purchases, submission, certificate, task };
}

/* -------------------------------------------------------------------------- */
/* Support issues and notifications                                            */
/* -------------------------------------------------------------------------- */

/**
 * One issue in each state, plus a thread on the answered one.
 *
 * Statuses are written directly rather than driven through the API, so this
 * seeds `closed_at`/`closed_by` by hand — the route would normally set them.
 * That is the usual seed trade-off: it bypasses RLS and the application rules
 * to produce a state that would otherwise take a dozen requests to reach.
 */
async function seedIssues(users) {
  const rows = unwrap(
    await supabase
      .from('issues')
      .insert([
        // Waiting on an admin — this is what the queue opens on.
        { reporter_id: users.lejla, subject: ISSUE_SUBJECTS[0], status: 'open' },
        // Answered but not closed: the middle state, easy to forget exists.
        { reporter_id: users.emir, subject: ISSUE_SUBJECTS[1], status: 'answered' },
        // Closed, so the "reply re-opens it" behaviour has something to act on.
        {
          reporter_id: users.lejla,
          subject: ISSUE_SUBJECTS[2],
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: users.admin,
        },
      ])
      .select(),
    'insert issues',
  );

  const bySubject = Object.fromEntries(rows.map((r) => [r.subject, r]));

  unwrap(
    await supabase.from('issue_messages').insert([
      {
        issue_id: bySubject[ISSUE_SUBJECTS[0]].id,
        sender_id: users.lejla,
        body: 'Zavrsio sam prvi modul ali drugi je i dalje zakljucan. Da li nesto propustam?',
      },
      {
        issue_id: bySubject[ISSUE_SUBJECTS[1]].id,
        sender_id: users.emir,
        body: 'Na certifikatu mi pise pogresno prezime. Moze li da se ispravi?',
      },
      {
        issue_id: bySubject[ISSUE_SUBJECTS[1]].id,
        sender_id: users.admin,
        body: 'Ispravili smo podatke na nalogu. Certifikat ce od sada nositi tacno ime.',
      },
      {
        issue_id: bySubject[ISSUE_SUBJECTS[2]].id,
        sender_id: users.lejla,
        body: 'Da li imate popust za studente?',
      },
      {
        issue_id: bySubject[ISSUE_SUBJECTS[2]].id,
        sender_id: users.admin,
        body: 'Trenutno nemamo studentski popust, ali planiramo ga za sljedecu sezonu.',
      },
    ]),
    'insert issue messages',
  );

  return rows;
}

/**
 * A few notifications, so the bell is not empty on first sign-in.
 *
 * Inserted directly, which is the one thing the application never does — every
 * real notification goes through `notifyAfterResponse` after the request that
 * caused it. Here there is no such request, so the rows are written as the
 * finished article. Two are left unread on purpose, so the badge shows a count.
 */
async function seedNotifications(users, { certificate, courseId }) {
  unwrap(
    await supabase.from('notifications').insert([
      {
        user_id: users.lejla,
        type: 'certificate_issued',
        title: 'Čestitamo — završili ste obuku!',
        body: `Certifikat za obuku „${COURSE_NAMES[3]}” je izdan na vaše ime. Broj: ${certificate.readable_id}.`,
        link: `/certificates/${certificate.readable_id}`,
      },
      {
        user_id: users.lejla,
        type: 'purchase_approved',
        title: 'Pristup obuci je odobren',
        body: `Sada možete pratiti obuku „${COURSE_NAMES[0]}”.`,
        link: '/dashboard',
        // Read, so the list shows both states.
        read_at: new Date().toISOString(),
      },
      {
        user_id: users.admin,
        type: 'purchase_requested',
        title: 'Novi zahtjev za kupovinu',
        body: `Emir Hadžić je zatražio/la pristup obuci „${COURSE_NAMES[0]}”.`,
        link: '/admin/purchases',
      },
      {
        user_id: users.ana,
        type: 'submission_received',
        title: 'Novo predano rješenje',
        body: `Lejla Begović je predala rješenje za „HTML i CSS osnove” (${COURSE_NAMES[0]}).`,
        link: '/admin/submissions',
      },
      {
        user_id: users.marko,
        type: 'course_published',
        title: 'Vaša obuka je objavljena',
        body: `Obuka „${COURSE_NAMES[2]}” je objavljena i vidljiva je u katalogu.`,
        link: `/admin/courses/${courseId[COURSE_NAMES[2]]}`,
        read_at: new Date().toISOString(),
      },
    ]),
    'insert notifications',
  );
}

/* -------------------------------------------------------------------------- */

async function main() {
  log('\nResetting seed accounts…');
  await resetAccounts();

  log('\nCreating accounts…');
  const users = await createAccounts();

  log('\nResetting seed content…');
  await resetContent();

  log('\nCreating courses and modules…');
  const content = await seedContent(users);

  log('\nCreating purchases, submissions and progress…');
  await seedQuiz(content);
  const activity = await seedActivity(users, content);
  await seedFiles(content, activity.task);

  log('\nCreating support issues and notifications…');
  await seedIssues(users);
  await seedNotifications(users, {
    certificate: activity.certificate,
    courseId: content.courseId,
  });

  log('\nDone.\n');
  log('  Sign in with any of these — password for all: ' + PASSWORD);
  for (const account of ACCOUNTS) {
    log(`    ${account.role.padEnd(7)}  ${account.email}`);
  }
  log('');
  log(`  Ana owns:   ${COURSE_NAMES[0]} (published), ${COURSE_NAMES[1]} (draft)`);
  log(`  Marko owns: ${COURSE_NAMES[2]}, ${COURSE_NAMES[3]}`);
  log(`  Certificate: ${activity.certificate.readable_id} (delivery requested)`);
  log('  Podrška:    3 zahtjeva (otvoren / odgovoren / zatvoren)');
  log('  Bell:       3 unread notifications across admin, Ana and Lejla');
  log('');
}

main().catch((error) => {
  console.error('\nSeed failed:', error.message, '\n');
  process.exit(1);
});
