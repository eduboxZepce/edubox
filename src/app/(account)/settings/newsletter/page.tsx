'use client';

import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import { useMyPreferences, useUpdatePreferences } from '@/hooks/usePreferences';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';

/**
 * The mailing-list opt-in.
 *
 * Its own section rather than a row in the notifications matrix, and that is
 * not just tidiness: that matrix is transactional mail about things that
 * happened to *you*, while this is marketing. Someone who wants to hear that
 * their task was reviewed has not thereby agreed to a mailing list, and the two
 * sit under different bodies of law.
 *
 * Stored in `user_preferences` (migration 0029), where only the owner may write
 * it — an admin can read the list in order to send to it, and can never add
 * anyone to it.
 */
export default function NewsletterSettingsPage() {
  const preferences = useMyPreferences();
  const update = useUpdatePreferences();

  async function setNewsletter(next: boolean) {
    try {
      await update.mutateAsync({ newsletter_opt_in: next });
      toast.success(next ? 'Prijavljeni ste na newsletter.' : 'Odjavljeni ste sa newslettera.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <ContentCard title="Newsletter" description="Povremene novosti o obukama i sadržaju.">
      <Stack spacing={1}>
        <FormControlLabel
          control={
            <Switch
              checked={preferences.data?.newsletter_opt_in ?? false}
              onChange={(event) => void setNewsletter(event.target.checked)}
              // Until the stored value arrives the switch would render "off"
              // and invite a click that flips it to the value it already had.
              disabled={preferences.isPending || update.isPending}
            />
          }
          label="Želim primati newsletter"
        />
        <Typography variant="body2" color="text.secondary">
          Možete se odjaviti u bilo kojem trenutku. Ovo nije vezano za obavještenja o vašim obukama,
          zadacima i certifikatima — njih postavljate u kartici Obavještenja.
        </Typography>
      </Stack>
    </ContentCard>
  );
}
