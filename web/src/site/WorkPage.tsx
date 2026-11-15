// Work: a wall of photos and videos (from the dashboard) with type filter, shuffle and a full-screen viewer.
// Opened from a project on the home page (/work?client=<work id>): that project and all the same client's work come first,
// then the rest in the dashboard order. Opened directly: everything in a random order (new each visit).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { InnerHeader, PageState, SiteShell, IconArrow } from './Shell';
import { Ph, chipStyle } from './pageBits';
import { usePrefs } from '../lib/prefs';
import { useApi, type L } from '../lib/api';
import '../styles/pages.css';

const PG = {
  en: {
    h1a: 'Our work', h1b: 'speaks for itself',
    sub: 'Every project starts with an idea, and every idea has a purpose.',
    intro: 'At Minto Media, we create unique and creative solutions that match each brand\'s identity and needs. Explore our projects in social media management, advertising, design and content creation, and see how we turn creative ideas into real work.',
    pieces: 'Projects', shuffle: 'Shuffle', loadMore: 'Show more',
    tabs: { social: 'Social Media', branding: 'Branding', photography: 'Photography', video: 'Video Production', ads: 'Advertising Campaigns', web: 'Web Design' } as Record<string, string>,
    ctaTitle: 'Want your brand on this wall?', letsTalk: "Let's talk", close: 'Close', prev: 'Previous', next: 'Next',
    all: 'All', aFilter: 'Filter work', aWall: 'Our work',
    kind: { photo: 'Photo', video: 'Video', reel: 'Reel' } as Record<string, string>,
    cat: { social: 'Social media', branding: 'Branding', photography: 'Photography', video: 'Video production', ads: 'Ad campaign', web: 'Web design' } as Record<string, string>,
    empty: 'New work is coming soon.', viewer: 'Work viewer',
  },
  ar: {
    h1a: 'شغلنا', h1b: 'بيتكلم عن نفسه',
    sub: 'كل مشروع بيبدأ بفكرة، وكل فكرة وراها هدف.',
    intro: 'في منتو ميديا بنعمل حلول إبداعية مختلفة مناسبة لهوية كل براند واحتياجاته. اكتشف مشاريعنا في إدارة السوشيال ميديا والإعلانات والتصميم وصناعة المحتوى، وشوف إزاي بنحوّل الأفكار الإبداعية لشغل حقيقي.',
    pieces: 'مشروع', shuffle: 'خلط', loadMore: 'عرض المزيد',
    tabs: { social: 'سوشيال ميديا', branding: 'هوية بصرية', photography: 'تصوير', video: 'إنتاج فيديو', ads: 'حملات إعلانية', web: 'تصميم مواقع' } as Record<string, string>,
    ctaTitle: 'تريد علامتك على هذا الحائط؟', letsTalk: 'لنتحدث', close: 'إغلاق', prev: 'السابق', next: 'التالي',
    all: 'الكل', aFilter: 'تصفية الأعمال', aWall: 'أعمالنا',
    kind: { photo: 'صورة', video: 'فيديو', reel: 'ريلز' } as Record<string, string>,
    cat: { social: 'سوشيال ميديا', branding: 'هوية بصرية', photography: 'تصوير', video: 'إنتاج فيديو', ads: 'حملة إعلانية', web: 'تصميم مواقع' } as Record<string, string>,
    empty: 'أعمال جديدة قريبًا.', viewer: 'عارض الأعمال',
  },
};

const CATS = ['social', 'branding', 'photography', 'video', 'ads', 'web'] as const;
type Item = { id: number; kind: 'photo' | 'video' | 'reel'; category: (typeof CATS)[number]; url: string; poster_url: string; title: L; client_name: L; caption: L; tags: L };
type Filter = 'all' | Item['category'];

// placeholder colours and "random-looking" shapes from the design
const COLS: [string, string][] = [['#0B4A94', '#C5D6EC'], ['#F68B1F', '#3A2410'], ['#123E73', '#9FB8D9'], ['#0F2C52', '#9FB8D9'], ['#1683C7', '#E6EFFA'], ['#FFC27A', '#5A3A10'], ['#1B2A40', '#8FA6C6'], ['#0E5E95', '#D5E3F5']];
const PHOTO_RATIOS = ['4 / 5', '1 / 1', '3 / 4', '5 / 4', '2 / 3', '4 / 3', '3 / 4', '1 / 1'];
const VIDEO_RATIOS = ['4 / 3', '16 / 10', '1 / 1', '5 / 4'];
const ratioOf = (m: Item, i: number) => (m.kind === 'reel' ? '9 / 16' : m.kind === 'video' ? VIDEO_RATIOS[(m.id * 3 + i) % VIDEO_RATIOS.length] : PHOTO_RATIOS[(m.id * 7 + i) % PHOTO_RATIOS.length]);
const isMoving = (m: Item) => m.kind !== 'photo';

