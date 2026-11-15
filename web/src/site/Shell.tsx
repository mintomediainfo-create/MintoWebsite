// The frame every public page shares: theme/language root, full-screen menu, header (inner pages),
// floating buttons, back-to-top button, footer and the scroll reveal animations.
import { createContext, ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePrefs } from '../lib/prefs';
import { useApi } from '../lib/api';
import { boardSwitch, zapTheme } from '../lib/transitions';
import { STR } from './strings';

export const LOGO = '/minto-symbol.png';
export const LOGO_DARK = '/minto-symbol-dark.png?v=2'; // dark mode: left figure white, right figure orange
/** The Minto symbol for the current theme (for places where it sits on the page background). */
export function useLogo() {
  return usePrefs().theme === 'dark' ? LOGO_DARK : LOGO;
}

export function useT() {
  const { lang } = usePrefs();
  return STR[lang] as Record<keyof typeof STR.en, string>;
}

/** Settings (contact, social, hero, testimonials display) — read once and shared. */
export function useSettings() {
  return useApi<any>('/settings').data;
}

// ---------- shared switches ----------
export function useSwitches() {
  const { theme, lang, setTheme, setLang } = usePrefs();
  return {
    toggleTheme: (e: React.MouseEvent<HTMLElement>) => {
      const next = theme === 'light' ? 'dark' : 'light';
      zapTheme(e.currentTarget, next, () => setTheme(next));
    },
    toggleLang: () => boardSwitch(theme === 'dark', () => setLang(lang === 'ar' ? 'en' : 'ar')),
  };
}

export const IconMoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const IconArrow = ({ dir = 'right', size = 20 }: { dir?: 'left' | 'right' | 'diag'; size?: number }) => (
  <svg className="mm-rtl" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === 'left' && <path d="M15 18l-6-6 6-6" />}
    {dir === 'right' && <path d="M9 18l6-6-6-6" />}
    {dir === 'diag' && (<><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>)}
  </svg>
);

/** Theme + language buttons (used in the hero, the inner header and the floating corner). */
export function SwitchButtons({ className = 'mm-hbtn', style }: { className?: string; style?: React.CSSProperties }) {
  const { theme } = usePrefs();
  const t = useT();
  const { toggleTheme, toggleLang } = useSwitches();
  const themeLabel = theme === 'light' ? t.themeToDark : t.themeToLight;
  return (
    <>
      <button type="button" className={className + ' mm-langbtn'} style={style} onClick={toggleLang} aria-label={t.langLabel} title={t.langLabel}>{t.langShort}</button>
      <button type="button" className={className} style={style} onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>{theme === 'light' ? <IconMoon /> : <IconSun />}</button>
    </>
  );
}

