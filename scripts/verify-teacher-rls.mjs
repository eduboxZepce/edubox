/**
 * Checks that the teacher ownership rules actually hold, against the real
 * database, as the real roles.
 *
 *   npm run db:verify-rls        (run `npm run db:seed` first)
 *
 * Every check signs in with the **anon** key and a password, so the requests
 * carry an ordinary user JWT and RLS applies exactly as it would in the browser.
 * A check that used the service-role key would prove nothing.
 *
 * This is deliberately a script and not a unit test: the thing being verified
 * is the database's behaviour, not our code's, and mocking it away would defeat
 * the point. Re-run it after any migration that touches policies.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const PASSWORD = 'Test1234!';
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** A client authenticated as a real user — subject to RLS. */
async function signIn(email) {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return client;
}

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  // Resolve the seeded rows with the service client (no RLS) so the checks
  // below know what they *should* be able to reach.
  const { data: courses } = await service.from('courses').select('id, name, owner_id, published');
  const anaCourse = courses.find((c) => c.name === 'Uvod u web programiranje');
  const anaDraft = courses.find((c) => c.name === 'Napredni JavaScript');
  const markoCourse = courses.find((c) => c.name === 'Osnove grafičkog dizajna');

  const ana = await signIn('ana@kursevi.test');
  const marko = await signIn('marko@kursevi.test');
  const student = await signIn('lejla@kursevi.test');

  console.log('\nReading courses');
  {
    const { data } = await ana.from('courses').select('id, name').eq('id', anaDraft.id);
    check('teacher sees their own draft', data?.length === 1);
  }
  {
    const { data } = await marko.from('courses').select('id, name').eq('id', anaDraft.id);
    check("teacher cannot see another teacher's draft", data?.length === 0);
  }
  {
    const { data } = await student.from('courses').select('id').eq('id', anaDraft.id);
    check('student cannot see a draft', data?.length === 0);
  }
  {
    const { data } = await marko.from('courses').select('id').eq('id', anaCourse.id);
    check("teacher can see another teacher's *published* course", data?.length === 1);
  }

  console.log('\nEditing courses');
  {
    const { error } = await ana
      .from('courses')
      .update({ description: 'Izmijenjeno u provjeri.' })
      .eq('id', anaCourse.id);
    check('teacher can edit their own course', !error, error?.message);
  }
  {
    const { data, error } = await ana
      .from('courses')
      .update({ name: 'OTETO' })
      .eq('id', markoCourse.id)
      .select();
    // RLS makes a denied UPDATE a no-op rather than an error: zero rows match.
    check(
      "teacher cannot edit another teacher's course",
      !error && (data?.length ?? 0) === 0,
      error?.message,
    );
  }
  {
    const { error } = await ana.from('courses').update({ published: true }).eq('id', anaDraft.id);
    check(
      'teacher cannot publish their own course',
      Boolean(error),
      error ? '' : 'no error raised',
    );
  }
  {
    const { error } = await ana
      .from('courses')
      .update({ owner_id: markoCourse.owner_id })
      .eq('id', anaCourse.id);
    check('teacher cannot transfer ownership', Boolean(error), error ? '' : 'no error raised');
  }

  console.log('\nCreating content');
  let createdCourseId = null;
  {
    const { data, error } = await ana
      .from('courses')
      .insert({ name: 'Provjera: nova obuka', price: 0 })
      .select()
      .single();
    check('teacher can create a course', !error, error?.message);
    if (data) {
      createdCourseId = data.id;
      check('created course is owned by its creator', data.owner_id === anaCourse.owner_id);
      check('created course is not published', data.published === false);
    }
  }
  {
    const { error } = await ana
      .from('modules')
      .insert({ course_id: markoCourse.id, title: 'Ubaceno', order: 99 });
    check(
      "teacher cannot add a module to another teacher's course",
      Boolean(error),
      error ? '' : 'insert succeeded',
    );
  }
  {
    const { error } = await ana
      .from('modules')
      .insert({ course_id: anaCourse.id, title: 'Provjera modul', order: 98 });
    check('teacher can add a module to their own course', !error, error?.message);
    if (!error) await service.from('modules').delete().eq('title', 'Provjera modul');
  }
  {
    const { error } = await student.from('courses').insert({ name: 'Student pokušava', price: 0 });
    check('student cannot create a course', Boolean(error), error ? '' : 'insert succeeded');
  }

  console.log('\nStudent data visibility');
  {
    const { data } = await ana.from('purchases').select('id, course_id');
    const onlyOwn = (data ?? []).every((p) => p.course_id !== markoCourse.id);
    check('teacher sees purchases only for their own courses', onlyOwn && (data?.length ?? 0) > 0);
  }
  {
    const { data } = await marko.from('purchases').select('id, course_id');
    const onlyOwn = (data ?? []).every((p) => p.course_id !== anaCourse.id);
    check("teacher does not see another teacher's purchases", onlyOwn);
  }
  {
    const { data } = await ana.from('task_submissions').select('id');
    check('teacher sees submissions on their own course', (data?.length ?? 0) > 0);
  }
  {
    // Asserted as "none of *Ana's*", not "none at all". The zero-rows form only
    // held while Marko's own courses happened to have no submissions on them —
    // so adding a task to his course through the UI failed a *security* check
    // that had not been violated. What matters is the isolation, not the count.
    const { data } = await marko.from('task_submissions').select('id, tasks(modules(course_id))');
    const anasVisible = (data ?? []).filter((s) => s.tasks?.modules?.course_id === anaCourse.id);
    check(
      "teacher does not see another teacher's submissions",
      anasVisible.length === 0,
      `saw ${anasVisible.length} of Ana's`,
    );
  }
  {
    // Precondition, established rather than assumed: this block asserts that a
    // *pending* request is enough to make a student visible, so a pending
    // request has to exist. The seed creates one, but the seed is disposable and
    // an admin working through the purchase queue legitimately clears it — which
    // silently turned this into a check of nothing, then a failure.
    //
    // Set up with the service client, like the other lookups at the top. Only
    // the assertions need a user JWT; arranging the data does not.
    const { data: emir } = await service
      .from('profiles')
      .select('id')
      .eq('email', 'emir@kursevi.test')
      .single();

    const { data: existing } = await service
      .from('purchases')
      .select('id')
      .eq('course_id', anaCourse.id)
      .eq('student_id', emir.id)
      .maybeSingle();

    if (!existing) {
      await service
        .from('purchases')
        .insert({ course_id: anaCourse.id, student_id: emir.id, price: 0, status: 'requested' });
    }

    const { data } = await ana.from('profiles').select('id, full_name');
    const names = (data ?? []).map((p) => p.full_name);

    check('teacher can read a student who bought their course', names.includes('Lejla Begović'));

    // Emir only *requested* Ana's course — `teaches_student` deliberately
    // does not filter on status, because the purchase queue Ana is allowed to
    // read is exactly the list of pending requests and it needs names on it.
    check('teacher can read a student who requested their course', names.includes('Emir Hadžić'));

    // Nobody with no relationship to Ana's courses at all.
    check(
      'teacher cannot read unrelated profiles',
      !names.includes('Marko Marković') && !names.includes('Amra Kovačević'),
      `saw: ${names.join(', ')}`,
    );
  }
  {
    // The answer key is the one thing a student must never read — it is a
    // separate table precisely so RLS can deny it while `answers` stays
    // readable. The seed puts a quiz on Ana's course, so all three roles are
    // meaningfully testable here.
    const anaKeys = await ana.from('answer_keys').select('id, is_correct');
    check('teacher can read the answer key for their own quiz', (anaKeys.data?.length ?? 0) > 0);

    // Again scoped to Ana's quiz rather than to a row count: Marko owning a
    // quiz of his own is normal, and reading *its* key is exactly what the
    // previous assertion says he may do.
    const markoKeys = await marko
      .from('answer_keys')
      .select('id, answers(questions(quizzes(modules(course_id))))');
    const anasKeys = (markoKeys.data ?? []).filter(
      (k) => k.answers?.questions?.quizzes?.modules?.course_id === anaCourse.id,
    );
    check(
      "teacher cannot read another teacher's answer key",
      anasKeys.length === 0,
      `saw ${anasKeys.length} of Ana's`,
    );

    const studentKeys = await student.from('answer_keys').select('id');
    check(
      'student cannot read any answer key',
      (studentKeys.data?.length ?? 0) === 0,
      `saw ${studentKeys.data?.length} rows`,
    );
  }

  // ---------------------------------------------------------------------------
  // Losing staff status revokes authoring — migrations 0019 and 0020
  // ---------------------------------------------------------------------------
  //
  // `courses.owner_id` survives a role change, and before 0019 that was the
  // whole test: a teacher demoted to student kept every authoring grant on the
  // courses they already owned. 0020 extends the same rule to deactivation.
  //
  // No re-authentication between these checks, deliberately. `is_staff()` reads
  // `profiles` at query time, so an existing JWT is enough — which is exactly
  // why the predicate has to carry the check rather than the login path.
  console.log('\nLosing staff status revokes authoring');
  try {
    await service.from('profiles').update({ role: 'student' }).eq('id', anaCourse.owner_id);
    {
      const { data, error } = await ana
        .from('courses')
        .update({ description: 'Ne bi smjelo da prođe.' })
        .eq('id', anaCourse.id)
        .select();
      check(
        'demoted teacher cannot edit a course they still own',
        !error && (data?.length ?? 0) === 0,
        error?.message ?? `updated ${data?.length} rows`,
      );
    }
    {
      const { error } = await ana
        .from('modules')
        .insert({ course_id: anaCourse.id, title: 'Ne bi smjelo', order: 99 });
      check('demoted teacher cannot add a module to their own course', Boolean(error));
    }
    {
      const { data } = await ana.from('purchases').select('id').eq('course_id', anaCourse.id);
      check("demoted teacher cannot read their course's purchases", (data?.length ?? 0) === 0);
    }

    await service.from('profiles').update({ role: 'teacher' }).eq('id', anaCourse.owner_id);
    {
      const { data, error } = await ana
        .from('courses')
        .update({ description: 'Vraćeno.' })
        .eq('id', anaCourse.id)
        .select();
      check(
        'restoring the teacher role restores authoring',
        !error && (data?.length ?? 0) === 1,
        error?.message,
      );
    }

    await service
      .from('profiles')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('id', anaCourse.owner_id);
    {
      const { data, error } = await ana
        .from('courses')
        .update({ description: 'Ni ovo ne bi smjelo.' })
        .eq('id', anaCourse.id)
        .select();
      check(
        'deactivated teacher cannot edit their own course',
        !error && (data?.length ?? 0) === 0,
        error?.message ?? `updated ${data?.length} rows`,
      );
    }
  } finally {
    // Always restore, or a failed run leaves the seeded teacher broken for the
    // next one.
    await service
      .from('profiles')
      .update({ role: 'teacher', deactivated_at: null })
      .eq('id', anaCourse.owner_id);
  }

  // Clean up the row this script created, so it can be run repeatedly.
  if (createdCourseId) await service.from('courses').delete().eq('id', createdCourseId);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\nVerification error:', error.message, '\n');
  process.exit(1);
});
