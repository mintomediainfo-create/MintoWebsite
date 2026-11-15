// Dashboard API. Every route here needs a logged-in admin.
import { Router } from 'express';
import { z } from 'zod';
import { q, one } from '../db';
import { requireAdmin, AuthedRequest, checkPassword, hashPassword } from '../lib/auth';
import path from 'path';
import { makeKey, publicUrl, signUpload, signDownload, removeFile, useR2, LOCAL_DIR } from '../lib/storage';
import { resources, pickColumns, slugify } from '../resources';
import { readSettings } from './public';
import { notifyNews } from '../lib/newsletter';
import { notify, NotifyKind } from '../lib/notify';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/me', async (req: AuthedRequest, res) => {
  res.json(await one('SELECT id, email, name FROM admins WHERE id = $1', [req.admin!.id]));
});

adminRouter.get('/summary', async (_req, res) => {
  const counts = await one<any>(`SELECT
    (SELECT count(*) FROM applications WHERE status = 'new') AS new_apps,
    (SELECT count(*) FROM applications) AS apps,
    (SELECT count(*) FROM jobs WHERE status = 'open') AS open_jobs,
    (SELECT count(*) FROM news WHERE status = 'published') AS news,
    (SELECT count(*) FROM work_items WHERE active) AS work,
    (SELECT count(*) FROM clients WHERE active) AS clients,
    (SELECT count(*) FROM testimonials WHERE active) AS testimonials,
    (SELECT count(*) FROM subscribers) AS subscribers,
    (SELECT count(*) FROM inquiries WHERE status = 'new') AS new_inquiries,
    (SELECT count(*) FROM inquiries) AS inquiries`);
  const recent = await q(`SELECT id, full_name, job_title, status, created_at FROM applications ORDER BY created_at DESC LIMIT 6`);
  res.json({ counts, recent });
});

// ---------- uploads (images, videos) ----------
const MEDIA = /^(image\/(png|jpe?g|webp|gif|svg\+xml|avif)|video\/(mp4|webm|quicktime))$/;
adminRouter.post('/upload-url', async (req, res) => {
  const p = z.object({ folder: z.string().regex(/^[a-z-]{2,30}$/), filename: z.string().min(1).max(200), contentType: z.string() }).safeParse(req.body);
  if (!p.success || !MEDIA.test(p.data.contentType)) return res.status(400).json({ error: 'This file type is not allowed.' });
  const key = makeKey(p.data.folder, p.data.filename);
  res.json({ key, publicUrl: publicUrl(key), ...(await signUpload(key, p.data.contentType)) });
});

// ---------- settings ----------
const SETTING_KEYS = ['hero', 'contact', 'social', 'testimonials_display', 'work_display', 'notifications', 'testimonials_video'];
adminRouter.get('/settings', async (_req, res) => res.json(await readSettings(true)));
adminRouter.post('/notifications/test', async (req, res) => {
  const kind = req.body?.kind === 'jobs' ? 'jobs' : req.body?.kind === 'inquiries' ? 'inquiries' : null;
  if (!kind) return res.status(400).json({ error: 'Bad request' });
  const r = await notify(kind as NotifyKind, 'Test alert from the Minto dashboard', 'If you can read this, alerts are working.', '/admin/notifications', { force: true });
  res.json({ ok: r.phone || r.email === 'sent', ...r });
});
adminRouter.put('/settings/:key', async (req, res) => {
  if (!SETTING_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'Unknown setting' });
  await q(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [req.params.key, JSON.stringify(req.body || {})]
  );
  res.json({ ok: true });
});

// ---------- generic content CRUD ----------
function resOr404(name: string, res: any) {
  const r = resources[name];
  if (!r) res.status(404).json({ error: 'Unknown content type' });
  return r;
}

async function uniqueSlug(table: string, base: string, exceptId?: number) {
  let slug = slugify(base);
  for (let i = 2; ; i++) {
    const hit = await one(`SELECT id FROM ${table} WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)`, [slug, exceptId ?? null]);
    if (!hit) return slug;
    slug = `${slugify(base)}-${i}`;
  }
}

