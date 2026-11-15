// One news post: tag, date, title, cover, body, then "more news" and the newsletter.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconArrow, InnerHeader, PageState, SiteShell } from './Shell';
import { Cover, NewsCard, NewsTag, copyHere, type NewsItem } from './pageBits';
import { Newsletter } from './NewsPage';
import { usePrefs } from '../lib/prefs';
import { fmtDate, useApi, type L } from '../lib/api';
import '../styles/pages.css';

const PG = {
  en: {
    allNews: 'All news', more: 'More news', copy: 'Copy link', copied: 'Link copied ✓',
    nfTitle: 'Post not found', nfText: 'This post was moved or is no longer online.', back: 'Back to news',
  },
  ar: {
    allNews: 'كل الأخبار', more: 'أخبار أخرى', copy: 'انسخ الرابط', copied: 'تم نسخ الرابط ✓',
    nfTitle: 'الخبر غير موجود', nfText: 'تم نقل هذا الخبر أو لم يعد متاحًا.', back: 'العودة إلى الأخبار',
  },
};

type Post = NewsItem & { body: L; more: NewsItem[] };

export default function NewsDetail() {
  const { slug = '' } = useParams();
  const { L, lang } = usePrefs();
  const p = PG[lang];
  const { data, error, loading } = useApi<Post>(`/news/${encodeURIComponent(slug)}`);
  const [copied, setCopied] = useState(false);
  const post = data && data.slug === slug ? data : undefined;
  const title = post ? L(post.title) : '';

  useEffect(() => {
    if (!title) return;
    const old = document.title;
    document.title = `${title} — Minto Media`;
    return () => { document.title = old; };
  }, [title]);
  useEffect(() => setCopied(false), [slug]);

  const header = <InnerHeader current="news" />;
  const back = (
    <Link to="/news" className="pg-back mm-rise"><IconArrow dir="left" size={16} />{p.allNews}</Link>
  );

  if (!post) {
    const notFound = error?.status === 404;
    return (
      <SiteShell header={header}>
        <section id="main" style={{ background: 'var(--bg)' }}>
          <div className="mm-wrap pg-hero" style={{ paddingTop: 120, paddingBottom: 140, display: 'flex', flexDirection: 'column', gap: 24, minHeight: '50vh' }}>
            {back}
            {notFound ? (
              <>
                <h1 className="mm-h1 mm-rise" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 110, lineHeight: 0.95, textTransform: 'uppercase' }}>{p.nfTitle}</h1>
                <p className="mm-rise" style={{ margin: 0, fontSize: 20, color: 'var(--muted)' }}>{p.nfText}</p>
                <Link to="/news" className="mm-btn mm-rise" style={{ alignSelf: 'flex-start' }}>{p.back}</Link>
              </>
            ) : <PageState loading={loading || !error} error={error} />}
          </div>
        </section>
      </SiteShell>
    );
  }

  const paras = L(post.body).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const more = post.more || [];

  return (
    <SiteShell header={header}>
      {/* POST HERO */}
      <section id="main" style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-hero" style={{ paddingTop: 72, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {back}
          <span className="mm-rise" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', animationDelay: '.05s' }}>
            <NewsTag type={post.type} />
            <time dateTime={post.published_at} style={{ color: 'var(--muted2)' }}>{fmtDate(post.published_at, lang)}</time>
          </span>
          <h1 className="mm-h1 nw-h1 mm-rise" style={{ margin: 0, maxWidth: 1150, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 96, lineHeight: 0.95, textTransform: 'uppercase', animationDelay: '.1s' }}>{title}</h1>
          {L(post.summary) && <p className="mm-rise" style={{ margin: 0, maxWidth: 760, fontSize: 22, lineHeight: 1.55, color: 'var(--muted)', animationDelay: '.2s' }}>{L(post.summary)}</p>}
        </div>
      </section>

      {/* COVER */}
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap">
          <div className="rv rv-pop nw-cover" style={{ position: 'relative', height: 600, borderRadius: 28, overflow: 'hidden' }}>
            <Cover url={post.cover_url} alt={title} bg="#123E73" />
          </div>
        </div>
      </section>

      {/* BODY */}
      <section style={{ background: 'var(--bg)' }}>
        <article className="mm-wrap pg-sec" style={{ paddingTop: 72, paddingBottom: 120 }}>
          <div className="nw-body" style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, fontSize: 19, lineHeight: 1.75, color: 'var(--muted)' }}>
            {paras.map((t, i) => (
              <p key={i} style={{ whiteSpace: 'pre-line', ...(i === 0 ? { color: 'var(--fg)', fontWeight: 600 } : null) }}>{t}</p>
            ))}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 24, paddingTop: 28, borderTop: '1px solid var(--line)' }}>
              <Link to="/news" className="mm-more">{p.back}</Link>
              <button type="button" className="nw-share" onClick={async () => setCopied(await copyHere())}>
                <span aria-live="polite">{copied ? p.copied : p.copy}</span>
              </button>
            </div>
          </div>
        </article>
      </section>

      {/* MORE NEWS */}
      {more.length > 0 && (
        <section data-bg="bg2" style={{ background: 'var(--bg2)' }}>
          <div className="mm-wrap pg-sec" style={{ paddingTop: 110, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 48 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
              <h2 className="mm-h2" style={{ fontSize: 88 }}><span className="ln"><span>{p.more}</span></span></h2>
              <Link to="/news" className="mm-more rv rv-right">{p.allNews}</Link>
            </div>
            <div className="nw-grid">
              {more.map((n, i) => <NewsCard key={n.id} p={n} i={i} />)}
            </div>
          </div>
        </section>
      )}

      <Newsletter top={more.length ? 120 : 0} />
    </SiteShell>
  );
}
