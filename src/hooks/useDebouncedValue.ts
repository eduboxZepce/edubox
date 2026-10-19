'use client';

import * as React from 'react';

/**
 * Returns `value` only after it has stopped changing for `delayMs`.
 *
 * The point is to keep an input responsive while the thing it drives is not.
 * A search box updates its own state on every keystroke — that has to be
 * instant — but the query key should only change once the user pauses, or
 * "obuke" fires five requests.
 *
 *   const [search, setSearch] = React.useState('');
 *   const debouncedSearch = useDebouncedValue(search, 300);
 *   const courses = useAdminCourses({ search: debouncedSearch });
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    // Clearing on every change is what makes this a debounce rather than a
    // delay: only the last pending timer of a burst survives to fire.
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
