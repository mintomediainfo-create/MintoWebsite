// "Let's talk" form: only the name and phone number are required (the team calls back); the rest is optional.
// It shows in the dashboard under Inquiries.
import { FormEvent, useState } from 'react';
import { ApiError, api, useApi } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import { useT } from './Shell';

export function ContactForm() {
  const t = useT();
  const { L, lang } = usePrefs();
  const services: any[] = useApi<any>('/site').data?.services || [];
  const [f, setF] = useState({ fullName: '', jobTitle: '', email: '', phone: '', company: '', message: '', website: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [bad, setBad] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'busy' | 'ok'>('idle');
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (name: string) => setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const missing: string[] = [];
    if (f.fullName.trim().length < 2) missing.push('fullName');
    if (f.phone.replace(/\D/g, '').length < 7) missing.push('phone');
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) missing.push('email'); // optional, but must look right if given
    setBad(missing);
    if (missing.includes('fullName') || missing.includes('phone')) setErr(t.cfReq); // banner is only for name/phone
    if (missing.length) return;
    setState('busy');
    try {
      await api('/contact', { body: { ...f, services: picked, lang } });
      setState('ok');
      setF({ fullName: '', jobTitle: '', email: '', phone: '', company: '', message: '', website: '' });
      setPicked([]);
    } catch (e2) {
      setState('idle');
      setErr(e2 instanceof ApiError && e2.status === 429 ? t.cfRate : t.cfErr);
    }
  }

  if (state === 'ok') {
    return (
      <div className="mm-cf mm-cf-ok" role="status">
        <p>{t.cfOk}</p>
        <button type="button" className="mm-cf-btn ghost" onClick={() => setState('idle')}>{t.cfAgain}</button>
      </div>
    );
  }

  return (
    <form className="mm-cf" onSubmit={submit} noValidate>
      <div className="mm-cf-grid">
        <label className="mm-cf-f"><span>{t.cfName} <b aria-hidden="true">*</b></span>
          <input className="mm-cf-in" value={f.fullName} onChange={set('fullName')} autoComplete="name" maxLength={120} required aria-invalid={bad.includes('fullName') || undefined} /></label>
        <label className="mm-cf-f"><span>{t.cfPhone} <b aria-hidden="true">*</b></span>
          <input className="mm-cf-in mm-ltr" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" maxLength={30} required aria-invalid={bad.includes('phone') || undefined} /></label>
        <label className="mm-cf-f"><span>{t.cfJob}</span>
          <input className="mm-cf-in" value={f.jobTitle} onChange={set('jobTitle')} autoComplete="organization-title" maxLength={120} /></label>
        <label className="mm-cf-f"><span>{t.cfEmail}</span>
          <input className="mm-cf-in mm-ltr" type="email" value={f.email} onChange={(e) => { set('email')(e); setBad((b) => b.filter((x) => x !== 'email')); }} autoComplete="email" maxLength={160} aria-invalid={bad.includes('email') || undefined} aria-describedby={bad.includes('email') ? 'mm-cf-email-err' : undefined} />
          {bad.includes('email') && <small id="mm-cf-email-err" className="mm-cf-fe" role="alert">{t.cfEmailBad}</small>}</label>
        <label className="mm-cf-f"><span>{t.cfCompany}</span>
          <input className="mm-cf-in" value={f.company} onChange={set('company')} autoComplete="organization" maxLength={120} /></label>
      </div>
      <fieldset className="mm-cf-svc">
          <legend>{t.cfServices}</legend>
          <div>
            {/* "Free consultation" first, then the services from the dashboard */}
            {[{ id: 'free', title: t.cfFreeConsult }, ...services].map((s) => {
              const name = L(s.title) as string;
              const on = picked.includes(name);
              return <button key={s.id} type="button" className={'mm-cf-chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => toggle(name)}>{name}</button>;
            })}
          </div>
      </fieldset>
      <label className="mm-cf-f"><span>{t.cfMessage}</span>
        <textarea className="mm-cf-in" rows={5} value={f.message} onChange={set('message')} placeholder={t.cfMessagePh} maxLength={4000} /></label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} className="mm-cf-hp" />
      {err && <p className="mm-cf-err" role="alert">{err}</p>}
      <button type="submit" className="mm-cf-btn" disabled={state === 'busy'}>{state === 'busy' ? t.cfSending : t.cfSend}</button>
    </form>
  );
}
