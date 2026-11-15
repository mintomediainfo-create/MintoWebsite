// Job applications: filterable table and the detail view.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useShell } from './shell';
import { jobTitle } from './Jobs';
import { Any, Badge, Card, Empty, ErrorBox, GLink, Icon, PageHead, Skeleton, fmtDate, useDirty, useLoad, useUi } from './ui';

export const APP_STATUS: [string, string][] = [['new', 'New'], ['reviewing', 'Reviewing'], ['shortlisted', 'Shortlisted'], ['rejected', 'Not selected'], ['hired', 'Hired']];
export const APP_TONE: Record<string, string> = { new: 'orange', reviewing: 'blue', shortlisted: 'purple', rejected: 'red', hired: 'green' };
export const statusName = (s: string) => APP_STATUS.find((x) => x[0] === s)?.[1] || s;
export const StatusBadge = ({ s }: { s: string }) => <Badge tone={APP_TONE[s]}>{statusName(s)}</Badge>;

export function ApplicationsList() {
  const [sp, setSp] = useSearchParams();
  const job = sp.get('job') || '';
  const status = sp.get('status') || '';
  const [search, setSearch] = useState('');
  const { data, error, loading, reload } = useLoad<Any[]>(`/admin/applications?job=${job}&status=${status}`);
  const jobs = useLoad<Any[]>('/admin/r/jobs');
  const navigate = useNavigate();
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data || []).filter((a) => !s || a.full_name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || (a.phone || '').includes(s));
  }, [data, search]);

  return (
    <div className="adm-page">
      <PageHead title="Applications" intro="People who applied for your jobs. Click a name to see their answers and CV." />
      <div className="adm-toolbar">
        <label className="adm-tool">
          <span>Job</span>
          <select className="adm-input" value={job} onChange={(e) => setParam('job', e.target.value)}>
            <option value="">All jobs</option>
            {(jobs.data || []).map((j) => <option key={j.id} value={j.id}>{jobTitle(j)}</option>)}
          </select>
        </label>
        <label className="adm-tool">
          <span>Status</span>
          <select className="adm-input" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            {APP_STATUS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </label>
        <label className="adm-tool grow">
          <span>Search</span>
          <input className="adm-input" type="search" placeholder="Name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <ErrorBox error={error} retry={reload} />
      {loading && !data ? <Skeleton rows={5} /> : rows.length === 0 ? (
        <Empty title={data && data.length ? 'No matches' : 'No applications yet'}
          text={data && data.length ? 'Try another filter or search.' : 'When someone applies for a job, they will show here.'}
          action={job || status || search ? <button type="button" className="adm-btn ghost" onClick={() => { setSearch(''); setSp(new URLSearchParams(), { replace: true }); }}>Clear filters</button> : undefined} />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th scope="col">Name</th><th scope="col">Job</th><th scope="col" className="hide-sm">Contact</th><th scope="col">Status</th><th scope="col" className="hide-sm">Date</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={a.status === 'new' ? 'is-new' : ''} onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) navigate('/admin/applications/' + a.id); }}>
                  <td><GLink to={'/admin/applications/' + a.id} className="adm-strong-link">{a.full_name}</GLink><div className="adm-muted small show-sm">{a.email}</div></td>
                  <td>{a.job_title || <span className="adm-muted">No role (sent CV)</span>}</td>
                  <td className="hide-sm"><div>{a.email}</div><div className="adm-muted small">{a.phone}{a.city && ' · ' + a.city}</div></td>
                  <td><StatusBadge s={a.status} /></td>
                  <td className="hide-sm adm-nowrap">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="adm-muted small">{rows.length} application{rows.length === 1 ? '' : 's'}</p>
        </div>
      )}
    </div>
  );
}

