import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/siteConfig';
import { BRAND_ASSETS } from '@/lib/brand/assets.generated';

/**
 * The mark on its own — `public/logo.svg` (copied there from `brand/logo.svg`
 * by `npm run brand`), sized in `em` so it scales with
 * whatever text it sits beside. Exported for places that already wrap the
 * brand in a link of their own (the admin sidebar), where `<Logo />` would
 * nest one link inside another.
 *
 * `unoptimized` because there is nothing to optimise: the optimiser only
 * rasterises, and a 2 KB vector is already smaller than any bitmap of it.
 */
export function LogoMark() {
  return (
    <Image
      src={BRAND_ASSETS.logo.src}
      alt=""
      width={BRAND_ASSETS.logo.width}
      height={BRAND_ASSETS.logo.height}
      unoptimized
      style={{ height: '1.15em', width: 'auto', flexShrink: 0 }}
    />
  );
}

/**
 * The short name, set a touch below its line box. Centring a box against the
 * mark centres the text's line box, which carries descender space a short
 * lower-case name barely uses — so the letters read as sitting high beside the mark.
 * In `em` so the nudge scales with the variant around it.
 */
export function LogoName() {
  return <span style={{ position: 'relative', top: '0.1em' }}>{SITE.shortName}</span>;
}

/**
 * Single source for the brand: the mark plus the short name.
 *
 * The mark is decorative (`alt=""`) because the name is right beside it —
 * announcing "logo, {name}" before the name to a screen reader says the same thing twice.
 * Sizing follows the surrounding `Typography`, so callers pick the scale with a
 * variant rather than a prop.
 */
export default function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4em',
      }}
    >
      <LogoMark />
      <LogoName />
    </Link>
  );
}
