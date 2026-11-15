// Theme (light/dark) and language (en/ar), shared by every page and saved in the browser.
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { L, Lang } from './api';
import { tr } from './api';

type Theme = 'light' | 'dark';
interface Prefs {
  theme: Theme;
  lang: Lang;
  isAr: boolean;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  /** pick the current language from a {en, ar} value */
  L: (v: L | string | null | undefined) => string;
}

const Ctx = createContext<Prefs>(null as any);

function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (read('mm-theme') === 'dark' ? 'dark' : 'light'));
  const [lang, setLang] = useState<Lang>(() => (read('mm-lang') === 'ar' ? 'ar' : 'en'));

  useEffect(() => {
    try { localStorage.setItem('mm-theme', theme); localStorage.setItem('mm-lang', lang); } catch { /* private mode */ }
    const h = document.documentElement;
    h.lang = lang;
    h.dir = lang === 'ar' ? 'rtl' : 'ltr';
    h.setAttribute('data-theme', theme);
    document.body.style.background = theme === 'dark' ? '#050B16' : '#ffffff';
  }, [theme, lang]);

  const value = useMemo<Prefs>(() => ({ theme, lang, isAr: lang === 'ar', setTheme, setLang, L: (v) => tr(v, lang) }), [theme, lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePrefs = () => useContext(Ctx);
