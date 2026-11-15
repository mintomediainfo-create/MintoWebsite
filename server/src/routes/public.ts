// Everything the public website reads, plus the job application and newsletter forms.
import { Router } from 'express';
import { z } from 'zod';
import { q, one } from '../db';
import { makeKey, signUpload } from '../lib/storage';
import { notify } from '../lib/notify';

export const publicRouter = Router();

const SETTINGS_DEFAULTS: Record<string, any> = {
  hero: { videoUrl: '', posterUrl: '', phoneVideoUrl: '', phonePosterUrl: '' }, // empty = the built-in video in web/public
  contact: { email: '', careersEmail: '', phone: '', phoneUae: '', whatsapp: '', whatsappUae: '', address: { en: '', ar: '' }, mapUrl: '', addressUae: { en: '', ar: '' }, mapUrlUae: '' },
  social: { facebook: '', instagram: '', linkedin: '', tiktok: '', youtube: '', x: '', behance: '' },
  testimonials_display: { desktop: 'both', mobile: 'both' }, // mobile: 'both' | 'cards' | 'video'
  notifications: { server: 'https://ntfy.sh', jobs: { topic: '', on: true }, inquiries: { topic: '', on: true } }, // private: only the dashboard reads it
  testimonials_video: { url: '' }, // the one shared video beside the testimonial cards
  work_display: { order: 'manual' }, // 'manual' = the dashboard order, 'weekly' = shuffled by itself once a week
};

