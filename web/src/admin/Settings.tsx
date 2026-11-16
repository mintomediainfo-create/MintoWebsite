// Contact & social links, newsletter subscribers, my account and admins.
import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { useSetting } from './Content';
import { useShell } from './shell';
import { Any, Card, Empty, ErrorBox, Icon, LInput, PageHead, Skeleton, TextIn, fmtDate, useLoad, useUi } from './ui';

/* ------------------------------------------------------------------ contact & social */

const SOCIAL: [string, string, string][] = [
  ['facebook', 'Facebook', 'https://facebook.com/…'], ['instagram', 'Instagram', 'https://instagram.com/…'], ['linkedin', 'LinkedIn', 'https://linkedin.com/company/…'],
  ['tiktok', 'TikTok', 'https://tiktok.com/@…'], ['youtube', 'YouTube', 'https://youtube.com/@…'], ['x', 'X (Twitter)', 'https://x.com/…'], ['behance', 'Behance', 'https://behance.net/…'],
];

export function ContactSocial() {
  const c = useSetting<Any>('contact');
  const s = useSetting<Any>('social');
  return (
    <div className="adm-page">
      <PageHead title="Contact & social" intro="Your contact details and social links. They show in the contact part and the footer of every page." site="/#contact" />
      <ErrorBox error={c.error} retry={c.reload} />
      {!c.draft || !s.draft ? <Skeleton rows={5} /> : (
        <>
          <Card title="Contact details">
            <form className="adm-form" onSubmit={(e) => { e.preventDefault(); c.save(); }}>
              <div className="adm-two">
                <TextIn label="Email" type="email" value={c.draft.email || ''} onChange={(v) => c.patch({ email: v })} placeholder="contact@…" />
                <TextIn label="Careers email" type="email" value={c.draft.careersEmail || ''} onChange={(v) => c.patch({ careersEmail: v })} placeholder="careers@…" hint="Shown on the Careers page for people who prefer to send their CV by email." />
                <TextIn label="Phone (Egypt)" type="tel" value={c.draft.phone || ''} onChange={(v) => c.patch({ phone: v })} placeholder="+20 …" />
                <TextIn label="Phone (UAE)" type="tel" value={c.draft.phoneUae || ''} onChange={(v) => c.patch({ phoneUae: v })} placeholder="+971 …" hint="Leave empty to hide it." />
                <TextIn label="WhatsApp (Egypt)" type="tel" value={c.draft.whatsapp || ''} onChange={(v) => c.patch({ whatsapp: v })} placeholder="+20 1…" hint="With the country code. Leave empty to hide it." />
                <TextIn label="WhatsApp (UAE)" type="tel" value={c.draft.whatsappUae || ''} onChange={(v) => c.patch({ whatsappUae: v })} placeholder="+971 5…" hint="With the country code. Leave empty to hide it." />
                <TextIn label="Google Maps link (Egypt)" type="url" value={c.draft.mapUrl || ''} onChange={(v) => c.patch({ mapUrl: v })} placeholder="https://maps.google.com/…" hint="Open your place on Google Maps, press Share and copy the link." />
              </div>
              <LInput label="Address (Egypt)" textarea rows={2} value={c.draft.address} onChange={(v) => c.patch({ address: v })} />
              <LInput label="Address (UAE)" textarea rows={2} value={c.draft.addressUae || { en: '', ar: '' }} onChange={(v) => c.patch({ addressUae: v })} />
              <div className="adm-two">
                <TextIn label="Google Maps link (UAE)" type="url" value={c.draft.mapUrlUae || ''} onChange={(v) => c.patch({ mapUrlUae: v })} placeholder="https://maps.google.com/…" hint="Leave both UAE boxes empty to hide the UAE branch." />
              </div>
              <div className="adm-form-actions">
                {c.dirty && <span className="adm-unsaved">Unsaved changes</span>}
                <button type="submit" className="adm-btn primary" disabled={!c.dirty || c.saving}>{c.saving ? 'Saving…' : 'Save contact details'}</button>
              </div>
            </form>
          </Card>
          <Card title="Social media links">
            <form className="adm-form" onSubmit={(e) => { e.preventDefault(); s.save(); }}>
              <p className="adm-hint">Paste the full link to each page. Leave a box empty to hide that icon.</p>
              <div className="adm-two">
                {SOCIAL.map(([k, label, ph]) => (
                  <TextIn key={k} label={label} type="url" value={s.draft![k] === '#' ? '' : s.draft![k] || ''} onChange={(v) => s.patch({ [k]: v })} placeholder={ph} />
                ))}
              </div>
              <div className="adm-form-actions">
                {s.dirty && <span className="adm-unsaved">Unsaved changes</span>}
                <button type="submit" className="adm-btn primary" disabled={!s.dirty || s.saving}>{s.saving ? 'Saving…' : 'Save social links'}</button>
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ subscribers */

export function Subscribers() {
  const { data, error, loading, reload } = useLoad<{ email: string; created_at: string }[]>('/admin/subscribers');
  const [search, setSearch] = useState('');
  const rows = (data || []).filter((r) => !search || r.email.toLowerCase().includes(search.toLowerCase()));

  function download() {
    const esc = (v: string) => '"' + String(v).replace(/"/g, '""') + '"';
    const csv = 'email,joined\n' + (data || []).map((r) => [esc(r.email), esc(new Date(r.created_at).toISOString().slice(0, 10))].join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `minto-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="adm-page">
      <PageHead title="Newsletter subscribers" intro="Emails of people who joined the newsletter from the site."
        actions={<button type="button" className="adm-btn primary" onClick={download} disabled={!data?.length}><Icon name="download" /> Download as Excel/CSV</button>} />
      <ErrorBox error={error} retry={reload} />
      {loading && !data ? <Skeleton rows={4} /> : !data?.length ? (
        <Empty title="No subscribers yet" text="When someone joins the newsletter, their email shows here." />
      ) : (
        <>
          <div className="adm-toolbar">
            <label className="adm-tool grow"><span>Search</span><input className="adm-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Email" /></label>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th scope="col">Email</th><th scope="col">Joined</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.email}><td><a href={'mailto:' + r.email}>{r.email}</a></td><td className="adm-nowrap">{fmtDate(r.created_at)}</td></tr>)}</tbody>
            </table>
            <p className="adm-muted small">{data.length} subscriber{data.length === 1 ? '' : 's'}</p>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ account & admins */

export function AccountSettings() {
  const { me, setMe } = useShell();
  const { toast, fail, confirm } = useUi();
  const admins = useLoad<Any[]>('/admin/admins');
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({ name: '', email: '', password: '' });
  const [adding, setAdding] = useState(false);

  async function saveAccount(e: FormEvent) {
    e.preventDefault();
    if (pw && pw.length < 8) { toast('The new password needs 8 or more characters.', 'error'); return; }
    if (pw !== pw2) { toast('The two new passwords are not the same.', 'error'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast('Please type a valid email address.', 'error'); return; }
    if (!cur) { toast('Please type your current password to confirm.', 'error'); return; }
    setBusy(true);
    try {
      const r = await api<{ email: string }>('/admin/account', { method: 'PUT', body: { name, email: email.trim(), currentPassword: cur, ...(pw ? { newPassword: pw } : {}) } });
      setMe({ ...me, name, email: r.email });
      setEmail(r.email);
      setCur(''); setPw(''); setPw2('');
      toast(pw ? 'Your account is saved and your password changed.' : 'Your account is saved.');
      admins.reload();
    } catch (err) { fail(err); } finally { setBusy(false); }
  }

  async function addAdmin(e: FormEvent) {
    e.preventDefault();
    if (add.password.length < 8) { toast('The password needs 8 or more characters.', 'error'); return; }
    setAdding(true);
    try {
      await api('/admin/admins', { body: add });
      toast(`${add.email} can now log in.`);
      setAdd({ name: '', email: '', password: '' });
      admins.reload();
    } catch (err) { fail(err); } finally { setAdding(false); }
  }

  async function removeAdmin(a: Any) {
    if (!(await confirm({ title: 'Remove this admin?', message: `${a.name || a.email} will not be able to log in any more.`, ok: 'Remove', danger: true }))) return;
    try { await api('/admin/admins/' + a.id, { method: 'DELETE' }); toast('Admin removed.'); admins.reload(); } catch (err) { fail(err); }
  }

  return (
    <div className="adm-page">
      <PageHead title="Settings" intro="Your account and the people who can use this dashboard." />
      <div className="adm-two top">
        <Card title="My account">
          <form className="adm-form" onSubmit={saveAccount}>
            <TextIn label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" hint="Use a real inbox: if you forget your password, the reset link is sent here. You log in with this email." />
            <TextIn label="Your name" value={name} onChange={setName} autoComplete="name" />
            <TextIn label="New password (optional)" type="password" value={pw} onChange={setPw} autoComplete="new-password" hint="8 or more characters. Leave empty to keep your password." />
            {pw && <TextIn label="Type the new password again" type="password" value={pw2} onChange={setPw2} autoComplete="new-password" />}
            <TextIn label="Current password" type="password" value={cur} onChange={setCur} autoComplete="current-password" hint="Needed to save any change here." />
            <div className="adm-form-actions"><button type="submit" className="adm-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save my account'}</button></div>
          </form>
        </Card>
        <Card title="Admins">
          <p className="adm-hint">Everyone here can log in and change the whole site.</p>
          {admins.loading && !admins.data ? <Skeleton rows={2} /> : (
            <ul className="adm-people">
              {(admins.data || []).map((a) => (
                <li key={a.id}>
                  <span className="adm-avatar">{(a.name || a.email).slice(0, 1).toUpperCase()}</span>
                  <div><b>{a.name || '—'}</b>{a.id === me.id && <span className="adm-muted"> (you)</span>}<div className="adm-muted small">{a.email} · since {fmtDate(a.created_at)}</div></div>
                  {a.id !== me.id && <button type="button" className="adm-icon-btn danger" aria-label={'Remove ' + a.email} onClick={() => removeAdmin(a)}><Icon name="trash" /></button>}
                </li>
              ))}
            </ul>
          )}
          <form className="adm-form adm-subform" onSubmit={addAdmin}>
            <h3>Add an admin</h3>
            <TextIn label="Name" value={add.name} onChange={(v) => setAdd({ ...add, name: v })} />
            <TextIn label="Email" type="email" required value={add.email} onChange={(v) => setAdd({ ...add, email: v })} autoComplete="off" />
            <TextIn label="Password" type="password" required value={add.password} onChange={(v) => setAdd({ ...add, password: v })} autoComplete="new-password" hint="8 or more characters. Share it with them privately; they can change it later." />
            <div className="adm-form-actions"><button type="submit" className="adm-btn primary" disabled={adding}><Icon name="plus" /> {adding ? 'Adding…' : 'Add admin'}</button></div>
          </form>
        </Card>
      </div>
    </div>
  );
}

