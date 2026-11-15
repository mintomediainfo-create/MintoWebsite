// "Let's talk": its own page with the contact details and the project inquiry form (messages show in the dashboard under Inquiries).
import { InnerHeader, SiteShell, phoneLinks, placeLinks, useSettings, useT, waLinks } from './Shell';
import { ContactForm } from './ContactForm';
import { usePrefs } from '../lib/prefs';
import '../styles/pages.css';

export default function ContactPage() {
  const t = useT();
  const { L } = usePrefs();
  const c = useSettings()?.contact || {};
  const rows: [string, React.ReactNode][] = [];
  if (c.email) rows.push([t.cfInfoEmail, <a href={`mailto:${c.email}`} className="mm-ltr">{c.email}</a>]);
  phoneLinks(c, t).forEach((p) => rows.push([p.label, <a href={p.href} className="mm-ltr">{p.number}</a>]));
  waLinks(c, t).forEach((w) => rows.push([w.label, <a href={w.href} target="_blank" rel="noopener noreferrer" className="mm-ltr">{w.number}</a>]));
  placeLinks(c, t, L).forEach((p) => rows.push([p.label, p.href ? <a href={p.href} target="_blank" rel="noopener noreferrer">{p.text}</a> : <span>{p.text}</span>]));
  return (
    <SiteShell header={<InnerHeader current="" />}>
      <section id="main" style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-hero" style={{ paddingTop: 120, paddingBottom: 56, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <h1 className="mm-h1 cr-h1" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 170, lineHeight: 0.9, textTransform: 'uppercase' }}>
            <span className="ln"><span>{t.cfPageH1a}</span></span>
            <span className="ln"><span style={{ transitionDelay: '.12s', color: '#F68B1F' }}>{t.cfPageH1b}</span></span>
          </h1>
          <p className="rv rv-left" style={{ margin: 0, maxWidth: 720, fontSize: 28, fontWeight: 700, lineHeight: 1.35 }}>{t.cfLead}</p>
          <p className="rv rv-left" style={{ margin: 0, maxWidth: 720, fontSize: 20, lineHeight: 1.6, color: 'var(--muted)' }}>{t.cfIntro}</p>
        </div>
      </section>
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-sec" style={{ paddingTop: 24, paddingBottom: 140, display: 'flex', flexWrap: 'wrap', gap: '56px 80px', alignItems: 'flex-start' }}>
          {rows.length > 0 && (
            <dl className="rv rv-up mm-cinfo">
              {rows.map(([label, value], i) => (
                <div key={i}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          )}
          <div className="rv rv-up" style={{ flex: '1 1 520px', minWidth: 0 }}><ContactForm /></div>
        </div>
      </section>
    </SiteShell>
  );
}
