import { Router } from 'express';
import { z } from 'zod';
import { one } from '../db';
import { checkPassword, setSession, clearSession } from '../lib/auth';

export const authRouter = Router();

// slow down password guessing: 8 wrong tries per 15 minutes per IP
const tries = new Map<string, { n: number; until: number }>();

authRouter.post('/login', async (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  const t = tries.get(ip);
  if (t && t.n >= 8 && t.until > Date.now()) return res.status(429).json({ error: 'Too many tries. Wait a few minutes and try again.' });

  const p = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  const admin = p.success ? await one<any>('SELECT * FROM admins WHERE lower(email) = lower($1)', [p.data.email]) : null;
  if (!p.success || !admin || !(await checkPassword(p.data.password, admin.password_hash))) {
    tries.set(ip, { n: (t && t.until > Date.now() ? t.n : 0) + 1, until: Date.now() + 15 * 60 * 1000 });
    return res.status(401).json({ error: 'Wrong email or password.' });
  }
  tries.delete(ip);
  setSession(res, admin);
  res.json({ id: admin.id, email: admin.email, name: admin.name });
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});
