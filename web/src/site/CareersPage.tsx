// Careers: hero, open roles (from the dashboard), "no role for you yet?".
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { InnerHeader, PageState, SiteShell, useSettings } from './Shell';
import { chipStyle } from './pageBits';
import { usePrefs } from '../lib/prefs';
import { fmtDate, useApi, type L } from '../lib/api';
import '../styles/pages.css';

const PG = {
  en: {
    h1a: 'Shape the future', h1b: 'with us',
    intro: 'Join the team of creators. At Minto Media, passion is the primary engine of creativity. We are always looking for creative minds with the passion to leave a true mark in the world of digital media.',
    whyTitle: 'Why join Minto Media',
    why: [['Stimulating work environment', 'A flexible environment that encourages innovation and out-of-the-box thinking.'], ['Major projects', 'The opportunity to work on massive media projects and with prominent brands.'], ['Continuous growth', 'Access to the latest production and media tools and technologies.']],
    seeRoles: 'See open positions ↓', aLife: 'Life at Minto', openRoles: 'Open positions', aFilter: 'Filter roles', all: 'All',
    viewJob: 'View job & apply', noRole: 'Do you see yourself as part of our next story?',
    noRoleText: 'Send your CV and portfolio via email to', noRoleText2: 'or fill out the form.', sendCv: 'Fill out the form',
    count: (n: number) => (n === 1 ? '1 open role' : `${n} open roles`),
    deadline: 'Apply by', none: 'No open roles right now.', noneText: 'New roles open often. Send us your CV and we will keep it for the next one.',
    cvSubject: 'CV for Minto Media',
  },
  ar: {
    h1a: 'اصنع المستقبل', h1b: 'معانا',
    intro: 'انضم لفريق المبدعين. في منتو ميديا الشغف هو المحرّك الأول للإبداع. دايمًا بندوّر على عقول مبدعة عندها الشغف تسيب بصمة حقيقية في عالم الإعلام الرقمي.',
    whyTitle: 'ليه تنضم لمنتو ميديا',
    why: [['بيئة شغل محفّزة', 'بيئة مرنة بتشجّع على الابتكار والتفكير برّه الصندوق.'], ['مشاريع كبيرة', 'فرصة تشتغل على مشاريع إعلامية ضخمة ومع براندات معروفة.'], ['نمو مستمر', 'وصول لأحدث أدوات وتقنيات الإنتاج والإعلام.']],
    seeRoles: 'الوظائف المتاحة ↓', aLife: 'الحياة في منتو', openRoles: 'الوظائف المتاحة', aFilter: 'تصفية الوظائف', all: 'الكل',
    viewJob: 'تفاصيل الوظيفة والتقديم', noRole: 'شايف نفسك جزء من قصتنا الجاية؟',
    noRoleText: 'ابعت سيرتك الذاتية وأعمالك على الإيميل', noRoleText2: 'أو املأ الفورم.', sendCv: 'املأ الفورم',
    count: (n: number) => (n === 1 ? 'وظيفة واحدة متاحة' : n === 2 ? 'وظيفتان متاحتان' : n >= 3 && n <= 10 ? `${n} وظائف متاحة` : `${n} وظيفة متاحة`),
    deadline: 'آخر موعد', none: 'لا توجد وظائف متاحة الآن.', noneText: 'نفتح وظائف جديدة باستمرار. أرسل لنا سيرتك الذاتية وسنحتفظ بها للفرصة القادمة.',
    cvSubject: 'سيرة ذاتية لمنتو ميديا',
  },
};

type Job = { id: number; slug: string; title: L; department: L; location: L; job_type: L; level: L; summary: L; deadline: string | null };

const deptKey = (j: Job) => (j.department?.en || j.department?.ar || '').trim().toLowerCase();

