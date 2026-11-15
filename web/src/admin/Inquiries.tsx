// Messages from the website's "Let's talk" form: filterable table and the detail view.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useShell } from './shell';
import { Any, Badge, Card, Empty, ErrorBox, GLink, Icon, PageHead, Skeleton, fmtDate, useDirty, useLoad, useUi } from './ui';

export const INQ_STATUS: [string, string][] = [['new', 'New'], ['contacted', 'Contacted'], ['won', 'Became a client'], ['closed', 'Closed']];
const INQ_TONE: Record<string, string> = { new: 'orange', contacted: 'blue', won: 'green', closed: 'grey' };
const inqName = (s: string) => INQ_STATUS.find((x) => x[0] === s)?.[1] || s;
const InqBadge = ({ s }: { s: string }) => <Badge tone={INQ_TONE[s]}>{inqName(s)}</Badge>;
const svcList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function InquiriesList() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const [search, setSearch] = useState('');
  const { data, error, loading, reload } = useLoad<Any[]>(`/admin/inquiries?status=${status}`);
  const navigate = useNavigate();
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data || []).filter((a) => !s || [a.full_name, a.email, a.phone, a.company, a.message].some((x) => String(x || '').toLowerCase().includes(s)));
  }, [data, search]);

  return (
    <div className="adm-page">
      <PageHead title="Inquiries" intro="Messages people send from the “Let's talk” form on the website: their idea and the services they need." />
      <div className="adm-toolbar">
        <label className="adm-tool">
          <span>Status</span>
          <select className="adm-input" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            {INQ_STATUS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </label>
        <label className="adm-tool grow">
          <span>Search</span>
          <input className="adm-input" type="search" placeholder="Name, phone, email, company or message" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <ErrorBox error={error} retry={reload} />
      {loading && !data ? <Skeleton rows={5} /> : rows.length === 0 ? (
        <Empty title={data && data.length ? 'No matches' : 'No messages yet'}
          text={data && data.length ? 'Try another filter or search.' : 'When a visitor sends the contact form, it will show here.'}
          action={status || search ? <button type="button" className="adm-btn ghost" onClick={() => { setSearch(''); setSp(new URLSearchParams(), { replace: true }); }}>Clear filters</button> : undefined} />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th scope="col">From</th><th scope="col">Needs</th><th scope="col" className="hide-sm">Contact</th><th scope="col">Status</th><th scope="col" className="hide-sm">Date</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={a.status === 'new' ? 'is-new' : ''} onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) navigate('/admin/inquiries/' + a.id); }}>
                  <td><GLink to={'/admin/inquiries/' + a.id} className="adm-strong-link">{a.full_name}</GLink>{(a.job_title || a.company) && <div className="adm-muted small">{[a.job_title, a.company].filter(Boolean).join(' · ')}</div>}</td>
                  <td>{svcList(a.services).join(', ') || <span className="adm-muted">—</span>}</td>
                  <td className="hide-sm"><div>{a.phone || a.email}</div>{a.phone && a.email && <div className="adm-muted small">{a.email}</div>}</td>
                  <td><InqBadge s={a.status} /></td>
                  <td className="hide-sm adm-nowrap">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="adm-muted small">{rows.length} message{rows.length === 1 ? '' : 's'}</p>
        </div>
      )}
    </div>
  );
}

export function InquiryView() {
  const { id } = useParams();
  const { data, error, loading, reload, setData } = useLoad<Any>('/admin/inquiries/' + id);
  const { toast, fail, confirm } = useUi();
  const { refreshSummary } = useShell();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setNotes(data.notes || ''); }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const notesDirty = !!data && notes !== (data.notes || '');
  useDirty(notesDirty);

  async function patch(body: Any, msg: string) {
    setBusy(true);
    try {
      const row = await api<Any>('/admin/inquiries/' + id, { method: 'PATCH', body });
      setData({ ...data, ...row });
      toast(msg);
      refreshSummary();
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function remove() {
    if (!(await confirm({ title: 'Delete this message?', message: `The message from ${data?.full_name} will be deleted for good.`, ok: 'Delete', danger: true }))) return;
    try {
      await api('/admin/inquiries/' + id, { method: 'DELETE' });
      toast('Message deleted.');
      refreshSummary();
      navigate('/admin/inquiries', { replace: true });
    } catch (e) { fail(e); }
  }

  if (error) return <div className="adm-page"><GLink to="/admin/inquiries" className="adm-back"><Icon name="left" size={16} /> All inquiries</GLink><ErrorBox error={error} retry={reload} /></div>;
  if (loading || !data) return <div className="adm-page"><Skeleton rows={5} /></div>;
  const a = data;
  const services = svcList(a.services);

  return (
    <div className="adm-page">
      <GLink to="/admin/inquiries" className="adm-back"><Icon name="left" size={16} /> All inquiries</GLink>
      <PageHead title={a.full_name} intro={<>Sent on {fmtDate(a.created_at, true)}{a.lang === 'ar' && ' · written on the Arabic site'}</>}
        actions={<>
          {/* the form only requires a name and phone, so calling back is the main action; email when they left one */}
          {a.phone && <a className="adm-btn primary" href={'tel:' + a.phone.replace(/[^\d+]/g, '')}><Icon name="phone" /> Call</a>}
          {a.email && <a className={'adm-btn' + (a.phone ? '' : ' primary')} href={'mailto:' + a.email}><Icon name="mail" /> Reply by email</a>}
        </>} />
      <div className="adm-editor">
        <div className="adm-editor-main">
          <Card title="Contact">
            <dl className="adm-dl">
              {a.phone && <><dt>Phone</dt><dd><a href={'tel:' + a.phone.replace(/[^\d+]/g, '')}>{a.phone}</a></dd></>}
              {a.email && <><dt>Email</dt><dd><a href={'mailto:' + a.email}>{a.email}</a></dd></>}
              {a.job_title && <><dt>Role</dt><dd>{a.job_title}</dd></>}
              {a.company && <><dt>Company</dt><dd>{a.company}</dd></>}
            </dl>
          </Card>
          <Card title="What they need">
            {services.length === 0 ? <p className="adm-muted">No service was ticked.</p> : <p>{services.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</p>}
          </Card>
          <Card title="Message">
            {a.message ? <p className="adm-pre" dir="auto">{a.message}</p> : <p className="adm-muted">No message (it is optional).</p>}
          </Card>
        </div>
        <aside className="adm-editor-side">
          <Card title="Status">
            <label className="adm-field">
              <span className="adm-label">Where is this message?</span>
              <select className="adm-input" value={a.status} disabled={busy} onChange={(e) => patch({ status: e.target.value }, 'Status changed to “' + inqName(e.target.value) + '”.')}>
                {INQ_STATUS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </label>
          </Card>
          <Card title="Private notes">
            <label className="adm-field">
              <span className="adm-label adm-sr-only">Notes</span>
              <textarea className="adm-input" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only admins can see these notes." />
            </label>
            <button type="button" className="adm-btn primary" disabled={!notesDirty || busy} onClick={() => patch({ notes }, 'Notes saved.')}>Save notes</button>
          </Card>
          <button type="button" className="adm-btn ghost danger-text" onClick={remove}><Icon name="trash" /> Delete message</button>
        </aside>
      </div>
    </div>
  );
}
