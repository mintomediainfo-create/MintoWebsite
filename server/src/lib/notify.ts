// Phone alerts for the team through ntfy (https://ntfy.sh). Each kind of event has its own "topic" (like a hashtag):
// people subscribe to a topic in the ntfy app and get a push notification. Topic names are set in the dashboard.
// A topic name works like a password on the public server, so alerts never carry phone numbers, emails or files, only a name and a link.
import { one } from '../db';
import { mailEnv } from '../env';

export type NotifyKind = 'jobs' | 'inquiries';
export type NotifySettings = { server: string; jobs: { topic: string; on: boolean }; inquiries: { topic: string; on: boolean } };

export const NOTIFY_DEFAULTS: NotifySettings = { server: 'https://ntfy.sh', jobs: { topic: '', on: true }, inquiries: { topic: '', on: true } };

export async function readNotifySettings(): Promise<NotifySettings> {
  const row = await one<{ value: any }>("SELECT value FROM settings WHERE key = 'notifications'");
  const v = row?.value || {};
  return {
    server: String(v.server || NOTIFY_DEFAULTS.server).replace(/\/$/, ''),
    jobs: { ...NOTIFY_DEFAULTS.jobs, ...(v.jobs || {}) },
    inquiries: { ...NOTIFY_DEFAULTS.inquiries, ...(v.inquiries || {}) },
  };
}

/** Sends one alert. Never throws: a notification problem must not break the form the visitor just sent. Returns true if ntfy accepted it. */
export async function notify(kind: NotifyKind, title: string, message: string, path: string, opts: { force?: boolean } = {}): Promise<boolean> {
  try {
    const s = await readNotifySettings();
    const c = s[kind];
    const topic = (c.topic || '').trim();
    if (!topic || (!c.on && !opts.force)) return false;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    // JSON publishing keeps Arabic text intact (plain headers could not)
    const r = await fetch(s.server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, title, message, click: mailEnv.SITE_URL + path, tags: [kind === 'jobs' ? 'briefcase' : 'speech_balloon'] }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
    return r.ok;
  } catch (e) {
    console.error('notify failed:', (e as Error).message);
    return false;
  }
}
