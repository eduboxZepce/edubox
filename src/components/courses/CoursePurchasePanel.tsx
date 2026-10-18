'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import { useCreatePurchase } from '@/hooks/usePurchases';
import { canRequestPurchase, type PurchaseState } from '@/lib/courseAccess';
import type { Purchase } from '@/lib/schemas/purchases.schema';
import PaymentReference from '@/components/purchases/PaymentReference';
import PaymentInstructions from '@/components/purchases/PaymentInstructions';
import { errorMessage } from '@/lib/api/errorMessage';
import { formatPrice } from '@/lib/format';
import { toast } from '@/store/useToastStore';
import { FEATURES } from '@/lib/features';

/**
 * Price and the call to action, for a viewer who doesn't own the course yet.
 *
 * The course page doesn't render this at all once access is granted — the price
 * is redundant to someone who already paid, so there's nothing left to show.
 * That means this component only has to handle the not-yet-purchased states:
 *
 *   signed out        → the button sends them to login and back again
 *   no row / denied   → request access
 *   requested         → waiting on an admin, nothing to do
 *
 * `denied` is actionable on purpose: the unique index in migration 0009
 * excludes denied rows specifically so a student can ask again.
 */
export default function CoursePurchasePanel({
  courseId,
  courseName,
  price,
  purchaseState,
  isAuthenticated,
  pendingPurchase,
}: {
  courseId: string;
  courseName: string;
  price: number;
  purchaseState: PurchaseState;
  isAuthenticated: boolean;
  /** The outstanding request, so its payment reference can be shown. */
  pendingPurchase?: Purchase;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const createPurchase = useCreatePurchase();

  const [justRequested, setJustRequested] = React.useState(false);
  /*
   * The reference from the response, held locally.
   *
   * The list this page reads from refetches a moment later, but the reference
   * is the one thing the student needs *immediately* — they are about to open
   * their banking app. Taking it straight off the create response means it is
   * on screen before the refetch lands.
   */
  const [newReference, setNewReference] = React.useState<string | null>(null);
  // Treat a fresh request as pending immediately; the refetched list will agree
  // a moment later, and this avoids the button flicking back to "request".
  const state: PurchaseState = justRequested ? 'requested' : purchaseState;

  async function handleRequest() {
    // Send them to login with a way back — losing the page they were reading is
    // the fastest way to lose the sale.
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }

    try {
      const { data } = await createPurchase.mutateAsync({ course_id: courseId });
      setJustRequested(true);
      setNewReference(data.readable_id);
      toast.success('Zahtjev je poslan. Obavijestit ćemo te kada bude odobren.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <ContentCard>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Cijena kursa
          </Typography>
          <Typography variant="h2" component="p">
            {formatPrice(price)}
          </Typography>
        </Stack>

        {/* With purchases switched off the panel is only the price: there is
            no request to send, no reference and no payment details. */}
        {!FEATURES.purchases ? null : state === 'requested' ? (
          <Stack spacing={2}>
            <Alert severity="info" icon={<HourglassEmptyIcon fontSize="inherit" />}>
              Tvoj zahtjev čeka odobrenje. Čim uplata bude potvrđena, kurs će ti biti dostupan.
            </Alert>

            {(newReference ?? pendingPurchase?.readable_id) ? (
              <>
                <PaymentReference readableId={(newReference ?? pendingPurchase?.readable_id)!} />
                {/*
                  The reference alone was only half of a bank transfer — it says
                  how we will recognise the payment, not who to pay. These are
                  the account details it goes with.
                */}
                <PaymentInstructions
                  reference={(newReference ?? pendingPurchase?.readable_id)!}
                  courseName={courseName}
                  price={price}
                  showReference={false}
                />
              </>
            ) : null}
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {state === 'denied' ? (
              <Alert severity="warning">
                Prethodni zahtjev za ovaj kurs je odbijen. Možeš poslati novi.
              </Alert>
            ) : null}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => void handleRequest()}
              disabled={createPurchase.isPending || !canRequestPurchase(state)}
            >
              {createPurchase.isPending ? 'Slanje zahtjeva…' : 'Zatraži pristup'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              {isAuthenticated
                ? 'Pristup kursu odobrava administrator nakon potvrde uplate.'
                : 'Za slanje zahtjeva potrebno je da se prijaviš.'}
            </Typography>
          </Stack>
        )}
      </Stack>
    </ContentCard>
  );
}
