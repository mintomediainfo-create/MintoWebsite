// Shrinks videos in the browser before they are uploaded, with ffmpeg.wasm (only loaded in the dashboard, when needed).
// H.264 MP4 with faststart (plays while it loads). Keeps the original when it is already small, or when the new file
// is not meaningfully smaller.
// Every job gets a FRESH ffmpeg (then it is closed): one ffmpeg.wasm that runs a second job can crash with
// "memory access out of bounds". Loading again is quick, the browser keeps the files.
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import type { Compressed } from './compress';

const MAX_SIDE = 1280;
const SKIP_BELOW = 3 * 1024 * 1024; // already light enough
export const VIDEO_MAX = 500 * 1024 * 1024; // the browser runs out of memory above this

const FIT = (side: number) => `scale='min(${side},iw)':'min(${side},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`;
const ENC = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

/** Runs one ffmpeg job: writes `input` as `inName`, runs `args`, returns the bytes of `outName` (null if it failed). */
async function job(input: Uint8Array, inName: string, args: string[], outName: string, onProgress?: (p: number) => void) {
  const f = new FFmpeg();
  const onP = ({ progress }: { progress: number }) => onProgress?.(Math.min(1, Math.max(0, progress)));
  try {
    await f.load({ coreURL, wasmURL });
    f.on('progress', onP);
    await f.writeFile(inName, input);
    const code = await f.exec(args);
    if (code !== 0) { console.warn('ffmpeg exit', code, args.join(' ')); return null; }
    const data = await f.readFile(outName);
    return typeof data === 'string' ? null : data;
  } catch (e) {
    console.warn('ffmpeg job failed', args.join(' '), e);
    return null;
  } finally {
    f.off('progress', onP);
    f.terminate();
  }
}

const extOf = (name: string) => (name.match(/\.[a-z0-9]{1,5}$/i)?.[0] || '.mp4').toLowerCase();
const baseOf = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]/gi, '-').slice(0, 30) || 'video';

/** Any video upload. onProgress gets 0..1 while it works. */
export async function compressVideo(file: File, onProgress?: (p: number) => void): Promise<Compressed> {
  const same: Compressed = { file, before: file.size, after: file.size, changed: false };
  if (file.size < SKIP_BELOW || typeof WebAssembly === 'undefined') return same;
  const inName = 'in' + extOf(file.name);
  const data = await job(await fetchFile(file), inName,
    ['-i', inName, '-vf', FIT(MAX_SIDE), '-crf', '28', ...ENC, '-c:a', 'aac', '-b:a', '96k', 'out.mp4'], 'out.mp4', onProgress);
  if (!data || data.byteLength > file.size * 0.9) return same;
  const out = new File([data], baseOf(file.name) + '.mp4', { type: 'video/mp4' });
  return { file: out, before: file.size, after: out.size, changed: true };
}

/** Width and height of a video file (read by the browser, nothing is uploaded). */
function videoSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (w: number, h: number) => { URL.revokeObjectURL(url); resolve({ w, h }); };
    v.preload = 'metadata';
    v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
    v.onerror = () => done(0, 0);
    v.src = url;
  });
}

/** A picture of the video at 0.5 s, made by the browser (ffmpeg.wasm crashes when it writes JPG). */
function frameOf(video: Uint8Array): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([video], { type: 'video/mp4' }));
    const v = document.createElement('video');
    const done = (b: Blob | null) => { URL.revokeObjectURL(url); resolve(b); };
    v.muted = true; v.preload = 'auto';
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = () => {
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      const x = c.getContext('2d');
      if (!x) return done(null);
      x.drawImage(v, 0, 0);
      c.toBlob((b) => done(b), 'image/jpeg', 0.85);
    };
    v.onerror = () => done(null);
    v.src = url;
  });
}

export type HeroFiles = { video: File; poster: File; phone: File | null; phonePoster: File | null; upright: boolean };

/**
 * The home page's big video. Always re-made, in high quality (it is the first thing people see):
 * - computers: longest side at most 1920 px, no sound, bitrate capped (a 20 s video stays under ~9 MB);
 * - phones: always a small copy, 960 px tall: cut to upright (9:16) from the middle of a wide video, just smaller for an upright one;
 * - a first-frame picture for each, shown while the video loads.
 * onProgress gets 0..1 for the whole job.
 */
export async function makeHeroVideos(file: File, onProgress?: (p: number) => void): Promise<HeroFiles> {
  const { w, h } = await videoSize(file);
  const wide = !w || w > h;
  const share = 0.72; // the computer video is most of the work
  const failed = () => new Error('This video could not be processed. Try another file (MP4 or MOV).');
  const base = baseOf(file.name);
  const inName = 'in' + extOf(file.name);

  const big = await job(await fetchFile(file), inName, ['-i', inName, '-vf', FIT(1920), '-crf', '23', '-maxrate', '3500k', '-bufsize', '7000k', ...ENC, '-an', 'hero.mp4'], 'hero.mp4',
    (p) => onProgress?.(p * share));
  if (!big) throw failed();
  const poster = await frameOf(big);
  if (!poster) throw failed();
  const out: HeroFiles = {
    video: new File([big], base + '.mp4', { type: 'video/mp4' }),
    poster: new File([poster], base + '.jpg', { type: 'image/jpeg' }),
    phone: null, phonePoster: null, upright: !wide,
  };
  {
    const vf = wide ? 'crop=trunc(ih*9/16/2)*2:ih,scale=-2:960' : "scale=-2:'min(960,ih)'";
    const small = await job(big, 'hero.mp4', ['-i', 'hero.mp4', '-vf', vf, '-crf', '26', '-maxrate', '1500k', '-bufsize', '3000k', ...ENC, '-an', 'phone.mp4'], 'phone.mp4',
      (p) => onProgress?.(share + p * (0.97 - share)));
    const shot = small && (await frameOf(small));
    if (small && shot) {
      out.phone = new File([small], base + '-phone.mp4', { type: 'video/mp4' });
      out.phonePoster = new File([shot], base + '-phone.jpg', { type: 'image/jpeg' });
    } // if the phone copy fails, phones simply get the computer video
  }
  onProgress?.(1);
  return out;
}