// "Minto Media" in the brand font: the lettering of the logo itself (Typo Round, taken from the brand guide as a shape),
// so it always looks right, with or without the font files. Same in both languages, like any logo. Colour = currentColor.
const WORDMARK = { w: 869.4, h: 112.2, d: 'M17.6 103.5C17.6 106 16.7 108 15 109.6C13.3 111.4 11.3 112.2 8.9 112.2L8.7 112.2C6.3 112.2 4.3 111.4 2.6 109.6C0.9 108 0 106 0 103.5L0 34.6C0 25 3.4 16.9 10.1 10.1C16.9 3.4 25 0 34.6 0C46 0 54.6 3.8 60.4 11.4C66.1 3.8 74.7 0 86.1 0C95.6 0 103.8 3.4 110.5 10.1C117.3 16.9 120.6 25 120.6 34.6L120.6 103.5C120.6 105.9 119.8 108 118.1 109.6C116.4 111.4 114.3 112.2 111.9 112.2L111.8 112.2C109.4 112.2 107.3 111.4 105.7 109.6C104 108 103.1 106 103.1 103.5L103.1 34.6C103.1 29.8 101.5 25.8 98.2 22.5C94.8 19.2 90.8 17.5 86.1 17.5C81.4 17.5 77.4 19.2 74.1 22.5C70.8 25.8 69.1 29.8 69.1 34.6L69.1 103.5C69.1 106 68.3 108 66.5 109.6C64.9 111.4 62.9 112.2 60.4 112.2L60.3 112.2C57.9 112.2 55.8 111.4 54.1 109.6C52.4 108 51.5 106 51.5 103.5L51.5 34.6C51.5 29.8 49.9 25.8 46.6 22.5C43.3 19.2 39.3 17.5 34.6 17.5C29.9 17.5 25.9 19.2 22.6 22.5C19.3 25.8 17.6 29.8 17.6 34.6L17.6 103.5ZM145.8 29.5C148.3 29.5 150.3 30.3 151.9 32C153.7 33.8 154.5 35.8 154.5 38.2L154.5 103.5C154.5 106 153.7 108 151.9 109.6C150.3 111.4 148.3 112.2 145.8 112.2L145.7 112.2C143.3 112.2 141.2 111.4 139.5 109.6C137.8 108 136.9 106 136.9 103.5L136.9 38.2C136.9 35.8 137.8 33.8 139.5 32C141.2 30.3 143.3 29.5 145.7 29.5L145.8 29.5ZM145.8 20.1C143 20.1 140.6 19.1 138.6 17.2C136.7 15.2 135.7 12.8 135.7 10.1C135.7 7.3 136.7 5 138.6 3C140.6 1.1 143 0.1 145.8 0.1C148.5 0.1 150.8 1.1 152.8 3C154.8 4.9 155.8 7.3 155.8 10.1C155.8 12.9 154.8 15.3 152.8 17.2C150.8 19.1 148.5 20.1 145.8 20.1ZM187.8 103.5C187.8 106 186.9 108 185.2 109.6C183.4 111.4 181.4 112.2 179.1 112.2L178.8 112.2C176.5 112.2 174.5 111.4 172.7 109.6C171 108 170.1 106 170.1 103.5L170.1 64.2C170.1 54.7 173.5 46.5 180.4 39.7C187.2 32.9 195.3 29.5 204.9 29.5C214.5 29.5 222.6 32.9 229.4 39.7C236.2 46.5 239.6 54.7 239.6 64.2L239.6 103.5C239.6 106 238.8 108 237 109.6C235.4 111.4 233.4 112.2 230.9 112.2L230.8 112.2C228.4 112.2 226.3 111.4 224.6 109.6C222.9 108 222 106 222 103.5L222 64.2C222 59.5 220.4 55.4 217.1 52.1C213.7 48.7 209.7 47.1 204.9 47.1C200.1 47.1 196.1 48.7 192.7 52.1C189.4 55.4 187.8 59.5 187.8 64.2L187.8 103.5ZM261.4 0C263.8 0 265.8 0.8 267.5 2.5C269.3 4.2 270.1 6.3 270.1 8.7L270.1 29.5L280.9 29.5C283.3 29.5 285.3 30.3 287 32C288.7 33.8 289.6 35.8 289.6 38.2L289.6 38.4C289.6 40.8 288.7 42.8 287 44.5C285.3 46.2 283.3 47.1 280.9 47.1L270.1 47.1L270.1 89.7C270.1 91.1 270.6 92.2 271.6 93.2C272.5 94.2 273.7 94.6 275.2 94.6L280.9 94.6C283.3 94.6 285.3 95.5 287 97.2C288.7 98.9 289.6 101 289.6 103.4L289.6 103.5C289.6 106 288.7 108 287 109.6C285.3 111.4 283.3 112.2 280.9 112.2L275.2 112.2C268.9 112.2 263.6 110 259.1 105.6C254.7 101.2 252.5 95.9 252.5 89.7L252.5 8.7C252.5 6.3 253.4 4.2 255.1 2.5C256.8 0.8 258.9 0 261.2 0L261.4 0ZM337.4 47.2C330.8 47.2 325.2 49.5 320.5 54.2C315.9 58.8 313.6 64.5 313.6 71.1C313.6 77.6 315.9 83.2 320.5 87.9C325.2 92.5 330.8 94.8 337.4 94.8C344 94.8 349.6 92.5 354.2 87.9C358.9 83.2 361.2 77.6 361.2 71.1C361.2 64.5 358.9 58.8 354.2 54.2C349.6 49.5 344 47.2 337.4 47.2ZM337.4 29.5C348.8 29.5 358.6 33.5 366.7 41.6C374.8 49.7 378.8 59.4 378.8 70.8C378.8 82.2 374.8 92 366.7 100.1C358.6 108.2 348.8 112.2 337.4 112.2C326 112.2 316.3 108.2 308.2 100.1C300.1 92 296 82.2 296 70.8C296 59.4 300.1 49.7 308.2 41.6C316.3 33.5 326 29.5 337.4 29.5ZM450.3 103.5C450.3 106 449.4 108 447.7 109.6C446 111.4 444 112.2 441.6 112.2L441.4 112.2C439 112.2 437 111.4 435.3 109.6C433.6 108 432.7 106 432.7 103.5L432.7 34.6C432.7 25 436.1 16.9 442.8 10.1C449.6 3.4 457.7 0 467.3 0C478.7 0 487.3 3.8 493.1 11.4C498.8 3.8 507.4 0 518.8 0C528.3 0 536.5 3.4 543.2 10.1C550 16.9 553.3 25 553.3 34.6L553.3 103.5C553.3 105.9 552.5 108 550.8 109.6C549.1 111.4 547 112.2 544.6 112.2L544.5 112.2C542.1 112.2 540 111.4 538.4 109.6C536.7 108 535.8 106 535.8 103.5L535.8 34.6C535.8 29.8 534.2 25.8 530.9 22.5C527.5 19.2 523.5 17.5 518.8 17.5C514.1 17.5 510.1 19.2 506.8 22.5C503.5 25.8 501.8 29.8 501.8 34.6L501.8 103.5C501.8 106 501 108 499.2 109.6C497.6 111.4 495.6 112.2 493.1 112.2L493 112.2C490.6 112.2 488.5 111.4 486.8 109.6C485.1 108 484.2 106 484.2 103.5L484.2 34.6C484.2 29.8 482.6 25.8 479.3 22.5C476 19.2 472 17.5 467.3 17.5C462.6 17.5 458.6 19.2 455.3 22.5C452 25.8 450.3 29.8 450.3 34.6L450.3 103.5ZM606.2 47.2C599.6 47.2 593.9 49.5 589.3 54.2C584.7 58.8 582.4 64.5 582.4 71.1L582.4 71.6L622.6 53.5C619 49.3 613.6 47.2 606.2 47.2ZM643.8 53.6C644.3 54.8 644.6 56 644.6 57.3C644.6 58.3 644.4 59.3 644.1 60.3C643.2 62.5 641.7 64.2 639.5 65.2C632.7 68.2 623.9 72.2 613 77.1C599.5 83.2 591.5 86.8 589.2 87.9C592.8 92.5 598.5 94.8 606.2 94.8C611.3 94.8 616 93.3 620.1 90.3C624.2 87.3 627 83.5 628.7 78.8C630.1 74.9 632.8 72.9 637 72.9C640 72.9 642.4 74.2 644.1 76.7C645.2 78.2 645.8 79.8 645.8 81.5C645.8 82.5 645.6 83.5 645.2 84.6C642.4 92.8 637.4 99.4 630.3 104.4C623.1 109.6 615.1 112.2 606.2 112.2C594.8 112.2 585 108.2 576.9 100.1C568.8 92 564.8 82.2 564.8 70.8C564.8 59.4 568.8 49.7 576.9 41.6C585 33.5 594.8 29.5 606.2 29.5C614.4 29.5 621.9 31.7 628.8 36.2C635.5 40.6 640.5 46.4 643.8 53.6ZM679.6 54.2C675 58.8 672.7 64.5 672.7 71.1C672.7 77.6 675 83.2 679.6 87.9C684.2 92.5 689.9 94.8 696.5 94.8C703 94.8 708.6 92.5 713.3 87.9C717.9 83.2 720.3 77.6 720.3 71.1C720.3 64.5 717.9 58.8 713.3 54.2C708.6 49.5 703 47.2 696.5 47.2C689.9 47.2 684.2 49.5 679.6 54.2ZM729.2 0C731.5 0 733.5 0.8 735.3 2.5C737 4.2 737.9 6.3 737.9 8.7L737.9 71.1C737.8 82.5 733.7 92.2 725.6 100.2C717.5 108.2 707.8 112.2 696.5 112.2C685.1 112.2 675.3 108.2 667.2 100.1C659.1 92 655.1 82.2 655.1 70.8C655.1 59.4 659.1 49.7 667.2 41.6C675.3 33.5 685.1 29.5 696.5 29.5C706.9 29.5 714.8 31.9 720.3 36.6L720.3 8.7C720.3 6.3 721.1 4.2 722.8 2.5C724.6 0.8 726.6 0 728.9 0L729.2 0ZM762.3 29.5C764.8 29.5 766.8 30.3 768.4 32C770.2 33.8 771 35.8 771 38.2L771 103.5C771 106 770.2 108 768.4 109.6C766.8 111.4 764.8 112.2 762.3 112.2L762.2 112.2C759.8 112.2 757.7 111.4 756 109.6C754.3 108 753.4 106 753.4 103.5L753.4 38.2C753.4 35.8 754.3 33.8 756 32C757.7 30.3 759.8 29.5 762.2 29.5L762.3 29.5ZM762.3 20.1C759.5 20.1 757.1 19.1 755.1 17.2C753.2 15.2 752.2 12.8 752.2 10.1C752.2 7.3 753.2 5 755.1 3C757.1 1.1 759.5 0.1 762.3 0.1C765 0.1 767.3 1.1 769.3 3C771.3 4.9 772.3 7.3 772.3 10.1C772.3 12.9 771.3 15.3 769.3 17.2C767.3 19.1 765 20.1 762.3 20.1ZM811.2 54C806.6 58.7 804.3 64.3 804.3 70.8C804.3 77.5 806.6 83.1 811.2 87.7C815.8 92.3 821.4 94.6 828 94.6C834.6 94.6 840.3 92.3 844.8 87.7C849.5 83.1 851.8 77.5 851.8 70.8C851.8 64.3 849.5 58.7 844.8 54C840.2 49.4 834.6 47.1 828 47.1C821.4 47.1 815.8 49.4 811.2 54ZM857.3 41.6C865.4 49.7 869.4 59.4 869.4 70.8L869.4 103.5C869.4 106 868.6 108 866.8 109.6C865.1 111.4 863.1 112.2 860.7 112.2L860.5 112.2C858.2 112.2 856.1 111.4 854.4 109.6C852.7 108 851.8 106 851.8 103.5C846.4 109.3 838.4 112.2 828 112.2C816.6 112.2 806.9 108.2 798.8 100.1C790.7 92 786.6 82.2 786.6 70.8C786.6 59.4 790.7 49.7 798.8 41.6C806.9 33.5 816.6 29.5 828 29.5C839.4 29.5 849.2 33.5 857.3 41.6Z' };
export function BrandName({ height, className, style }: { height: number; className?: string; style?: React.CSSProperties }) {
  const t = useT();
  return (
    // a few units of room around the letters so the edges of the M and the last "a" are never clipped
    <svg className={'mm-brandname' + (className ? ' ' + className : '')} viewBox={`-4 -4 ${WORDMARK.w + 8} ${WORDMARK.h + 8}`} height={height} width={(height * (WORDMARK.w + 8)) / (WORDMARK.h + 8)} role="img" aria-label={t.brand} style={{ display: 'block', flex: 'none', overflow: 'visible', ...style }}>
      <path d={WORDMARK.d} fill="currentColor" />
    </svg>
  );
}

