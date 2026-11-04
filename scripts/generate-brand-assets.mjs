/**
 * Builds every derived brand file from the `brand/` folder.
 *
 *   npm run brand
 *
 * Run it after changing anything in `brand/` — the logo, the photo, the name,
 * the tagline or the colours — and commit what it writes. It is not part of the
 * build: the outputs are static files, so a crawler or a mail client gets a
 * plain cached image rather than one rendered on request.
 *
 * ## Inputs
 *
 * - `brand/config.ts`   — name, tagline, colours, contact, company
 * - `brand/logo.svg`    — the mark, without the brand name beside it (the name
 *                         is set as text next to it everywhere)
 * - `brand/hero.jpg`    — the landing page photo (`.jpeg`, `.png`, `.webp` work too)
 * - `brand/og-image.jpg` — optional; a designed 1200×630 share image. Without
 *                         it, one is generated from the logo, name and colours.
 *
 * ## Outputs (never edit these by hand — they are overwritten)
 *
 * | File                                   | Used by                                       |
 * | -------------------------------------- | --------------------------------------------- |
 * | `public/logo.svg`                      | `<Logo />` in every header                    |
 * | `src/app/icon.svg`, `favicon.ico`      | the browser tab                               |
 * | `src/app/apple-icon.png`               | iOS home screen                               |
 * | `public/icon-192.png`, `icon-512.png`  | web app manifest, Organization structured data |
 * | `public/email-logo.png`                | every email header (Gmail cannot show SVG)    |
 * | `public/brand/og-<hash>.jpg`           | default share image (`DEFAULT_OG_IMAGE`)      |
 * | `public/brand/hero-<hash>.jpg`         | the landing page hero                         |
 * | `src/lib/brand/assets.generated.ts`    | sizes and paths of the above, certificate mark |
 * | `supabase/templates/confirmation.html` | paste into Supabase → Auth → Email Templates  |
 *
 * ## Why the photo and the share image get a hash in their name
 *
 * Next's image optimiser caches per URL, not per file contents, so replacing
 * `public/hero.jpg` in place kept serving the old picture at some widths and
 * not others (see docs/project-context.md, "Replacing a `public/` image under
 * the same name serves the old one"). Social platforms cache share images per
 * URL too. A content hash makes every new picture a new URL, automatically.
 *
 * `email-logo.png` deliberately keeps a fixed name: emails already sitting in
 * inboxes point at it, and a renamed file would break their header.
 *
 * ## Why the certificate gets a PNG of the mark rather than the SVG
 *
 * The PDF route runs on Vercel, where `public/` is not in the function bundle,
 * so it cannot read the logo from disk — the certificate-fonts trap again. The
 * mark is therefore embedded in `assets.generated.ts` as a high-resolution PNG
 * (about 600 dpi at the printed size), which also means any logo works, however
 * many colours, gradients or groups it uses.
 *
 * Node ≥ 22.18 imports `brand/config.ts` directly (type stripping).
 */
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import { ImageResponse } from 'next/og.js';
import sharp from 'sharp';
import * as prettier from 'prettier';
import { BRAND } from '../brand/config.ts';

const ROOT = new URL('../', import.meta.url);
const at = (path) => new URL(path, ROOT);
const kb = (buffer) => `${(buffer.length / 1024).toFixed(0)} KB`;
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex').slice(0, 8);
const dataUri = (mime, buffer) => `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
const log = (file, detail) => console.log(`  ${file.padEnd(40)} ${detail}`);

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

// --- Check the config ---------------------------------------------------------

const HEX = /^#[0-9a-f]{6}$/i;
for (const [name, color] of Object.entries(BRAND.colors)) {
  for (const scheme of ['light', 'dark']) {
    if (!HEX.test(color[scheme])) {
      fail(`brand/config.ts: colors.${name}.${scheme} must be a #rrggbb hex value.`);
    }
  }
}
if (!/^https:\/\/[^/]+$/.test(BRAND.url)) {
  fail('brand/config.ts: url must look like https://www.example.ba (https, no trailing slash).');
}

// --- Read the logo ------------------------------------------------------------

