// Shared building blocks for the dashboard: toasts, confirm dialog, inputs, media uploader,
// sortable list, side panel, empty states and the "unsaved changes" guard.
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  ReactNode, MouseEvent as RMouseEvent, CSSProperties, DragEvent as RDragEvent,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, L, api, isVideo, uploadFile } from '../lib/api';
import { compressImage, fmtSize } from '../lib/compress';

/* ------------------------------------------------------------------ helpers */

export type Any = Record<string, any>;
export const emptyL = (): L => ({ en: '', ar: '' });
export const asL = (v: any): L => ({ en: v?.en ?? '', ar: v?.ar ?? '' });
export const uid = (p = 'q') => p + Math.random().toString(36).slice(2, 8);
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const pad = (n: number) => String(n).padStart(2, '0');

/** Any date/timestamp from the API → value for <input type="date"> (local day). */
export function toDateInput(v?: string | null) {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fmtDate(v?: string | null, time = false) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) });
}
/** "en" text, or the Arabic when English is empty. */
export const en = (v: any) => (typeof v === 'string' ? v : v?.en || v?.ar || '');
export const move = <T,>(arr: T[], from: number, to: number) => {
  const n = [...arr];
  const [x] = n.splice(from, 1);
  n.splice(to, 0, x);
  return n;
};

/* ------------------------------------------------------------------ icons */

const PATHS: Record<string, string> = {
  grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M18 13l-6 6-6-6',
  left: 'M19 12H5M11 6l-6 6 6 6',
  right: 'M5 12h14M13 6l6 6-6 6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  x: 'M6 6l12 12M18 6L6 18',
  upload: 'M12 16V4M6 10l6-6 6 6M4 20h16',
  home: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9h.01',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  users: 'M16 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 11a4 4 0 100-8 4 4 0 000 8zM22 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  quote: 'M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  news: 'M4 5h13v14H6a2 2 0 01-2-2V5zM17 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  case: 'M3 8h18v12H3zM8 8V5h8v3M3 13h18',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 005 5L15 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z',
  bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 004 0',
  cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  download: 'M12 4v12M6 10l6 6 6-6M4 20h16',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  check: 'M5 12l5 5 9-10',
  link: 'M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1',
  play: 'M7 4l13 8-13 8z',
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg className="adm-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={name === 'grip' ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name] || ''} />
    </svg>
  );
}

/* ------------------------------------------------------------------ unsaved-changes guard */

const dirtySet = new Set<number>();
let dirtyCounter = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (dirtySet.size) { e.preventDefault(); e.returnValue = ''; }
  });
}
/** Marks this screen as having unsaved changes while `on` is true. */
export function useDirty(on: boolean) {
  const id = useRef(0);
  if (!id.current) id.current = ++dirtyCounter;
  useEffect(() => {
    const k = id.current;
    if (on) dirtySet.add(k); else dirtySet.delete(k);
    return () => { dirtySet.delete(k); };
  }, [on]);
}
export const hasDirty = () => dirtySet.size > 0;

/* ------------------------------------------------------------------ toasts, confirm, errors */

