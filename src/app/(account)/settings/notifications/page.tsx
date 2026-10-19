'use client';

import * as React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotifications';
import {
  NOTIFICATION_CATALOG,
  NOTIFICATION_GROUPS,
  isNotificationTypeEnabled,
  type NotificationGroup,
  type NotificationType,
} from '@/lib/notifications/catalog';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { NotificationPreference } from '@/lib/schemas/notifications.schema';

/**
 * Which notifications you get, and through which channel.
 *
 * ## Saved per switch, not behind a Save button
 *
 * This is a settings matrix, not a form: every switch is independent, and
 * nothing here needs validating against anything else. `<Form>` and
 * `useZodForm` exist for the case where a set of fields is submitted together
 * and can be wrong as a set — a preference cannot. So each toggle is its own
 * small `PATCH`, which also means no "you have unsaved changes" problem.
 *
 * The switch flips immediately and reverts if the request fails, so the control
 * never sits still while something is in flight.
 *
 * ## Turning off in-app is allowed
 *
 * It would be easy to argue the bell should be mandatory. But a person who
 * genuinely does not want to hear about a thing should be able to say so, and a
 * switch that refuses is worse than no switch. Nothing is lost by it: the
 * underlying record — the purchase, the thread, the certificate — is still on
 * its own screen either way.
 */
export default function NotificationSettingsPage() {
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  /**
   * Which switch is mid-request, so only that row is disabled.
   *
   * `update.isPending` would disable the whole matrix on every toggle, which
   * makes flipping four switches in a row feel broken.
   */
  const [saving, setSaving] = React.useState<string | null>(null);

  async function handleToggle(
    type: NotificationType,
    channel: 'email_enabled' | 'in_app_enabled',
    value: boolean,
  ) {
    setSaving(`${type}:${channel}`);
    try {
      await update.mutateAsync({ preferences: [{ type, [channel]: value }] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(null);
    }
  }

  return (
    // No container or heading: `settings/layout.tsx` owns the shell and the
    // tabs, so this page is only its own section.
    <QueryState skeleton="list" query={preferences} errorTitle="Postavke nije moguće učitati">
      {(response) => {
        // Grouped for reading. The catalogue's order is preserved inside each
        // group, so the screen matches the order things are declared in.
        const byGroup = new Map<NotificationGroup, NotificationPreference[]>();
        for (const preference of response.data) {
          // Rows for a switched-off feature are dropped here rather than by the
          // API, which stays unaware of the flags.
          if (!isNotificationTypeEnabled(preference.type as NotificationType)) continue;
          const group = NOTIFICATION_CATALOG[preference.type as NotificationType].group;
          byGroup.set(group, [...(byGroup.get(group) ?? []), preference]);
        }

        return (
          <Stack spacing={3}>
            {!response.meta.email_configured ? (
              <Alert severity="info">
                <AlertTitle>Slanje email-a još nije aktivirano</AlertTitle>
                Email obavještenja su podešena, ali nalog za slanje još nije povezan — dok se ne
                poveže, stižu samo obavještenja u aplikaciji. Vaš izbor se pamti i primijenit će se
                čim slanje bude uključeno.
              </Alert>
            ) : null}

            {[...byGroup.entries()].map(([group, rows]) => (
              <ContentCard
                key={group}
                title={NOTIFICATION_GROUPS[group].title}
                description={NOTIFICATION_GROUPS[group].description}
                disablePadding
              >
                <Stack divider={<Divider />}>
                  {/* One header row, so the two columns are labelled once
                        rather than on every switch. */}
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ px: 3, py: 1.5, alignItems: 'center', bgcolor: 'action.hover' }}
                  >
                    <Box sx={{ flex: 1 }} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ width: 72, textAlign: 'center', flexShrink: 0 }}
                    >
                      U aplikaciji
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ width: 72, textAlign: 'center', flexShrink: 0 }}
                    >
                      Email
                    </Typography>
                  </Stack>

                  {rows.map((preference) => {
                    const definition = NOTIFICATION_CATALOG[preference.type as NotificationType];

                    return (
                      <Stack
                        key={preference.type}
                        direction="row"
                        spacing={2}
                        sx={{ px: 3, py: 1.75, alignItems: 'center' }}
                      >
                        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {definition.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {definition.description}
                          </Typography>
                        </Stack>

                        <Box sx={{ width: 72, textAlign: 'center', flexShrink: 0 }}>
                          <Switch
                            checked={preference.in_app_enabled}
                            disabled={saving === `${preference.type}:in_app_enabled`}
                            onChange={(event) =>
                              void handleToggle(
                                preference.type as NotificationType,
                                'in_app_enabled',
                                event.target.checked,
                              )
                            }
                            slotProps={{
                              input: {
                                'aria-label': `${definition.label} — obavještenje u aplikaciji`,
                              },
                            }}
                          />
                        </Box>

                        <Box sx={{ width: 72, textAlign: 'center', flexShrink: 0 }}>
                          <Switch
                            checked={preference.email_enabled}
                            disabled={saving === `${preference.type}:email_enabled`}
                            onChange={(event) =>
                              void handleToggle(
                                preference.type as NotificationType,
                                'email_enabled',
                                event.target.checked,
                              )
                            }
                            slotProps={{
                              input: { 'aria-label': `${definition.label} — email` },
                            }}
                          />
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </ContentCard>
            ))}

            <Box>
              <Button href="/notifications" startIcon={<ArrowBackIcon />} color="inherit">
                Nazad na obavještenja
              </Button>
            </Box>
          </Stack>
        );
      }}
    </QueryState>
  );
}
