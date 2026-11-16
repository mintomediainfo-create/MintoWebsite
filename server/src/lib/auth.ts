import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env, isProd } from '../env';

const COOKIE = 'mm_admin';

export const hashPassword = (p: string) => bcrypt.hash(p, 11);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

export function setSession(res: Response, admin: { id: number; email: string }) {
  const token = jwt.sign({ sub: admin.id, email: admin.email }, env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 7 * 24 * 3600 * 1000, path: '/' });
}
export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: '/' });
}

// Password reset links. The token is signed with the secret PLUS the admin's current password hash, so it stops working
// as soon as the password changes (used once = gone), and after RESET_MINUTES. Nothing to store in the database.
export const RESET_MINUTES = 30;
type ResetAdmin = { id: number; password_hash: string };
export const makeResetToken = (a: ResetAdmin) =>
  jwt.sign({ sub: a.id, use: 'reset' }, env.JWT_SECRET + a.password_hash, { expiresIn: RESET_MINUTES * 60 });
/** Which admin the token is for (not checked yet: checkResetToken does that). */
export function resetTokenAdmin(token: string): number | null {
  const p = jwt.decode(token) as any;
  return p && p.use === 'reset' && Number.isInteger(Number(p.sub)) ? Number(p.sub) : null;
}
export function checkResetToken(token: string, a: ResetAdmin) {
  try {
    const p = jwt.verify(token, env.JWT_SECRET + a.password_hash, { algorithms: ['HS256'] }) as any;
    return p.use === 'reset' && Number(p.sub) === a.id;
  } catch { return false; }
}

export interface AuthedRequest extends Request { admin?: { id: number; email: string } }

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as any;
    req.admin = { id: Number(p.sub), email: p.email };
    next();
  } catch {
    clearSession(res);
    res.status(401).json({ error: 'Session expired' });
  }
}