adminRouter.get('/r/:res', async (req, res) => {
  const r = resOr404(req.params.res, res); if (!r) return;
  res.json(await q(`SELECT * FROM ${r.table} ORDER BY ${r.order}`));
});

adminRouter.get('/r/:res/:id', async (req, res) => {
  const r = resOr404(req.params.res, res); if (!r) return;
  const row = await one(`SELECT * FROM ${r.table} WHERE id = $1`, [Number(req.params.id)]);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
});

// Work items: only one Featured; Featured always shows on the home page; at most 5 more pieces on the home page.
const HOME_EXTRA = 5;
/** A promise that gives up after `ms` with a clear error (a database call on Vercel could hang until the function died). */
function withLimit<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let t: NodeJS.Timeout;
  return Promise.race([p, new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(`The database did not answer in time (${what}). Please try again.`)), ms); })])
    .finally(() => clearTimeout(t));
}
/** Returns whether the piece is Featured, or null when the save is refused (the 409 answer is already sent).
 *  (It used to return false for both: every save of a piece that is not Featured stopped without an answer and hung.) */
export async function workRules(data: Record<string, any>, id: number | null, res: any): Promise<boolean | null> {
  // the saved state is only needed for fields the request leaves out (the dashboard always sends all three)
  const all = 'featured' in data && 'on_home' in data && 'active' in data;
  const cur = id && !all ? await withLimit(one<any>('SELECT featured, on_home, active FROM work_items WHERE id = $1', [id]), 5000, 'reading the work item') : null;
  const featured = 'featured' in data ? !!data.featured : !!cur?.featured;
  if (featured) data.on_home = true;
  const onHome = 'on_home' in data ? !!data.on_home : !!cur?.on_home;
  const active = 'active' in data ? !!data.active : cur ? !!cur.active : true;
  if (onHome && !featured && active) {
    const n = await withLimit(one<{ n: string }>('SELECT count(*) AS n FROM work_items WHERE on_home AND active AND NOT featured AND ($1::int IS NULL OR id <> $1)', [id]), 5000, 'counting the home page pieces');
    if (Number(n?.n || 0) >= HOME_EXTRA) { res.status(409).json({ error: `The home page already shows ${HOME_EXTRA} pieces plus the Featured one. Turn off “Show on home page” on another piece first.` }); return null; }
  }
  return featured;
}
// "We support your success" media: exactly 3 slots on the home page, so at most 3 pieces can be shown (active) at the same time.
const INTRO_MAX = 3;
async function introRules(data: Record<string, any>, id: number | null, res: any, creating: boolean) {
  const cur = id ? await one<any>('SELECT active FROM intro_media WHERE id = $1', [id]) : null;
  const active = 'active' in data ? !!data.active : cur ? !!cur.active : true;
  if (!active) return true;
  const n = await one<{ n: string }>('SELECT count(*) AS n FROM intro_media WHERE active AND ($1::int IS NULL OR id <> $1)', [id]);
  if (Number(n?.n || 0) < INTRO_MAX) return true;
  if (creating) { data.active = false; return true; } // a 4th piece is saved hidden: you choose which of the 3 to swap
  res.status(409).json({ error: `Only ${INTRO_MAX} pieces can show at the same time. Hide one of the shown pieces first.` });
  return false;
}
async function onlyOneFeatured(id: number) {
  await q('UPDATE work_items SET featured = false WHERE featured AND id <> $1', [id]);
}

