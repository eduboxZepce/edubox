'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import EmptyState from '@/components/feedback/EmptyState';
import FilterSelect from '@/components/data/FilterSelect';
import PaginationBar from '@/components/data/PaginationBar';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { useListParams } from '@/hooks/useListParams';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import type { Notification } from '@/lib/schemas/notifications.schema';

/**
 * Everything you have been told, oldest decisions included.
 *
 * The bell's dropdown holds eight; this is the same data with paging and a
 * read/unread filter, for when someone is looking for a specific thing rather
 * than checking what is new.
 *
 * Shared by all three roles — see `(account)/layout.tsx` for why this has its
 * own route group.
 */
export default function NotificationsPage() {
  const list = useListParams({ unread: '' }, { pageSize: 20 });
  const notifications = useNotifications(list.queryParams);
  const unreadCount = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const router = useRouter();

  function handleOpen(notification: Notification) {
    if (!notification.read_at) markRead.mutate(notification.id);
    if (notification.link) router.push(notification.link);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Obavještenja"
        description="Sve što se dogodilo na vašem nalogu, po redoslijedu."
        actions={
          <Stack direction="row" spacing={1}>
            <Button href="/settings/notifications" startIcon={<SettingsOutlinedIcon />}>
              Postavke
            </Button>
            <Button
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || (unreadCount.data ?? 0) === 0}
            >
              Označi sve kao pročitano
            </Button>
          </Stack>
        }
      />

      <ContentCard disablePadding>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5, alignItems: { md: 'center' } }}
        >
          <FilterSelect
            label="Prikaz"
            value={list.filters.unread}
            onChange={(value) => list.setFilter('unread', value)}
            allLabel="Sva obavještenja"
            options={[{ value: 'true', label: 'Samo nepročitana' }]}
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: { md: 'auto' }, flexShrink: 0 }}
          >
            {unreadCount.data ? `Nepročitanih: ${unreadCount.data}` : null}
          </Typography>
        </Stack>

        <QueryState
          skeleton="list"
          query={notifications}
          errorTitle="Obavještenja nije moguće učitati"
          isEmpty={(page) => page.data.length === 0}
          empty={
            list.filters.unread === 'true' ? (
              <EmptyState
                title="Nema nepročitanih obavještenja"
                description="Sve ste pročitali. Promijenite prikaz da vidite starija."
              />
            ) : (
              <EmptyState
                title="Nemate obavještenja"
                description="Ovdje ćete vidjeti sve što se dogodi na vašem nalogu."
              />
            )
          }
        >
          {(page) => (
            <>
              <Stack divider={<Divider />}>
                {page.data.map((notification) => {
                  const clickable = Boolean(notification.link);

                  return (
                    <Box
                      key={notification.id}
                      // A real button only when there is somewhere to go. A row
                      // that looks clickable and does nothing is worse than a
                      // row that plainly does not.
                      component={clickable ? 'button' : 'div'}
                      type={clickable ? 'button' : undefined}
                      onClick={clickable ? () => handleOpen(notification) : undefined}
                      sx={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        font: 'inherit',
                        color: 'inherit',
                        border: 'none',
                        bgcolor: notification.read_at ? 'transparent' : 'action.hover',
                        borderLeft: 3,
                        borderLeftStyle: 'solid',
                        borderLeftColor: notification.read_at ? 'transparent' : 'primary.main',
                        px: 3,
                        py: 2,
                        cursor: clickable ? 'pointer' : 'default',
                        '&:hover': clickable ? { bgcolor: 'action.selected' } : undefined,
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 0.5, sm: 2 }}
                        sx={{ alignItems: { sm: 'baseline' } }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: notification.read_at ? 500 : 700, flex: 1 }}
                        >
                          {notification.title}
                        </Typography>
                        {/* Relative for scanning, absolute in the tooltip for
                            the moment someone needs the actual date. */}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          title={formatDateTime(notification.created_at)}
                          sx={{ flexShrink: 0 }}
                        >
                          {formatRelativeTime(notification.created_at)}
                        </Typography>
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {notification.body}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>

              <PaginationBar meta={page.meta} onChange={list.setPage} />
            </>
          )}
        </QueryState>
      </ContentCard>
    </PageContainer>
  );
}
