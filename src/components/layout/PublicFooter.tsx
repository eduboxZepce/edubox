import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FEATURES } from '@/lib/features';
import { listFooterCategories } from '@/lib/server/categories';
import { SITE } from '@/lib/siteConfig';
import Logo from '@/components/layout/Logo';

/**
 * Footer for the public pages.
 *
 * It exists mainly so the legal and contact pages are reachable at all — they
 * are the kind of page nobody navigates *to*, only ever finds at the bottom of
 * something else. A Server Component: it is a list of links and nothing more,
 * so it costs no JavaScript.
 *
 * `(marketing)/layout.tsx` renders it once for every public page. It is
 * deliberately absent from the signed-in shells, which have their own
 * navigation and no use for a marketing footer.
 */
/** "Edubox d.o.o. · Adresa · ID: …" — only the parts that are filled in. */
const companyLine = [
  SITE.company.legalName,
  SITE.company.address,
  SITE.company.idNumber && `ID: ${SITE.company.idNumber}`,
]
  .filter(Boolean)
  .join(' · ');

type FooterSection = { title: string; links: { label: string; href: string }[] };

/*
 * Async because the course column is read from the database (see
 * `listFooterCategories`). Every other link comes from `siteConfig.ts` or is a
 * fixed route. Sections for switched-off features are left out, so the footer
 * never links to a page that 404s.
 */
export default async function PublicFooter() {
  const categories = FEATURES.catalog ? await listFooterCategories() : [];

  const sections: FooterSection[] = [
    ...(FEATURES.catalog
      ? [
          {
            title: 'Kursevi',
            links: [
              ...categories.map((category) => ({
                label: category.name,
                href: `/courses?categoryId=${category.id}`,
              })),
              { label: 'Svi kursevi', href: '/courses' },
            ],
          },
        ]
      : []),
    {
      // "O nama" (/o-nama) was linked here before the page existed, which put a
      // link to a 404 on every public page. Add it back together with the page.
      title: 'Platforma',
      links: [
        ...(FEATURES.blog ? [{ label: 'Blog', href: '/blog' }] : []),
        { label: 'Kontakt', href: '/kontakt' },
        ...(FEATURES.certificates
          ? [{ label: 'Provjera certifikata', href: '/provjera-certifikata' }]
          : []),
        { label: 'Uvjeti korištenja', href: '/uvjeti-koristenja' },
        { label: 'Politika privatnosti', href: '/politika-privatnosti' },
      ],
    },
    {
      // Contact details and social URLs live in siteConfig.ts.
      title: 'Kontakt',
      links: [
        { label: SITE.contact.email, href: `mailto:${SITE.contact.email}` },
        { label: SITE.contact.phone.display, href: `tel:${SITE.contact.phone.tel}` },
        ...SITE.social.filter((profile) => profile.href !== ''),
      ],
    },
  ];

  return (
    // `data-nosnippet`: Google once built a page's search snippet out of this
    // footer — contacts and social labels run together into one line.
    <Box component="footer" data-nosnippet sx={{ mt: 8, borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 4, sm: 6 }}
          sx={{ justifyContent: 'space-between' }}
        >
          <Stack spacing={1} sx={{ maxWidth: 280 }}>
            <Typography variant="h6" component="p">
              <Logo />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {SITE.description}
            </Typography>
          </Stack>

          {sections.map((section) => (
            <Stack key={section.title} spacing={1}>
              <Typography variant="subtitle2">{section.title}</Typography>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  variant="body2"
                  underline="hover"
                  color="text.secondary"
                  {...(link.href.startsWith('http') && {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  })} // This makes social links open in new tab
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} {SITE.name}. Sva prava zadržana.
          {companyLine && ` ${companyLine}`}
        </Typography>
      </Container>
    </Box>
  );
}
