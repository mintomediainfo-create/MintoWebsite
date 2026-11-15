import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { useR2, LOCAL_DIR } from './lib/storage';
import { isProd } from './env';
import { pool, q } from './db';
import { resources, pickColumns } from './resources';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// dashboard changes in the log: when a request arrives (before its body is read) and when it is answered
app.use('/api/admin', (req, res, next) => {
  if (req.method === 'GET') return next();
  const t = Date.now();
  console.log(`-> ${req.method} /api/admin${req.path}`);
  res.on('finish', () => console.log(`<- ${req.method} /api/admin${req.path} ${res.statusCode} ${Date.now() - t}ms`));
  res.on('close', () => { if (!res.writableFinished) console.log(`xx ${req.method} /api/admin${req.path} closed without an answer after ${Date.now() - t}ms`); });
  next();
});
// JSON bodies, read by hand: on Vercel a request (Work saves with Arabic text) could hang in express.json() waiting for
// bytes that never came (FUNCTION_INVOCATION_TIMEOUT). Here: use a body the platform already parsed, else read the
// stream until it ends, but never wait more than 4 s after the last chunk; then parse what arrived.
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || !/json/i.test(req.get('content-type') || '')) return next();
  let pre: unknown;
  try { pre = (req as any).body; } catch { pre = undefined; }
  if (pre && typeof pre === 'object' && !Buffer.isBuffer(pre)) return next();
  const chunks: Buffer[] = []; let size = 0, done = false, timer: NodeJS.Timeout;
  const finish = (why: string) => {
    if (done) return; done = true; clearTimeout(timer);
    const raw = Buffer.concat(chunks).toString('utf8');
    const declared = Number(req.get('content-length') || 0);
    if (why !== 'end' || (declared && declared !== size)) console.log(`body ${req.method} ${req.path}: ${why}, ${size} of ${declared} bytes`);
    if (!raw) { (req as any).body = {}; return next(); }
    try { (req as any).body = JSON.parse(raw); next(); } catch { res.status(400).json({ error: 'Bad JSON' }); }
  };
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => finish('timeout'), 4000); };
  if (typeof pre === 'string' || Buffer.isBuffer(pre)) { chunks.push(Buffer.from(pre as any)); size = chunks[0].length; return finish('end'); }
  arm();
  req.on('data', (c: Buffer) => { chunks.push(c); size += c.length; if (size > 1024 * 1024) { done = true; clearTimeout(timer); res.status(413).json({ error: 'Too large' }); } else arm(); });
  req.on('end', () => finish('end'));
  req.on('error', () => finish('error'));
});
app.use(cookieParser());

// small async wrapper so a thrown error becomes a 500 instead of a hanging request
const wrap = (r: express.Router) => {
  for (const layer of (r as any).stack) {
    for (const l of layer.route?.stack || []) {
      const fn = l.handle;
      l.handle = (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
    }
  }
  return r;
};

// for Google: robots.txt and a sitemap of every public page (news and open jobs included), on whatever domain the site runs
const origin = (req: express.Request) => `${req.protocol}://${req.get('host')}`;
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${origin(req)}/sitemap.xml\n`);
});
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const [news, jobs] = await Promise.all([
      q<{ slug: string; d: string }>("SELECT slug, to_char(published_at, 'YYYY-MM-DD') AS d FROM news WHERE status = 'published' ORDER BY published_at DESC"),
      q<{ slug: string }>("SELECT slug FROM jobs WHERE status = 'open'"),
    ]);
    const pages = ['/', '/about', '/work', '/news', '/careers', '/contact'].map((p) => ({ p, d: '' }))
      .concat(news.map((n) => ({ p: `/news/${n.slug}`, d: n.d })), jobs.map((j) => ({ p: `/careers/${j.slug}`, d: '' })));
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      pages.map(({ p, d }) => `  <url><loc>${esc(origin(req) + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n');
  } catch (e) { next(e); }
});

app.use('/api/auth', wrap(authRouter));
app.use('/api/admin', wrap(adminRouter));
app.use('/api', wrap(publicRouter));

// TEMPORARY diagnosis of the Work save hang (remove after): does the same work as a Work save, timed step by step,
// inside a transaction that is rolled back (nothing changes). Needs the key.
app.get('/api/_diag/work/:id', async (req, res) => {
  if (req.query.k !== 'e349e7aab9f9bbaf24ee13b5') return res.status(404).end();
  const id = Number(req.params.id);
  const out: string[] = []; const t0 = Date.now(); const mark = (m: string) => out.push(`${Date.now() - t0}ms ${m}`);
  const lim = (p: Promise<any>, what: string): Promise<any> => Promise.race([p, new Promise<any>((_, r) => setTimeout(() => r(new Error('TIMEOUT ' + what)), 6000))]);
  let c: any;
  try {
    mark(`pool total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount}`);
    c = await lim(pool.connect(), 'connect'); mark('connected');
    await lim(c.query('BEGIN'), 'begin'); mark('begin');
    const a = await lim(c.query('SELECT featured, on_home, active FROM work_items WHERE id = $1', [id]), 'select'); mark(`select rows=${a.rowCount}`);
    const b = await lim(c.query('UPDATE work_items SET client_name = client_name WHERE id = $1 RETURNING *', [id]), 'update'); mark(`update rows=${b.rowCount}`);
    // the real save: every field the dashboard sends (the row's own values), through pickColumns, same SQL as the route
    if (req.query.full) {
      const data = pickColumns(resources.work, { ...a.rows[0], ...(await c.query('SELECT * FROM work_items WHERE id = $1', [id])).rows[0] });
      const keys = Object.keys(data); mark(`fields ${keys.join(',')}`);
      const f = await lim(c.query(`UPDATE work_items SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${keys.length + 1} RETURNING *`, [...Object.values(data), id]), 'full update');
      mark(`full update rows=${f.rowCount}`);
    }
    await lim(c.query('ROLLBACK'), 'rollback'); mark('rolled back');
  } catch (e) {
    mark('ERROR ' + (e as Error).message);
    try { await c?.query('ROLLBACK'); } catch { /* ignore */ }
  } finally { try { c?.release(true); } catch { /* ignore */ } }
  res.json(out);
});

// development only: when R2 is not set up, uploads are written to server/uploads
if (!useR2) {
  app.put('/api/local-upload/:key(*)', express.raw({ type: '*/*', limit: '200mb' }), (req, res) => {
    const key = decodeURIComponent(req.params.key);
    if (key.includes('..')) return res.status(400).end();
    const file = path.join(LOCAL_DIR, key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, req.body);
    res.json({ ok: true });
  });
  app.use('/uploads/cvs', (_req, res) => res.status(404).end()); // CVs are private
  app.use('/uploads', express.static(LOCAL_DIR));
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: isProd ? 'Something went wrong.' : String(err?.message || err) });
});

export default app;
