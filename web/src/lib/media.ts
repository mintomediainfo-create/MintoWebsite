// Where the site's media lives (videos, client logos, the hero). On the live site: Cloudflare R2 (VITE_MEDIA_URL =
// the R2 public URL, e.g. https://media.mintomediaagency.com, set in Vercel). Locally: empty, so web/public/media is used.
// The files are not in git: they are uploaded to R2 with `npm run media:upload` (server/src/uploadMedia.ts).
export const MEDIA_URL = ((import.meta.env.VITE_MEDIA_URL as string | undefined) || '').replace(/\/$/, '');
/** media('/media/hero/hero.mp4') -> the full address of that file */
export const media = (path: string) => MEDIA_URL + path;