// ---------- menu ----------
const MenuCtx = createContext<{ open: () => void }>({ open: () => {} });
export const useMenu = () => useContext(MenuCtx);

export function socialLinks(settings: any) {
  const s = settings?.social || {};
  const names: [string, string][] = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['x', 'X'], ['behance', 'Behance']];
  return names.filter(([k]) => s[k]).map(([k, label]) => ({ key: k, label, href: s[k] as string }));
}

// The phone numbers from the dashboard (Egypt + UAE), as tel: links. Empty numbers are skipped.
export function phoneLinks(c: any, t: ReturnType<typeof useT>) {
  const list: [string, string][] = [[c?.phone, t.phEg], [c?.phoneUae, t.phUae]];
  return list.filter(([n]) => String(n || '').replace(/\D/g, '')).map(([n, label]) => ({ label, number: String(n), href: `tel:${String(n).replace(/[^+\d]/g, '')}` }));
}

// The office addresses from the dashboard (Egypt + UAE), each with its Google Maps link if there is one. Empty ones are skipped.
export function placeLinks(c: any, t: ReturnType<typeof useT>, L: (v: any) => string) {
  const list: [any, string, string][] = [[c?.address, c?.mapUrl, t.placeEg], [c?.addressUae, c?.mapUrlUae, t.placeUae]];
  return list.filter(([a]) => L(a)).map(([a, href, label]) => ({ label, text: L(a), href: String(href || '') }));
}

