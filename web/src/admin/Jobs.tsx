// Careers: jobs list (with application counts) and the job editor with
// the page sections builder and the application questions builder.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, L } from '../lib/api';
import {
  Any, Badge, Card, Empty, ErrorBox, GLink, Icon, LInput, LListEditor, PageHead, SaveBar, Segmented, SelectIn, Skeleton, SortList, TextIn, Toggle,
  asL, clone, emptyL, en, fmtDate, toDateInput, uid, useDirty, useDraft, useLoad, useUi,
} from './ui';

const STATUS: [string, string][] = [['open', 'Open (taking applications)'], ['closed', 'Closed'], ['draft', 'Draft (hidden)']];
const STATUS_TONE: Record<string, string> = { open: 'green', closed: 'grey', draft: 'orange' };
const STATUS_SHORT: Record<string, string> = { open: 'Open', closed: 'Closed', draft: 'Draft' };

const SECTION_STYLES: [string, string][] = [['text', 'Paragraph'], ['bullets', 'Bullet list'], ['checks', 'Check list'], ['cards', 'Cards']];
const Q_TYPES: [string, string][] = [['text', 'Short answer'], ['textarea', 'Long answer'], ['single', 'One choice'], ['multi', 'Several choices']];

/* ------------------------------------------------------------------ list */