// Same shuffle for everyone during one week (changes every Monday), so the site does not flicker between visits.
function weekNumber(d = new Date()) {
  return Math.floor((d.getTime() - Date.UTC(2024, 0, 1)) / (7 * 24 * 3600 * 1000));
}
function weeklyShuffle<T>(items: T[], week = weekNumber()): T[] {
  const a = items.slice();
  let s = (week * 2654435761) % 4294967296 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = Math.floor((s / 4294967296) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Private settings (like the alert topic names) never go to the public website; only the dashboard asks for them.
const PRIVATE_SETTINGS = ['notifications'];

export async function readSettings(includePrivate = false) {
  const rows = await q<{ key: string; value: any }>('SELECT key, value FROM settings');
  const out: Record<string, any> = JSON.parse(JSON.stringify(SETTINGS_DEFAULTS));
  for (const r of rows) out[r.key] = { ...(out[r.key] || {}), ...r.value };
  if (!includePrivate) for (const k of PRIVATE_SETTINGS) delete out[k];
  return out;
}

// one request gives the home page everything it needs
publicRouter.get('/site', async (_req, res) => {
  const [settings, intro, services, workHome, clients, testimonials, story, news, jobs] = await Promise.all([
    readSettings(),
    q('SELECT id, kind, url, poster_url FROM intro_media WHERE active ORDER BY sort, id LIMIT 3'),
    q('SELECT id, title, short, tags, bg, fg FROM services WHERE active ORDER BY sort, id'),
    q('SELECT id, kind, category, url, poster_url, title, client_name, tags, featured FROM work_items WHERE active AND on_home ORDER BY featured DESC, sort, id DESC'),
    q('SELECT id, name, logo_light_url, logo_dark_url FROM clients WHERE active ORDER BY sort, id'),
    q('SELECT id, quote, name, role, avatar_url, video_url, poster_url FROM testimonials WHERE active ORDER BY sort, id'),
    q('SELECT id, year, title, text FROM story WHERE active ORDER BY sort, id'),
    q(`SELECT id, slug, type, title, summary, cover_url, published_at FROM news WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT 3`),
    one<{ n: string }>(`SELECT count(*) AS n FROM jobs WHERE status = 'open'`),
  ]);
  res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  // the featured piece always stays first; the others follow the dashboard order or the weekly shuffle
  const weekly = settings.work_display?.order === 'weekly';
  const featured = workHome.filter((w: any) => w.featured);
  const rest = workHome.filter((w: any) => !w.featured);
  const homeWork = [...featured, ...(weekly ? weeklyShuffle(rest) : rest)].slice(0, 6);
  res.json({ settings, intro, services, workHome: homeWork, clients, testimonials, story, news, openJobs: Number(jobs?.n || 0) });
});

publicRouter.get('/settings', async (_req, res) => {
  res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  // + the service names, same order as the home page cards, for the footer's "Our services" links
  const [settings, svcs] = await Promise.all([readSettings(), q<{ title: any }>('SELECT title FROM services WHERE active ORDER BY sort, id')]);
  res.json({ ...settings, serviceTitles: svcs.map((r) => r.title) });
});

publicRouter.get('/work', async (_req, res) => {
  res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  const rows = await q('SELECT id, kind, category, url, poster_url, title, client_name, caption, tags FROM work_items WHERE active ORDER BY sort, id DESC');
  const { work_display } = await readSettings();
  res.json(work_display?.order === 'weekly' ? weeklyShuffle(rows) : rows);
});

publicRouter.get('/news', async (req, res) => {
  const type = String(req.query.type || '');
  const rows = await q(
    `SELECT id, slug, type, title, summary, cover_url, featured, published_at FROM news
     WHERE status = 'published' AND ($1 = '' OR type = $1) ORDER BY featured DESC, published_at DESC, id DESC`,
    [['news', 'announcement', 'event'].includes(type) ? type : '']
  );
  res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  res.json(rows);
});

publicRouter.get('/news/:slug', async (req, res) => {
  const row = await one(`SELECT * FROM news WHERE slug = $1 AND status = 'published'`, [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const more = await q(
    `SELECT id, slug, type, title, cover_url, published_at FROM news WHERE status = 'published' AND id <> $1 ORDER BY published_at DESC LIMIT 3`,
    [(row as any).id]
  );
  res.json({ ...row, more });
});

publicRouter.get('/jobs', async (_req, res) => {
  res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  res.json(await q(`SELECT id, slug, title, department, location, job_type, level, summary, deadline FROM jobs WHERE status = 'open' ORDER BY sort, id DESC`));
});

publicRouter.get('/jobs/:slug', async (req, res) => {
  const row = await one(`SELECT * FROM jobs WHERE slug = $1 AND status = 'open'`, [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// ---------- job applications ----------
const CV_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const MAX_CV = 5 * 1024 * 1024;

publicRouter.post('/apply/upload-url', async (req, res) => {
  const body = z.object({ filename: z.string().min(1).max(200), size: z.number().int().positive() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Bad request' });
  const ext = body.data.filename.split('.').pop()!.toLowerCase();
  if (!CV_TYPES[ext]) return res.status(400).json({ error: 'type' });
  if (body.data.size > MAX_CV) return res.status(400).json({ error: 'size' });
  const key = makeKey('cvs', body.data.filename);
  const signed = await signUpload(key, CV_TYPES[ext]);
  res.json({ key, contentType: CV_TYPES[ext], ...signed });
});

const applySchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
  city: z.string().trim().max(80).optional().default(''),
  answers: z.record(z.union([z.string().max(4000), z.array(z.string().max(300)).max(30)])).optional().default({}),
  cvKey: z.string().regex(/^cvs\//).max(300),
  cvName: z.string().max(200).optional().default(''),
  portfolio: z.string().trim().max(400).optional().default(''),
  linkedin: z.string().trim().max(400).optional().default(''),
  consent: z.literal(true),
  lang: z.enum(['en', 'ar']).optional().default('en'),
});

publicRouter.post('/jobs/:slug/apply', async (req, res) => {
  const job = await one<any>(`SELECT id, title, questions FROM jobs WHERE slug = $1 AND status = 'open'`, [req.params.slug]);
  if (!job) return res.status(404).json({ error: 'This job is no longer open.' });
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid', fields: parsed.error.flatten().fieldErrors });
  const d = parsed.data;

  // check the admin's questions, and save each answer with its question text (so it still reads well if the job changes)
  const missing: string[] = [];
  const answers = (job.questions || []).map((qq: any) => {
    const raw = d.answers[qq.id];
    const val = Array.isArray(raw) ? raw.filter(Boolean) : String(raw || '').trim();
    if (qq.required && (!val || (Array.isArray(val) && !val.length))) missing.push(qq.id);
    return { id: qq.id, question: qq.label?.en || qq.label?.ar || qq.id, question_ar: qq.label?.ar || '', type: qq.type, answer: val };
  });
  if (missing.length) return res.status(400).json({ error: 'invalid', missing });

  const row = await one<{ id: number }>(
    `INSERT INTO applications (job_id, job_title, full_name, email, phone, city, answers, cv_key, cv_name, portfolio, linkedin, lang)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [job.id, job.title?.en || job.title?.ar || '', d.fullName, d.email, d.phone, d.city, JSON.stringify(answers), d.cvKey, d.cvName, d.portfolio, d.linkedin, d.lang]
  );
  await notify('jobs', 'New job application', `${d.fullName} applied for ${job.title?.en || job.title?.ar || 'a job'}`, `/admin/applications/${row?.id}`);
  res.status(201).json({ ok: true, id: row?.id });
});

// "Send your CV" for people with no open role: same table, no job attached
publicRouter.post('/apply/general', async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid', fields: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  const role = String(d.answers.role || '').trim().slice(0, 200);
  const answers = role ? [{ id: 'role', question: 'Role they are interested in', question_ar: 'الوظيفة التي تهتم بها', type: 'text', answer: role }] : [];
  const row = await one<{ id: number }>(
    `INSERT INTO applications (job_id, job_title, full_name, email, phone, city, answers, cv_key, cv_name, portfolio, linkedin, lang)
     VALUES (NULL,'',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [d.fullName, d.email, d.phone, d.city, JSON.stringify(answers), d.cvKey, d.cvName, d.portfolio, d.linkedin, d.lang]
  );
  await notify('jobs', 'New CV (no specific role)', `${d.fullName} sent a CV${role ? ' · ' + role : ''}`, `/admin/applications/${row?.id}`);
  res.status(201).json({ ok: true, id: row?.id });
});

// ---------- contact form ----------
const contactTries = new Map<string, { n: number; until: number }>(); // 5 messages per hour per IP

publicRouter.post('/contact', async (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  const t = contactTries.get(ip);
  if (t && t.until > Date.now() && t.n >= 5) return res.status(429).json({ error: 'rate' });

  const p = z.object({
    // only the name and a phone number are required (someone from the team calls back); everything else is optional
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30).refine((v) => v.replace(/\D/g, '').length >= 7, 'phone'),
    email: z.string().trim().max(160).optional().default('').refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'email'),
    jobTitle: z.string().trim().max(120).optional().default(''),
    company: z.string().trim().max(120).optional().default(''),
    services: z.array(z.string().trim().max(120)).max(20).optional().default([]),
    budget: z.string().trim().max(60).optional().default(''),
    message: z.string().trim().max(4000).optional().default(''),
    lang: z.enum(['en', 'ar']).optional().default('en'),
    website: z.string().max(200).optional().default(''), // honeypot: real people leave it empty
  }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid', fields: p.error.flatten().fieldErrors });
  if (p.data.website) return res.json({ ok: true }); // a bot: pretend it worked, save nothing

  const d = p.data;
  const row = await one<{ id: number }>(
    'INSERT INTO inquiries (full_name, job_title, email, phone, company, services, budget, message, lang) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [d.fullName, d.jobTitle, d.email, d.phone, d.company, JSON.stringify(d.services), d.budget, d.message, d.lang]
  );
  await notify('inquiries', 'New inquiry', `${d.fullName} · ${d.phone}${d.company ? ' · ' + d.company : ''}${d.services.length ? ' · ' + d.services.slice(0, 3).join(', ') : ''}`, `/admin/inquiries/${row?.id}`);
  contactTries.set(ip, { n: (t && t.until > Date.now() ? t.n : 0) + 1, until: t && t.until > Date.now() ? t.until : Date.now() + 60 * 60 * 1000 });
  res.status(201).json({ ok: true });
});

publicRouter.post('/subscribe', async (req, res) => {
  const p = z.object({ email: z.string().trim().email().max(160), lang: z.enum(['en', 'ar']).optional().default('en') }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid' });
  await q('INSERT INTO subscribers (email, lang) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET lang = EXCLUDED.lang', [p.data.email.toLowerCase(), p.data.lang]);
  res.json({ ok: true });
});

// the link at the bottom of every newsletter email
publicRouter.get('/unsubscribe', async (req, res) => {
  const token = String(req.query.token || '');
  if (/^[0-9a-f-]{36}$/i.test(token)) await q('DELETE FROM subscribers WHERE token = $1', [token]);
  res.type('html').send('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Minto Media</title><body style="font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;background:#050B16;color:#fff"><div><h1>You are unsubscribed</h1><h2 dir="rtl">تم إلغاء اشتراكك</h2><p><a style="color:#F68B1F" href="/">mintomediaagency.com</a></p></div></body>');
});
