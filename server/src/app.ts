import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { useR2, LOCAL_DIR } from './lib/storage';
import { isProd } from './env';
import { q } from './db';

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
// JSON bodies. On Vercel the platform may already have read the request body (req.body is set); reading the stream
// again then waits forever (FUNCTION_INVOCATION_TIMEOUT on every Save). So use that body when it is there.
const jsonBody = express.json({ limit: '1mb' });
app.use((req, res, next) => {
  let pre: unknown;
  try { pre = (req as any).body; } catch { pre = undefined; }
  if (pre && typeof pre === 'object' && !Buffer.isBuffer(pre)) { (req as any)._body = true; return next(); }
  if (typeof pre === 'string' && pre && /json/i.test(req.get('content-type') || '')) {
    try { (req as any).body = JSON.parse(pre); (req as any)._body = true; return next(); } catch { return res.status(400).json({ error: 'Bad JSON' }); }
  }
  return jsonBody(req, res, next);
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