/**
 * Splits an SVG into its viewBox, its root attributes and its contents, so it
 * can be re-placed inside a larger canvas (padded square icons, the share
 * card) as a nested `<svg>`. Nesting keeps the artwork exactly as drawn —
 * transforms, gradients, groups — rather than re-interpreting its paths.
 */
function parseLogo(source) {
  const svg = source
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  const open = svg.match(/<svg\b([^>]*)>/i);
  const close = svg.lastIndexOf('</svg>');
  if (!open || close === -1) fail('brand/logo.svg is not an SVG document.');

  const attrs = Object.fromEntries(
    [...open[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(([, k, v]) => [k, v]),
  );

  let viewBox = attrs.viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some(Number.isNaN)) {
    const width = parseFloat(attrs.width);
    const height = parseFloat(attrs.height);
    if (!width || !height) fail('brand/logo.svg needs a viewBox (or a width and height).');
    viewBox = [0, 0, width, height];
  }

  // Namespaces go on the outer document; presentation attributes such as
  // `fill="none"` stay on the nested one, where they apply to the artwork.
  const namespaces = [];
  const presentation = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'xmlns' || key.startsWith('xmlns:')) namespaces.push(`${key}="${value}"`);
    else if (
      !['width', 'height', 'viewBox', 'x', 'y', 'version', 'preserveAspectRatio'].includes(key)
    )
      presentation.push(`${key}="${value}"`);
  }

  return {
    width: viewBox[2],
    height: viewBox[3],
    viewBox: viewBox.join(' '),
    namespaces: namespaces.filter((n) => !n.startsWith('xmlns=')).join(' '),
    presentation: presentation.join(' '),
    inner: svg.slice(open.index + open[0].length, close),
  };
}

const logoSource = await readFile(at('brand/logo.svg'), 'utf8').catch(() =>
  fail('brand/logo.svg is missing. Put the logo mark there as an SVG.'),
);
const logo = parseLogo(logoSource);
const logoRatio = logo.width / logo.height;

/**
 * The logo centred on a canvas of exactly `width × height` pixels, as an SVG
 * string. `pad` is the empty margin on every side; `background` fills the
 * canvas first.
 */
function placedLogo(width, height, { pad = 0, background } = {}) {
  const scale = Math.min((width - pad * 2) / logo.width, (height - pad * 2) / logo.height);
  const w = logo.width * scale;
  const hgt = logo.height * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${logo.namespaces} width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${
    background ? `<rect width="${width}" height="${height}" fill="${background}"/>` : ''
  }<svg x="${(width - w) / 2}" y="${(height - hgt) / 2}" width="${w}" height="${hgt}" viewBox="${logo.viewBox}" preserveAspectRatio="xMidYMid meet" ${logo.presentation}>${logo.inner}</svg></svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

/** The same pixels in one colour — for the mark on the coloured share card. */
async function silhouette(pngBuffer, color) {
  const { width, height } = await sharp(pngBuffer).metadata();
  const alpha = await sharp(pngBuffer).ensureAlpha().extractChannel(3).toBuffer();
  return sharp({ create: { width, height, channels: 3, background: color } })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

console.log('\nBrand assets from brand/:\n');

// --- Logo, favicon, app icons -------------------------------------------------

await writeFile(at('public/logo.svg'), logoSource);
log('public/logo.svg', `${logo.width}×${logo.height} (copied)`);

// The favicon fills its square edge to edge: at 16 px every pixel of margin is
// a pixel of logo lost.
await writeFile(at('src/app/icon.svg'), placedLogo(512, 512));
log('src/app/icon.svg', '512×512 vector');

/**
 * An .ico is a small directory followed by PNG images, which every browser
 * has accepted inside an .ico for years. sharp cannot write .ico, and the
 * format is simple enough not to need a dependency for it.
 */
async function ico(sizes) {
  const images = await Promise.all(sizes.map((size) => png(placedLogo(size, size))));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry); // width (0 = 256)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1); // height
    header.writeUInt8(0, entry + 2); // palette size
    header.writeUInt8(0, entry + 3); // reserved
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(images[i].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[i].length;
  });
  return Buffer.concat([header, ...images]);
}

const favicon = await ico([16, 32, 48]);
await writeFile(at('src/app/favicon.ico'), favicon);
log('src/app/favicon.ico', `16/32/48  ${kb(favicon)}`);

