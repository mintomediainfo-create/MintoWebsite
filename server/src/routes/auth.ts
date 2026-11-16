import { Router } from 'express';
import { z } from 'zod';
import { one, q } from '../db';
import { mailEnv } from '../env';
import { checkPassword, setSession, clearSession, hashPassword, makeResetToken, resetTokenAdmin, checkResetToken, RESET_MINUTES } from '../lib/auth';
import { sendMail } from '../lib/mail';

export const authRouter = Router();

const ipOf = (req: any) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();

// slow down password guessing: 8 wrong tries per 15 minutes per IP
const tries = new Map<string, { n: number; until: number }>();

authRouter.post('/login', async (req, res) => {
  const ip = ipOf(req);
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

// ---------- forgot password: a link by email to the account's own address ----------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function resetMail(name: string, link: string) {
  const hi = name ? `Hi ${name},` : 'Hi,';
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0E1B33;max-width:560px;line-height:1.55">
<h2 style="margin:0 0 14px;color:#0B4A94">Reset your dashboard password</h2>
<p>${esc(hi)}</p>
<p>Someone (hopefully you) asked to reset the password of this Minto Media dashboard account. Press the button to choose a new one.</p>
<p style="margin:26px 0"><a href="${esc(link)}" style="background:#F68B1F;color:#0E1B33;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:999px">Choose a new password</a></p>
<p style="color:#56677F;font-size:13px">The link works for ${RESET_MINUTES} minutes, and only once. If you did not ask for this, ignore this email: your password stays the same.</p>
<p style="color:#8A9AB1;font-size:12px;word-break:break-all">If the button does not work, open this address: ${esc(link)}</p></div>`;
  const text = `${hi}\n\nTo choose a new password for your Minto Media dashboard account, open this link:\n${link}\n\nIt works for ${RESET_MINUTES} minutes, and only once. If you did not ask for this, ignore this email: your password stays the same.\n`;
  return { html, text };
}

// 5 requests per 15 minutes per IP, and one email per account per minute (no flooding someone's inbox)
const forgotTries = new Map<string, { n: number; until: number }>();
const lastMail = new Map<number, number>();

authRouter.post('/forgot', async (req, res) => {
  const ip = ipOf(req);
  const t = forgotTries.get(ip);
  if (t && t.n >= 5 && t.until > Date.now()) return res.status(429).json({ error: 'Too many tries. Wait a few minutes and try again.' });
  forgotTries.set(ip, { n: (t && t.until > Date.now() ? t.n : 0) + 1, until: Date.now() + 15 * 60 * 1000 });

  const p = z.object({ email: z.string().trim().email().max(200) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Please type a valid email address.' });
  const admin = await one<any>('SELECT id, email, name, password_hash FROM admins WHERE lower(email) = lower($1)', [p.data.email]);
  // the answer is the same whether or not the email has an account (nobody can use this to find admin emails)
  if (admin && Date.now() - (lastMail.get(admin.id) || 0) > 60 * 1000) {
    lastMail.set(admin.id, Date.now());
    // after # so the token never reaches any server log
    const link = `${mailEnv.SITE_URL}/admin/reset#${makeResetToken(admin)}`;
    const { html, text } = resetMail(admin.name || '', link);
    try {
      await sendMail(admin.email, 'Reset your Minto Media dashboard password', html, text);
    } catch (e) {
      console.error('password reset email failed:', (e as Error).message);
    }
  }
  res.json({ ok: true });
});

authRouter.post('/reset', async (req, res) => {
  const p = z.object({ token: z.string().min(20).max(2000), password: z.string().min(8).max(200) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'The new password needs 8 or more characters.' });
  const id = resetTokenAdmin(p.data.token);
  const admin = id ? await one<any>('SELECT id, email, name, password_hash FROM admins WHERE id = $1', [id]) : null;
  if (!admin || !checkResetToken(p.data.token, admin)) {
    return res.status(400).json({ error: 'This link has expired or was already used. Ask for a new one.' });
  }
  // only if the password did not change in the meantime (the same link opened twice at once)
  const done = await q('UPDATE admins SET password_hash = $1 WHERE id = $2 AND password_hash = $3 RETURNING id',
    [await hashPassword(p.data.password), admin.id, admin.password_hash]);
  if (!done.length) return res.status(400).json({ error: 'This link was already used. Ask for a new one.' });
  tries.delete(ipOf(req));
  setSession(res, admin);
  res.json({ id: admin.id, email: admin.email, name: admin.name });
});