function shuffled(n: number, seed: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  if (!seed) return a; // seed 0 = the order chosen in the dashboard
  let s = seed;
  for (let j = n - 1; j > 0; j--) { s = (s * 9301 + 49297) % 233280; const r = Math.floor((s / 233280) * (j + 1)); [a[j], a[r]] = [a[r], a[j]]; }
  return a;
}
// How tall a tile is for its width (from its aspect ratio "w / h").
const tallness = (m: Item, i: number) => { const [w, h] = ratioOf(m, i).split('/').map(Number); return h / w; };

/** The wall: tiles placed row by row (1st left, 2nd next to it, ...), each into the column that is shortest so far,
 *  so the first row reads left to right (the clicked client's work sits side by side) and the columns stay even. */
function Wall({ items, wall, onOpen }: { items: Item[]; wall: number; onOpen: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(4);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      setN(window.innerWidth <= 760 ? 2 : Math.max(1, Math.min(4, Math.floor((w + 18) / 278)))); // 4 columns of 260px+
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cols: { m: Item; i: number }[][] = Array.from({ length: n }, () => []);
  const h = new Array(n).fill(0);
  items.forEach((m, i) => {
    let c = 0;
    for (let k = 1; k < n; k++) if (h[k] < h[c] - 0.01) c = k;
    cols[c].push({ m, i });
    h[c] += tallness(m, i);
  });
  return (
    <div ref={ref} className="mm-wall">
      {cols.map((col, k) => (
        <div key={k} className="mm-wcol">
          {col.map(({ m, i }) => <Tile key={`${wall}-${m.id}`} m={m} i={i} onOpen={() => onOpen(i)} />)}
        </div>
      ))}
    </div>
  );
}

const fmtLen = (sec: number) => (isFinite(sec) && sec > 0 ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}` : '');

const PLAY = <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A tile video: starts by itself (muted, looping) as soon as it is on screen and pauses when it scrolls away. The first frame shows until it plays. */
function AutoVideo({ src, poster, onLen }: { src: string; poster?: string; onLen: (s: string) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || reduceMotion() || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { rootMargin: '200px 0px' });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return (
    // poster: iPhones paint nothing before a video plays, so without it the tile is a plain colour
    // preload none when there is a picture: nothing downloads until the tile comes near the screen (20 videos loading
    // at once also blocked other requests to the site, Chrome only opens a few connections per address)
    <video ref={ref} src={poster ? src : src + '#t=0.1'} poster={poster || undefined} muted loop playsInline preload={poster ? 'none' : 'metadata'} aria-hidden="true"
      onLoadedMetadata={(e) => onLen(fmtLen(e.currentTarget.duration))}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  );
}

/** What a tile shows: the photo, or the video. */
function TileMedia({ m, alt, onLen }: { m: Item; alt: string; onLen: (s: string) => void }) {
  if (!m.url) return null;
  if (!isMoving(m)) return <img src={m.url} alt={alt} loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
  return <AutoVideo src={m.url} poster={m.poster_url} onLen={onLen} />;
}

function Tile({ m, i, onOpen }: { m: Item; i: number; onOpen: () => void }) {
  const { L, lang } = usePrefs();
  const p = PG[lang];
  const [len, setLen] = useState('');
  const col = COLS[(m.id * 3) % COLS.length];
  const client = L(m.client_name);
  const label = [p.cat[m.category] || p.kind[m.kind], client].filter(Boolean).join(' · ');
  const vars = {
    aspectRatio: ratioOf(m, i),
    '--td': `${((i % 4) * 0.08 + (i % 3) * 0.04).toFixed(2)}s`,
    '--tr': ['-12deg', '6deg', '-6deg', '12deg'][i % 4],
    '--fx': ['-180px', '-40px', '40px', '180px'][i % 4],
    '--fy': ['60px', '160px', '160px', '60px'][i % 4],
    '--rx': ['10deg', '28deg', '28deg', '10deg'][i % 4],
  } as React.CSSProperties;
  return (
    <button type="button" className="mm-tile rv" onClick={onOpen} aria-label={label} style={vars}>
      <span className="mm-img" style={{ background: col[0] }}>
        {!m.url && <Ph bg={col[0]} />}
        <TileMedia m={m} alt={client} onLen={setLen} />
      </span>
      {isMoving(m) && <span className="mm-play">{PLAY}{len || p.kind[m.kind]}</span>}
      <span className="mm-tinfo">{client && <span style={{ fontSize: 14, fontWeight: 800 }}>{client}</span>}<span style={{ fontSize: 12, opacity: 0.8 }}>{p.cat[m.category] || p.kind[m.kind]}</span></span>
    </button>
  );
}

function Lightbox({ list, index, setIndex, onClose }: { list: Item[]; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const { L, lang, isAr } = usePrefs();
  const p = PG[lang];
  const closeBtn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const n = list.length;
  const cur = list[index];
  const step = useCallback((d: number) => setIndex((index + d + n) % n), [index, n, setIndex]);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ov; before?.focus?.(); };
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') step(isAr ? -1 : 1);
      else if (e.key === 'ArrowLeft') step(isAr ? 1 : -1);
      else if (e.key === 'Tab' && box.current) {
        // keep focus inside the viewer
        const f = Array.from(box.current.querySelectorAll<HTMLElement>('button, video[controls]'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [step, onClose, isAr]);

  if (!cur) return null;
  const col = COLS[(cur.id * 3) % COLS.length];
  const client = L(cur.client_name);
  const alt = client;
  const mediaStyle: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' };
  return (
    <div ref={box} className="mm-lb wk-lb" role="dialog" aria-modal="true" aria-label={`${p.viewer}: ${[p.kind[cur.kind], client].join(' · ')}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(3,8,18,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 110px' }}>
      <button ref={closeBtn} type="button" className="mm-lbbtn" onClick={onClose} aria-label={p.close} style={{ position: 'absolute', top: 24, insetInlineEnd: 24 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
      </button>
      {n > 1 && (
        <div className="mm-lbnav" style={{ position: 'absolute', left: 24, right: 24, top: '50%', marginTop: -28, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
          <button type="button" className="mm-lbbtn" onClick={() => step(-1)} aria-label={p.prev} style={{ pointerEvents: 'auto' }}><IconArrow dir="left" size={22} /></button>
          <button type="button" className="mm-lbbtn" onClick={() => step(1)} aria-label={p.next} style={{ pointerEvents: 'auto' }}><IconArrow dir="right" size={22} /></button>
        </div>
      )}
      <div key={cur.id} className="mm-lbi" style={{ display: 'flex', gap: 32, alignItems: 'flex-end', maxWidth: 1200, width: '100%', maxHeight: '100%' }}>
        <div className="wk-lbmedia" style={{ flex: 1, minWidth: 0, height: 'min(76vh, 760px)', borderRadius: 24, background: cur.url ? 'rgba(255,255,255,.03)' : col[0], position: 'relative', overflow: 'hidden' }}>
          {!cur.url && <Ph bg={col[0]} />}
          {isMoving(cur) && cur.url
            ? <video src={cur.url} controls autoPlay loop playsInline aria-label={alt} style={mediaStyle} />
            : cur.url && <img src={cur.url} alt={alt} style={mediaStyle} />}
        </div>
        <div className="mm-lbside" style={{ width: 240, flex: 'none', display: 'flex', flexDirection: 'column', gap: 10, color: '#ffffff' }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#F68B1F' }}>{p.cat[cur.category] || p.kind[cur.kind]}</span>
          {client && <span style={{ fontFamily: "'Minto Head', sans-serif", fontSize: 40, lineHeight: 1.05, textTransform: 'uppercase' }}>{client}</span>}
          <span style={{ fontSize: 13, color: '#8FA6C6' }} aria-live="polite">{index + 1} / {n}</span>
        </div>
      </div>
    </div>
  );
}

export default function WorkPage() {
  const { lang } = usePrefs();
  const p = PG[lang];
  const { data, error, loading } = useApi<Item[]>('/work');
  const items = data || [];
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(18);
  const [wall, setWall] = useState(0); // bumps on filter/shuffle so the boxes fly in again
  const [lb, setLb] = useState(-1);
  const [sp, setSp] = useSearchParams();
  const firstId = Number(sp.get('client')) || 0; // the work item clicked on the home page
  // opened from a project on the home page: that client first, the rest in the dashboard order (seed 0);
  // opened directly: a new random order every visit
  const [seed, setSeed] = useState(() => (firstId ? 0 : Math.floor(Math.random() * 100000) + 1));

  const list = useMemo(() => {
    let order = shuffled(items.length, seed).map((k) => items[k]);
    const picked = firstId ? items.find((m) => m.id === firstId) : undefined;
    if (picked) {
      // the clicked piece, then the rest of that client's work, then everything else in the usual order
      const key = (m: Item) => (m.client_name?.en || m.client_name?.ar || '').trim().toLowerCase();
      const k = key(picked);
      const same = order.filter((m) => m.id !== picked.id && k && key(m) === k);
      order = [picked, ...same, ...order.filter((m) => m.id !== picked.id && !same.includes(m))];
    }
    return order.filter((m) => filter === 'all' || m.category === filter);
  }, [items, seed, filter, firstId]);
  const visible = list.slice(0, shown);
  const count = (c: string) => items.filter((m) => m.category === c).length;

  // a tab only shows when it has work in it
  const kinds: [Filter, string][] = [['all', p.all], ...CATS.filter((c) => count(c) > 0).map((c): [Filter, string] => [c, p.tabs[c]])];
  return (
    <SiteShell header={<InnerHeader current="work" />}>
      {/* PAGE HERO */}
      <section id="main" style={{ background: 'var(--bg)' }}>
        {/* one column: the title, the line under it, then the text, all on the first screen */}
        <div className="mm-wrap pg-hero wk-hero" style={{ paddingTop: 44, paddingBottom: 44, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 26 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h1 className="mm-h1 wk-h1" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 120, lineHeight: 1, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
              <span className="ln"><span>{p.h1a}</span></span>
              <span className="ln"><span style={{ transitionDelay: '.12s', color: '#F68B1F' }}>{p.h1b}</span></span>
            </h1>
            <span className="rv rv-up" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)' }}>{p.sub}</span>
          </div>
          <div className="rv rv-up" style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 760, transitionDelay: '.2s' }}>
            <p style={{ margin: 0, fontSize: 20, lineHeight: 1.6, color: 'var(--muted)' }}>{p.intro}</p>
          </div>
        </div>
      </section>

      {/* TOOLS: type filter + shuffle */}
      <section className="wk-tools" style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="mm-wrap pg-tabs" role="group" aria-label={p.aFilter} style={{ paddingTop: 16, paddingBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {kinds.map(([k, label]) => (
            <button key={k} type="button" className="mm-chip pg-chip" aria-pressed={filter === k} style={chipStyle(filter === k)}
              onClick={() => { setFilter(k); setShown(18); setWall((w) => w + 1); }}>{label}</button>
          ))}
          <span style={{ flex: 1 }} />
          <button type="button" className="mm-chip pg-chip mm-shuffle" onClick={() => { setSeed(Math.floor(Math.random() * 100000) + 1); setWall((w) => w + 1); if (firstId) setSp({}, { replace: true }); }}
            style={{ border: '1px solid var(--line2)', background: 'var(--card)', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" /></svg>
            {p.shuffle}
          </button>
        </div>
      </section>

      {/* THE WALL */}
      <section aria-label={p.aWall} style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap" style={{ paddingTop: 40, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 48 }}>
          {!data && <PageState loading={loading} error={error} />}
          {data && !list.length && <p style={{ margin: 0, padding: '80px 0', textAlign: 'center', fontSize: 18, color: 'var(--muted2)' }}>{p.empty}</p>}
          {visible.length > 0 && (
            <Wall items={visible} wall={wall} onOpen={setLb} />
          )}
          {list.length > shown && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="button" className="pg-ghost" onClick={() => setShown((s) => s + 12)}>{p.loadMore}</button>
            </div>
          )}
        </div>
        {lb >= 0 && visible[lb] && <Lightbox list={visible} index={lb} setIndex={setLb} onClose={() => setLb(-1)} />}
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap" style={{ paddingBottom: 120 }}>
          <div className="rv rv-pop pg-cta" style={{ background: '#F68B1F', color: '#0E1B33', borderRadius: 32, padding: '72px 64px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
            <h2 className="mm-wide pg-cta-h" style={{ margin: 0, flex: '1 1 520px', fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 72, lineHeight: 0.95, textTransform: 'uppercase' }}>{p.ctaTitle}</h2>
            <Link to="/contact" className="mm-btn mm-dark-btn" style={{ padding: '20px 32px' }}>{p.letsTalk}</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
