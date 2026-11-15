// Small pieces shared by the inner pages (Work, News, News post, Careers, Job).
import { Link } from 'react-router-dom';
import { LOGO, Media } from './Shell';
import { usePrefs } from '../lib/prefs';
import { fmtDate, type L } from '../lib/api';

/** The design's coloured block, shown when there is no image yet. */
export function Ph({ bg }: { bg: string }) {
  return (
    <span className="pg-ph" style={{ background: bg }} aria-hidden="true">
      <img src={LOGO} alt="" width={54} height={58} />
    </span>
  );
}

/** Image (or video) that fills its box, or the coloured placeholder when the URL is empty. */
export function Cover({ url, alt, bg, className }: { url?: string; alt: string; bg: string; className?: string }) {
  return (
    <span className={className} style={{ position: 'absolute', inset: 0, display: 'block' }}>
      {url ? <Media url={url} alt={alt} /> : <Ph bg={bg} />}
    </span>
  );
}

/** Filter chip colours from the design (selected = orange). */
export function chipStyle(on: boolean): React.CSSProperties {
  return { border: `1px solid ${on ? '#F68B1F' : 'var(--line2)'}`, background: on ? '#F68B1F' : 'transparent', color: on ? '#0E1B33' : 'var(--fg)' };
}

// ---------- news ----------
export type NewsType = 'news' | 'announcement' | 'event';
export type NewsItem = { id: number; slug: string; type: NewsType; title: L; summary?: L; cover_url: string; featured?: boolean; published_at: string };

export const NEWS_IMG_BG = ['#0F2C52', '#123E73', '#1B2A40'];
const TAG_COL: Record<string, [string, string]> = { news: ['#E6EFFA', '#0B4A94'], announcement: ['#F68B1F', '#0E1B33'], event: ['#1683C7', '#ffffff'] };
const TAG_NAME = { en: { news: 'News', announcement: 'Announcement', event: 'Event' }, ar: { news: 'خبر', announcement: 'إعلان', event: 'فعالية' } };

export function NewsTag({ type }: { type: string }) {
  const { lang } = usePrefs();
  const c = TAG_COL[type] || TAG_COL.news;
  const name = (TAG_NAME[lang] as Record<string, string>)[type] || TAG_NAME[lang].news;
  return <span style={{ background: c[0], color: c[1], padding: '6px 12px', borderRadius: 999 }}>{name}</span>;
}

/** News card used on the News grid and under a post ("more news"). */
export function NewsCard({ p, i }: { p: NewsItem; i: number }) {
  const { L, lang } = usePrefs();
  const title = L(p.title);
  return (
    <Link to={`/news/${p.slug}`} className="mm-card rv rv-up" style={{ textDecoration: 'none', color: 'var(--fg)', display: 'flex', flexDirection: 'column', gap: 18, transitionDelay: `${(i % 3) * 0.1}s` }}>
      <span style={{ display: 'block', height: 260, borderRadius: 22, overflow: 'hidden', position: 'relative' }}>
        <Cover className="mm-img" url={p.cover_url} alt={title} bg={NEWS_IMG_BG[i % 3]} />
      </span>
      <span style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>
        <NewsTag type={p.type} />
        <time dateTime={p.published_at} style={{ color: 'var(--muted2)' }}>{fmtDate(p.published_at, lang)}</time>
      </span>
      <span className="mm-ttl" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3 }}>{title}</span>
      {L(p.summary) && <span style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--muted2)' }}>{L(p.summary)}</span>}
    </Link>
  );
}

/** Copy the current page link; returns true when it worked. */
export async function copyHere() {
  try { await navigator.clipboard.writeText(window.location.href); return true; } catch { return false; }
}
