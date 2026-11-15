// File storage on Cloudflare R2. The browser uploads straight to R2 with a short-lived signed URL,
// so big videos never pass through the server (Vercel functions have a small body limit).
// Without R2 settings (local development) files go to server/uploads instead.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import { env } from '../env';

export const useR2 = !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET);
export const LOCAL_DIR = path.join(__dirname, '../../uploads');

let s3: S3Client | null = null;
function client() {
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    });
  }
  return s3;
}

// CVs go to a private bucket (no public URL). Media goes to the public bucket.
const bucketFor = (key: string) => (key.startsWith('cvs/') ? env.R2_PRIVATE_BUCKET || env.R2_BUCKET : env.R2_BUCKET);

const SAFE = /[^a-z0-9.\-_]/gi;
export function makeKey(folder: string, filename: string) {
  const ext = (path.extname(filename) || '').toLowerCase().replace(SAFE, '').slice(0, 8);
  const base = path.basename(filename, path.extname(filename)).replace(SAFE, '-').slice(0, 40) || 'file';
  const d = new Date();
  return `${folder}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${base}-${crypto.randomBytes(5).toString('hex')}${ext}`;
}

export function publicUrl(key: string) {
  return useR2 ? `${env.R2_PUBLIC_URL}/${key}` : `/uploads/${key}`;
}

/** Signed URL the browser can PUT the file to. */
export async function signUpload(key: string, contentType: string) {
  if (!useR2) return { uploadUrl: `/api/local-upload/${encodeURIComponent(key)}`, method: 'PUT' as const };
  const cmd = new PutObjectCommand({ Bucket: bucketFor(key), Key: key, ContentType: contentType });
  return { uploadUrl: await getSignedUrl(client(), cmd, { expiresIn: 600 }), method: 'PUT' as const };
}

/** Short-lived link to read a private file (CVs). */
export async function signDownload(key: string, downloadName?: string) {
  if (!useR2) return `/api/admin/local-file/${encodeURIComponent(key)}`;
  const cmd = new GetObjectCommand({
    Bucket: bucketFor(key),
    Key: key,
    ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName.replace(/"/g, '')}"` : undefined,
  });
  return getSignedUrl(client(), cmd, { expiresIn: 300 });
}

export async function removeFile(key: string) {
  if (!useR2 || !key) return;
  try { await client().send(new DeleteObjectCommand({ Bucket: bucketFor(key), Key: key })); } catch { /* ignore */ }
}
