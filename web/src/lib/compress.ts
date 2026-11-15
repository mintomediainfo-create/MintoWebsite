// Shrinks pictures in the browser before they are uploaded (same look, much smaller file => the site loads faster).
// JPG / PNG / WebP are resized (never enlarged) to at most MAX_SIDE pixels and saved as WebP. SVG, GIF and AVIF are left alone.
// Any other picture (iPhone HEIC, BMP, TIFF ...) is ALWAYS converted to WebP, so the site can show it everywhere.
// High quality on purpose: sharp on big and retina screens. PNGs (logos, graphics with text) are saved lossless.
const MAX_SIDE = 2560;
const QUALITY = 0.9;
const SKIP_BELOW = 300 * 1024; // already light, upload as it is
const SHRINKABLE = /^image\/(jpe?g|png|webp)$/;
const WEB_READY = /^image\/(png|jpe?g|webp|gif|svg\+xml|avif)$/; // shows in every browser as it is

/** Any picture: by its type, or by its name when the browser gives no type (common for .heic on Windows). */
export const IMAGE_EXT = /\.(jpe?g|jfif|png|webp|gif|svg|avif|heic|heif|bmp|tiff?)$/i;
export const isImageFile = (f: File) => f.type.startsWith('image/') || IMAGE_EXT.test(f.name);
const isHeic = (f: File) => /^image\/hei[cf]/.test(f.type) || /\.hei[cf]$/i.test(f.name);

export type Compressed = { file: File; before: number; after: number; changed: boolean };

/** Decodes the picture: the browser itself, or (iPhone HEIC in Chrome / Edge) the heic2any library, loaded only then. */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    if (!isHeic(file)) throw e;
    const heic2any = (await import('heic2any')).default;
    const jpg = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 })) as Blob;
    return createImageBitmap(jpg, { imageOrientation: 'from-image' });
  }
}

export async function compressImage(file: File): Promise<Compressed> {
  const same: Compressed = { file, before: file.size, after: file.size, changed: false };
  const mustConvert = !WEB_READY.test(file.type);
  const cannot = () => new Error('This picture could not be read. Please save it as JPG or PNG and try again.');
  if (typeof createImageBitmap === 'undefined') { if (mustConvert) throw cannot(); return same; }
  if (!mustConvert && (!SHRINKABLE.test(file.type) || file.size < SKIP_BELOW)) return same;
  let bmp: ImageBitmap;
  try { bmp = await decode(file); } catch { if (mustConvert) throw cannot(); return same; }
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) { if (mustConvert) throw cannot(); return same; }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/webp', file.type === 'image/png' ? 1 : QUALITY));
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  if (mustConvert) {
    if (!blob || blob.type !== 'image/webp') throw cannot();
    return { file: new File([blob], name, { type: 'image/webp' }), before: file.size, after: blob.size, changed: true };
  }
  // keep the original if the browser could not make a WebP, or if it did not get meaningfully smaller
  if (!blob || blob.type !== 'image/webp' || blob.size > file.size * 0.9) return same;
  return { file: new File([blob], name, { type: 'image/webp' }), before: file.size, after: blob.size, changed: true };
}

export const fmtSize = (n: number) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
