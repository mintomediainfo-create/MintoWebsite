// Dashboard home: counts, recent applications, quick links.
import { useEffect } from 'react';
import { StatusBadge } from './Applications';
import { useShell } from './shell';
import { Card, GLink, Icon, PageHead, Skeleton, fmtDate } from './ui';

const CARDS: [key: string, label: string, to: string, icon: string][] = [
  ['new_apps', 'New applications', '/admin/applications?status=new', 'inbox'],
  ['new_inquiries', 'New inquiries', '/admin/inquiries?status=new', 'mail'],
  ['open_jobs', 'Open jobs', '/admin/jobs', 'case'],
  ['news', 'Published posts', '/admin/news', 'news'],
  ['work', 'Work items shown', '/admin/work', 'star'],
  ['clients', 'Client logos', '/admin/clients', 'users'],
  ['testimonials', 'Testimonials', '/admin/testimonials', 'quote'],
  ['subscribers', 'Subscribers', '/admin/subscribers', 'mail'],
  ['apps', 'All applications', '/admin/applications', 'inbox'],
];

const QUICK: [string, string, string][] = [
  ['Write a news post', '/admin/news/new', 'news'],
  ['Add a job', '/admin/jobs/new', 'case'],
  ['Add work', '/admin/work', 'star'],
  ['Edit contact details', '/admin/contact', 'pin'],
];

export default function Overview() {
  const { me, summary, refreshSummary } = useShell();
  useEffect(() => { refreshSummary(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="adm-page">
      <PageHead title={`${hello}${me.name ? ', ' + me.name.split(' ')[0] : ''}`} intro="Here is what is happening on the Minto Media website." site="/" siteLabel="Open the website" />
      {!summary ? <Skeleton rows={4} grid /> : (
        <div className="adm-stats">
          {CARDS.map(([k, label, to, icon]) => {
            const n = Number(summary.counts[k as keyof typeof summary.counts] || 0);
            return (
              <GLink key={k} to={to} className={'adm-stat' + ((k === 'new_apps' || k === 'new_inquiries') && n > 0 ? ' hot' : '')}>
                <span className="adm-stat-ico"><Icon name={icon} /></span>
                <span className="adm-stat-n">{n}</span>
                <span className="adm-stat-l">{label}</span>
              </GLink>
            );
          })}
        </div>
      )}
      <div className="adm-two top">
        <Card title="Latest applications" actions={<GLink to="/admin/applications" className="adm-linkbtn">See all</GLink>}>
          {!summary ? <Skeleton rows={3} /> : summary.recent.length === 0 ? <p className="adm-muted">No applications yet.</p> : (
            <ul className="adm-recent">
              {summary.recent.map((a) => (
                <li key={a.id}>
                  <GLink to={'/admin/applications/' + a.id}>
                    <span className="adm-avatar">{a.full_name.slice(0, 1).toUpperCase()}</span>
                    <span className="adm-recent-main"><b>{a.full_name}</b><span className="adm-muted small">{a.job_title || 'No role'} · {fmtDate(a.created_at)}</span></span>
                    <StatusBadge s={a.status} />
                  </GLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Quick links">
          <ul className="adm-quick">
            {QUICK.map(([t, to, icon]) => (
              <li key={to}><GLink to={to}><Icon name={icon} /> {t} <span className="adm-quick-go"><Icon name="right" size={16} /></span></GLink></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
