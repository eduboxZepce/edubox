import 'server-only';
import type { LiveStatKey } from '@/lib/siteConfig';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * Real figures for the landing page's stats band, read from the database.
 *
 * `SITE.stats` holds hand-written floors so the band is not empty on a new
 * platform; `<StatsBar>` shows whichever of the two is higher, so the band
 * starts out on the floor and takes over the real number once it overtakes it.
 *
 * ## Why the service-role client, outside an API route
 *
 * Two of the three counts read tables `anon` cannot see (`profiles`,
 * `purchases`, `certificates`), so the public client would count zero. This
 * is safe for the same reason the outline endpoint is: the function itself is
 * the access control. Every query is `head: true` — it returns a number and no
 * rows — and nothing the caller passes reaches a filter.
 *
 * A failed read yields `null` for that figure rather than throwing: the floor
 * is still a sensible thing to show, and a stats band is not worth failing the
 * home page over.
 */

export type LiveStats = Record<LiveStatKey, number | null>;

export async function getLiveStats(): Promise<LiveStats> {
  const db = createServiceRoleClient();

  const [courses, students, enrolments, certificates] = await Promise.all([
    db.from('courses').select('id', { count: 'exact', head: true }).eq('published', true),
    db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .is('deactivated_at', null),
    db.from('purchases').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('certificates').select('id', { count: 'exact', head: true }),
  ]);

  const count = (result: { count: number | null; error: { message: string } | null }) => {
    if (result.error) {
      console.error('[landing] Failed to read a stat', result.error.message);
      return null;
    }
    return result.count;
  };

  const enrolled = count(enrolments);
  const finished = count(certificates);

  return {
    publishedCourses: count(courses),
    students: count(students),
    // A certificate is issued once per finished course, so certificates over
    // approved purchases is "share of enrolments completed". Capped at 100
    // because a certificate survives its purchase being deleted.
    completionRate:
      enrolled && finished !== null ? Math.min(100, Math.round((finished / enrolled) * 100)) : null,
  };
}