// Home-screen and manifest icons: the mark on white with ~12% padding, so it
// survives the circle or squircle crop Android and iOS apply.
const apple = await png(placedLogo(180, 180, { pad: 22, background: '#ffffff' }));
await writeFile(at('src/app/apple-icon.png'), apple);
log('src/app/apple-icon.png', `180×180  ${kb(apple)}`);

for (const size of [192, 512]) {
  const icon = await png(
    placedLogo(size, size, { pad: Math.round(size * 0.12), background: '#ffffff' }),
  );
  await writeFile(at(`public/icon-${size}.png`), icon);
  log(`public/icon-${size}.png`, `${size}×${size}  ${kb(icon)}`);
}

// --- Email logo -----------------------------------------------------------------

// Shown at about 29 px high beside the brand name; a very wide mark is capped
// at 140 px so it cannot push the name off a phone screen. Rendered at 3× for
// high-density screens.
let emailHeight = 29;
let emailWidth = Math.round(emailHeight * logoRatio);
if (emailWidth > 140) {
  emailWidth = 140;
  emailHeight = Math.round(emailWidth / logoRatio);
}
const emailLogo = await png(placedLogo(emailWidth * 3, emailHeight * 3));
await writeFile(at('public/email-logo.png'), emailLogo);
log('public/email-logo.png', `${emailWidth}×${emailHeight} @3x  ${kb(emailLogo)}`);

// --- Hashed images: hero photo and share card -------------------------------------

const brandDir = at('public/brand/');
await mkdir(brandDir, { recursive: true });
const written = new Set();

async function writeHashed(prefix, buffer) {
  const name = `${prefix}-${hash(buffer)}.jpg`;
  await writeFile(new URL(name, brandDir), buffer);
  written.add(name);
  return `/brand/${name}`;
}

