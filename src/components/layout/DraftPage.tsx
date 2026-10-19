import * as React from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';

/**
 * A public page that exists, routes, and is honest about having no content yet.
 *
 * Distinct from the old admin `<PlaceholderPage>` (now deleted), which listed
 * *engineering* work still to do. These pages are not waiting on code — the
 * route, the chrome and the footer link are all finished. They are waiting on
 * **copy**, which is somebody else's job, so the notice says that rather than
 * pretending a developer is coming back.
 *
 * The distinction matters for the legal pages especially: "Uvjeti korištenja"
 * with invented text would be worse than one that says plainly it is not
 * written yet.
 *
 * `sections` sketches the intended structure where that is known, so whoever
 * writes the copy inherits an outline instead of a blank page.
 */
export default function DraftPage({
  title,
  description,
  sections,
  children,
}: {
  title: string;
  description?: string;
  /** Headings the finished page is expected to have. */
  sections?: string[];
  children?: React.ReactNode;
}) {
  return (
    <PageContainer>
      <PageHeader title={title} description={description} />

      <Alert severity="info">
        Sadržaj ove stranice još nije napisan. Stranica postoji i dostupna je, ali tekst tek treba
        dodati.
      </Alert>

      {children}

      {sections?.length ? (
        <ContentCard
          title="Planirani sadržaj"
          description="Okvir za tekst koji tek treba napisati."
        >
          <Stack component="ul" spacing={1} sx={{ m: 0, pl: 3 }}>
            {sections.map((section) => (
              <Typography key={section} component="li" variant="body2" color="text.secondary">
                {section}
              </Typography>
            ))}
          </Stack>
        </ContentCard>
      ) : null}
    </PageContainer>
  );
}
