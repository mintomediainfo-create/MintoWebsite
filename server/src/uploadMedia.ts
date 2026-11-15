// Uploads the site's own media (web/public/media: hero, work videos, intro clips, client logos) to the public R2 bucket,
// at the same paths (media/work/w01.mp4 ...), so the live site reads them from R2_PUBLIC_URL. These files are not in git.
//   npm run media:upload            (needs the R2_* settings in .env)
// Files that are already on R2 with the same size are skipped, so it is safe to run again after adding or changing files.
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env';

const ROOT = path.join(__dirname, '../../web/public');
const DIR = path.join(ROOT, 'media');
const TYPES: Record<string, string> = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.avif': 'image/avif',
};

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

async function main() {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) {
    console.error('R2 is not set up: fill R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in .env first.');
    process.exit(1);
  }
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  const files = walk(DIR).filter((f) => TYPES[path.extname(f).toLowerCase()]);
  let sent = 0, skipped = 0, bytes = 0;
  for (const f of files) {
    const key = path.relative(ROOT, f).split(path.sep).join('/'); // media/work/w01.mp4
    const size = fs.statSync(f).size;
    const there = await s3.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key })).catch(() => null);
    if (there?.ContentLength === size) { skipped++; continue; }
    await s3.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET, Key: key, Body: fs.readFileSync(f), ContentType: TYPES[path.extname(f).toLowerCase()],
      // the names never change for new content (a changed file keeps its name only for the built-in hero), so a day of cache is safe
      CacheControl: 'public, max-age=86400',
    }));
    sent++; bytes += size;
    console.log(`up  ${key}  ${Math.round(size / 1024)} KB`);
  }
  console.log(`done: ${sent} uploaded (${(bytes / 1048576).toFixed(1)} MB), ${skipped} already there.`);
  console.log(`They are served from ${env.R2_PUBLIC_URL || '(set R2_PUBLIC_URL)'}/media/...`);
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
