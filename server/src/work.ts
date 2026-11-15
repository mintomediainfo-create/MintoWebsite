// The Work page items (and which 6 are on the home page). Called by db:content. It replaces the pieces it added before
// (files under /media/work/) and the "[...]" samples; pieces added in the dashboard are kept.
import { q } from './db';
import { env } from './env';

const t = (en: string, ar: string) => ({ en, ar });
const J = JSON.stringify;
type T = ReturnType<typeof t>;
type Cat = 'social' | 'branding' | 'photography' | 'video' | 'ads' | 'web';
const MEDIA = env.MEDIA_URL; // on R2 (npm run media:upload first); locally '' so web/public/media is used

// Work page, top to bottom. The client's second batch (rNN = reels, pNN = photos, Nov 2026) comes first, the first 20
// videos (wNN) last. The first 6 are on the home page; the very first is Featured (the big card).
// No client name -> "Minto Media". All files are in web/public/media/work (on R2 with npm run media:upload).
const MINTO = t('Minto Media', 'منتو ميديا');
const C = {
  zafeer: t('Zafeer', 'زفير'), lulu: t('Lulu Lounge', 'لولو لاونج'), santorini: t('Santorini', 'سانتوريني'), lail: t('Lail', 'ليل'),
  bob: t('BOB Coffee & Bakery', 'بوب كافيه آند بيكري'),
};
type W = { f: string; kind: 'reel' | 'photo'; cat: Cat; client?: T };
const reel = (n: number, client?: T): W => ({ f: `r${String(n).padStart(2, '0')}`, kind: 'reel', cat: 'social', client });
const photo = (n: number, client?: T): W => ({ f: `p${String(n).padStart(2, '0')}`, kind: 'photo', cat: 'photography', client });
// Lail's own photos (lNN.webp, from the client's Lail folder)
const lail = (n: number): W => ({ f: `l${String(n).padStart(2, '0')}`, kind: 'photo', cat: 'photography', client: C.lail });
const oldReel = (n: number, cat: Cat, client?: T): W => ({ f: `w${String(n).padStart(2, '0')}`, kind: 'reel', cat, client });

const HOME: W[] = [reel(18, C.zafeer), reel(2, C.lulu), photo(19, C.bob), reel(31, C.lail), lail(2), reel(14, C.santorini)];
const REEL_NAMES: Record<number, T> = { 2: C.lulu, 15: C.lulu, 19: C.lulu, 14: C.santorini, 18: C.zafeer, 40: C.zafeer, 31: C.lail };
const PHOTO_NAMES: Record<number, T> = { 18: C.bob, 19: C.bob, 21: C.bob, 24: C.bob, 26: C.zafeer, 30: C.lail, 31: C.lail };
const DROPPED_PHOTOS = new Set([1]); // p01 (Mostafa Gad) taken off the site, Nov 2026
const onHome = new Set(HOME.map((w) => w.f));
// the rest of the new batch: reels and photos taking turns
const restReels = Array.from({ length: 40 }, (_, i) => reel(i + 1, REEL_NAMES[i + 1])).filter((w) => !onHome.has(w.f));
const batchPhotos = Array.from({ length: 34 }, (_, i) => i + 1).filter((n) => !DROPPED_PHOTOS.has(n)).map((n) => photo(n, PHOTO_NAMES[n]));
const restPhotos = [lail(1), lail(3), ...batchPhotos].filter((w) => !onHome.has(w.f));
const mixed: W[] = [];
for (let i = 0; i < Math.max(restReels.length, restPhotos.length); i++) {
  if (restReels[i]) mixed.push(restReels[i]);
  if (restPhotos[i]) mixed.push(restPhotos[i]);
}
const OLD: W[] = [
  oldReel(6, 'photography'), oldReel(1, 'social', C.zafeer), oldReel(13, 'photography'), oldReel(7, 'video'), oldReel(12, 'photography'), oldReel(17, 'video'),
  oldReel(2, 'photography'), oldReel(3, 'photography'), oldReel(4, 'photography'), oldReel(5, 'video'), oldReel(8, 'video'),
  oldReel(9, 'video'), oldReel(10, 'ads'), oldReel(11, 'video'), oldReel(14, 'photography'), oldReel(15, 'photography'),
  oldReel(16, 'video'), oldReel(18, 'video'), oldReel(19, 'social'), oldReel(20, 'photography', C.zafeer),
];
const WORK: W[] = [...HOME, ...mixed, ...OLD];

export async function seedWork() {
  await q("DELETE FROM work_items WHERE client_name->>'en' LIKE '[%' OR url LIKE '%/media/work/%' OR (url = '' AND poster_url = '')");
  for (const [i, w] of WORK.entries()) {
    const f = `${MEDIA}/media/work/${w.f}`;
    const [url, poster] = w.kind === 'reel' ? [f + '.mp4', f + '.jpg'] : [f + '.webp', f + '.webp'];
    await q('INSERT INTO work_items (kind, category, url, poster_url, client_name, on_home, featured, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [w.kind, w.cat, url, poster, J(w.client || MINTO), i < 6, i === 0, i]);
  }
  console.log(`work: ${WORK.length} pieces saved (6 on the home page)`);
}
