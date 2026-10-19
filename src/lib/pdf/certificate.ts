import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { BRAND_MARK } from '@/lib/brandMark';
import { SITE } from '@/lib/siteConfig';

/**
 * Draws the certificate as a real A4 PDF.
 *
 * ## The font is embedded, and that is not optional
 *
 * pdf-lib's built-in fonts are WinAnsi-encoded, which does **not** contain
 * `č ć ž š đ`. Every Serbian name hits that — the seeded data alone has
 * Hodžić, Begović, Đulić — so a standard font either throws or drops the
 * character. EB Garamond is embedded here instead (SIL OFL, vendored under
 * `fonts/` with its licence).
 *
 * A related trap, found the hard way: Google Fonts' `latin-ext` subset files
 * contain *only* the extended characters and no ASCII at all. Embedding one
 * renders "Begović" as blank boxes with a stray `ć`. The vendored files are
 * the **full** faces, not subsets. `subset: true` below is the other direction
 * — pdf-lib subsets on the way *out*, so each generated file carries only the
 * glyphs it uses and comes to a few kilobytes rather than a megabyte.
 *
 * ## Landscape
 *
 * A4 is 595.28 × 841.89pt; a certificate is conventionally landscape, so the
 * page is those numbers the other way round. Everything below is positioned
 * from the page box rather than hard-coded, so switching orientation is a
 * one-line change.
 */

/** A4 long edge and short edge, in PostScript points. */
const A4_LONG = 841.89;
const A4_SHORT = 595.28;

const PAGE_WIDTH = A4_LONG;
const PAGE_HEIGHT = A4_SHORT;

/** The house palette, in the ink-on-paper register rather than the app's. */
const INK = rgb(0.11, 0.13, 0.18);
const MUTED = rgb(0.42, 0.45, 0.5);
const ACCENT = rgb(0.55, 0.44, 0.19);
const PAPER = rgb(0.996, 0.992, 0.984);

export type CertificateDocument = {
  readableId: string;
  studentName: string;
  courseName: string;
  issuedAt: string;
  /**
   * Absolute URL of the public check, with number and surname filled in
   * (`verificationHref`). Encoded in the QR code; printed without its query.
   */
  verifyUrl: string;
};

/**
 * Read once per process, not per request. The files are ~500KB each and never
 * change; re-reading them on every download would be pure waste.
 *
 * `process.cwd()` rather than a path relative to this module, because the
 * compiled output does not sit where the source does. `next.config.ts` traces
 * the directory into the build so it is still there in production.
 */
let fontCache: { regular: Buffer; semibold: Buffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;

  const dir = path.join(process.cwd(), 'src', 'lib', 'pdf', 'fonts');
  const [regular, semibold] = await Promise.all([
    fs.readFile(path.join(dir, 'EBGaramond-Regular.ttf')),
    fs.readFile(path.join(dir, 'EBGaramond-SemiBold.ttf')),
  ]);

  fontCache = { regular, semibold };
  return fontCache;
}

/** Centres a line of text on the page and returns the width it occupied. */
function drawCentred(
  page: PDFPage,
  text: string,
  {
    y,
    size,
    font,
    color,
  }: { y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> },
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_WIDTH - width) / 2, y, size, font, color });
  return width;
}

/**
 * Shrinks a line until it fits the available width.
 *
 * Course names and student names are free text and can be long. Wrapping a
 * display line looks worse than setting it a little smaller, and truncating
 * somebody's name is not an option — so the type size gives way instead, down
 * to a floor where it would stop being a display line at all.
 */
