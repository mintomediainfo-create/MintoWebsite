// Minto Media dashboard: login, guard, layout (sidebar / phone drawer) and routes.
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/admin.css';
import { api, ApiError } from '../lib/api';
import { ShellCtx, Me, Summary } from './shell';
import { Icon, UiProvider, hasDirty, useUi } from './ui';
import Overview from './Overview';
import { Clients, IntroMedia, Services, Story, Testimonials, Work } from './Content';
import HeroVideo from './HeroVideo';
import { NewsEdit, NewsList } from './News';
import { JobEdit, JobsList } from './Jobs';
import { ApplicationView, ApplicationsList } from './Applications';
import { InquiriesList, InquiryView } from './Inquiries';
import { Notifications } from './Notifications';
import { AccountSettings, ContactSocial, Subscribers } from './Settings';

const NAV: { group: string; items: [to: string, label: string, icon: string][] }[] = [
  { group: '', items: [['/admin', 'Overview', 'home']] },
  {
    group: 'Home page',
    items: [
      ['/admin/hero', 'Hero video', 'film'],
      ['/admin/intro', 'Success media', 'image'],
      ['/admin/services', 'Services', 'layers'],
      ['/admin/work', 'Work', 'star'],
      ['/admin/clients', 'Client logos', 'users'],
      ['/admin/testimonials', 'Testimonials', 'quote'],
      ['/admin/story', 'Our story', 'clock'],
    ],
  },
  { group: 'Posts & contact', items: [['/admin/news', 'News', 'news'], ['/admin/inquiries', 'Inquiries', 'mail'], ['/admin/contact', 'Contact & social', 'pin']] },
  { group: 'Careers', items: [['/admin/jobs', 'Jobs', 'case'], ['/admin/applications', 'Applications', 'inbox']] },
  { group: 'People', items: [['/admin/subscribers', 'Subscribers', 'mail'], ['/admin/notifications', 'Phone alerts', 'bell'], ['/admin/settings', 'Settings', 'cog']] },
];

export default function Admin() {
  useEffect(() => {
    const t = document.title;
    document.title = 'Dashboard · Minto Media';
    return () => { document.title = t; };
  }, []);
  return (
    <div className="adm" dir="ltr" lang="en">
      <UiProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="*" element={<Guard />} />
        </Routes>
      </UiProvider>
    </div>
  );
}

/* ------------------------------------------------------------------ login */

function Login() {
  const [sp] = useSearchParams();
  const next = sp.get('next') || '/admin';
  const safeNext = next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin';
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // already logged in? go straight in
    api('/admin/me').then(() => navigate(safeNext, { replace: true })).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!email.trim() || !password) { setErr('Please type your email and password.'); return; }
    setBusy(true);
    try {
      await api('/auth/login', { body: { email: email.trim(), password } });
      navigate(safeNext, { replace: true });
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Could not reach the server. Check your internet connection.');
    } finally { setBusy(false); }
  }

  return (
    <main className="adm-login">
      <div className="adm-login-bg" aria-hidden="true">
        <span className="adm-blob b1" /><span className="adm-blob b2" /><span className="adm-blob b3" />
        <img className="adm-sym s1" src="/minto-symbol.png" alt="" />
        <img className="adm-sym s2" src="/minto-symbol.png" alt="" />
        <img className="adm-sym s3" src="/minto-symbol.png" alt="" />
      </div>
      <form className="adm-login-card" onSubmit={submit} noValidate>
        <div className="adm-brand big"><img className="adm-logo" src="/minto-symbol.png" alt="" /><span>Minto <b>Dashboard</b></span></div>
        <h1>Log in</h1>
        <p className="adm-muted">Manage everything on the Minto Media website.</p>
        {err && <div className="adm-login-err" role="alert">{err}</div>}
        <div className="adm-field">
          <label className="adm-label" htmlFor="adm-email">Email</label>
          <input id="adm-email" className="adm-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="adm-pw">Password</label>
          <div className="adm-pw">
            <input id="adm-pw" className="adm-input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="adm-linkbtn" onClick={() => setShow(!show)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <button type="submit" className="adm-btn primary block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <a className="adm-login-back" href="/">← Back to the website</a>
      </form>
      <p className="adm-login-foot">Minto Media · We support your success</p>
    </main>
  );
}

/* ------------------------------------------------------------------ guard + layout */

function Guard() {
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<'load' | 'ok' | 'out' | 'down'>('load');
  const loc = useLocation();

  const check = useCallback(() => {
    setState('load');
    api<Me>('/admin/me')
      .then((m) => { setMe(m); setState('ok'); })
      .catch((e) => setState(e instanceof ApiError && e.status === 401 ? 'out' : 'down'));
  }, []);
  useEffect(check, [check]);

  if (state === 'out') return <Navigate to={'/admin/login?next=' + encodeURIComponent(loc.pathname + loc.search)} replace />;
  if (state === 'down') {
    return (
      <main className="adm-login"><div className="adm-login-card">
        <h1>Can't reach the server</h1>
        <p className="adm-muted">Check your internet connection and try again.</p>
        <button type="button" className="adm-btn primary block" onClick={check}>Try again</button>
      </div></main>
    );
  }
  if (state === 'load' || !me) return <div className="adm-boot" aria-busy="true" aria-label="Loading dashboard"><img className="adm-logo" src="/minto-symbol.png" alt="" /></div>;
  return <Layout me={me} setMe={setMe} />;
}

