/**
 * Generates the brand images that live in `public/`:
 *
 * - `og-image.jpg` — the default share image (1200×630), used by every public
 *   page that has no image of its own (`DEFAULT_OG_IMAGE` in `src/lib/seo.ts`).
 * - `icon-192.png`, `icon-512.png` — the web app manifest icons
 *   (`src/app/manifest.ts`), also the logo in the Organization structured data.
 *
 *   npm run brand:assets
 *
 * Run it after changing the logo (`src/lib/brandMark.ts`) or the name/tagline
 * (`src/lib/siteConfig.ts`), and commit the output. It is not part of the build:
 * the files are static, so a crawler gets a plain cached JPEG rather than an
 * image rendered on request.
 *
 * ## Replacing the share image with a designed one
 *
 * This is a generated placeholder. To use a designed image instead, overwrite
 * `public/og-image.jpg` — keep it 1200×630, JPEG, under ~300 KB, with anything
 * important inside the central ~1000×500 (some platforms crop the edges) — and
 * stop running this script for it. Note the cache warning in PROJECT-CONTEXT
 * ("Replacing a `public/` image under the same name serves the old one"):
 * social platforms cache share images per URL too, so a redesign may want a new
 * filename and a matching change to `DEFAULT_OG_IMAGE`.
 *
 * Node ≥ 22.18 imports the two `.ts` sources directly (type stripping).
 */
import { writeFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import { ImageResponse } from 'next/og.js';
import sharp from 'sharp';
import { BRAND_MARK, brandMarkSvg } from '../src/lib/brandMark.ts';
import { SITE } from '../src/lib/siteConfig.ts';

const OUT = new URL('../public/', import.meta.url);
const svgDataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// --- Share image -------------------------------------------------------------

const tagline = SITE.tagline.charAt(0).toUpperCase() + SITE.tagline.slice(1);
const markHeight = 150;
const markWidth = Math.round((markHeight * BRAND_MARK.width) / BRAND_MARK.height);

// Everything is centred both ways: Facebook, LinkedIn and messaging apps crop a
// 1.91:1 image differently, and the middle is what all of them keep.
const card = h(
  'div',
  {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
      // The landing page's brand gradient (theme.ts primary → secondary).
      background: 'linear-gradient(135deg, #2f5bea 0%, #2f5bea 55%, #7b3fe4 120%)',
      color: '#ffffff',
      textAlign: 'center',
    },
  },
  h('img', { src: svgDataUri(brandMarkSvg('#ffffff')), width: markWidth, height: markHeight }),
  h('div', { style: { display: 'flex', fontSize: 92, fontWeight: 700 } }, SITE.name),
  h('div', { style: { display: 'flex', fontSize: 40, opacity: 0.9 } }, tagline),
);

const png = Buffer.from(await new ImageResponse(card, { width: 1200, height: 630 }).arrayBuffer());
const jpg = await sharp(png).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
await writeFile(new URL('og-image.jpg', OUT), jpg);
console.log(`og-image.jpg  1200×630  ${(jpg.length / 1024).toFixed(0)} KB`);

// --- Manifest icons ----------------------------------------------------------

// The blue mark on white with ~12% padding, so it survives the "maskable" crop
// Android applies (a circle or squircle inside the square).
const iconSvg = (size) => {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <image href="${svgDataUri(brandMarkSvg())}" x="${pad}" y="${pad}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
  </svg>`;
};

for (const size of [192, 512]) {
  const icon = await sharp(Buffer.from(iconSvg(size)))
    .png()
    .toBuffer();
  await writeFile(new URL(`icon-${size}.png`, OUT), icon);
  console.log(`icon-${size}.png  ${size}×${size}  ${(icon.length / 1024).toFixed(0)} KB`);
}
