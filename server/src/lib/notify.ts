// Team alerts for each new job application and contact-form inquiry, two ways (each one optional, set in the dashboard):
// - email: the full details, to the team's address (Reply goes straight to the visitor). Needs the SMTP_* settings.
// - phone: a push notification through ntfy (https://ntfy.sh). Each kind has its own "topic" (like a hashtag) that people
//   subscribe to in the ntfy app. A topic name works like a password on the public server, so phone alerts never carry
//   phone numbers, emails or files, only a name and a link.
import { one } from '../db';
import { mailEnv } from '../env';
import { mailConfigured, sendMail } from './mail';

export type NotifyKind = 'jobs' | 'inquiries';
type Channel = { topic: string; on: boolean; email: string };
export type NotifySettings = { server: string; jobs: Channel; inquiries: Channel };

export const NOTIFY_DEFAULTS: NotifySettings = {
  server: 'https://ntfy.sh',
  jobs: { topic: '', on: true, email: 'careers@mintomediaagency.com' },
  inquiries: { topic: '', on: true, email: 'contact@mintomediaagency.com' },
};

export async function readNotifySettings(): Promise<NotifySettings> {
  const row = await one<{ value: any }>("SELECT value FROM settings WHERE key = 'notifications'");
  const v = row?.value || {};
  return {
    server: String(v.server || NOTIFY_DEFAULTS.server).replace(/\/$/, ''),
    jobs: { ...NOTIFY_DEFAULTS.jobs, ...(v.jobs || {}) },
    inquiries: { ...NOTIFY_DEFAULTS.inquiries, ...(v.inquiries || {}) },
  };
}

/** The details for the email (never sent to the phone): rows of [label, value], and who a reply should go to. */
export type MailDetails = { rows: [string, string][]; replyTo?: string };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function mailBody(title: string, d: MailDetails, link: string) {
  const rows = d.rows.filter(([, v]) => v && v.trim());
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0E1B33;max-width:620px">
<h2 style="margin:0 0 16px;color:#0B4A94">${esc(title)}</h2>
<table cellpadding="8" style="border-collapse:collapse;width:100%">${rows.map(([k, v]) =>
    `<tr><td style="border-bottom:1px solid #E3E8F0;color:#56677F;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="border-bottom:1px solid #E3E8F0;white-space:pre-wrap" dir="auto">${esc(v)}</td></tr>`).join('')}</table>
<p style="margin:22px 0"><a href="${esc(link)}" style="background:#F68B1F;color:#0E1B33;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Open in the dashboard</a></p>
<p style="color:#8A9AB1;font-size:12px">Sent by the Minto Media website.${d.replyTo ? ' Press Reply to answer them directly.' : ''}</p></div>`;
  const text = `${title}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nOpen in the dashboard: ${link}\n`;
  return { html, text };
}

export type NotifyResult = { phone: boolean; email: 'sent' | 'off' | 'not-set-up' | 'failed' };

/**
 * Sends one alert (email + phone, whichever are set). Never throws: an alert problem must not break the form the visitor
 * just sent. `force` sends even when the kind is switched off (the dashboard's test button).
 */
export async function notify(kind: NotifyKind, title: string, message: string, path: string,
  opts: { force?: boolean; mail?: MailDetails } = {}): Promise<NotifyResult> {
  const out: NotifyResult = { phone: false, email: 'off' };
  let s: NotifySettings;
  try { s = await readNotifySettings(); } catch (e) { console.error('notify: settings', (e as Error).message); return out; }
  const c = s[kind];
  if (!c.on && !opts.force) return out;
  const link = mailEnv.SITE_URL + path;

  const phone = (async () => {
    const topic = (c.topic || '').trim();
    if (!topic) return;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 4000);
      // JSON publishing keeps Arabic text intact (plain headers could not)
      const r = await fetch(s.server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, title, message, click: link, tags: [kind === 'jobs' ? 'briefcase' : 'speech_balloon'] }),
        signal: ctl.signal,
      });
      clearTimeout(timer);
      out.phone = r.ok;
    } catch (e) { console.error('notify (phone) failed:', (e as Error).message); }
  })();

  const email = (async () => {
    const to = (c.email || '').trim();
    if (!to) return;
    if (!mailConfigured) out.email = 'not-set-up'; // still printed in the server console by sendMail (local development)
    try {
      const { html, text } = mailBody(title, opts.mail || { rows: [['', message]] }, link);
      const headers: Record<string, string> = {};
      if (opts.mail?.replyTo) headers['Reply-To'] = opts.mail.replyTo;
      await sendMail(to, `${title}: ${message}`.slice(0, 180), html, text, headers);
      if (mailConfigured) out.email = 'sent';
    } catch (e) {
      out.email = 'failed';
      console.error('notify (email) failed:', (e as Error).message);
    }
  })();

  await Promise.all([phone, email]);
  return out;
}
