// Emails every subscriber when a news post is published (once per post).
import { q, one } from '../db';
import { mailEnv } from '../env';
import { sendMail } from './mail';

type L = { en?: string; ar?: string } | null;
const pick = (v: L, lang: string) => (v && (v[lang as 'en' | 'ar'] || v.en || v.ar)) || '';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TXT = {
  en: { kind: { news: 'News', announcement: 'Announcement', event: 'Event' } as Record<string, string>, read: 'Read more', why: 'You get this because you joined the Minto Media newsletter.', unsub: 'Unsubscribe' },
  ar: { kind: { news: 'خبر', announcement: 'إعلان', event: 'فعالية' } as Record<string, string>, read: 'اقرأ المزيد', why: 'وصلتك هذه الرسالة لأنك اشتركت في نشرة منتو ميديا.', unsub: 'إلغاء الاشتراك' },
};

export function unsubscribeUrl(token: string) {
  return `${mailEnv.SITE_URL}/api/unsubscribe?token=${token}`;
}

/** Sends the post to all subscribers. Safe to call many times: only the first call for a published post sends. */
export async function notifyNews(newsId: number) {
  // claim the post, so saving it again never emails people twice
  const post = await one<any>(`UPDATE news SET notified_at = now() WHERE id = $1 AND status = 'published' AND notified_at IS NULL RETURNING id, slug, type, title, summary`, [newsId]);
  if (!post) return { sent: 0 };
  const subs = await q<{ email: string; token: string; lang: string }>('SELECT email, token, lang FROM subscribers');
  let sent = 0;
  for (let i = 0; i < subs.length; i += 10) {
    await Promise.all(subs.slice(i, i + 10).map(async (s) => {
      const lang = s.lang === 'ar' ? 'ar' : 'en';
      const tx = TXT[lang];
      const title = pick(post.title, lang);
      const summary = pick(post.summary, lang);
      const link = `${mailEnv.SITE_URL}/news/${post.slug}`;
      const un = unsubscribeUrl(s.token);
      const dir = lang === 'ar' ? 'rtl' : 'ltr';
      const html = `<div dir="${dir}" style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0E1B33">
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F68B1F">${esc(tx.kind[post.type] || '')}</p>
  <h1 style="margin:0 0 12px;font-size:26px;line-height:1.3">${esc(title)}</h1>
  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#3E4F68">${esc(summary)}</p>
  <a href="${link}" style="display:inline-block;background:#F68B1F;color:#0E1B33;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px">${tx.read}</a>
  <hr style="border:0;border-top:1px solid #DCE4EF;margin:32px 0 16px">
  <p style="margin:0;font-size:12px;color:#56677F">${tx.why} <a href="${un}" style="color:#56677F">${tx.unsub}</a></p>
</div>`;
      const text = `${title}\n\n${summary}\n\n${tx.read}: ${link}\n\n${tx.why}\n${tx.unsub}: ${un}`;
      try {
        await sendMail(s.email, title, html, text, { 'List-Unsubscribe': `<${un}>` });
        sent++;
      } catch (e) {
        console.error('newsletter: could not send to', s.email, (e as Error).message);
      }
    }));
  }
  return { sent };
}