adminRouter.post('/r/:res', async (req, res) => {
  const r = resOr404(req.params.res, res); if (!r) return;
  const data = pickColumns(r, req.body);
  let workFeatured = false;
  if (req.params.res === 'work') { const w = await workRules(data, null, res); if (w === null) return; workFeatured = w; }
  if (req.params.res === 'intro-media' && !(await introRules(data, null, res, true))) return;
  if (r.slugFrom) {
    const src = req.body?.slug || req.body?.[r.slugFrom]?.en || req.body?.[r.slugFrom]?.ar || 'item';
    data.slug = await uniqueSlug(r.table, src);
  }
  if ('sort' in r.cols && !('sort' in data)) {
    const m = await one<{ m: number }>(`SELECT COALESCE(max(sort), 0) + 1 AS m FROM ${r.table}`);
    data.sort = m?.m ?? 0;
  }
  const keys = Object.keys(data);
  const row = await one(
    keys.length
      ? `INSERT INTO ${r.table} (${keys.join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`
      : `INSERT INTO ${r.table} DEFAULT VALUES RETURNING *`,
    Object.values(data)
  );
  if (workFeatured && row) await onlyOneFeatured((row as any).id);
  if (req.params.res === 'news' && row) await notifyNews((row as any).id).catch((e) => console.error('newsletter failed', e));
  res.status(201).json(row);
});