const heroSource = ['hero.jpg', 'hero.jpeg', 'hero.png', 'hero.webp'].find((name) =>
  existsSync(at(`brand/${name}`)),
);
if (!heroSource) fail('brand/hero.jpg is missing. Put the landing page photo there.');
// 2560 px covers a full-width hero on a large 2× display; anything beyond that
// is repository weight nobody sees, since next/image resizes from this anyway.
const hero = await sharp(await readFile(at(`brand/${heroSource}`)))
  .rotate()
  .resize({ width: 2560, withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toBuffer();
const heroMeta = await sharp(hero).metadata();
const heroPath = await writeHashed('hero', hero);
log(`public${heroPath}`, `${heroMeta.width}×${heroMeta.height}  ${kb(hero)}`);

let ogImage;
if (existsSync(at('brand/og-image.jpg'))) {
  // A designed card: normalise it to the size every platform expects.
  ogImage = await sharp(await readFile(at('brand/og-image.jpg')))
    .resize(1200, 630, { fit: 'cover' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
} else {
  // Generated card: the mark in white, the name and the tagline, on the same
  // gradient as the landing page. Centred both ways, because Facebook,
  // LinkedIn and messaging apps crop a 1.91:1 image differently and the
  // middle is what all of them keep.
  const markHeight = 150;
  const markWidth = Math.min(Math.round(markHeight * logoRatio), 600);
  const mark = await silhouette(await png(placedLogo(markWidth * 2, markHeight * 2)), '#ffffff');
  const tagline = BRAND.tagline.charAt(0).toUpperCase() + BRAND.tagline.slice(1);
  const primary = BRAND.colors.primary.light;
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
        background: `linear-gradient(135deg, ${primary} 0%, ${primary} 55%, ${BRAND.colors.secondary.light} 120%)`,
        color: '#ffffff',
        textAlign: 'center',
        padding: '0 60px',
      },
    },
    h('img', { src: dataUri('image/png', mark), width: markWidth, height: markHeight }),
    h('div', { style: { display: 'flex', fontSize: 92, fontWeight: 700 } }, BRAND.name),
    h('div', { style: { display: 'flex', fontSize: 40, opacity: 0.9 } }, tagline),
  );
  const rendered = Buffer.from(
    await new ImageResponse(card, { width: 1200, height: 630 }).arrayBuffer(),
  );
  ogImage = await sharp(rendered).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}
const ogPath = await writeHashed('og', ogImage);
log(
  `public${ogPath}`,
  `1200×630  ${kb(ogImage)}${existsSync(at('brand/og-image.jpg')) ? ' (designed)' : ''}`,
);

// Old hashed files are removed, or every logo change would leave its
// predecessors behind in `public/`.
for (const name of await readdir(brandDir)) {
  if (!written.has(name)) await rm(new URL(name, brandDir));
}

// --- Certificate mark ----------------------------------------------------------

// Printed 30 pt high on the certificate; 250 px is ~600 dpi at that size.
const certHeight = 250;
const certWidth = Math.round(certHeight * logoRatio);
const certMark = await png(placedLogo(certWidth, certHeight));
log('certificate mark (embedded)', `${certWidth}×${certHeight}  ${kb(certMark)}`);

// --- The generated module ----------------------------------------------------------

async function writeFormatted(path, source) {
  const file = fileURLToPath(at(path));
  const options = (await prettier.resolveConfig(file)) ?? {};
  await writeFile(file, await prettier.format(source, { ...options, filepath: file }));
}

await writeFormatted(
  'src/lib/brand/assets.generated.ts',
  `/**
 * GENERATED by \`npm run brand\` from the \`brand/\` folder — do not edit.
 * Change the files in \`brand/\` and run the command again.
 */
export const BRAND_ASSETS = {
  /** \`public/logo.svg\`, in its own units — only the ratio matters. */
  logo: { src: '/logo.svg', width: ${logo.width}, height: ${logo.height} },
  /** The size the email header shows \`public/email-logo.png\` at. */
  emailLogo: { src: '/email-logo.png', width: ${emailWidth}, height: ${emailHeight} },
  heroImage: '${heroPath}',
  ogImage: { src: '${ogPath}', width: 1200, height: 630 },
  /** The mark for the certificate PDF, as a base64 PNG. */
  certificateMark: {
    width: ${certWidth},
    height: ${certHeight},
    png: '${certMark.toString('base64')}',
  },
} as const;
`,
);
log('src/lib/brand/assets.generated.ts', 'sizes and paths');

// --- Supabase confirmation email -------------------------------------------------------

const host = new URL(BRAND.url).host;
const { legalName, address, idNumber } = BRAND.company;
const tokens = {
  NAME: BRAND.name,
  PRIMARY: BRAND.colors.primary.light,
  CONTACT_EMAIL: BRAND.contact.email,
  BRAND_LINE: `© ${legalName || BRAND.name} · ${host}`,
  COMPANY_LINE: [address, idNumber && `ID broj: ${idNumber}`].filter(Boolean).join(' · '),
  LOGO_WIDTH: String(emailWidth),
  LOGO_HEIGHT: String(emailHeight),
};
const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const template = (await readFile(at('scripts/templates/confirmation.html'), 'utf8'))
  // The source's own comment explains the tokens; the output gets a shorter one.
  .replace(
    /^<!--[\s\S]*?-->\s*/,
    `<!--
  GENERATED by \`npm run brand\` from scripts/templates/confirmation.html — edit that file.

  Paste this into Supabase → Authentication → Emails → "Confirm signup".
  Subject: Potvrdite email adresu — ${BRAND.name}
-->
`,
  )
  .replace(/%([A-Z_]+)%/g, (match, key) => (key in tokens ? escapeHtml(tokens[key]) : match));
// Written as is, not through prettier: email HTML stays compact (see .prettierignore).
await mkdir(at('supabase/templates/'), { recursive: true });
await writeFile(at('supabase/templates/confirmation.html'), template);
log('supabase/templates/confirmation.html', 'paste into Supabase');

// The local CLI config names the same subject; keep it in step.
const tomlPath = at('supabase/config.toml');
const toml = await readFile(tomlPath, 'utf8');
await writeFile(
  tomlPath,
  toml.replace(
    /(\[auth\.email\.template\.confirmation\]\s*\nsubject = )"[^"]*"/,
    `$1"Potvrdite email adresu — ${BRAND.name.replace(/"/g, '\\"')}"`,
  ),
);

console.log('\nDone. Commit the changed files.\n');
