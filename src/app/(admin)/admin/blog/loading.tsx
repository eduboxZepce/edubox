// Route-segment fallback — see `PageSkeletons`.
import { ListPageSkeleton } from '@/components/feedback/PageSkeletons';

export default function Loading() {
  return <ListPageSkeleton columns={3} filters={1} />;
}