function fitSize(text: string, font: PDFFont, preferred: number, maxWidth: number, floor = 14) {
  let size = preferred;
  while (size > floor && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

/**
 * Draws a QR code as vector squares, its bottom-left corner at (x, y).
 *
 * Vector rather than an embedded PNG: it stays sharp at any print size and
 * needs no image pipeline. Each row's dark run is one rectangle, which keeps a
 * version-6 code to a few hundred draw calls instead of one per module.
 *
 * No text is involved, so none of the font traps above apply — but the code
 * must sit on light paper with clear space around it (the "quiet zone"), or
 * scanners cannot find its edges. The layout keeps four modules clear.
 */
function drawQrCode(
  page: PDFPage,
  text: string,
  { x, y, size, color }: { x: number; y: number; size: number; color: ReturnType<typeof rgb> },
) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const count = modules.size;
  const cell = size / count;

  for (let row = 0; row < count; row++) {
    let runStart = -1;
    for (let col = 0; col <= count; col++) {
      const dark = col < count && modules.get(row, col) === 1;
      if (dark && runStart < 0) runStart = col;
      if (!dark && runStart >= 0) {
        page.drawRectangle({
          x: x + runStart * cell,
          // PDF y grows upwards; QR rows are counted from the top.
          y: y + size - (row + 1) * cell,
          width: (col - runStart) * cell,
          // A hair of overlap so adjacent rows do not show hairline seams
          // in viewers that anti-alias each rectangle separately.
          height: cell + 0.05,
          color,
        });
        runStart = -1;
      }
    }
  }
}

export async function renderCertificatePdf(input: CertificateDocument): Promise<Uint8Array> {
  const { regular, semibold } = await loadFonts();

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  /*
   * `subset: false`, and this is not a size oversight.
   *
   * pdf-lib's subsetter drops glyphs from this font. EB Garamond builds its
   * accented characters as *composite* glyphs — `ć` is a `c` plus a combining
   * acute — and the subsetter fails to carry the component glyphs across, so
   * the output renders a scattering of stray accents and almost no letters.
   * Confirmed by rasterising both variants of the same line: subsetted drew
   * 1,621 ink pixels, full drew 7,208.
   *
   * The trap is that this is invisible to a text check. The ToUnicode map is
   * still correct, so extracting text from the broken file returns exactly the
   * right string — it was only rendering the page to an image that showed the
   * document was empty. Verify PDFs by looking at them.
   *
   * The cost is a font per file rather than a few glyphs; pdf-lib deflates the
   * streams, so a certificate lands around half a megabyte. That is ordinary
   * for a PDF with embedded faces, and correctness is not negotiable here.
   */
  /*
   * `liga: false` — standard ligatures off, and this one is not cosmetic.
   *
   * With ligatures on, fontkit substitutes a single `fi` glyph and pdf-lib
   * writes it with an advance that does not match, so the text renders as
   * "certifi  cates" with a hole in it. Confirmed by rasterising the same line
   * with the feature on and off. Kerning is left alone; only `liga` misbehaves.
   */
  const features = { liga: false };

  const body = await doc.embedFont(regular, { subset: false, features });
  const display = await doc.embedFont(semibold, { subset: false, features });

  doc.setTitle(`Certifikat ${input.readableId} — ${input.courseName}`);
  doc.setAuthor(SITE.name);
  doc.setSubject(`Certifikat o završenoj obuci za ${input.studentName}`);
  doc.setCreator(SITE.name);
  doc.setProducer(SITE.name);

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Paper. A pure-white page looks like a screenshot; a hair of warmth reads as
  // a document.
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAPER });

  // Double rule, the way a certificate border is normally set: a heavier outer
  // line and a fine inner one a few points in.
  page.drawRectangle({
    x: 24,
    y: 24,
    width: PAGE_WIDTH - 48,
    height: PAGE_HEIGHT - 48,
    borderColor: ACCENT,
    borderWidth: 2.5,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: PAGE_WIDTH - 64,
    height: PAGE_HEIGHT - 64,
    borderColor: ACCENT,
    borderWidth: 0.75,
  });

  const contentWidth = PAGE_WIDTH - 160;
  const centre = PAGE_WIDTH / 2;

  /*
   * The vertical rhythm, top to bottom, measured from the page height so the
   * whole block stays balanced if the page size ever changes. The first draft
   * hung everything off the top and left a dead band across the lower third —
   * a certificate should fill its page.
   */
  // The mark, centred above the wordmark. drawSvgPath places the path's own
  // origin (its top-left corner) at x/y and flips the y axis for us.
  const markHeight = 30;
  const markScale = markHeight / BRAND_MARK.height;
  for (const d of BRAND_MARK.paths) {
    page.drawSvgPath(d, {
      x: centre - (BRAND_MARK.width * markScale) / 2,
      y: PAGE_HEIGHT - 44,
      scale: markScale,
      color: rgb(12 / 255, 91 / 255, 238 / 255),
    });
  }

  // The brand as a wordmark; follows SITE.name like the issuer line below.
  drawCentred(page, SITE.name.toUpperCase(), {
    y: PAGE_HEIGHT - 90,
    size: 13,
    font: display,
    color: MUTED,
  });

  drawCentred(page, 'CERTIFIKAT', { y: PAGE_HEIGHT - 150, size: 40, font: display, color: INK });
  drawCentred(page, 'o završenoj obuci', {
    y: PAGE_HEIGHT - 173,
    size: 14,
    font: body,
    color: MUTED,
  });

  // A short rule under the title, tying the two lines together.
  page.drawLine({
    start: { x: centre - 40, y: PAGE_HEIGHT - 192 },
    end: { x: centre + 40, y: PAGE_HEIGHT - 192 },
    thickness: 1,
    color: ACCENT,
  });

  drawCentred(page, 'Ovim se potvrđuje da je', {
    y: PAGE_HEIGHT - 230,
    size: 12,
    font: body,
    color: MUTED,
  });

  const nameSize = fitSize(input.studentName, display, 32, contentWidth);
  drawCentred(page, input.studentName, {
    y: PAGE_HEIGHT - 275,
    size: nameSize,
    font: display,
    color: INK,
  });

  // Underline set to the name rather than to a fixed width — it is the line the
  // name is written on, so it should follow whatever was written.
  const nameWidth = display.widthOfTextAtSize(input.studentName, nameSize);
  const ruleWidth = Math.min(Math.max(nameWidth + 60, 220), contentWidth);
  page.drawLine({
    start: { x: centre - ruleWidth / 2, y: PAGE_HEIGHT - 290 },
    end: { x: centre + ruleWidth / 2, y: PAGE_HEIGHT - 290 },
    thickness: 0.75,
    color: rgb(0.8, 0.78, 0.74),
  });

  drawCentred(page, 'uspješno završio/la sve module obuke', {
    y: PAGE_HEIGHT - 318,
    size: 12,
    font: body,
    color: MUTED,
  });

  const courseSize = fitSize(input.courseName, display, 23, contentWidth, 12);
  drawCentred(page, input.courseName, {
    y: PAGE_HEIGHT - 352,
    size: courseSize,
    font: display,
    color: ACCENT,
  });

  /*
   * Issuer block. Occupies the band between the course name and the footer,
   * which otherwise reads as a printing error. A signature rule rather than a
   * drawn seal: a rule is a convention every reader already knows, and an
   * emblem improvised in vector primitives tends to look like one.
   */
  page.drawLine({
    start: { x: centre - 90, y: 196 },
    end: { x: centre + 90, y: 196 },
    thickness: 0.75,
    color: rgb(0.8, 0.78, 0.74),
  });
  drawCentred(page, SITE.name, { y: 176, size: 14, font: display, color: INK });
  drawCentred(page, 'Izdavalac certifikata', { y: 161, size: 9, font: body, color: MUTED });

  /*
   * The footer: three columns on one baseline — date, number, verification.
   * Laid out from the page box so they stay balanced whatever the strings are.
   */
  const footerY = 86;
  const labelY = footerY + 20;
  const column = PAGE_WIDTH / 3;

  const footer: { label: string; value: string }[] = [
    { label: 'DATUM IZDAVANJA', value: input.issuedAt },
    { label: 'BROJ CERTIFIKATA', value: input.readableId },
    // Printed without the query: a person types the short form and enters the
    // number and surname themselves; the QR above carries the full link.
    {
      label: 'PROVJERA',
      value: input.verifyUrl.replace(/^https?:\/\//, '').replace(/\?.*$/, ''),
    },
  ];

  footer.forEach((entry, index) => {
    const columnCentre = column * index + column / 2;

    const labelWidth = body.widthOfTextAtSize(entry.label, 8);
    page.drawText(entry.label, {
      x: columnCentre - labelWidth / 2,
      y: labelY,
      size: 8,
      font: body,
      color: MUTED,
    });

    // The verification URL is the one field that can be long enough to collide
    // with its neighbours, so it gets the same shrink-to-fit treatment.
    const valueSize = fitSize(entry.value, display, 11, column - 24, 7);
    const valueWidth = display.widthOfTextAtSize(entry.value, valueSize);
    page.drawText(entry.value, {
      x: columnCentre - valueWidth / 2,
      y: footerY,
      size: valueSize,
      font: display,
      color: INK,
    });
  });

  /*
   * The QR code, above the PROVJERA column it belongs to. That band — right of
   * the issuer block, below the course name, above the footer rule — is
   * otherwise empty. 64pt is about 23mm: small enough to stay out of the way,
   * large enough for a phone at arm's length (modules come out around 0.6mm).
   */
  const qrSize = 64;
  drawQrCode(page, input.verifyUrl, {
    x: column * 2 + column / 2 - qrSize / 2,
    y: footerY + 54,
    size: qrSize,
    color: INK,
  });

  page.drawLine({
    start: { x: 80, y: footerY + 42 },
    end: { x: PAGE_WIDTH - 80, y: footerY + 42 },
    thickness: 0.5,
    color: rgb(0.85, 0.83, 0.79),
  });

  return doc.save();
}
