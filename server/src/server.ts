// Local / VPS entry. On Vercel the app is served by /api/index.ts instead.
import fs from 'fs';
import path from 'path';
import express from 'express';
import app from './app';
import { env } from './env';
import { migrate } from './migrate';

// when the website has been built (npm run build), serve it from the same server
const dist = path.join(__dirname, '../../web/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

migrate()
  .then(() => app.listen(env.PORT, () => console.log(`Minto API on http://localhost:${env.PORT}`)))
  .catch((e) => { console.error('Database problem:', e.message); process.exit(1); });