type ToastT = { id: number; text: string; kind: 'ok' | 'error' };
type ConfirmOpts = { title: string; message?: ReactNode; ok?: string; cancel?: string; danger?: boolean };
interface UiCtxT {
  toast: (text: string, kind?: 'ok' | 'error') => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  /** Show an API error. "Not logged in" sends the user to the login page. */
  fail: (e: unknown) => void;
  /** Navigate, asking first when there are unsaved changes. */
  go: (to: string) => void;
}
const UiCtx = createContext<UiCtxT>(null as any);
export const useUi = () => useContext(UiCtx);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const navigate = useNavigate();
  const loc = useLocation();
  const okRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const toast = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setDlg({ ...o, resolve });
  }), []);

  const close = (v: boolean) => {
    dlg?.resolve(v);
    setDlg(null);
    setTimeout(() => lastFocus.current?.focus?.(), 0);
  };

  useEffect(() => { if (dlg) okRef.current?.focus(); }, [dlg]);

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      const next = loc.pathname.startsWith('/admin/login') ? '/admin' : loc.pathname + loc.search;
      navigate('/admin/login?next=' + encodeURIComponent(next), { replace: true });
      return;
    }
    const msg = e instanceof Error ? e.message : 'Something went wrong.';
    toast(msg === 'Failed to fetch' ? 'Could not reach the server. Check your internet connection.' : msg, 'error');
  }, [loc.pathname, loc.search, navigate, toast]);

  const go = useCallback((to: string) => {
    if (!hasDirty()) { navigate(to); return; }
    confirm({ title: 'Leave without saving?', message: 'You have changes that are not saved yet. If you leave now, they will be lost.', ok: 'Leave page', cancel: 'Stay here', danger: true })
      .then((ok) => { if (ok) { dirtySet.clear(); navigate(to); } });
  }, [confirm, navigate]);

  return (
    <UiCtx.Provider value={{ toast, confirm, fail, go }}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={'adm-toast ' + t.kind}>
            <Icon name={t.kind === 'ok' ? 'check' : 'x'} />
            <span>{t.text}</span>
            <button type="button" aria-label="Close message" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><Icon name="x" size={14} /></button>
          </div>
        ))}
      </div>
      {dlg && (
        <div className="adm-overlay adm-overlay-top" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
          <div className="adm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="adm-dlg-t"
            onKeyDown={(e) => { if (e.key === 'Escape') close(false); }}>
            <h2 id="adm-dlg-t">{dlg.title}</h2>
            {dlg.message && <div className="adm-dialog-msg">{dlg.message}</div>}
            <div className="adm-dialog-actions">
              <button type="button" className="adm-btn ghost" onClick={() => close(false)}>{dlg.cancel || 'Cancel'}</button>
              <button type="button" ref={okRef} className={'adm-btn ' + (dlg.danger ? 'danger' : 'primary')} onClick={() => close(true)}>{dlg.ok || 'OK'}</button>
            </div>
          </div>
        </div>
      )}
    </UiCtx.Provider>
  );
}

/**
 * GET an API path (with a small cache so going back shows data at once, then refreshes).
 * Sends the user to login when the session ended.
 * (Own version instead of lib/api useApi: that one stops updating under React StrictMode.)
 */
const loadCache = new Map<string, unknown>();
export function useLoad<T = any>(path: string | null) {
  const [data, setDataS] = useState<T | undefined>(() => (path ? (loadCache.get(path) as T) : undefined));
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!path && !loadCache.has(path));
  const cur = useRef(path);
  cur.current = path;
  const { fail } = useUi();
  const failRef = useRef(fail);
  failRef.current = fail;

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const d = await api<T>(path);
      loadCache.set(path, d);
      if (cur.current === path) { setDataS(d); setError(null); }
    } catch (e) {
      if (cur.current === path) setError(e instanceof ApiError ? e : new ApiError(0, (e as Error).message || 'Network error', null));
    } finally {
      if (cur.current === path) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setDataS(path ? (loadCache.get(path) as T) : undefined);
    reload();
  }, [path, reload]);

  useEffect(() => { if (error) failRef.current(error); }, [error]);

  const setData = useCallback((v: T) => {
    if (cur.current) loadCache.set(cur.current, v);
    setDataS(v);
  }, []);

  return { data, error, loading, reload, setData };
}