export function ApplicationView() {
  const { id } = useParams();
  const { data, error, loading, reload, setData } = useLoad<Any>('/admin/applications/' + id);
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
      const row = await api<Any>('/admin/applications/' + id, { method: 'PATCH', body });
      setData({ ...data, ...row });
      toast(msg);
      refreshSummary();
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function openCv() {
    const w = window.open('', '_blank');
    try {
      const { url } = await api<{ url: string }>('/admin/applications/' + id + '/cv');
      if (w) w.location.href = url; else window.location.href = url;
    } catch (e) { w?.close(); fail(e); }
  }
  async function remove() {
    if (!(await confirm({ title: 'Delete this application?', message: `The application from ${data?.full_name} and their CV will be deleted for good.`, ok: 'Delete', danger: true }))) return;
    try {
      await api('/admin/applications/' + id, { method: 'DELETE' });
      toast('Application deleted.');
      refreshSummary();
      navigate('/admin/applications', { replace: true });
    } catch (e) { fail(e); }
  }

  if (error) return <div className="adm-page"><GLink to="/admin/applications" className="adm-back"><Icon name="left" size={16} /> All applications</GLink><ErrorBox error={error} retry={reload} /></div>;
  if (loading || !data) return <div className="adm-page"><Skeleton rows={5} /></div>;
  const a = data;
  const answers: Any[] = Array.isArray(a.answers) ? a.answers : [];
  const ext = (u: string) => (/^https?:\/\//i.test(u) ? u : 'https://' + u);

  return (
    <div className="adm-page">
      <GLink to="/admin/applications" className="adm-back"><Icon name="left" size={16} /> All applications</GLink>
      <PageHead title={a.full_name} intro={<>{a.job_title ? <>Applied for <b>{a.job_title}</b></> : <>Sent a CV with <b>no specific role</b></>} on {fmtDate(a.created_at, true)}{a.lang === 'ar' && ' · filled in Arabic'}</>}
        actions={<button type="button" className="adm-btn primary" onClick={openCv}><Icon name="download" /> Download CV</button>} />
      <div className="adm-editor">
        <div className="adm-editor-main">
          <Card title="Contact">
            <dl className="adm-dl">
              <dt>Email</dt><dd><a href={'mailto:' + a.email}>{a.email}</a></dd>
              <dt>Phone</dt><dd><a href={'tel:' + a.phone.replace(/[^\d+]/g, '')}>{a.phone}</a></dd>
              {a.city && <><dt>City</dt><dd>{a.city}</dd></>}
              {a.portfolio && <><dt>Portfolio</dt><dd><a href={ext(a.portfolio)} target="_blank" rel="noreferrer noopener">{a.portfolio} <Icon name="ext" size={14} /></a></dd></>}
              {a.linkedin && <><dt>LinkedIn</dt><dd><a href={ext(a.linkedin)} target="_blank" rel="noreferrer noopener">{a.linkedin} <Icon name="ext" size={14} /></a></dd></>}
              <dt>CV</dt><dd><button type="button" className="adm-linkbtn" onClick={openCv}><Icon name="download" size={14} /> {a.cv_name || 'Download CV'}</button></dd>
            </dl>
          </Card>
          <Card title="Answers">
            {answers.length === 0 ? <p className="adm-muted">This job had no extra questions.</p> : (
              <dl className="adm-answers">
                {answers.map((x, i) => {
                  const ans = Array.isArray(x.answer) ? x.answer : x.answer ? [x.answer] : [];
                  return (
                    <div key={x.id || i}>
                      <dt>{x.question || x.question_ar}{x.question && x.question_ar && <span className="adm-muted ar adm-q-ar" lang="ar" dir="rtl">{x.question_ar}</span>}</dt>
                      <dd dir="auto">
                        {ans.length === 0 ? <span className="adm-muted">No answer</span>
                          : Array.isArray(x.answer) ? <ul>{ans.map((y: string, j: number) => <li key={j}>{y}</li>)}</ul>
                            : <p className="adm-pre">{ans[0]}</p>}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </Card>
        </div>
        <aside className="adm-editor-side">
          <Card title="Status">
            <label className="adm-field">
              <span className="adm-label">Where is this application?</span>
              <select className="adm-input" value={a.status} disabled={busy} onChange={(e) => patch({ status: e.target.value }, 'Status changed to “' + statusName(e.target.value) + '”.')}>
                {APP_STATUS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
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
          <button type="button" className="adm-btn ghost danger-text" onClick={remove}><Icon name="trash" /> Delete application</button>
        </aside>
      </div>
    </div>
  );
}
