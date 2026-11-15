// About: who Minto Media is, its mission and vision, its four values and why clients choose it.
import { Link } from 'react-router-dom';
import { InnerHeader, SiteShell, useT } from './Shell';
import '../styles/pages.css';

const card: React.CSSProperties = { borderRadius: 28, background: 'var(--card)', border: '1px solid var(--line2)', padding: 36, display: 'flex', flexDirection: 'column', gap: 16 };
const head: React.CSSProperties = { fontFamily: "'Minto Head', sans-serif", fontSize: 48, lineHeight: 1, color: '#F68B1F' };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 };

function Cards({ items }: { items: [string, string][] }) {
  return (
    <div style={grid}>
      {items.map(([title, text], i) => (
        <div key={i} className="rv rv-up" style={{ ...card, transitionDelay: `${i * 0.12}s` }}>
          <span style={head}>{String(i + 1).padStart(2, '0')}</span>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{title}</h3>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: 'var(--muted)' }}>{text}</p>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const t = useT();
  const values: [string, string][] = [[t.v1t, t.v1p], [t.v2t, t.v2p], [t.v3t, t.v3p], [t.v4t, t.v4p]];
  const why: [string, string][] = [[t.w1t, t.w1p], [t.w2t, t.w2p], [t.w3t, t.w3p], [t.w4t, t.w4p]];
  const p = { margin: 0, maxWidth: 820, fontSize: 21, lineHeight: 1.65, color: 'var(--muted)' };
  return (
    <SiteShell header={<InnerHeader current="about" />}>
      <section id="main" style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-hero" style={{ paddingTop: 120, paddingBottom: 72, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <span className="rv rv-left mm-eyebrow">{t.aboutEyebrow}</span>
          <h1 className="mm-h1 cr-h1" style={{ margin: 0, maxWidth: 1100, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 96, lineHeight: 1, textTransform: 'uppercase' }}>
            <span className="ln"><span>{t.aboutH1}</span></span>
          </h1>
          <p className="rv rv-left" style={p}>{t.aboutP}</p>
          <p className="rv rv-left" style={{ ...p, transitionDelay: '.12s' }}>{t.aboutP2}</p>
        </div>
      </section>
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap" style={{ paddingBottom: 100, ...grid, gap: 24 }}>
          {[[t.missionT, t.missionP], [t.visionT, t.visionP]].map(([title, text], i) => (
            <div key={i} className="rv rv-up" style={{ ...card, background: i ? '#0B4A94' : '#F68B1F', color: i ? '#ffffff' : '#0E1B33', border: 0, padding: 44, transitionDelay: `${i * 0.12}s` }}>
              <h2 style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 44, lineHeight: 1, textTransform: 'uppercase' }}>{title}</h2>
              <p style={{ margin: 0, fontSize: 19, lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ background: 'var(--bg2)' }} data-bg="bg2">
        <div className="mm-wrap pg-sec" style={{ paddingTop: 100, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 48 }}>
          <h2 className="mm-h2 cr-h2" style={{ fontSize: 80 }}><span className="ln"><span>{t.valuesTitle}</span></span></h2>
          <Cards items={values} />
        </div>
      </section>
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-sec" style={{ paddingTop: 100, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <span className="rv rv-left mm-eyebrow">{t.whyEyebrow}</span>
          <h2 className="mm-h2 cr-h2" style={{ fontSize: 80, maxWidth: 1100 }}><span className="ln"><span>{t.whyH}</span></span></h2>
          <p className="rv rv-left" style={p}>{t.whyP}</p>
          <Cards items={why} />
        </div>
      </section>
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap" style={{ paddingTop: 80, paddingBottom: 120 }}>
          <div className="rv rv-pop pg-cta" style={{ background: '#F68B1F', color: '#0E1B33', borderRadius: 32, padding: '64px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
            <h2 className="mm-wide pg-cta-h" style={{ margin: 0, flex: '1 1 480px', fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 64, lineHeight: 0.95, textTransform: 'uppercase' }}>{t.cfLead}</h2>
            <Link to="/contact" className="mm-btn mm-dark-btn" style={{ padding: '20px 32px' }}>{t.letsTalk}</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