// The WhatsApp numbers from the dashboard (Egypt + UAE), as wa.me links. Empty numbers are skipped.
export function waLinks(c: any, t: ReturnType<typeof useT>) {
  const list: [string, string][] = [[c?.whatsapp, t.waEg], [c?.whatsappUae, t.waUae]];
  return list.filter(([n]) => String(n || '').replace(/\D/g, '')).map(([n, label]) => ({ label, number: String(n), href: `https://wa.me/${String(n).replace(/\D/g, '')}` }));
}

function Menu({ onClose }: { onClose: () => void }) {
  const t = useT();
  const settings = useSettings();
  const c = settings?.contact || {};
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const links: [string, string][] = [['/', t.home], ['/about', t.about], ['/#services', t.whatWeDo], ['/work', t.ourWork], ['/#history', t.ourStory], ['/news', t.news], ['/careers', t.careers], ['/contact', t.contact]];
  return (
    <div className="mm-menu" role="dialog" aria-modal="true" aria-label={t.aMenu} style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F68B1F', color: '#0E1B33', overflow: 'auto' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '26px 32px 48px', display: 'flex', flexDirection: 'column', gap: 40 }} className="mm-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BrandName height={19} />
          <button type="button" onClick={onClose} aria-label={t.aClose} autoFocus style={{ width: 52, height: 52, borderRadius: 999, border: '2px solid #0E1B33', background: 'transparent', color: '#0E1B33', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
          </button>
        </div>
        <nav aria-label={t.aMain} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: "'Minto Head', sans-serif", fontSize: 88, lineHeight: 1.05, textTransform: 'uppercase' }}>
          {links.map(([href, label], i) => (
            <Link key={href} className="mm-mlink" to={href} onClick={() => { onClose(); if (href === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ textDecoration: 'none', color: '#0E1B33', animationDelay: `${0.25 + i * 0.07}s` }}>{label}</Link>
          ))}
        </nav>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, fontSize: 15, fontWeight: 700, borderTop: '2px solid #0E1B33', paddingTop: 20 }}>
          <span className="mm-ltr">{[c.email, c.phone].filter(Boolean).join(' · ')}</span>
          <span style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {socialLinks(settings).map((s) => <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: '#0E1B33' }}>{s.label}</a>)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- header for inner pages ----------
