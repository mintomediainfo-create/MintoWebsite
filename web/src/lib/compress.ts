// Shrinks pictures in the browser before they are uploaded (same look, much smaller file => the site loads faster).
// JPG / PNG / WebP are resized (never enlarged) to at most MAX_SIDE pixels and saved as WebP. SVG, GIF and AVIF are left alone.
// High quality on purpose: sharp on big and retina screens. PNGs (logos, graphics with text) are saved lossless.
const MAX_SIDE = 2560;
const QUALITY = 0.9;
const SKIP_BELOW = 300 * 1024; // already light, upload as it is
const SHRINKABLE = /^image\/(jpe?g|png|webp)$/;

export type Compressed = { file: File; before: number; after: number; changed: boolean };

export async function compressImage(file: File): Promise<Compressed> {
  const same: Compressed = { file, before: file.size, after: file.size, changed: false };
  if (!SHRINKABLE.test(file.type) || file.size < SKIP_BELOW || typeof createImageBitmap === 'undefined') return same;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return same;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/webp', file.type === 'image/png' ? 1 : QUALITY));
    // keep the original if the browser could not make a WebP, or if it did not get meaningfully smaller
    if (!blob || blob.type !== 'image/webp' || blob.size > file.size * 0.9) return same;
    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return { file: new File([blob], name, { type: 'image/webp' }), before: file.size, after: blob.size, changed: true };
  } catch {
    return same;
  }
}

export const fmtSize = (n: number) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