adminRouter.put('/r/:res/:id', async (req, res) => {
  const r = resOr404(req.params.res, res); if (!r) return;
  const id = Number(req.params.id);
  const t0 = Date.now(); const step = (m: string) => console.log(`   put ${req.params.res}/${id}: ${m} at ${Date.now() - t0}ms`);
  const data = pickColumns(r, req.body);
  step(`body ok, fields: ${Object.keys(data).join(',')}`);
  let workFeatured = false;
  if (req.params.res === 'work') { const w = await workRules(data, id, res); if (w === null) return; workFeatured = w; }
  if (req.params.res === 'intro-media' && !(await introRules(data, id, res, false))) return;
  if (r.slugFrom && 'slug' in data) data.slug = await uniqueSlug(r.table, String(data.slug || req.body?.[r.slugFrom]?.en || 'item'), id);
  const keys = Object.keys(data);
  if (!keys.length) return res.json(await one(`SELECT * FROM ${r.table} WHERE id = $1`, [id]));
  const row = await withLimit(one(
    `UPDATE ${r.table} SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
    [...Object.values(data), id]
  ), 9000, 'saving');
  step('update ok');
  if (row && workFeatured) await onlyOneFeatured(id);
  if (row && req.params.res === 'news') await notifyNews(id).catch((e) => console.error('newsletter failed', e));
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
});

adminRouter.delete('/r/:res/:id', async (req, res) => {
  const r = resOr404(req.params.res, res); if (!r) return;
  await q(`DELETE FROM ${r.table} WHERE id = $1`, [Number(req.params.id)]);
  res.json({ ok: true });
});

adminRouter.post('/r/:res/reorder', async (req, res) => {
  const r = resOr404(req.params.res, res); if (!r) return;
  if (!('sort' in r.cols)) return res.status(400).json({ error: 'This list has no order' });
  const ids = z.array(z.number().int()).max(500).safeParse(req.body?.ids);
  if (!ids.success) return res.status(400).json({ error: 'Bad request' });
  await Promise.all(ids.data.map((id, i) => q(`UPDATE ${r.table} SET sort = $1 WHERE id = $2`, [i, id])));
  res.json({ ok: true });
});

// ---------- job applications ----------
adminRouter.get('/applications', async (req, res) => {
  const job = req.query.job ? Number(req.query.job) : null;
  const status = String(req.query.status || '');
  res.json(
    await q(
      `SELECT id, job_id, job_title, full_name, email, phone, city, status, created_at FROM applications
       WHERE ($1::int IS NULL OR job_id = $1) AND ($2 = '' OR status = $2) ORDER BY created_at DESC`,
      [job, status]
    )
  );
});
adminRouter.get('/applications/:id', async (req, res) => {
  const row = await one('SELECT * FROM applications WHERE id = $1', [Number(req.params.id)]);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
});
adminRouter.patch('/applications/:id', async (req, res) => {
  const p = z.object({ status: z.enum(['new', 'reviewing', 'shortlisted', 'rejected', 'hired']).optional(), notes: z.string().max(5000).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Bad request' });
  const row = await one(
    'UPDATE applications SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
    [p.data.status ?? null, p.data.notes ?? null, Number(req.params.id)]
  );
  res.json(row);
});
adminRouter.get('/applications/:id/cv', async (req, res) => {
  const row = await one<any>('SELECT cv_key, cv_name, full_name FROM applications WHERE id = $1', [Number(req.params.id)]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ url: await signDownload(row.cv_key, row.cv_name || `${row.full_name}-cv`) });
});
// local development only: CV download without R2
adminRouter.get('/local-file/:key(*)', (req, res) => {
  const key = decodeURIComponent(req.params.key);
  if (useR2 || key.includes('..')) return res.status(404).end();
  res.download(path.join(LOCAL_DIR, key));
});
adminRouter.delete('/applications/:id', async (req, res) => {
  const row = await one<any>('DELETE FROM applications WHERE id = $1 RETURNING cv_key', [Number(req.params.id)]);
  if (row?.cv_key) await removeFile(row.cv_key);
  res.json({ ok: true });
});

// ---------- contact form messages ----------
const INQ_STATUS = ['new', 'contacted', 'won', 'closed'] as const;
adminRouter.get('/inquiries', async (req, res) => {
  const status = String(req.query.status || '');
  res.json(await q(
    `SELECT id, full_name, job_title, email, phone, company, services, message, status, created_at FROM inquiries
     WHERE ($1 = '' OR status = $1) ORDER BY created_at DESC`,
    [status]
  ));
});
adminRouter.get('/inquiries/:id', async (req, res) => {
  const row = await one('SELECT * FROM inquiries WHERE id = $1', [Number(req.params.id)]);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
});
adminRouter.patch('/inquiries/:id', async (req, res) => {
  const p = z.object({ status: z.enum(INQ_STATUS).optional(), notes: z.string().max(5000).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Bad request' });
  const row = await one(
    'UPDATE inquiries SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
    [p.data.status ?? null, p.data.notes ?? null, Number(req.params.id)]
  );
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
});
adminRouter.delete('/inquiries/:id', async (req, res) => {
  await q('DELETE FROM inquiries WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

adminRouter.get('/subscribers', async (_req, res) => {
  res.json(await q('SELECT email, created_at FROM subscribers ORDER BY created_at DESC'));
});

// ---------- admin accounts ----------
adminRouter.get('/admins', async (_req, res) => res.json(await q('SELECT id, email, name, created_at FROM admins ORDER BY id')));
adminRouter.post('/admins', async (req, res) => {
  const p = z.object({ email: z.string().email(), name: z.string().max(80).default(''), password: z.string().min(8).max(200) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Email and a password of 8+ characters are needed.' });
  const exists = await one('SELECT id FROM admins WHERE lower(email) = lower($1)', [p.data.email]);
  if (exists) return res.status(409).json({ error: 'This email already has an account.' });
  res.status(201).json(
    await one('INSERT INTO admins (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id, email, name, created_at', [p.data.email.toLowerCase(), p.data.name, await hashPassword(p.data.password)])
  );
});
adminRouter.delete('/admins/:id', async (req: AuthedRequest, res) => {
  if (Number(req.params.id) === req.admin!.id) return res.status(400).json({ error: 'You cannot remove your own account.' });
  await q('DELETE FROM admins WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});
adminRouter.put('/account', async (req: AuthedRequest, res) => {
  const p = z.object({ name: z.string().max(80).optional(), currentPassword: z.string(), newPassword: z.string().min(8).max(200).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'The new password needs 8+ characters.' });
  const me = await one<any>('SELECT * FROM admins WHERE id = $1', [req.admin!.id]);
  if (!me || !(await checkPassword(p.data.currentPassword, me.password_hash))) return res.status(403).json({ error: 'Your current password is not right.' });
  await q('UPDATE admins SET name = COALESCE($1, name), password_hash = $2 WHERE id = $3', [
    p.data.name ?? null,
    p.data.newPassword ? await hashPassword(p.data.newPassword) : me.password_hash,
    me.id,
  ]);
  res.json({ ok: true });
});