export function InnerHeader({ current }: { current: 'home' | 'about' | 'work' | 'news' | 'careers' | '' }) {
  const t = useT();
  const { open } = useMenu();
  const logo = useLogo();
  const link = (to: string, label: string, key: string) => (
    <Link to={to} aria-current={current === key ? 'page' : undefined} style={{ textDecoration: 'none', color: current === key ? '#F68B1F' : 'var(--fg)' }}>{label}</Link>
  );
  return (
    <header className="mm-ihead" style={{ position: 'sticky', top: 0, zIndex: 60, background: 'var(--bg)', borderBottom: '1px solid var(--line)', transition: 'background .4s ease' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Link to="/" aria-label={t.aHome} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--fg)' }}>
          <img src={logo} alt="" width={34} height={36} style={{ display: 'block', width: 34, height: 36, objectFit: 'contain' }} />
          <BrandName className="mm-brandtxt" height={16} />
        </Link>
        <nav className="mm-hnav" aria-label={t.aMain} style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {link('/', t.home, 'home')}{link('/about', t.about, 'about')}{link('/work', t.work, 'work')}{link('/news', t.news, 'news')}{link('/careers', t.careers, 'careers')}
        </nav>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link className="mm-hcta" to="/contact" style={{ textDecoration: 'none', background: '#F68B1F', color: '#0E1B33', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 22px', borderRadius: 999, marginInlineEnd: 6 }}>{t.letsTalk}</Link>
          <SwitchButtons />
          <button type="button" className="mm-hbtn" onClick={open} aria-label={t.aOpen} style={{ flexDirection: 'column', gap: 6, padding: '0 13px' }}>
            <span style={{ display: 'block', width: '100%', height: 2, background: 'currentColor' }} />
            <span style={{ display: 'block', width: '100%', height: 2, background: 'currentColor' }} />
            <span style={{ display: 'block', width: '100%', height: 2, background: 'currentColor' }} />
          </button>
        </span>
      </div>
    </header>
  );
}

// ---------- footer ----------
export function Footer() {
  const t = useT();
  const { L } = usePrefs();
  const settings = useSettings();
  const c = settings?.contact || {};
  const a = { color: '#D5E3F5', textDecoration: 'none' };
  return (
    <footer id="contact" style={{ background: '#0B4A94', color: '#D5E3F5', overflow: 'hidden' }}>
      <div style={{ width: '100%', margin: 0, padding: '64px 48px 28px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: '1 1 520px', minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 800, fontSize: 104, lineHeight: 1, letterSpacing: '-0.04em', color: '#ffffff' }}>
              <span className="ln mm-slow" style={{ padding: '0 .15em .1em 0' }}><span>{t.letsTalk}<span style={{ color: '#F68B1F' }}>.</span></span></span>
            </h2>
            <Link className="rv rv-left" to="/contact" style={{ alignSelf: "flex-start", textDecoration: "none", background: "#F68B1F", color: "#0E1B33", fontWeight: 800, fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", padding: "18px 30px", borderRadius: 999, transitionDelay: ".25s" }}>{t.contactUs}</Link>
            <p className="rv rv-left" style={{ margin: 0, maxWidth: 460, fontSize: 15, lineHeight: 1.6, transitionDelay: '.35s' }}>
              <span style={{ display: 'block', color: '#ffffff', fontWeight: 800, marginBottom: 6 }}>{t.footTag}</span>
              {t.footP}
            </p>
          </div>
          <div className="rv rv-right mm-fgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, auto))', gap: 40, fontSize: 15, transitionDelay: '.15s' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ color: '#ffffff', fontWeight: 800 }}>{t.pages}</span>
              <Link to="/" style={a}>{t.home}</Link><Link to="/about" style={a}>{t.about}</Link><Link to="/#services" style={a}>{t.ourServices}</Link><Link to="/work" style={a}>{t.work}</Link>
              <Link to="/news" style={a}>{t.news}</Link><Link to="/careers" style={a}>{t.careers}</Link><Link to="/contact" style={a}>{t.contactUs}</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ color: '#ffffff', fontWeight: 800 }}>{t.ourServicesF}</span>
              {/* each one opens the home page's services and brings that card to the middle (see Services in Home.tsx) */}
              {(Array.isArray(settings?.serviceTitles) && settings.serviceTitles.length ? settings.serviceTitles.map((x: any) => L(x)) : [t.fs1, t.fs2, t.fs3, t.fs4, t.fs5, t.fs6])
                .map((s: string, i: number) => <Link key={i} to={'/#service-' + (i + 1)} style={a}>{s}</Link>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ color: '#ffffff', fontWeight: 800 }}>{t.follow}</span>
              {socialLinks(settings).map((s) => <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" style={a}>{s.label}</a>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ color: '#ffffff', fontWeight: 800 }}>{t.contact}</span>
              {phoneLinks(c, t).map((p) => <a key={p.href} className="mm-ltr" href={p.href} style={a}>{p.number}</a>)}
              {waLinks(c, t).map((w) => <a key={w.href} href={w.href} target="_blank" rel="noopener noreferrer" style={a}>{w.label}</a>)}
              {c.email && <a href={`mailto:${c.email}`} style={a}>{c.email}</a>}
              {placeLinks(c, t, L).map((p) => (p.href ? <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer" style={a}>{p.text}</a> : <span key={p.label}>{p.text}</span>))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingTop: 24, borderTop: '1px solid #3C6DAA', fontSize: 14 }}>
          <BrandName height={14} style={{ color: '#ffffff' }} />
          <span>{t.rights.replace('2026', String(new Date().getFullYear()))}</span>
          <button type="button" className="mm-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer', background: 'transparent', color: '#ffffff', fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', border: '1px solid #3C6DAA', padding: '10px 16px', borderRadius: 999, transition: 'background .3s ease, color .3s ease', fontFamily: 'inherit' }}>{t.backTop}</button>
        </div>
      </div>
    </footer>
  );
}

// ---------- back-to-top button with a progress ring ----------
function ToTop() {
  const t = useT();
  const [show, setShow] = useState(false);
  const ring = useRef<SVGCircleElement>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        // hidden again once the footer's last row (with its own "Back to top" button) is on screen, so it never covers it
        const foot = document.getElementById('contact');
        const atEnd = !!foot && foot.getBoundingClientRect().bottom < window.innerHeight + 40;
        setShow(y > 700 && !atEnd);
        const h = document.documentElement.scrollHeight - window.innerHeight;
        const p = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;
        ring.current?.setAttribute('stroke-dashoffset', (207.3 * (1 - p)).toFixed(1));
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return (
    <button type="button" className={'mm-totop' + (show ? '' : ' off')} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t.topLabel} title={t.topLabel} tabIndex={show ? 0 : -1}>
      <svg className="mm-topring" viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="35" r="33" stroke="rgba(246,139,31,.25)" /><circle ref={ring} cx="35" cy="35" r="33" stroke="#F68B1F" strokeDasharray="207.3" strokeDashoffset="207.3" /></svg>
      <svg className="mm-toparr" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
    </button>
  );
}

// ---------- short loading screen between pages ----------
// The loader itself lives in index.html (window.mmLoader). The first open already shows the full one, so only a change
// of page (not just of #section) shows the short one. Layout effect: it covers the screen before the new page paints.
declare global { interface Window { mmLoader?: (short?: boolean) => void } }
let lastPath: string | null = null;
function usePageLoader(path: string) {
  useLayoutEffect(() => {
    if (lastPath !== null && lastPath !== path) window.mmLoader?.(true);
    lastPath = path;
  }, [path]);
}

// ---------- scroll reveals (.rv and .ln get "on" when they come into view) ----------
function useReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    document.documentElement.classList.add('mm-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('on');
        else if (e.boundingClientRect.top > 0 && e.target.classList.contains('on')) { e.target.classList.add('seen'); e.target.classList.remove('on'); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    // phones (motion allowed): like impactbbdo.com, the blocks slide in from the sides as you scroll, one from the right,
    // the next from the left. The timeline steps, logo band and CTA columns join in too.
    const sides = window.matchMedia('(max-width: 760px)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let side = 0;
    const watch = () => {
      if (sides) document.querySelectorAll('.mm-ms, .mm-logobar, .mm-cta > div').forEach((el) => el.classList.add('rv'));
      document.querySelectorAll('.rv:not([data-w]), .ln:not([data-w])').forEach((el) => {
        el.setAttribute('data-w', '1');
        if (sides && el.classList.contains('rv') && !el.classList.contains('mm-tile') && !el.classList.contains('mm-squiggle') && !el.closest('.mm-svc-pinned')) el.classList.add(side++ % 2 ? 'mm-slideL' : 'mm-slideR');
        io.observe(el);
      });
    };
    watch();
    let pending = 0;
    const mo = new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; watch(); }); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect(); mo.disconnect(); cancelAnimationFrame(pending);
      document.querySelectorAll('[data-w]').forEach((el) => el.removeAttribute('data-w'));
    };
  }, []);
}

/**
 * The page frame. `floating` = show the theme/language buttons in the corner once `#top` (the hero) has scrolled away (home page).
 * Every direct child of the root is a "band" for the theme animation; give bands that use --bg2 the attribute data-bg="bg2".
 */
export function SiteShell({ children, header = null, floating = false }: { children: ReactNode; header?: ReactNode; floating?: boolean }) {
  const { theme, lang } = usePrefs();
  const t = useT();
  const [menu, setMenu] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const loc = useLocation();
  useReveal();
  usePageLoader(loc.pathname);
  useEffect(() => setMenu(false), [loc.pathname, loc.hash]);
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menu]);
  useEffect(() => {
    if (!floating) return;
    const hero = document.getElementById('top');
    if (!hero || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: '-90px 0px 0px 0px', threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, [floating]);

  return (
    <MenuCtx.Provider value={{ open: () => setMenu(true) }}>
      <div className={`mm-theme mm-${theme} mm-${lang === 'ar' ? 'ar' : 'en'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <a className="mm-skip" href="#main">{t.skip}</a>
        <ToTop />
        {floating && (
          <span className={'mm-fabs' + (pastHero ? '' : ' off')} aria-hidden={!pastHero}>
            <SwitchButtons className="mm-fab" />
          </span>
        )}
        {menu && <Menu onClose={() => setMenu(false)} />}
        {header}
        {children}
        <Footer />
      </div>
    </MenuCtx.Provider>
  );
}

/** Image or video, picked by `kind` or by the file extension. Videos play muted and loop. */
export function Media({ url, poster, kind, alt = '', className, style }: { url?: string; poster?: string; kind?: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  if (!url) return null;
  const vid = kind === 'video' || kind === 'reel' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
  const s: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style };
  return vid ? (
    <video className={className} src={url} poster={poster || undefined} muted loop playsInline autoPlay preload="metadata" aria-hidden={!alt} style={s} />
  ) : (
    <img className={className} src={url} alt={alt} loading="lazy" decoding="async" style={s} />
  );
}

export function PageState({ loading, error }: { loading?: boolean; error?: unknown }) {
  const t = useT();
  if (error) return <p style={{ padding: '120px 32px', textAlign: 'center', color: 'var(--muted)' }}>{t.error}</p>;
  if (loading) return <p style={{ padding: '120px 32px', textAlign: 'center', color: 'var(--muted2)' }} aria-live="polite">{t.loading}</p>;
  return null;
}
