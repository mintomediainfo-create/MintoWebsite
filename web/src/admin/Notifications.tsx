// Phone alerts for the team (ntfy). One "topic" (like a hashtag) for job applications and one for contact-form inquiries.
import { useState } from 'react';
import { api } from '../lib/api';
import { useSetting } from './Content';
import { Any, Card, ErrorBox, PageHead, SaveBar, Skeleton, TextIn, Toggle, useUi } from './ui';

type Kind = 'jobs' | 'inquiries';
type Cfg = { server: string; jobs: { topic: string; on: boolean }; inquiries: { topic: string; on: boolean } };

const KINDS: [Kind, string, string][] = [
  ['jobs', 'Job applications', 'An alert for every new application and every CV sent without a role.'],
  ['inquiries', 'Inquiries', 'An alert for every message sent from the “Let’s talk” form.'],
];

const randomName = (kind: Kind) => {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return 'minto-' + kind + '-' + Array.from(bytes, (b) => a[b % a.length]).join('');
};
const clean = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);

export function Notifications() {
  const s = useSetting<Cfg>('notifications');
  const { toast, fail } = useUi();
  const [testing, setTesting] = useState<Kind | ''>('');
  const v = s.draft;
  const setKind = (k: Kind, patch: Any) => s.patch({ [k]: { ...(v as Any)[k], ...patch } } as Any);

  async function test(k: Kind) {
    setTesting(k);
    try {
      const r = await api<{ ok: boolean }>('/admin/notifications/test', { body: { kind: k } });
      toast(r.ok ? 'Sent. Check your phone.' : 'It was not delivered. Check that the topic name is saved and the server is right.', r.ok ? undefined : 'error');
    } catch (e) { fail(e); } finally { setTesting(''); }
  }

  return (
    <div className="adm-page">
      <PageHead title="Phone alerts" intro="Get a notification on your phone the moment someone applies for a job or sends a message from the website." />
      <ErrorBox error={s.error} retry={s.reload} />
      {!v ? <Skeleton rows={3} /> : (
        <>
          <Card title="How to get the alerts">
            <ol className="adm-steps">
              <li>Install the free <b>ntfy</b> app on your phone (App Store or Google Play).</li>
              <li>In the app press <b>+</b> and type the <b>topic name</b> of the alerts you want.</li>
              <li>That's it. Each person on the team picks the topics that match their work.</li>
            </ol>
            <p className="adm-hint">A topic name works like a password: anyone who knows it can read its alerts. Use the “Make a private name” button, and share the name only with your team. Alerts never include phone numbers, emails or CVs, only a name and a link to the dashboard.</p>
          </Card>
          {KINDS.map(([k, title, text]) => (
            <Card key={k} title={title}>
              <p className="adm-hint">{text}</p>
              <div className="adm-form">
                <Toggle checked={!!v[k].on} onChange={(x) => setKind(k, { on: x })} label="Send alerts" />
                <TextIn label="Topic name" value={v[k].topic || ''} onChange={(x) => setKind(k, { topic: clean(x) })} placeholder="e.g. minto-jobs-k7x2q9"
                  hint="Letters, numbers, - and _ only. The same name you type in the ntfy app." mono />
                <div className="adm-form-actions" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <button type="button" className="adm-btn ghost" onClick={() => setKind(k, { topic: randomName(k) })}>Make a private name</button>
                  <button type="button" className="adm-btn ghost" disabled={!v[k].topic || s.dirty || testing === k} onClick={() => test(k)}>{testing === k ? 'Sending…' : 'Send a test'}</button>
                  {s.dirty && <span className="adm-muted small">Save first, then send a test.</span>}
                </div>
              </div>
            </Card>
          ))}
          <Card title="Advanced">
            <TextIn label="ntfy server" value={v.server || ''} onChange={(x) => s.patch({ server: x.trim() })} placeholder="https://ntfy.sh" hint="Leave as it is unless you run your own ntfy server." mono />
          </Card>
          <SaveBar dirty={s.dirty} saving={s.saving} onSave={() => s.save()} onReset={() => s.orig && s.reset(s.orig)} />
        </>
      )}
    </div>
  );
}
