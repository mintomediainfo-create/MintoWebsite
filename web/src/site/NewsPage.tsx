// News & announcements: type filter, featured post on top, grid, newsletter.
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { InnerHeader, PageState, SiteShell } from './Shell';
import { Cover, NewsCard, NewsTag, chipStyle, type NewsItem, type NewsType } from './pageBits';
import { usePrefs } from '../lib/prefs';
import { api, fmtDate, useApi } from '../lib/api';
import '../styles/pages.css';

const PG = {
  en: {
    h1a: 'News &', h1b: 'announcements', intro: "What's new at Minto: launches, team news, events and updates.",
    aFilter: 'Filter news', featured: 'Featured', readMore: 'Read more', loadMore: 'Load more',
    all: 'All', news: 'News', announcement: 'Announcements', event: 'Events',
    empty: 'Nothing here yet. Check back soon.',
    nlTitle: 'Get Minto news first', nlText: 'One short email when we have something new. No spam.',
    emailLabel: 'Email address', yourEmail: 'Your email', sub: 'Subscribe', thanks: 'Thanks!', sending: 'Sending…',
    badEmail: 'Please write a valid email, like name@example.com.', subErr: 'Something went wrong. Please try again.', subOk: 'You are on the list. Thank you!',
  },
  ar: {
    h1a: 'الأخبار', h1b: 'والإعلانات', intro: 'كل جديد في منتو: إطلاقات وأخبار الفريق والفعاليات والتحديثات.',
    aFilter: 'تصفية الأخبار', featured: 'مميز', readMore: 'اقرأ المزيد', loadMore: 'عرض المزيد',
    all: 'الكل', news: 'أخبار', announcement: 'إعلانات', event: 'فعاليات',
    empty: 'لا توجد أخبار بعد. تابعنا قريبًا.',
    nlTitle: 'اعرف أخبار منتو أولاً', nlText: 'رسالة قصيرة على بريدك عندما يكون لدينا جديد. بدون إزعاج.',
    emailLabel: 'البريد الإلكتروني', yourEmail: 'بريدك الإلكتروني', sub: 'اشترك', thanks: 'شكرًا!', sending: 'جارٍ الإرسال…',
    badEmail: 'من فضلك اكتب بريدًا إلكترونيًا صحيحًا مثل name@example.com.', subErr: 'حدث خطأ. حاول مرة أخرى.', subOk: 'تم تسجيلك. شكرًا لك!',
  },
};

type Tab = '' | NewsType;

