/**
 * Makes an existing account an admin.
 *
 *   npm run make-admin -- someone@example.ba
 *
 * For the very first admin of a new installation: there is nobody yet who
 * could promote anyone from `/admin/users`. Register normally on the site
 * (email or Google), then run this with that address. Every admin after the
 * first is made from the admin panel instead.
 *
 * ## Why a script and not one line in the SQL editor
 *
 * `prevent_unauthorized_role_change()` (migration 0003) rejects a role change
 * unless the caller is an admin or the `service_role`. The Supabase SQL editor
 * runs as `postgres`, which is neither, so a plain `update profiles set role`
 * there fails with "Only an admin may change a user role". This script uses the
 * service-role key from `.env.local`, which the trigger exempts on purpose.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: npm run make-admin -- someone@example.ba');
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from('profiles')
  .update({ role: 'admin' })
  .eq('email', email)
  .select('email, full_name, role');

if (error) {
  console.error(`✖ ${error.message}`);
  process.exit(1);
}
if (!data.length) {
  console.error(`✖ No account with the email ${email}. Register on the site first, then re-run.`);
  process.exit(1);
}
console.log(`✔ ${data[0].full_name || data[0].email} is now an admin.`);
