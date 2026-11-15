// "Send your CV" for people with no open role: details + CV upload. Shows in the dashboard under Applications (no role).
import { DragEvent, FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { InnerHeader, SiteShell } from './Shell';
import { usePrefs } from '../lib/prefs';
import { ApiError, api, uploadFile } from '../lib/api';
import '../styles/pages.css';

const PG = {
  en: {
    h1a: 'Send us', h1b: 'your CV',
    intro: 'No open role fits you yet? Tell us about yourself and attach your CV. We keep it and reach out when something fits.',
    name: 'Full name', email: 'Email', phone: 'Phone number', city: 'City (optional)', role: 'Role you are interested in (optional)',
    portfolio: 'Portfolio link (optional)', linkedin: 'LinkedIn (optional)',
    cv: 'CV / Resume', drag: 'Drag your CV here or', choose: 'choose a file', types: 'PDF, DOC or DOCX · max 5 MB',
    uploading: 'Uploading…', ready: 'Ready to send', remove: 'Remove',
    consent: 'I agree that Minto Media can keep my data to review my CV.', send: 'Send CV', sending: 'Sending…',
    fix: 'Please fix the highlighted fields.', typeErr: 'Please upload a PDF, DOC or DOCX file.', sizeErr: 'This file is bigger than 5 MB.',
    upErr: 'The upload did not finish. Please try again.', wait: 'Please wait until your CV finishes uploading.', err: 'Something went wrong. Please try again.',
    ok: 'Thank you! We got your CV and will be in touch when a role fits.', roles: 'See open roles', again: 'Send another CV',
  },
  ar: {
    h1a: 'أرسل لنا', h1b: 'سيرتك الذاتية',
    intro: 'لا توجد وظيفة مناسبة لك بعد؟ عرّفنا بنفسك وأرفق سيرتك الذاتية. سنحتفظ بها ونتواصل معك عندما تتوفر فرصة مناسبة.',
    name: 'الاسم بالكامل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', city: 'المدينة (اختياري)', role: 'الوظيفة التي تهتم بها (اختياري)',
    portfolio: 'رابط أعمالك (اختياري)', linkedin: 'LinkedIn (اختياري)',
    cv: 'السيرة الذاتية', drag: 'اسحب سيرتك الذاتية هنا أو', choose: 'اختر ملفًا', types: 'PDF أو DOC أو DOCX · الحد الأقصى 5 ميجابايت',
    uploading: 'جارٍ الرفع…', ready: 'جاهز للإرسال', remove: 'حذف',
    consent: 'أوافق على أن تحتفظ منتو ميديا ببياناتي لمراجعة سيرتي الذاتية.', send: 'أرسل السيرة الذاتية', sending: 'جارٍ الإرسال…',
    fix: 'من فضلك صحّح الخانات المحددة.', typeErr: 'من فضلك ارفع ملف PDF أو DOC أو DOCX.', sizeErr: 'حجم الملف أكبر من 5 ميجابايت.',
    upErr: 'لم يكتمل رفع الملف. حاول مرة أخرى.', wait: 'من فضلك انتظر حتى يكتمل رفع سيرتك الذاتية.', err: 'حدث خطأ. حاول مرة أخرى.',
    ok: 'شكرًا لك! وصلتنا سيرتك الذاتية وسنتواصل معك عندما تتوفر وظيفة مناسبة.', roles: 'الوظائف المتاحة', again: 'إرسال سيرة ذاتية أخرى',
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = 5 * 1024 * 1024;
type Cv = { name: string; size: number; progress: number; key?: string };
const empty = { name: '', email: '', phone: '', city: '', role: '', portfolio: '', linkedin: '' };

export default function SendCvPage() {
  const { lang } = usePrefs();
  const p = PG[lang];
  const [f, setF] = useState(empty);
  const [consent, setConsent] = useState(false);
  const [cv, setCv] = useState<Cv | null>(null);
  const [drag, setDrag] = useState(false);
  const [bad, setBad] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const seq = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function pick(file: File | undefined | null) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'doc', 'docx'].includes(ext)) { setMsg(p.typeErr); return; }
    if (file.size > MAX) { setMsg(p.sizeErr); return; }
    setMsg('');
    const id = ++seq.current;
    setCv({ name: file.name, size: file.size, progress: 0 });
    try {
      const r = await uploadFile(file, { path: '/apply/upload-url', body: { filename: file.name, size: file.size } }, (pr) => {
        if (id === seq.current) setCv((c) => (c ? { ...c, progress: pr } : c));
      });
      if (id === seq.current) setCv((c) => (c ? { ...c, progress: 1, key: r.key } : c));
    } catch {
      if (id === seq.current) { setCv(null); setMsg(p.upErr); }
    }
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const missing: string[] = [];
    if (f.name.trim().length < 3) missing.push('name');
    if (!EMAIL_RE.test(f.email.trim())) missing.push('email');
    if (f.phone.replace(/\D/g, '').length < 6) missing.push('phone');
    if (!cv) missing.push('cv');
    if (!consent) missing.push('consent');
    setBad(missing);
    if (missing.length) { setMsg(p.fix); return; }
    if (!cv?.key) { setMsg(p.wait); return; }
    setBusy(true); setMsg('');
    try {
      await api('/apply/general', {
        body: {
          fullName: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), city: f.city.trim(),
          portfolio: f.portfolio.trim(), linkedin: f.linkedin.trim(), answers: { role: f.role.trim() },
          cvKey: cv.key, cvName: cv.name, consent: true, lang,
        },
      });
      setDone(true); setF(empty); setCv(null); setConsent(false);
    } catch (e2) {
      setMsg(e2 instanceof ApiError && e2.status === 400 ? p.fix : p.err);
    } finally { setBusy(false); }
  }

  const kb = (n: number) => (n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const inv = (k: string) => (bad.includes(k) ? true : undefined);

  return (
    <SiteShell header={<InnerHeader current="careers" />}>
      <section id="main" style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-hero" style={{ paddingTop: 120, paddingBottom: 56, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <h1 className="mm-h1 cr-h1" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 150, lineHeight: 0.9, textTransform: 'uppercase' }}>
            <span className="ln"><span>{p.h1a}</span></span>
            <span className="ln"><span style={{ transitionDelay: '.12s', color: '#F68B1F' }}>{p.h1b}</span></span>
          </h1>
          <p className="rv rv-left" style={{ margin: 0, maxWidth: 620, fontSize: 21, lineHeight: 1.55, color: 'var(--muted)' }}>{p.intro}</p>
        </div>
      </section>
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-sec" style={{ paddingTop: 24, paddingBottom: 140 }}>
          {done ? (
            <div className="mm-cf mm-cf-ok" role="status">
              <p>{p.ok}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link to="/careers" className="mm-btn" style={{ padding: '16px 28px' }}>{p.roles}</Link>
                <button type="button" className="mm-cf-btn ghost" onClick={() => setDone(false)}>{p.again}</button>
              </div>
            </div>
          ) : (
            <form className="mm-cf" onSubmit={submit} noValidate>
              <div className="mm-cf-grid">
                <label className="mm-cf-f"><span>{p.name}</span><input className="mm-cf-in" value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} aria-invalid={inv('name')} /></label>
                <label className="mm-cf-f"><span>{p.email}</span><input className="mm-cf-in mm-ltr" type="email" value={f.email} onChange={set('email')} autoComplete="email" maxLength={160} aria-invalid={inv('email')} /></label>
                <label className="mm-cf-f"><span>{p.phone}</span><input className="mm-cf-in mm-ltr" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" maxLength={30} aria-invalid={inv('phone')} /></label>
                <label className="mm-cf-f"><span>{p.city}</span><input className="mm-cf-in" value={f.city} onChange={set('city')} autoComplete="address-level2" maxLength={80} /></label>
                <label className="mm-cf-f"><span>{p.role}</span><input className="mm-cf-in" value={f.role} onChange={set('role')} maxLength={200} /></label>
                <label className="mm-cf-f"><span>{p.portfolio}</span><input className="mm-cf-in mm-ltr" value={f.portfolio} onChange={set('portfolio')} maxLength={400} /></label>
                <label className="mm-cf-f"><span>{p.linkedin}</span><input className="mm-cf-in mm-ltr" value={f.linkedin} onChange={set('linkedin')} maxLength={400} /></label>
              </div>

              <div className="mm-cf-f">
                <span>{p.cv}</span>
                <div className={'mm-cv-drop' + (drag ? ' drag' : '')} aria-invalid={inv('cv')}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
                  <input ref={input} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
                  {cv ? (
                    <div className="mm-cv-file">
                      <b dir="auto">{cv.name}</b>
                      <span>{kb(cv.size)} · {cv.key ? p.ready : p.uploading + ' ' + Math.round(cv.progress * 100) + '%'}</span>
                      <button type="button" className="mm-cf-btn ghost" onClick={() => { seq.current++; setCv(null); }}>{p.remove}</button>
                    </div>
                  ) : (
                    <p>{p.drag} <button type="button" className="mm-cv-pick" onClick={() => input.current?.click()}>{p.choose}</button><br /><small>{p.types}</small></p>
                  )}
                </div>
              </div>

              <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 15, color: bad.includes('consent') ? 'var(--errfg)' : 'var(--muted)' }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4, accentColor: '#F68B1F' }} />
                <span>{p.consent}</span>
              </label>
              {msg && <p className="mm-cf-err" role="alert">{msg}</p>}
              <button type="submit" className="mm-cf-btn" disabled={busy}>{busy ? p.sending : p.send}</button>
            </form>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
