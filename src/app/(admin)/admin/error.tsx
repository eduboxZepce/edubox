'use client';

import RouteError from '@/components/feedback/RouteError';

/**
 * Last-resort boundary for uncaught errors anywhere under `/admin`.
 *
 * Kept separate from the root boundary so the sidebar and top bar survive: an
 * admin who hits an error is mid-task, and losing the shell would mean losing
 * their place as well as the page.
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  /** Re-runs the failed segment. Next 16's replacement for `reset()`, which
      only cleared the boundary without re-fetching anything. */
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={unstable_retry}
      scope="admin"
      homeHref="/admin"
      homeLabel="Kontrolna ploča"
    />
  );
}