function Layout({ me, setMe }: { me: Me; setMe: (m: Me) => void }) {
  const [summary, setSummary] = useState<Summary>();
  const [menu, setMenu] = useState(false);
  const { fail, go, confirm } = useUi();
  const loc = useLocation();
  const navigate = useNavigate();

  const refreshSummary = useCallback(() => {
    api<Summary>('/admin/summary').then(setSummary).catch(fail);
  }, [fail]);
  useEffect(() => { refreshSummary(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setMenu(false); }, [loc.pathname]);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [menu]);

  const newApps = Number(summary?.counts.new_apps || 0);
  const newInq = Number(summary?.counts.new_inquiries || 0);

  async function logout() {
    if (hasDirty() && !(await confirm({ title: 'Log out without saving?', message: 'You have changes that are not saved.', ok: 'Log out', danger: true }))) return;
    try { await api('/auth/logout', { body: {} }); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  }

  return (
    <ShellCtx.Provider value={{ me, setMe, summary, refreshSummary }}>
      <a href="#adm-main" className="adm-skip">Skip to content</a>
      <header className="adm-topbar">
        <button type="button" className="adm-icon-btn" aria-label="Open menu" aria-expanded={menu} aria-controls="adm-side" onClick={() => setMenu(true)}><Icon name="menu" /></button>
        <div className="adm-brand"><img className="adm-logo" src="/minto-symbol.png" alt="" /><span>Minto <b>Dashboard</b></span></div>
        {newApps > 0 ? <NavLink to="/admin/applications?status=new" className="adm-top-badge" aria-label={newApps + ' new applications'}>{newApps}</NavLink> : <span />}
      </header>
      <div className="adm-shell">
        {menu && <div className="adm-scrim" onClick={() => setMenu(false)} aria-hidden="true" />}
        <aside id="adm-side" className={'adm-side' + (menu ? ' open' : '')} aria-label="Dashboard menu">
          <div className="adm-side-head">
            <div className="adm-brand"><img className="adm-logo" src="/minto-symbol.png" alt="" /><span>Minto <b>Dashboard</b></span></div>
            <button type="button" className="adm-icon-btn adm-side-close" aria-label="Close menu" onClick={() => setMenu(false)}><Icon name="x" /></button>
          </div>
          <nav className="adm-nav">
            {NAV.map((g) => (
              <div key={g.group || 'main'} className="adm-nav-group">
                {g.group && <h2>{g.group}</h2>}
                <ul>
                  {g.items.map(([to, label, icon]) => (
                    <li key={to}>
                      <NavLink to={to} end={to === '/admin'} className={({ isActive }) => 'adm-nav-link' + (isActive ? ' active' : '')}
                        onClick={(e) => { if (hasDirty()) { e.preventDefault(); go(to); } }}>
                        <Icon name={icon} /> <span>{label}</span>
                        {to === '/admin/applications' && newApps > 0 && <span className="adm-nav-badge" aria-label={newApps + ' new'}>{newApps}</span>}
                        {to === '/admin/inquiries' && newInq > 0 && <span className="adm-nav-badge" aria-label={newInq + ' new'}>{newInq}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="adm-side-foot">
            <div className="adm-me"><span className="adm-avatar">{(me.name || me.email).slice(0, 1).toUpperCase()}</span><div><b>{me.name || 'Admin'}</b><span>{me.email}</span></div></div>
            <div className="adm-side-actions">
              <a className="adm-btn ghost small" href="/" target="_blank" rel="noreferrer"><Icon name="ext" size={15} /> Website</a>
              <button type="button" className="adm-btn ghost small" onClick={logout}><Icon name="logout" size={15} /> Log out</button>
            </div>
          </div>
        </aside>
        <main id="adm-main" className="adm-main" tabIndex={-1}>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="hero" element={<HeroVideo />} />
            <Route path="intro" element={<IntroMedia />} />
            <Route path="services" element={<Services />} />
            <Route path="work" element={<Work />} />
            <Route path="clients" element={<Clients />} />
            <Route path="testimonials" element={<Testimonials />} />
            <Route path="story" element={<Story />} />
            <Route path="news" element={<NewsList />} />
            <Route path="news/:id" element={<NewsEdit />} />
            <Route path="inquiries" element={<InquiriesList />} />
            <Route path="inquiries/:id" element={<InquiryView />} />
            <Route path="contact" element={<ContactSocial />} />
            <Route path="jobs" element={<JobsList />} />
            <Route path="jobs/:id" element={<JobEdit />} />
            <Route path="applications" element={<ApplicationsList />} />
            <Route path="applications/:id" element={<ApplicationView />} />
            <Route path="subscribers" element={<Subscribers />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<AccountSettings />} />
            <Route path="*" element={<div className="adm-page"><h1>Page not found</h1><p><NavLink to="/admin">Back to the overview</NavLink></p></div>} />
          </Routes>
        </main>
      </div>
    </ShellCtx.Provider>
  );
}
