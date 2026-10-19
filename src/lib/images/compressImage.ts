import { IMAGE_MAX_DIMENSION, MAX_IMAGE_BYTES } from '@/lib/storage';

/**
 * Shrinks an image in the browser before it is uploaded.
 *
 * Storage on the free plan is 1 GB for everything, and a phone photo is 5–15 MB
 * at 4000+ px — about 100× more than any slot on the site can show. Resizing to
 * `IMAGE_MAX_DIMENSION` and re-encoding as WebP typically lands at 100–300 KB.
 *
 * Done client-side rather than in the upload route because the bytes never pass
 * through the route (it only signs the upload), and because a large original
 * would not fit through a Vercel function's 4.5 MB request limit anyway.
 *
 * Never fails the upload on its own: if the browser cannot decode the file
 * (an AVIF on an older browser, say) the original is returned and the size
 * limit decides. Quality steps down until the result fits `MAX_IMAGE_BYTES`.
 */
const QUALITY_STEPS = [0.82, 0.72, 0.6];

export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    // `from-image` applies EXIF orientation, so a portrait phone photo is not
    // stored on its side once the metadata is dropped.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let best: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );
    // Safari before 16 ignores 'image/webp' and hands back a PNG, which is
    // usually *larger* — treat that as "could not compress".
    if (!blob || blob.type !== 'image/webp') break;
    best = blob;
    if (blob.size <= MAX_IMAGE_BYTES) break;
  }

  // An already-small, already-sized image can come out bigger after
  // re-encoding; keep whichever is smaller.
  if (!best || (scale === 1 && best.size >= file.size)) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'slika';
  return new File([best], `${baseName}.webp`, { type: 'image/webp' });
}
