import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Home from './site/Home';
import WorkPage from './site/WorkPage';
import NewsPage from './site/NewsPage';
import NewsDetail from './site/NewsDetail';
import CareersPage from './site/CareersPage';
import JobPage from './site/JobPage';
import ContactPage from './site/ContactPage';
import AboutPage from './site/AboutPage';
import SendCvPage from './site/SendCvPage';
import { InnerHeader, SiteShell, useT } from './site/Shell';

const Admin = lazy(() => import('./admin/Admin'));

/**
 * New page → start at the top. The page you are already on (a footer/menu link to it) → glide back to the top.
 * A link with #section → scroll to it once it exists. #services and #service-N are done by the home page's Services section
 * (it scrolls past its intro and brings that card to the middle). `key` changes on every click, so the same link works twice.
 */
function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    const samePage = lastPath.current === pathname;
    lastPath.current = pathname;
    if (!hash) { window.scrollTo({ top: 0, left: 0, behavior: (samePage ? 'smooth' : 'instant') as ScrollBehavior }); return; }
    if (hash === '#services' || hash.startsWith('#service-')) return;
    let tries = 0, tm = 0;
    const id = decodeURIComponent(hash.slice(1));
    const go = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (tries++ < 30) tm = window.setTimeout(go, 100);
    };
    go();
    return () => clearTimeout(tm);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function NotFound() {
  const t = useT();
  return (
    <SiteShell header={<InnerHeader current="" />}>
      <main id="main" className="mm-wrap" style={{ padding: '160px 32px', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
        <h1 className="mm-h2" style={{ fontSize: 120 }}>404</h1>
        <p style={{ fontSize: 20, color: 'var(--muted)', margin: 0 }}>{t.notFoundP}</p>
        <Link className="mm-btn" to="/">{t.backHome}</Link>
      </main>
    </SiteShell>
  );
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/work" element={<WorkPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsDetail />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/careers/send-cv" element={<SendCvPage />} />
        <Route path="/careers/:slug" element={<JobPage />} />
        <Route path="/admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