export function JobsList() {
  const { data, error, loading, reload, setData } = useLoad<Any[]>('/admin/r/jobs');
  const apps = useLoad<Any[]>('/admin/applications');
  const { confirm, toast, fail } = useUi();
  const navigate = useNavigate();
  const counts: Record<number, { all: number; fresh: number }> = {};
  for (const a of apps.data || []) {
    const c = (counts[a.job_id] ||= { all: 0, fresh: 0 });
    c.all++; if (a.status === 'new') c.fresh++;
  }

  async function reorder(next: Any[]) {
    setData(next);
    try { await api('/admin/r/jobs/reorder', { body: { ids: next.map((x) => x.id) } }); toast('New order saved.'); }
    catch (e) { fail(e); reload(); }
  }
  async function remove(it: Any) {
    const n = counts[it.id]?.all || 0;
    if (!(await confirm({
      title: 'Delete this job?',
      message: <>“{en(it.title)}” will be removed for good.{n > 0 && <> Its {n} application{n > 1 ? 's' : ''} will be kept.</>} To stop new applications, set it to Closed instead.</>,
      ok: 'Delete', danger: true,
    }))) return;
    try { await api('/admin/r/jobs/' + it.id, { method: 'DELETE' }); setData((data || []).filter((x) => x.id !== it.id)); toast('Job deleted.'); }
    catch (e) { fail(e); }
  }
  async function duplicate(it: Any) {
    try {
      const { id, slug, created_at, sort, ...rest } = clone(it);
      const copy = await api<Any>('/admin/r/jobs', { body: { ...rest, title: { en: (rest.title?.en || '') + ' (copy)', ar: rest.title?.ar ? rest.title.ar + ' (نسخة)' : '' }, status: 'draft' } });
      toast('Copy made. It is a draft until you open it.');
      navigate('/admin/jobs/' + copy.id);
    } catch (e) { fail(e); }
  }

  return (
    <div className="adm-page">
      <PageHead title="Jobs" intro="Jobs on the Careers page. Only open jobs show on the site and take applications." site="/careers"
        actions={<GLink className="adm-btn primary" to="/admin/jobs/new"><Icon name="plus" /> Add job</GLink>} />
      <ErrorBox error={error} retry={reload} />
      {loading && !data ? <Skeleton rows={3} /> : data && data.length === 0 ? (
        <Empty title="No jobs yet" text="Add a job and people can apply from the Careers page."
          action={<GLink className="adm-btn primary" to="/admin/jobs/new"><Icon name="plus" /> Add first job</GLink>} />
      ) : (
        <SortList items={(data || []) as (Any & { id: number })[]} onMove={reorder} noun="job" labelOf={(it) => en(it.title)}
          render={(it) => {
            const c = counts[it.id];
            return (
              <div className="adm-row">
                <div className="adm-row-main">
                  <GLink to={'/admin/jobs/' + it.id} className="adm-row-title">{en(it.title) || '(no title)'}</GLink>
                  <div className="adm-row-sub">{[en(it.department), en(it.location), en(it.job_type)].filter(Boolean).join(' · ')}{it.deadline && ' · Deadline ' + fmtDate(it.deadline)}</div>
                  <div className="adm-row-badges">
                    <Badge tone={STATUS_TONE[it.status]}>{STATUS_SHORT[it.status] || it.status}</Badge>
                    <GLink to={'/admin/applications?job=' + it.id} className="adm-badge-link">
                      <Badge tone={c?.fresh ? 'orange' : 'grey'}>{c?.all || 0} application{c?.all === 1 ? '' : 's'}{c?.fresh ? ` · ${c.fresh} new` : ''}</Badge>
                    </GLink>
                  </div>
                </div>
                <div className="adm-row-actions">
                  {it.status === 'open' && <a className="adm-icon-btn" href={'/careers/' + it.slug} target="_blank" rel="noreferrer" aria-label={'View ' + en(it.title) + ' on site'}><Icon name="ext" /></a>}
                  <button type="button" className="adm-icon-btn" aria-label={'Duplicate ' + en(it.title)} title="Duplicate" onClick={() => duplicate(it)}><Icon name="copy" /></button>
                  <GLink className="adm-icon-btn" to={'/admin/jobs/' + it.id} aria-label={'Edit ' + en(it.title)}><Icon name="edit" /></GLink>
                  <button type="button" className="adm-icon-btn danger" aria-label={'Delete ' + en(it.title)} onClick={() => remove(it)}><Icon name="trash" /></button>
                </div>
              </div>
            );
          }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

const blankJob = (): Any => ({
  title: emptyL(), department: emptyL(), location: emptyL(), job_type: { en: 'Full time', ar: 'دوام كامل' }, level: emptyL(), summary: emptyL(),
  sections: [
    { title: { en: 'About the role', ar: 'عن الوظيفة' }, style: 'text', text: emptyL(), items: [] },
    { title: { en: 'What you will do', ar: 'ماذا ستفعل' }, style: 'bullets', text: emptyL(), items: [emptyL()] },
    { title: { en: 'What you need', ar: 'ماذا نحتاج منك' }, style: 'checks', text: emptyL(), items: [emptyL()] },
  ],
  questions: [], deadline: '', status: 'draft', slug: '',
});

/** make sure the JSON from the database has every field the editor needs */
function normalize(j: Any): Any {
  return {
    ...j,
    deadline: toDateInput(j.deadline),
    sections: (Array.isArray(j.sections) ? j.sections : []).map((s: Any) => ({
      title: asL(s.title), style: s.style || 'text', text: asL(s.text), items: (s.items || []).map(asL),
    })),
    questions: (Array.isArray(j.questions) ? j.questions : []).map((q: Any) => ({
      id: q.id || uid(), label: asL(q.label), type: q.type || 'text', required: !!q.required, options: (q.options || []).map(asL),
    })),
  };
}

type Sec = { _k?: number; title: L; style: string; text: L; items: L[] };
type Q = { id: string; label: L; type: string; required: boolean; options: L[] };

export function JobEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { data, error, reload } = useLoad<Any>(isNew ? null : '/admin/r/jobs/' + id);
  const d = useDraft<Any>(undefined);
  const { toast, fail, confirm } = useUi();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'details' | 'page' | 'form'>('details');
  useDirty(d.dirty);

  useEffect(() => {
    if (isNew) d.reset(blankJob());
    else if (data) d.reset(normalize(data));
  }, [isNew, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = d.draft;

  async function save() {
    if (!v) return;
    if (!v.title.en.trim() && !v.title.ar.trim()) { toast('Please write the job title.', 'error'); setTab('details'); return; }
    const badQ = v.questions.findIndex((q: Q) => !q.label.en.trim() && !q.label.ar.trim());
    if (badQ >= 0) { toast(`Question ${badQ + 1} has no text.`, 'error'); setTab('form'); return; }
    const noOpt = v.questions.findIndex((q: Q) => (q.type === 'single' || q.type === 'multi') && q.options.filter((o) => o.en || o.ar).length < 2);
    if (noOpt >= 0) { toast(`Question ${noOpt + 1} needs at least 2 choices.`, 'error'); setTab('form'); return; }
    setSaving(true);
    try {
      const { id: _i, created_at, sort, ...body } = v;
      body.questions = body.questions.map((q: Q) => ({ ...q, options: q.type === 'single' || q.type === 'multi' ? q.options.filter((o) => o.en || o.ar) : [] }));
      body.sections = body.sections.map((s: Sec) => ({ title: s.title, style: s.style, text: s.style === 'text' ? s.text : emptyL(), items: s.style === 'text' ? [] : s.items.filter((o) => o.en || o.ar) }));
      if (isNew && !body.slug) delete body.slug;
      const saved = isNew ? await api<Any>('/admin/r/jobs', { body }) : await api<Any>('/admin/r/jobs/' + v.id, { method: 'PUT', body: { ...body, slug: v.slug || '' } });
      d.reset(normalize(saved));
      toast('Job saved.');
      if (isNew) navigate('/admin/jobs/' + saved.id, { replace: true });
    } catch (e) { fail(e); } finally { setSaving(false); }
  }

  if (error) return <div className="adm-page"><ErrorBox error={error} retry={reload} /><GLink to="/admin/jobs" className="adm-back"><Icon name="left" size={16} /> All jobs</GLink></div>;
  if (!v) return <div className="adm-page"><Skeleton rows={6} /></div>;

  const secs: Sec[] = v.sections;
  const qs: Q[] = v.questions;
  const setSec = (i: number, p: Partial<Sec>) => d.patch({ sections: secs.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const setQ = (i: number, p: Partial<Q>) => d.patch({ questions: qs.map((s, j) => (j === i ? { ...s, ...p } : s)) });

  return (
    <div className="adm-page">
      <GLink to="/admin/jobs" className="adm-back"><Icon name="left" size={16} /> All jobs</GLink>
      <PageHead title={isNew ? 'New job' : en(v.title) || 'Edit job'}
        site={!isNew && d.orig?.status === 'open' ? '/careers/' + d.orig.slug : undefined} siteLabel="View job page" />

      <div className="adm-tabs" role="tablist" aria-label="Job parts">
        {([['details', '1. Basic details'], ['page', '2. Job page'], ['form', '3. Application form']] as const).map(([k, t]) => (
          <button key={k} type="button" role="tab" id={'tab-' + k} aria-selected={tab === k} aria-controls={'panel-' + k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="adm-editor" role="tabpanel" id="panel-details" aria-labelledby="tab-details">
          <div className="adm-editor-main">
            <Card>
              <LInput label="Job title" value={v.title} onChange={(x) => d.patch({ title: x })} />
              <div className="adm-two">
                <LInput label="Department" value={v.department} onChange={(x) => d.patch({ department: x })} placeholder={{ en: 'Creative', ar: 'الإبداع' }} />
                <LInput label="Location" value={v.location} onChange={(x) => d.patch({ location: x })} placeholder={{ en: 'Cairo / Remote', ar: 'القاهرة / عن بعد' }} />
                <LInput label="Job type" value={v.job_type} onChange={(x) => d.patch({ job_type: x })} placeholder={{ en: 'Full time', ar: 'دوام كامل' }} />
                <LInput label="Level" value={v.level} onChange={(x) => d.patch({ level: x })} placeholder={{ en: '2+ years', ar: 'خبرة سنتين+' }} />
              </div>
              <LInput label="Short summary" textarea rows={3} value={v.summary} onChange={(x) => d.patch({ summary: x })} hint="Shown on the job card in the Careers list." />
            </Card>
          </div>
          <aside className="adm-editor-side">
            <Card title="Status">
              <SelectIn label="Status" value={v.status} onChange={(x) => d.patch({ status: x })} options={STATUS} />
              <TextIn label="Last day to apply (optional)" type="date" value={v.deadline || ''} onChange={(x) => d.patch({ deadline: x })} />
              <TextIn label="Web address (slug)" mono value={v.slug} onChange={(x) => d.patch({ slug: x.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="made from the title" hint={<>The page will be at <code>/careers/{v.slug || '…'}</code>.</>} />
            </Card>
          </aside>
        </div>
      )}

      {tab === 'page' && (
        <div role="tabpanel" id="panel-page" aria-labelledby="tab-page">
          <p className="adm-muted">The parts of the job details page, from top to bottom. Each part has a title and either a paragraph or a list.</p>
          {secs.length === 0 && <Empty title="No parts yet" text="Add the first part, e.g. “About the role”." />}
          <SortList items={secs.map((s, i) => ({ ...s, id: i }))} noun="part" labelOf={(s) => 'part “' + (s.title.en || s.id + 1) + '”'}
            onMove={(n) => d.patch({ sections: n.map(({ id: _x, ...s }) => s) })}
            render={(s, i) => (
              <div className="adm-builder">
                <div className="adm-builder-head">
                  <strong>Part {i + 1}</strong>
                  <button type="button" className="adm-btn ghost small danger-text" onClick={async () => {
                    if (await confirm({ title: 'Remove this part?', message: `“${s.title.en || 'Part ' + (i + 1)}” and its text will be removed.`, ok: 'Remove', danger: true }))
                      d.patch({ sections: secs.filter((_, j) => j !== i) });
                  }}><Icon name="trash" size={15} /> Remove</button>
                </div>
                <LInput label="Part title" value={s.title} onChange={(x) => setSec(i, { title: x })} />
                <Segmented label="Show as" value={s.style} onChange={(x) => setSec(i, { style: x, items: x !== 'text' && !s.items.length ? [emptyL()] : s.items })} options={SECTION_STYLES} />
                {s.style === 'text'
                  ? <LInput label="Text" textarea rows={4} value={s.text} onChange={(x) => setSec(i, { text: x })} hint="Leave an empty line to start a new paragraph." />
                  : <LListEditor label="Lines" itemName="Line" addLabel="Add line" items={s.items} onChange={(x) => setSec(i, { items: x })} />}
              </div>
            )} />
          <button type="button" className="adm-btn ghost" onClick={() => d.patch({ sections: [...secs, { title: emptyL(), style: 'bullets', text: emptyL(), items: [emptyL()] }] })}>
            <Icon name="plus" /> Add part
          </button>
        </div>
      )}

      {tab === 'form' && (
        <div className="adm-editor" role="tabpanel" id="panel-form" aria-labelledby="tab-form">
          <div className="adm-editor-main">
            <div className="adm-note">
              <p><b>“About you” is added to every job automatically:</b> full name, email, phone, city and CV upload (required), portfolio link and LinkedIn (optional). You don't need to add these.</p>
            </div>
            <h2 className="adm-h2">“Your experience” questions</h2>
            {qs.length === 0 && <Empty title="No extra questions" text="That's fine — people will just fill in “About you”. Add questions to learn more." />}
            <SortList items={qs.map((q, i) => ({ ...q, _id: q.id, id: i }))} noun="question" labelOf={(q) => 'question ' + (q.id + 1)}
              onMove={(n) => d.patch({ questions: n.map(({ id: _x, _id, ...q }) => ({ id: _id, ...q })) })}
              render={(q, i) => (
                <div className="adm-builder">
                  <div className="adm-builder-head">
                    <strong>Question {i + 1}</strong>
                    <button type="button" className="adm-btn ghost small danger-text" onClick={() => d.patch({ questions: qs.filter((_, j) => j !== i) })}><Icon name="trash" size={15} /> Remove</button>
                  </div>
                  <LInput label="Question" value={q.label} onChange={(x) => setQ(i, { label: x })} />
                  <div className="adm-two">
                    <SelectIn label="Answer type" value={q.type} onChange={(x) => setQ(i, { type: x, options: (x === 'single' || x === 'multi') && q.options.length < 2 ? [...q.options, emptyL(), emptyL()].slice(0, Math.max(2, q.options.length)) : q.options })} options={Q_TYPES} />
                    <Toggle checked={q.required} onChange={(x) => setQ(i, { required: x })} label="Must be answered" />
                  </div>
                  {(q.type === 'single' || q.type === 'multi') && (
                    <LListEditor label="Choices" itemName="Choice" addLabel="Add choice" items={q.options} onChange={(x) => setQ(i, { options: x })} />
                  )}
                </div>
              )} />
            <button type="button" className="adm-btn ghost" onClick={() => d.patch({ questions: [...qs, { id: uid(), label: emptyL(), type: 'text', required: false, options: [] }] })}>
              <Icon name="plus" /> Add question
            </button>
          </div>
          <aside className="adm-editor-side wide">
            <FormPreview questions={qs} />
          </aside>
        </div>
      )}

      <SaveBar dirty={d.dirty || isNew} saving={saving} onSave={save} onReset={isNew ? undefined : () => d.orig && d.reset(d.orig)} label={isNew ? 'Create job' : 'Save changes'} />
    </div>
  );
}

/** What applicants will see (not a real form). */
function FormPreview({ questions }: { questions: Q[] }) {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = (v: L) => v[lang] || v[lang === 'en' ? 'ar' : 'en'];
  const ar = lang === 'ar';
  const about: [string, string, boolean][] = [['Full name', 'الاسم الكامل', true], ['Email', 'البريد الإلكتروني', true], ['Phone', 'رقم الهاتف', true], ['City', 'المدينة', true], ['Portfolio link', 'رابط الأعمال', false], ['LinkedIn', 'لينكد إن', false]];
  return (
    <Card title="Preview" actions={
      <div className="adm-seg small" role="group" aria-label="Preview language">
        <button type="button" className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
        <button type="button" className={lang === 'ar' ? 'on' : ''} aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>عربي</button>
      </div>
    }>
      <div className={'adm-preview-form' + (ar ? ' ar' : '')} dir={ar ? 'rtl' : 'ltr'} lang={lang} aria-label="Form preview">
        <h3>{ar ? 'عنك' : 'About you'}</h3>
        <div className="adm-pf-grid">
          {about.map(([e, a, req]) => (
            <div key={e} className="adm-pf-field"><span>{ar ? a : e}{req && ' *'}</span><div className="adm-pf-input" /></div>
          ))}
        </div>
        <div className="adm-pf-field"><span>{ar ? 'السيرة الذاتية *' : 'CV *'}</span><div className="adm-pf-input file">{ar ? 'ارفع ملف PDF أو Word' : 'Upload PDF or Word'}</div></div>
        {questions.length > 0 && <h3>{ar ? 'خبرتك' : 'Your experience'}</h3>}
        {questions.map((q, i) => (
          <div key={q.id + i} className="adm-pf-field">
            <span>{t(q.label) || <em className="adm-muted">{ar ? 'سؤال بدون نص' : 'Question with no text'}</em>}{q.required && ' *'}</span>
            {q.type === 'text' && <div className="adm-pf-input" />}
            {q.type === 'textarea' && <div className="adm-pf-input tall" />}
            {(q.type === 'single' || q.type === 'multi') && (
              <div className="adm-pf-opts">
                {q.options.filter((o) => o.en || o.ar).map((o, j) => (
                  <span key={j} className="adm-pf-opt"><i className={q.type === 'single' ? 'radio' : 'box'} />{t(o)}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="adm-pf-submit">{ar ? 'أرسل الطلب' : 'Send application'}</div>
      </div>
    </Card>
  );
}

// used by Applications for the job filter
export const jobTitle = (j: Any) => en(j.title) || 'Job #' + j.id;
