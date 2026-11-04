import { createTheme, alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { SITE } from '@/lib/siteConfig';

/**
 * The brand colours come from `brand/config.ts`; everything else in the
 * palette is neutral and shared by every client.
 *
 * `contrastText` is chosen, not configured: whichever of white or near-black
 * contrasts more with the colour (WCAG relative luminance). A client with a
 * pale brand colour therefore gets dark button text without anyone having to
 * know to ask for it.
 */
const { primary, secondary } = SITE.colors;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const WHITE = '#ffffff';
const INK = '#0b0d12';

function contrastText(hex: string): string {
  const l = luminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const onInk = (l + 0.05) / (luminance(INK) + 0.05);
  return onWhite >= onInk ? WHITE : INK;
}

const brand = (main: string) => ({ main, contrastText: contrastText(main) });

/**
 * Central MUI theme. Pages are built manually on top of this, so keep the
 * palette/typography/component decisions here rather than scattering `sx`
 * overrides.
 *
 * Design direction: flat and bordered rather than shadow-heavy, sharp/minimal
 * radii, generous spacing, tightened heading letter-spacing, ripple disabled
 * in favor of instant color-shift hover/focus states. The goal is a look
 * that doesn't read as "default MUI" on first glance.
 */
export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    light: {
      palette: {
        mode: 'light',
        primary: brand(primary.light),
        secondary: brand(secondary.light),
        success: { main: '#1f9d55' },
        warning: { main: '#c98a00' },
        error: { main: '#d63c3c' },
        background: { default: '#f7f8fa', paper: '#ffffff' },
        text: { primary: '#14161a', secondary: '#5a5f6b' },
        divider: '#e2e4e9',
      },
    },
    dark: {
      palette: {
        mode: 'dark',
        primary: brand(primary.dark),
        secondary: brand(secondary.dark),
        success: { main: '#3fc978' },
        warning: { main: '#e0a838' },
        error: { main: '#ea6363' },
        background: { default: '#0e0f13', paper: '#15171d' },
        text: { primary: '#f2f3f5', secondary: '#a3a8b4' },
        divider: '#2a2d35',
      },
    },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 },
    h2: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2 },
    h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25 },
    h4: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.005em' },
    h5: { fontSize: '1.0625rem', fontWeight: 600 },
    h6: { fontSize: '0.9375rem', fontWeight: 600 },
    subtitle1: {
      fontSize: '0.9375rem',
      fontWeight: 500,
      color: 'var(--mui-palette-text-secondary)',
    },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8437rem', lineHeight: 1.55 },
    overline: { fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.6875rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.005em' },
  },
  shape: { borderRadius: 6 },
  spacing: 8,
  shadows: [
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    '0 2px 12px rgba(15, 17, 21, 0.08)',
    '0 2px 12px rgba(15, 17, 21, 0.08)',
    '0 4px 20px rgba(15, 17, 21, 0.10)',
    '0 4px 20px rgba(15, 17, 21, 0.10)',
    '0 4px 20px rgba(15, 17, 21, 0.10)',
    '0 4px 20px rgba(15, 17, 21, 0.10)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
    '0 8px 28px rgba(15, 17, 21, 0.12)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: (themeParam) => ({
        '::selection': {
          backgroundColor: alpha(themeParam.palette.primary.main, 0.25),
        },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background: themeParam.palette.divider,
          borderRadius: 8,
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: themeParam.palette.text.secondary,
          backgroundClip: 'padding-box',
        },
      }),
    },
    /*
     * Routing integration — read this before adding a link anywhere.
     *
     * Setting Next's `Link` here means `<Button href>`, `<ListItemButton href>`,
     * `<CardActionArea href>`, `<IconButton href>` and `<Link href>` all
     * client-side navigate on their own. **Never pass `component={NextLink}`
     * at a call site** — with one exception, `MenuItem`, noted below.
     *
     * That isn't a style preference. A page is a Server Component by default,
     * and every MUI component is a Client Component, so writing
     * `component={NextLink}` in a page hands a *function* across the RSC
     * boundary — which can't be serialised, and fails at runtime with
     * "Functions cannot be passed directly to Client Components". Configuring
     * it here sidesteps that entirely: the theme is only ever imported by
     * `ThemeRegistry`, which is itself a Client Component, so `NextLink` never
     * crosses the boundary.
     *
     * `LinkComponent` (ButtonBase) and `component` (Link) are different props
     * by design: ButtonBase swaps its element only when an `href` is present,
     * so a plain `<Button onClick>` still renders a real `<button>`.
     *
     * ## `MenuItem` is the exception — it needs `component={NextLink}`
     *
     * ButtonBase only substitutes `LinkComponent` when its root is still the
     * default `'button'`:
     *
     *     if (ComponentProp === 'button' && isLink) ComponentProp = LinkComponent;
     *
     * `MenuItem` overrides that root with `'li'`, so the condition never holds
     * and `<MenuItem href="…">` renders `<li href="…">` — a dead element that
     * silently does nothing. There is no styling or console warning; it just
     * doesn't navigate. (`ListItemButton` defaults to `'div'` but *does* resolve
     * to an anchor, so the sidebar is unaffected — MenuItem is the only one.)
     *
     * So a menu item that links must say so explicitly:
     *
     *     <MenuItem component={NextLink} href={`/admin/courses/${id}/edit`}>
     *
     * That is safe here only because every `<Menu>` in this app lives in a
     * Client Component. Never do it from a Server Component — see above.
     *
     * This covers MUI components only. `<Stack component={NextLink}>` and
     * `<Box component={NextLink}>` are still written out at the call site — and
     * are therefore only usable inside a Client Component.
     */
    MuiButtonBase: {
      defaultProps: { disableRipple: true, LinkComponent: NextLink },
    },
    MuiLink: {
      defaultProps: { component: NextLink },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 6,
          paddingInline: 20,
          paddingBlock: 10,
          transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
        },
        sizeSmall: { paddingInline: 14, paddingBlock: 6 },
        sizeLarge: { paddingInline: 26, paddingBlock: 13 },
        contained: {
          '&:hover': { boxShadow: 'none', filter: 'brightness(0.92)' },
          '&:active': { filter: 'brightness(0.85)' },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': { borderWidth: 1.5 },
        },
        text: {
          '&:hover': { backgroundColor: 'var(--mui-palette-action-hover)' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1.5,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--mui-palette-text-secondary)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
          },
        },
        input: { paddingBlock: 11 },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid var(--mui-palette-divider)',
        },
        elevation1: { boxShadow: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '&:last-child': { paddingBottom: 24 },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderBottom: '1px solid var(--mui-palette-divider)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          height: 28,
        },
        label: { paddingInline: 10 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'var(--mui-palette-divider)',
          paddingBlock: 14,
        },
        head: {
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: 'var(--mui-palette-text-secondary)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'var(--mui-palette-divider)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 6,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '6px 10px',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 8px 28px rgba(15, 17, 21, 0.12)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          marginInline: 6,
          paddingBlock: 9,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: '1px solid var(--mui-palette-divider)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          // MUI zeroes the top padding of content that follows a title, and the
          // content scrolls (`overflow-y: auto`), so it clips whatever pokes
          // above its first child. An outlined field's floating label sits ~9px
          // above the input, so a form dialog lost the top half of its first
          // label. Same selector as MUI's own rule, so this one wins by order.
          '.MuiDialogTitle-root + &': { paddingTop: 12 },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 6, border: '1px solid transparent' },
      },
    },
  },
});

export default theme;