/** A link that warns about unsaved changes. */
export function GLink({ to, children, className, ...rest }: { to: string; children: ReactNode; className?: string; [k: string]: any }) {
  const { go } = useUi();
  return (
    <Link to={to} className={className} {...rest}
      onClick={(e: RMouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (hasDirty()) { e.preventDefault(); go(to); }
        rest.onClick?.(e);
      }}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ layout pieces */

export function PageHead({ title, intro, site, siteLabel, actions }: { title: string; intro?: ReactNode; site?: string; siteLabel?: string; actions?: ReactNode }) {
  return (
    <header className="adm-head">
      <div className="adm-head-text">
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      <div className="adm-head-actions">
        {site && (
          <a className="adm-btn ghost" href={site} target="_blank" rel="noreferrer">
            <Icon name="ext" /> {siteLabel || 'View on site'}
          </a>
        )}
        {actions}
      </div>
    </header>
  );
}

export function Card({ title, children, actions, className }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={'adm-card ' + (className || '')}>
      {(title || actions) && (
        <div className="adm-card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="adm-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Skeleton({ rows = 4, grid }: { rows?: number; grid?: boolean }) {
  return (
    <div className={grid ? 'adm-skel-grid' : 'adm-skel-list'} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="adm-skel" />)}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="adm-empty">
      <div className="adm-empty-ico"><Icon name="plus" size={26} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Badge({ tone = 'grey', children }: { tone?: string; children: ReactNode }) {
  return <span className={'adm-badge ' + tone}>{children}</span>;
}

export function ErrorBox({ error, retry }: { error: ApiError | null; retry: () => void }) {
  if (!error || error.status === 401) return null;
  return (
    <div className="adm-error-box" role="alert">
      <p>Could not load this page: {error.message}</p>
      <button type="button" className="adm-btn ghost" onClick={retry}>Try again</button>
    </div>
  );
}

/* ------------------------------------------------------------------ inputs */

export function Field({ label, hint, children, id }: { label: ReactNode; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="adm-field">
      <label className="adm-label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  );
}

export function TextIn({ label, value, onChange, hint, type = 'text', placeholder, required, dir, autoComplete, mono }: {
  label: ReactNode; value: string; onChange: (v: string) => void; hint?: ReactNode; type?: string; placeholder?: string;
  required?: boolean; dir?: 'rtl' | 'ltr'; autoComplete?: string; mono?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <input id={id} className={'adm-input' + (mono ? ' mono' : '')} type={type} value={value ?? ''} placeholder={placeholder} required={required}
        dir={dir} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SelectIn({ label, value, onChange, options, hint }: {
  label: ReactNode; value: string; onChange: (v: string) => void; options: [string, string][]; hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <select id={id} className="adm-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </Field>
  );
}

/** Two fields side by side: English | العربية. */
export function LInput({ label, value, onChange, textarea, rows = 3, hint, compact, placeholder }: {
  label: ReactNode; value: any; onChange: (v: L) => void; textarea?: boolean; rows?: number; hint?: ReactNode; compact?: boolean;
  placeholder?: L;
}) {
  const id = useId();
  const v = asL(value);
  const one = (k: 'en' | 'ar') => {
    const props = {
      id: id + k,
      className: 'adm-input' + (k === 'ar' ? ' ar' : ''),
      value: v[k],
      dir: k === 'ar' ? ('rtl' as const) : ('ltr' as const),
      lang: k,
      placeholder: placeholder?.[k],
      onChange: (e: { target: { value: string } }) => onChange({ ...v, [k]: e.target.value }),
    };
    return (
      <div className="adm-l-col">
        <label htmlFor={id + k} className="adm-l-lang" lang={k}>{k === 'en' ? 'English' : 'العربية'}</label>
        {textarea ? <textarea rows={rows} {...props} /> : <input type="text" {...props} />}
      </div>
    );
  };
  return (
    <fieldset className={'adm-l' + (compact ? ' compact' : '')}>
      {label !== '' && <legend className="adm-label">{label}</legend>}
      <div className="adm-l-row">{one('en')}{one('ar')}</div>
      {hint && <p className="adm-hint">{hint}</p>}
    </fieldset>
  );
}

export function Toggle({ checked, onChange, label, hideLabel, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hideLabel?: boolean; hint?: ReactNode }) {
  return (
    <div className={'adm-toggle-wrap' + (hideLabel ? ' bare' : '')}>
      <button type="button" role="switch" aria-checked={!!checked} className="adm-switch" onClick={() => onChange(!checked)}
        aria-label={hideLabel ? label : undefined}>
        <span className="adm-switch-track" aria-hidden="true"><span className="adm-switch-thumb" /></span>
        {!hideLabel && <span className="adm-switch-text">{label}</span>}
      </button>
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  );
}

/** Radio buttons styled as a segmented control. */
export function Segmented({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const name = useId();
  return (
    <fieldset className="adm-seg-wrap">
      <legend className="adm-label">{label}</legend>
      <div className="adm-seg">
        {options.map(([v, t]) => (
          <label key={v} className={value === v ? 'on' : ''}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            <span>{t}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const SWATCHES = ['#F68B1F', '#0E1B33', '#0B4A94', '#0F2C52', '#0E5E95', '#1B2A40', '#ffffff', '#F4F6FA'];
export function ColorIn({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const valid = /^#[0-9a-f]{6}$/i.test(value || '');
  return (
    <Field label={label} id={id}>
      <div className="adm-color">
        <input type="color" aria-label={label + ' picker'} value={valid ? value : '#000000'} onChange={(e) => onChange(e.target.value)} />
        <input id={id} className="adm-input mono" value={value || ''} maxLength={7} onChange={(e) => onChange(e.target.value)} placeholder="#0B4A94" />
      </div>
      <div className="adm-swatches">
        {SWATCHES.map((c) => (
          <button key={c} type="button" className={'adm-swatch' + (value?.toLowerCase() === c.toLowerCase() ? ' on' : '')} style={{ background: c }}
            aria-label={'Use colour ' + c} onClick={() => onChange(c)} />
        ))}
      </div>
    </Field>
  );
}

/** A list of bilingual lines (tags, bullet items, answer options) with add / remove / reorder. */
export function LListEditor({ label, items, onChange, addLabel = 'Add', itemName = 'Item', hint, empty }: {
  label: ReactNode; items: L[]; onChange: (v: L[]) => void; addLabel?: string; itemName?: string; hint?: ReactNode; empty?: string;
}) {
  const list = Array.isArray(items) ? items.map(asL) : [];
  const set = (i: number, v: L) => onChange(list.map((x, j) => (j === i ? v : x)));
  return (
    <fieldset className="adm-llist">
      <legend className="adm-label">{label}</legend>
      {hint && <p className="adm-hint">{hint}</p>}
      {list.length === 0 && <p className="adm-muted small">{empty || 'Nothing here yet.'}</p>}
      <ol>
        {list.map((it, i) => (
          <li key={i}>
            <span className="adm-llist-n" aria-hidden="true">{i + 1}</span>
            <div className="adm-llist-inputs">
              <input className="adm-input" aria-label={`${itemName} ${i + 1} in English`} value={it.en} onChange={(e) => set(i, { ...it, en: e.target.value })} placeholder="English" />
              <input className="adm-input ar" dir="rtl" lang="ar" aria-label={`${itemName} ${i + 1} in Arabic`} value={it.ar} onChange={(e) => set(i, { ...it, ar: e.target.value })} placeholder="العربية" />
            </div>
            <div className="adm-iconbtns">
              <button type="button" className="adm-icon-btn" aria-label={`Move ${itemName.toLowerCase()} ${i + 1} up`} disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))}><Icon name="up" size={16} /></button>
              <button type="button" className="adm-icon-btn" aria-label={`Move ${itemName.toLowerCase()} ${i + 1} down`} disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))}><Icon name="down" size={16} /></button>
              <button type="button" className="adm-icon-btn danger" aria-label={`Remove ${itemName.toLowerCase()} ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="adm-btn ghost small" onClick={() => onChange([...list, emptyL()])}><Icon name="plus" size={16} /> {addLabel}</button>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ media */

const IMG_TYPES = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif';
const VID_TYPES = 'video/mp4,video/webm,video/quicktime';
const OK_TYPE = /^(image\/(png|jpe?g|webp|gif|svg\+xml|avif)|video\/(mp4|webm|quicktime))$/;

export function Thumb({ url, poster, kind, alt = '', className, style }: { url?: string; poster?: string; kind?: string; alt?: string; className?: string; style?: CSSProperties }) {
  const vid = kind === 'video' || kind === 'reel' || isVideo(url || '');
  if (!url && !poster) {
    return <div className={'adm-thumb empty ' + (className || '')} style={style}><Icon name={vid ? 'film' : 'image'} size={22} /><span>No file yet</span></div>;
  }
  if (vid && url) {
    // With a picture: show just the picture. A list of 20 <video> tags keeps Chrome's few connections busy,
    // so a Save made right after waits in line (very slow on the local dev server).
    return (
      <div className={'adm-thumb ' + (className || '')} style={style}>
        {poster ? <img src={poster} alt={alt} loading="lazy" /> : <video src={url} muted playsInline preload="metadata" />}
        <span className="adm-thumb-play" aria-hidden="true"><Icon name="play" size={14} /></span>
      </div>
    );
  }
  return <div className={'adm-thumb ' + (className || '')} style={style}><img src={url || poster} alt={alt} loading="lazy" /></div>;
}

/**
 * Upload a picture or video: drag & drop or click, progress bar, preview, replace, remove, or paste a link.
 * Stores the public URL through onChange.
 */
export function MediaInput({ label, value, onChange, folder, accept = 'image', hint, bg = 'light', imgStyle, onKind }: {
  label: string; value: string; onChange: (url: string) => void; folder: string; accept?: 'image' | 'video' | 'any';
  hint?: ReactNode; bg?: 'light' | 'dark' | 'check'; imgStyle?: CSSProperties; onKind?: (k: 'image' | 'video') => void;
}) {
  const { toast, fail } = useUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<'compress' | 'upload'>('upload');
  const [drag, setDrag] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const labelId = useId();
  const types = accept === 'image' ? IMG_TYPES : accept === 'video' ? VID_TYPES : IMG_TYPES + ',' + VID_TYPES;
  const what = accept === 'image' ? 'a picture (JPG, PNG, WebP, SVG)' : accept === 'video' ? 'a video (MP4, WebM, MOV)' : 'a picture or a video';

  async function take(file?: File | null) {
    if (!file) return;
    const okKind = accept === 'any' || file.type.startsWith(accept + '/');
    if (!OK_TYPE.test(file.type) || !okKind) { toast(`This file type is not allowed here. Please choose ${what}.`, 'error'); return; }
    setProgress(0);
    try {
      let up = file;
      let note = '';
      if (file.type.startsWith('image/')) {
        const c = await compressImage(file); // smaller file, same look
        up = c.file;
        if (c.changed) note = ` Made smaller: ${fmtSize(c.before)} → ${fmtSize(c.after)}.`;
      } else if (file.type.startsWith('video/')) {
        const { compressVideo, VIDEO_MAX } = await import('../lib/compressVideo'); // big library, loaded only here
        if (file.size > VIDEO_MAX) { toast(`This video is ${fmtSize(file.size)}. Please make it smaller than ${fmtSize(VIDEO_MAX)} first.`, 'error'); return; }
        setPhase('compress');
        const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', stop);
        try {
          const c = await compressVideo(file, (p) => setProgress(p));
          up = c.file;
          if (c.changed) note = ` Made smaller: ${fmtSize(c.before)} → ${fmtSize(c.after)}.`;
        } finally {
          window.removeEventListener('beforeunload', stop);
        }
        setPhase('upload');
        setProgress(0);
      }
      const r = await uploadFile(up, { path: '/admin/upload-url', body: { folder, filename: up.name, contentType: up.type } }, (p) => setProgress(p));
      onChange(r.publicUrl || '');
      onKind?.(file.type.startsWith('video/') ? 'video' : 'image');
      toast('File uploaded. Remember to save.' + note);
    } catch (e) {
      fail(e);
    } finally {
      setProgress(null);
      setPhase('upload');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const vid = accept === 'video' || (accept === 'any' && isVideo(value));
  const dropProps = {
    onDragOver: (e: RDragEvent) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDrag(true); } },
    onDragLeave: () => setDrag(false),
    onDrop: (e: RDragEvent) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setDrag(false); take(e.dataTransfer.files[0]); },
  };

  return (
    <div className="adm-field adm-media-field" role="group" aria-labelledby={labelId}>
      <span className="adm-label" id={labelId}>{label}</span>
      {value ? (
        <div className={'adm-media bg-' + bg + (drag ? ' drag' : '')} {...dropProps}>
          <div className="adm-media-preview">
            {vid ? <video src={value} muted controls playsInline preload="metadata" /> : <img src={value} alt="" style={imgStyle} />}
          </div>
          <div className="adm-media-bar">
            <span className="adm-media-name" title={value}>{value.split('/').pop()}</span>
            <button type="button" className="adm-btn ghost small" onClick={() => fileRef.current?.click()} disabled={progress != null}><Icon name="upload" size={15} /> Replace</button>
            <button type="button" className="adm-btn ghost small danger-text" onClick={() => onChange('')} disabled={progress != null}><Icon name="trash" size={15} /> Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" className={'adm-drop' + (drag ? ' drag' : '')} onClick={() => fileRef.current?.click()} disabled={progress != null} {...dropProps}>
          <Icon name="upload" size={22} />
          <span><b>Drag a file here</b> or <u>choose one</u></span>
          <small>{what[0].toUpperCase() + what.slice(1)}</small>
        </button>
      )}
      {progress != null && (
        <div className="adm-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={phase === 'compress' ? 'Making the video smaller' : 'Uploading'}>
          <span style={{ width: Math.max(4, progress * 100) + '%' }} />
          <em>{phase === 'compress' ? 'Making the video smaller (keep this page open)…' : 'Uploading…'} {Math.round(progress * 100)}%</em>
        </div>
      )}
      <input ref={fileRef} type="file" accept={types} hidden onChange={(e) => take(e.target.files?.[0])} />
      <div className="adm-media-url">
        {showUrl ? (
          <div className="adm-inline">
            <input className="adm-input" type="url" placeholder="https://…" aria-label={label + ' link'} value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} />
            <button type="button" className="adm-btn ghost small" onClick={() => { onChange(urlDraft.trim()); setShowUrl(false); }} disabled={!urlDraft.trim()}>Use link</button>
            <button type="button" className="adm-btn ghost small" onClick={() => setShowUrl(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="adm-linkbtn" onClick={() => { setUrlDraft(value || ''); setShowUrl(true); }}><Icon name="link" size={14} /> Or paste a link</button>
        )}
      </div>
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ sortable list */

/**
 * Reorder by drag and drop (grab the dotted handle) or with the up/down buttons.
 * `render` draws the item itself; the list adds the handle and buttons.
 */
export function SortList<T extends { id: number }>({ items, onMove, render, grid, disabled, noun = 'item', labelOf }: {
  items: T[]; onMove: (next: T[]) => void; render: (item: T, i: number) => ReactNode; grid?: boolean; disabled?: boolean;
  noun?: string; labelOf?: (item: T) => string;
}) {
  const [armed, setArmed] = useState<number | null>(null);
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const end = () => { setFrom(null); setOver(null); setArmed(null); };
  const name = (it: T, i: number) => (labelOf ? labelOf(it) : `${noun} ${i + 1}`);
  return (
    <ul className={'adm-sort' + (grid ? ' grid' : '')}>
      {items.map((it, i) => (
        <li key={it.id}
          className={'adm-sort-item' + (from === i ? ' dragging' : '') + (over === i && from !== null && from !== i ? ' over' : '')}
          draggable={!disabled && armed === i}
          onDragStart={(e) => { setFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
          onDragOver={(e) => { if (from === null) return; e.preventDefault(); if (over !== i) setOver(i); }}
          onDrop={(e) => { e.preventDefault(); if (from !== null && from !== i) onMove(move(items, from, i)); end(); }}
          onDragEnd={end}>
          {!disabled && (
            <div className="adm-sort-ctl">
              <span className="adm-grip" title="Drag to change the order" onPointerDown={() => setArmed(i)} onPointerUp={() => setArmed(null)}>
                <Icon name="grip" size={16} />
              </span>
              <button type="button" className="adm-icon-btn" aria-label={`Move ${name(it, i)} up`} disabled={i === 0} onClick={() => onMove(move(items, i, i - 1))}><Icon name={grid ? 'left' : 'up'} size={16} /></button>
              <button type="button" className="adm-icon-btn" aria-label={`Move ${name(it, i)} down`} disabled={i === items.length - 1} onClick={() => onMove(move(items, i, i + 1))}><Icon name={grid ? 'right' : 'down'} size={16} /></button>
            </div>
          )}
          {render(it, i)}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ side panel */

export function Drawer({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, textarea, select, button:not(.adm-drawer-x)');
    first?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; prev?.focus?.(); };
  }, []);
  return (
    <div className="adm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={'adm-drawer' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
        <div className="adm-drawer-head">
          <h2>{title}</h2>
          <button type="button" className="adm-icon-btn adm-drawer-x" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="adm-drawer-body">{children}</div>
        {footer && <div className="adm-drawer-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Bottom bar with the Save button for full-page editors. */
export function SaveBar({ dirty, saving, onSave, onReset, label = 'Save changes' }: { dirty: boolean; saving: boolean; onSave: () => void; onReset?: () => void; label?: string }) {
  return (
    <div className={'adm-savebar' + (dirty ? ' dirty' : '')}>
      <span className="adm-savebar-msg">{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
      {onReset && dirty && <button type="button" className="adm-btn ghost" onClick={onReset} disabled={saving}>Undo changes</button>}
      <button type="button" className="adm-btn primary" onClick={onSave} disabled={saving || !dirty}>{saving ? 'Saving…' : label}</button>
    </div>
  );
}

/** Small state helper for a form that edits a copy of some data. */
export function useDraft<T>(initial: T | undefined) {
  const [orig, setOrig] = useState<T | undefined>(initial);
  const [draft, setDraft] = useState<T | undefined>(initial);
  const dirty = draft !== undefined && orig !== undefined && !same(draft, orig);
  const reset = (v: T) => { setOrig(clone(v)); setDraft(clone(v)); };
  return { draft, setDraft, orig, dirty, reset, patch: (p: Partial<T>) => setDraft((d) => ({ ...(d as T), ...p })) };
}