/** Newsletter box (orange card) — also used under a news post. */
export function Newsletter({ top = 0 }: { top?: number }) {
  const { lang } = usePrefs();
  const p = PG[lang];
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'bad' | 'error'>('idle');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setState('bad'); return; }
    setState('sending');
    try { await api('/subscribe', { body: { email: email.trim(), lang } }); setState('done'); setEmail(''); }
    catch { setState('error'); }
  };
  const msg = state === 'bad' ? p.badEmail : state === 'error' ? p.subErr : state === 'done' ? p.subOk : '';
  return (
    <section className="nw-nl" style={{ background: 'var(--bg)' }}>
      <div className="mm-wrap" style={{ paddingTop: top, paddingBottom: 120 }}>
        <div className="rv rv-pop pg-cta" style={{ background: '#F68B1F', color: '#0E1B33', borderRadius: 32, padding: 64, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <div className="mm-wide" style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 64, lineHeight: 0.95, textTransform: 'uppercase' }}>{p.nlTitle}</h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: '#2A2416' }}>{p.nlText}</p>
          </div>
          <form onSubmit={submit} noValidate className="mm-wide" style={{ flex: '1 1 420px', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <label htmlFor="nw-email" className="mm-sr">{p.emailLabel}</label>
            <input id="nw-email" className="nw-nlin" type="email" autoComplete="email" dir="ltr" required placeholder={p.yourEmail} value={email}
              aria-invalid={state === 'bad'} aria-describedby={msg ? 'nw-msg' : undefined}
              onChange={(e) => { setEmail(e.target.value); if (state !== 'sending') setState('idle'); }} />
            <button type="submit" disabled={state === 'sending'} className="mm-btn mm-dark-btn" style={{ height: 58, padding: '0 28px' }}>
              {state === 'done' ? p.thanks : state === 'sending' ? p.sending : p.sub}
            </button>
            <span id="nw-msg" role={state === 'bad' || state === 'error' ? 'alert' : 'status'} style={{ flexBasis: '100%', minHeight: 0, fontSize: 14, fontWeight: 700, color: state === 'done' ? '#0E1B33' : '#7A1E10' }}>{msg}</span>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function NewsPage() {
  const { L, lang } = usePrefs();
  const p = PG[lang];
  const [tab, setTab] = useState<Tab>('');
  const [shown, setShown] = useState(6);
  const { data, error, loading } = useApi<NewsItem[]>('/news' + (tab ? `?type=${tab}` : ''));
  const all = data || [];
  const feat = all.find((x) => x.featured) || all[0];
  const rest = all.filter((x) => x !== feat);
  const tabs: [Tab, string][] = [['', p.all], ['news', p.news], ['announcement', p.announcement], ['event', p.event]];
  const featTitle = feat ? L(feat.title) : '';

  return (
    <SiteShell header={<InnerHeader current="news" />}>
      {/* PAGE HERO */}
      <section id="main" style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-hero" style={{ paddingTop: 120, paddingBottom: 56, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40 }}>
          <h1 className="mm-h1 nw-h1" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 128, lineHeight: 0.9, textTransform: 'uppercase' }}>
            <span className="ln"><span>{p.h1a}</span></span>
            <span className="ln"><span style={{ transitionDelay: '.12s', color: '#F68B1F' }}>{p.h1b}</span></span>
          </h1>
          <p className="rv rv-right" style={{ margin: 0, maxWidth: 400, fontSize: 20, lineHeight: 1.55, color: 'var(--muted)', transitionDelay: '.3s' }}>{p.intro}</p>
        </div>
      </section>

      {/* FILTER TABS */}
      <section style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="mm-wrap pg-tabs" role="group" aria-label={p.aFilter} style={{ paddingTop: 18, paddingBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {tabs.map(([k, label]) => (
            <button key={k || 'all'} type="button" className="mm-chip pg-chip" aria-pressed={tab === k} style={chipStyle(tab === k)} onClick={() => { setTab(k); setShown(6); }}>{label}</button>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap" style={{ paddingTop: 56 }} aria-busy={loading}>
          {!data && <PageState loading={loading} error={error} />}
          {data && !all.length && <p style={{ margin: 0, padding: '40px 0 0', textAlign: 'center', fontSize: 18, color: 'var(--muted2)' }}>{p.empty}</p>}
          {feat && (
            <Link key={feat.id} to={`/news/${feat.slug}`} className="mm-card rv rv-pop" style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center', textDecoration: 'none', color: 'var(--fg)' }}>
              <span className="mm-wide nw-featimg" style={{ flex: '3 1 520px', display: 'block', height: 520, borderRadius: 28, overflow: 'hidden', position: 'relative' }}>
                <Cover className="mm-img" url={feat.cover_url} alt={featTitle} bg="#123E73" />
              </span>
              <span className="mm-wide" style={{ flex: '2 1 360px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                  {feat.featured ? <span style={{ background: '#F68B1F', color: '#0E1B33', padding: '7px 12px', borderRadius: 999 }}>{p.featured}</span> : <NewsTag type={feat.type} />}
                  <time dateTime={feat.published_at} style={{ color: 'var(--muted2)' }}>{fmtDate(feat.published_at, lang)}</time>
                </span>
                <span className="mm-ttl nw-featttl" style={{ fontFamily: "'Minto Head', sans-serif", fontSize: 60, lineHeight: 1, textTransform: 'uppercase' }}>{featTitle}</span>
                {L(feat.summary) && <span style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--muted)' }}>{L(feat.summary)}</span>}
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', borderBottom: '2px solid #F68B1F', alignSelf: 'flex-start', paddingBottom: 6 }}>{p.readMore}</span>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* GRID */}
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-sec" style={{ paddingTop: rest.length ? 96 : 0, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 56 }}>
          {rest.length > 0 && (
            <div className="nw-grid">
              {rest.slice(0, shown).map((n, i) => <NewsCard key={n.id} p={n} i={i} />)}
            </div>
          )}
          {rest.length > shown && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="button" className="pg-ghost" onClick={() => setShown((s) => s + 3)}>{p.loadMore}</button>
            </div>
          )}
        </div>
      </section>

      <Newsletter />
    </SiteShell>
  );
}
