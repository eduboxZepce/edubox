// Route-segment fallback. Without its own, the list's table skeleton would
// stand in for a form.
import { FormPageSkeleton } from '@/components/feedback/PageSkeletons';

export default function Loading() {
  return <FormPageSkeleton fields={5} cards={4} />;
}
