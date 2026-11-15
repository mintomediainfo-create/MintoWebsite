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
