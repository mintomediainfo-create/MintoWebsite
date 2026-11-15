// All settings come from environment variables (see .env.example at the project root).
import fs from 'fs';
import path from 'path';

// tiny .env loader for local runs (Vercel injects env vars itself)
for (const f of [path.join(__dirname, '../../.env'), path.join(__dirname, '../.env')]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  PORT: Number(process.env.PORT || 4000),
  // Cloudflare R2 (S3-compatible). If these are empty, files are saved on the local disk (good for development only).
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  R2_BUCKET: process.env.R2_BUCKET || '',
  R2_PRIVATE_BUCKET: process.env.R2_PRIVATE_BUCKET || '', // for CVs; no public access
  R2_PUBLIC_URL: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''), // public bucket URL or custom domain, e.g. https://media.mintomediaagency.com
  // where the site's own media (web/public/media, uploaded with npm run media:upload) is served from: R2 when it is set up, else '' (local)
  MEDIA_URL: (process.env.MEDIA_URL || process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@mintomediaagency.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
export const isProd = env.NODE_ENV === 'production';

// Email (newsletter). Any SMTP account works (Brevo, Mailgun, Gmail app password...). Empty SMTP_HOST = emails are only printed in the console (development).
export const mailEnv = {
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'Minto Media <no-reply@mintomediaagency.com>',
  SITE_URL: (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
};
