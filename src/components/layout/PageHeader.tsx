import * as React from 'react';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type Crumb = {
  label: string;
  /** Omit on the last crumb — the current page isn't a link to itself. */
  href?: string;
};

/**
 * The title block every page opens with: optional breadcrumbs, an h1, an
 * optional one-line explanation, and a slot for page-level actions.
 *
 *   <PageHeader
 *     breadcrumbs={[{ label: 'Obuke', href: '/admin/courses' }, { label: 'Nova obuka' }]}
 *     title="Nova obuka"
 *     description="Popunite osnovne podatke o obuci."
 *     actions={<Button variant="contained">Sačuvaj</Button>}
 *   />
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <Stack spacing={1.5}>
      {breadcrumbs?.length ? (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="Navigacija">
          {breadcrumbs.map((crumb) =>
            crumb.href ? (
              <Link
                key={crumb.label}
                href={crumb.href}
                variant="body2"
                underline="hover"
                color="text.secondary"
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography key={crumb.label} variant="body2" color="text.primary">
                {crumb.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' } }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h2" component="h1">
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : null}
        </Stack>

        {actions ? (
          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}