export default function CareersPage() {
  const { L, lang, isAr } = usePrefs();
  const p = PG[lang];
  const settings = useSettings();
  const { data, error, loading } = useApi<Job[]>('/jobs');
  const jobs = data || [];
  const [dept, setDept] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const depts = useMemo(() => {
    const seen = new Map<string, Job>();
    jobs.forEach((j) => { const k = deptKey(j); if (k && !seen.has(k)) seen.set(k, j); });
    return Array.from(seen.entries());
  }, [jobs]);
  const list = dept ? jobs.filter((j) => deptKey(j) === dept) : jobs;
  const openId = open === null ? list[0]?.id : open; // the first role starts open, like the design

  const careersEmail = (settings?.contact?.careersEmail || settings?.contact?.email) as string | undefined;

  const meta: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', border: '1px solid var(--line2)', padding: '7px 12px', borderRadius: 999 };

  return (
    <SiteShell header={<InnerHeader current="careers" />}>
      {/* PAGE HERO */}
      <section id="main" style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-hero" style={{ paddingTop: 120, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 40 }}>
          <h1 className="mm-h1 cr-h1" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 170, lineHeight: 0.9, textTransform: 'uppercase' }}>
            <span className="ln"><span>{p.h1a}</span></span>
            <span className="ln"><span style={{ transitionDelay: '.12s', color: '#F68B1F' }}>{p.h1b}</span></span>
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32 }}>
            <p className="rv rv-left" style={{ margin: 0, maxWidth: 560, fontSize: 21, lineHeight: 1.55, color: 'var(--muted)' }}>{p.intro}</p>
            <a className="rv rv-right mm-btn" href="#roles" style={{ padding: '20px 32px' }}
              onClick={(e) => { e.preventDefault(); document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{p.seeRoles}</a>
          </div>
        </div>
      </section>

      {/* WHY JOIN */}
      <section aria-label={p.whyTitle} style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-sec" style={{ paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 36 }}>
          <h2 className="mm-h2 cr-h2" style={{ fontSize: 72 }}><span className="ln"><span>{p.whyTitle}</span></span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {p.why.map(([title, text], i) => (
              <div key={i} className="rv rv-up" style={{ transitionDelay: `${i * 0.12}s`, borderRadius: 28, background: 'var(--card)', border: '1px solid var(--line2)', padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontFamily: "'Minto Head', sans-serif", fontSize: 44, lineHeight: 1, color: '#F68B1F' }}>{String(i + 1).padStart(2, '0')}</span>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{title}</h3>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'var(--muted)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPEN ROLES */}
      <section id="roles" style={{ background: 'var(--bg)', scrollMarginTop: 80 }}>
        <div className="mm-wrap pg-sec" style={{ paddingTop: 120, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
            <h2 className="mm-h2 cr-h2" style={{ fontSize: 96 }}><span className="ln"><span>{p.openRoles}</span></span></h2>
            {data && <span className="rv rv-right" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted2)' }}>{p.count(list.length)}</span>}
          </div>
          {depts.length > 1 && (
            <div role="group" aria-label={p.aFilter} className="pg-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" className="mm-chip pg-chip" aria-pressed={!dept} style={chipStyle(!dept)} onClick={() => { setDept(''); setOpen(null); }}>{p.all}</button>
              {depts.map(([k, j]) => (
                <button key={k} type="button" className="mm-chip pg-chip" aria-pressed={dept === k} style={chipStyle(dept === k)} onClick={() => { setDept(k); setOpen(null); }}>{L(j.department)}</button>
              ))}
            </div>
          )}
          {!data && <PageState loading={loading} error={error} />}
          {data && !jobs.length && (
            <div className="rv rv-up" style={{ borderRadius: 24, background: 'var(--card)', border: '1px solid var(--line2)', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 24, fontWeight: 800 }}>{p.none}</span>
              <span style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--muted)' }}>{p.noneText}</span>
            </div>
          )}
          {list.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)' }}>
              {list.map((j) => {
                const isOpen = openId === j.id;
                const pid = `role-${j.id}`;
                return (
                  <div key={j.id} className="rv rv-up" style={{ borderBottom: '1px solid var(--line)' }}>
                    <h3 style={{ margin: 0 }}>
                      <button type="button" className="mm-role" aria-expanded={isOpen} aria-controls={pid} onClick={() => setOpen(isOpen ? -1 : j.id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '28px 16px', border: 0, background: 'transparent', color: 'var(--fg)', fontFamily: 'inherit', textAlign: isAr ? 'right' : 'left', cursor: 'pointer' }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span className="cr-rtitle" style={{ fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}>{L(j.title)}</span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted2)' }}>{L(j.department)}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                          {L(j.location) && <span className="mm-rmeta" style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>{L(j.location)}</span>}
                          {L(j.job_type) && <span className="mm-rmeta" style={meta}>{L(j.job_type)}</span>}
                          <span aria-hidden="true" style={{ width: 48, height: 48, flex: 'none', borderRadius: 999, background: isOpen ? '#F68B1F' : 'var(--card)', color: isOpen ? '#0E1B33' : 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 400, lineHeight: 1, transition: 'background .25s ease, color .25s ease' }}>{isOpen ? '−' : '+'}</span>
                        </span>
                      </button>
                    </h3>
                    {isOpen && (
                      <div id={pid} className="mm-open" style={{ padding: '0 16px 36px', display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div className="mm-wide" style={{ flex: '1 1 520px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 17, lineHeight: 1.6, color: 'var(--muted)' }}>
                          {L(j.summary) && <p style={{ margin: 0 }}>{L(j.summary)}</p>}
                          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {L(j.location) && <span style={{ ...meta, color: 'var(--muted)' }}>{L(j.location)}</span>}
                            {L(j.job_type) && <span style={{ ...meta, color: 'var(--muted)' }}>{L(j.job_type)}</span>}
                            {L(j.level) && <span style={{ ...meta, color: 'var(--muted)' }}>{L(j.level)}</span>}
                            {j.deadline && <span style={{ ...meta, color: 'var(--muted)' }}>{p.deadline} {fmtDate(j.deadline, lang)}</span>}
                          </span>
                        </div>
                        <Link to={`/careers/${j.slug}`} className="mm-btn" style={{ padding: '18px 28px' }}>{p.viewJob}</Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* NO ROLE FITS */}
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap" style={{ paddingBottom: 120 }}>
          <div className="rv rv-pop pg-cta" style={{ background: '#0B4A94', color: '#ffffff', borderRadius: 32, padding: '72px 64px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
            <div className="mm-wide" style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="pg-cta-h" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 64, lineHeight: 0.95, textTransform: 'uppercase' }}>{p.noRole}</h2>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: '#D5E3F5' }}>{p.noRoleText}{careersEmail && <> <a href={`mailto:${careersEmail}`} className="mm-ltr" style={{ color: '#ffffff', fontWeight: 800 }}>{careersEmail}</a></>} {p.noRoleText2}</p>
            </div>
            <Link to="/careers/send-cv" className="mm-btn" style={{ padding: '20px 32px' }}>{p.sendCv}</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
