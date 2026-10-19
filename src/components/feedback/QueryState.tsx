'use client';

import * as React from 'react';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LoadingState from './LoadingState';
import {
  CardGridSkeleton,
  DetailListSkeleton,
  FormSkeleton,
  ListRowsSkeleton,
  TableSkeleton,
  TextBlockSkeleton,
} from './Skeletons';

/**
 * Renders the four states of a React Query read — loading, error, empty,
 * loaded — so no page has to write the same `if (isLoading) … if (error) …`
 * ladder again.
 *
 * `children` is a function, not JSX, and that's the point: it only runs once
 * `data` is known, so inside it `data` is fully typed and never undefined.
 *
 *   <QueryState
 *     query={coursesQuery}
 *     skeleton="table"
 *     isEmpty={(page) => page.data.length === 0}
 *     empty={<EmptyState title="Nema obuka" />}
 *   >
 *     {(page) => <CourseGrid courses={page.data} />}
 *   </QueryState>
 *
 * Structurally typed rather than tied to `UseQueryResult`, so it accepts any
 * `useQuery` result *and* a hand-composed object. That second case matters when
 * a page picks between two queries of different shapes and normalises their
 * data first — see the course page, which feeds it one query's status
 * alongside a merged module list.
 */
export type MinimalQueryResult<TData> = {
  data: TData | undefined;
  /** True while there is no data yet. */
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

/**
 * Which placeholder to draw while the data is in flight.
 *
 * Named shapes rather than a component per call site, because there are only a
 * handful of layouts in this app and the point is that the placeholder matches
 * the content. Pass `loading` instead when a screen needs something bespoke.
 *
 * `'spinner'` is still available for a small inline region with no shape worth
 * imitating — but it is deliberately no longer the default. A centred spinner
 * says only "something is happening", and it collapses the region to its own
 * height, so the layout jumps when the data lands.
 */
export type QuerySkeleton =
  'text' | 'table' | 'list' | 'grid' | 'detail' | 'form' | 'spinner' | 'none';

function renderSkeleton(kind: QuerySkeleton): React.ReactNode {
  switch (kind) {
    case 'table':
      return <TableSkeleton />;
    case 'list':
      return <ListRowsSkeleton />;
    case 'grid':
      return <CardGridSkeleton />;
    case 'detail':
      return <DetailListSkeleton />;
    case 'form':
      return <FormSkeleton />;
    case 'spinner':
      return <LoadingState />;
    case 'none':
      return null;
    case 'text':
    default:
      return <TextBlockSkeleton lines={4} />;
  }
}

export type QueryStateProps<TData> = {
  query: MinimalQueryResult<TData>;
  children: (data: TData) => React.ReactNode;
  /**
   * How to tell that a successful response contains nothing. Lists usually pass
   * `(page) => page.data.length === 0`; detail queries normally omit it.
   */
  isEmpty?: (data: TData) => boolean;
  empty?: React.ReactNode;
  /** A named placeholder shape. Ignored when `loading` is given. */
  skeleton?: QuerySkeleton;
  /** A bespoke placeholder, when none of the named shapes fits. */
  loading?: React.ReactNode;
  errorTitle?: string;
};

export default function QueryState<TData>({
  query,
  children,
  isEmpty,
  empty,
  skeleton = 'text',
  loading,
  errorTitle,
}: QueryStateProps<TData>) {
  // `isPending` means "no data yet", which is what we want. `isLoading` would
  // be false during a background refetch that still has no data to show, and a
  // disabled query (`enabled: false`) stays pending — deliberately, since it
  // has nothing to render either.
  if (query.isPending) return <>{loading ?? renderSkeleton(skeleton)}</>;

  if (query.isError) {
    return (
      <ErrorState error={query.error} title={errorTitle} onRetry={() => void query.refetch()} />
    );
  }

  const data = query.data as TData;

  if (isEmpty?.(data)) {
    return <>{empty ?? <EmptyState title="Nema podataka" />}</>;
  }

  return <>{children(data)}</>;
}
