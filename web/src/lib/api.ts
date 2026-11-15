// Small helpers to talk to the Express API.
import { useCallback, useEffect, useRef, useState } from 'react';

export type L = { en: string; ar: string };
export type Lang = 'en' | 'ar';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  // never wait forever: after 30 s the request stops with a clear message (instead of "Saving…" that never ends)
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 30000);
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
      credentials: 'same-origin',
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctl.signal,
    });
  } catch (e) {
    throw new ApiError(0, ctl.signal.aborted ? 'The server took too long to answer. Please try again.' : 'Could not reach the server. Check your connection.', null);
  } finally {
    clearTimeout(tm);
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new ApiError(res.status, (data && data.error) || res.statusText, data);
  return data as T;
}

// tiny cache so going back to a page shows it at once, then refreshes
const cache = new Map<string, unknown>();

// The loading screen (index.html) waits while a page is still fetching its first data, so the page shows complete.
// window.mmBusy() = how many things the page still waits for: first-time fetches here, plus holds (mmHold, e.g. the
// hero video) that a component takes and lets go.
declare global { interface Window { mmBusy?: () => number; mmHold?: () => () => void } }
let busy = 0;
if (typeof window !== 'undefined') {
  window.mmBusy = () => busy;
  window.mmHold = () => { busy++; let on = true; return () => { if (on) { on = false; busy--; } }; };
}

export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | undefined>(() => (path ? (cache.get(path) as T) : undefined));
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!path && !cache.has(path));
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    const first = !cache.has(path); // only a first-time fetch keeps the loading screen up (cached pages show at once)
    const release = first ? window.mmHold?.() : undefined;
    try {
      const d = await api<T>(path);
      cache.set(path, d);
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError(e as ApiError);
    } finally {
      if (alive.current) setLoading(false);
      release?.();
    }
  }, [path]);

  useEffect(() => {
    if (path && cache.has(path)) setData(cache.get(path) as T);
    load();
  }, [load, path]);

  return { data, error, loading, reload: load, setData };
}

/** Pick the right language from a {en, ar} value (falls back to the other language). */
export function tr(v: L | string | null | undefined, lang: Lang): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return (lang === 'ar' ? v.ar || v.en : v.en || v.ar) || '';
}

export const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url || '');

/**
 * Upload a file straight to storage (R2 in production) with a signed URL.
 * `sign` is the API path that returns { uploadUrl, key, publicUrl? }.
 */
export async function uploadFile(
  file: File,
  sign: { path: string; body: Record<string, unknown> },
  onProgress?: (p: number) => void
): Promise<{ key: string; publicUrl?: string }> {
  const s = await api<{ uploadUrl: string; key: string; publicUrl?: string; contentType?: string }>(sign.path, { body: sign.body });
  await new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', s.uploadUrl);
    x.setRequestHeader('Content-Type', s.contentType || file.type || 'application/octet-stream');
    x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error('Upload failed (' + x.status + ')')));
    x.onerror = () => reject(new Error('Upload failed. Check your connection.'));
    x.send(file);
  });
  return { key: s.key, publicUrl: s.publicUrl };
}

export function fmtDate(d: string | null | undefined, lang: Lang) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
