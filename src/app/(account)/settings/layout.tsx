import Stack from '@mui/material/Stack';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import SettingsTabs from '@/components/settings/SettingsTabs';

/**
 * One settings screen, three sections.
 *
 * The container, the heading and the tabs live here so the child pages are just
 * their own content — none of them repeats the shell, and adding a fourth
 * section means a page plus one line in `SettingsTabs`.
 *
 * A layout rather than a single page with panels because each section keeps its
 * own URL. See the note in `SettingsTabs` for why that is worth a navigation.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer maxWidth="form">
      {/* No description listing the sections: which ones exist depends on the
          feature flags, and the tabs right below already name them. */}
      <PageHeader title="Postavke" />

      <Stack spacing={3}>
        <SettingsTabs />
        {children}
      </Stack>
    </PageContainer>
  );
}
