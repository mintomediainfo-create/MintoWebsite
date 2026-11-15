// One job: details tab (sections from the dashboard) and apply tab (fixed "about you" part + the job's own questions).
import { DragEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconArrow, InnerHeader, PageState, SiteShell } from './Shell';
import { copyHere } from './pageBits';
import { usePrefs } from '../lib/prefs';
import { ApiError, api, fmtDate, uploadFile, useApi, type L } from '../lib/api';
import '../styles/pages.css';

const PG = {
  en: {
    thanks: 'Thank you,', friend: 'friend', gotApp: 'We got your application for', gotApp2: '. Our team will read it and reply by email.',
    backCareers: 'Back to careers', seeWork: 'See our work', allRoles: 'All open roles', hiring: 'We are hiring',
    deadlineChip: 'Apply by', aJob: 'Job page', tabDetails: 'Job details', tabApply: 'Apply now',
    soundsLike: 'Sounds like you?', applyArrow: 'Apply now', summary: 'Job summary', team: 'Team', placeL: 'Place', typeL: 'Type', levelL: 'Level', deadline: 'Deadline',
    copy: 'Copy job link', copied: 'Link copied ✓',
    fsYou: 'About you', fsExp: 'Your experience', fsSend: 'Send',
    fullName: 'Full name', phName: 'Your full name', emailL: 'Email', phoneL: 'Phone number', city: 'City', phCity: 'Where do you live?',
    cvL: 'CV / Resume', drag: 'Drag your CV here or', choose: 'choose a file', fileTypes: 'PDF, DOC or DOCX · max 5 MB',
    uploading: 'Uploading…', ready: 'Ready to send', removeCv: 'Remove CV', replaceCv: 'Replace',
    portfolio: 'Portfolio link', phPortfolio: 'Behance, Drive, website…', linkedin: 'LinkedIn', optional: '(optional)', required: 'required',
    chooseMany: 'Choose all that fit', consent: 'I agree that Minto Media can keep my data to review my application.',
    fixErr: 'Please fix the fields marked in red, then send again.', sendApp: 'Send application', sendingApp: 'Sending…',
    applyingFor: 'You are applying for', next: 'What happens next', next1: 'We read every application.', next2: 'If it fits, we invite you to a short call.', next3: 'Then a small task, and an offer.',
    closedTitle: 'This job is closed', closedText: 'This role is no longer open. Have a look at the other open roles.', seeRoles: 'See open roles',
    mb: ' MB', kb: ' KB',
    err: {
      name: 'Please write your full name.', email: 'Please write a valid email, like name@example.com.', phone: 'Please write a valid phone number.',
      cv: 'Please upload your CV.', type: 'Please upload a PDF, DOC or DOCX file.', size: 'This file is bigger than 5 MB. Please upload a smaller file.',
      upload: 'The upload did not finish. Please try again.', wait: 'Please wait until your CV finishes uploading.',
      consent: 'Please agree so we can review your application.', req: 'Please answer this question.', invalid: 'Please check this field.',
      general: 'Something went wrong. Please try again.', closed: 'This job is no longer open.',
    } as Record<string, string>,
  },
  ar: {
    thanks: 'شكرًا لك،', friend: 'صديقنا', gotApp: 'وصلنا طلبك لوظيفة', gotApp2: '. سيقرأ فريقنا طلبك ويرد عليك عبر البريد الإلكتروني.',
    backCareers: 'العودة إلى الوظائف', seeWork: 'شاهد أعمالنا', allRoles: 'كل الوظائف المتاحة', hiring: 'نحن نوظّف',
    deadlineChip: 'آخر موعد', aJob: 'صفحة الوظيفة', tabDetails: 'تفاصيل الوظيفة', tabApply: 'قدّم الآن',
    soundsLike: 'هل هذه الوظيفة لك؟', applyArrow: 'قدّم الآن', summary: 'ملخص الوظيفة', team: 'الفريق', placeL: 'المكان', typeL: 'النوع', levelL: 'المستوى', deadline: 'آخر موعد',
    copy: 'انسخ رابط الوظيفة', copied: 'تم نسخ الرابط ✓',
    fsYou: 'بياناتك', fsExp: 'خبرتك', fsSend: 'إرسال',
    fullName: 'الاسم بالكامل', phName: 'اكتب اسمك بالكامل', emailL: 'البريد الإلكتروني', phoneL: 'رقم الهاتف', city: 'المدينة', phCity: 'أين تسكن؟',
    cvL: 'السيرة الذاتية', drag: 'اسحب سيرتك الذاتية هنا أو', choose: 'اختر ملفًا', fileTypes: 'PDF أو DOC أو DOCX · الحد الأقصى 5 ميجابايت',
    uploading: 'جارٍ الرفع…', ready: 'جاهز للإرسال', removeCv: 'حذف السيرة الذاتية', replaceCv: 'استبدال',
    portfolio: 'رابط أعمالك', phPortfolio: 'بيهانس، درايف، موقعك…', linkedin: 'LinkedIn', optional: '(اختياري)', required: 'مطلوب',
    chooseMany: 'اختر كل ما يناسبك', consent: 'أوافق على أن تحتفظ منتو ميديا ببياناتي لمراجعة طلبي.',
    fixErr: 'من فضلك صحّح الخانات المحددة باللون الأحمر ثم أرسل مرة أخرى.', sendApp: 'أرسل الطلب', sendingApp: 'جارٍ الإرسال…',
    applyingFor: 'أنت تتقدم لوظيفة', next: 'ماذا بعد؟', next1: 'نقرأ كل الطلبات.', next2: 'إذا كان طلبك مناسبًا، ندعوك لمكالمة قصيرة.', next3: 'ثم مهمة صغيرة، وبعدها عرض العمل.',
    closedTitle: 'هذه الوظيفة مغلقة', closedText: 'لم تعد هذه الوظيفة متاحة. اطّلع على الوظائف المتاحة الأخرى.', seeRoles: 'الوظائف المتاحة',
    mb: ' ميجابايت', kb: ' كيلوبايت',
    err: {
      name: 'من فضلك اكتب اسمك بالكامل.', email: 'من فضلك اكتب بريدًا إلكترونيًا صحيحًا مثل name@example.com.', phone: 'من فضلك اكتب رقم هاتف صحيحًا.',
      cv: 'من فضلك ارفع سيرتك الذاتية.', type: 'من فضلك ارفع ملف PDF أو DOC أو DOCX.', size: 'حجم الملف أكبر من 5 ميجابايت. من فضلك ارفع ملفًا أصغر.',
      upload: 'لم يكتمل رفع الملف. حاول مرة أخرى.', wait: 'من فضلك انتظر حتى يكتمل رفع سيرتك الذاتية.',
      consent: 'من فضلك وافق حتى نتمكن من مراجعة طلبك.', req: 'من فضلك أجب عن هذا السؤال.', invalid: 'من فضلك راجع هذه الخانة.',
      general: 'حدث خطأ. حاول مرة أخرى.', closed: 'لم تعد هذه الوظيفة متاحة.',
    } as Record<string, string>,
  },
};

type Section = { title: L; style: 'text' | 'bullets' | 'checks' | 'cards'; text: L; items: L[] };
type Question = { id: string; label: L; type: 'text' | 'textarea' | 'single' | 'multi'; required: boolean; options: L[] };
type Job = {
  id: number; slug: string; title: L; department: L; location: L; job_type: L; level: L; summary: L; deadline: string | null;
  sections: Section[]; questions: Question[];
};
type Cv = { name: string; size: number; ext: string; progress: number; key?: string };
type Answers = Record<string, string | string[]>;

const CHECK = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const optValue = (o: L) => o.en || o.ar || '';
const fieldId: Record<string, string> = { name: 'ap-name', email: 'ap-email', phone: 'ap-phone', city: 'ap-city', cv: 'ap-cv-btn', portfolio: 'ap-portfolio', linkedin: 'ap-linkedin', consent: 'ap-consent' };
const idFor = (k: string) => fieldId[k] || (k.startsWith('q:') ? `ap-q-${k.slice(2)}` : '');

const h2: React.CSSProperties = { margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 44, textTransform: 'uppercase' };
const legend: React.CSSProperties = { padding: 0, marginBottom: 20, fontFamily: "'Minto Head', sans-serif", fontSize: 40, textTransform: 'uppercase' };
const chipSt: React.CSSProperties = { fontSize: 13, fontWeight: 700, border: '1px solid var(--line2)', padding: '8px 14px', borderRadius: 999, color: 'var(--muted)' };
const card: React.CSSProperties = { borderRadius: 24, background: 'var(--card)', border: '1px solid var(--line2)', padding: 28, display: 'flex', flexDirection: 'column' };

function Paras({ text, style }: { text: string; style?: React.CSSProperties }) {
  return <>{text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((t, i) => <p key={i} style={{ margin: 0, whiteSpace: 'pre-line', ...style }}>{t}</p>)}</>;
}

function JobSection({ s }: { s: Section }) {
  const { L } = usePrefs();
  const items = (s.items || []).map((x) => L(x)).filter(Boolean);
  const text = L(s.text);
  if (!L(s.title) && !text && !items.length) return null;
  return (
    <div className="jb-sec" style={s.style === 'cards' ? { gap: 20 } : undefined}>
      {L(s.title) && <h2 className="mm-jh2" style={h2}>{L(s.title)}</h2>}
      {text && <Paras text={text} style={{ fontSize: 19, lineHeight: 1.7, color: 'var(--muted)' }} />}
      {items.length > 0 && s.style === 'cards' && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {items.map((t, i) => <li key={i} style={{ borderRadius: 18, background: 'var(--card)', border: '1px solid var(--line2)', padding: 22, fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{t}</li>)}
        </ul>
      )}
      {items.length > 0 && s.style !== 'cards' && (
        <ul className="jb-list">
          {items.map((t, i) => (
            <li key={i}>
              {s.style === 'checks'
                ? <span style={{ flex: 'none', width: 22, height: 22, marginTop: 3, borderRadius: 999, background: '#F68B1F', color: '#0E1B33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{CHECK}</span>
                : <span aria-hidden="true" style={{ flex: 'none', width: 10, height: 10, marginTop: 10, borderRadius: 999, background: '#F68B1F' }} />}
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JobPage() {
  const { slug = '' } = useParams();
  const { L, lang, isAr } = usePrefs();
  const p = PG[lang];
  const { data, error, loading } = useApi<Job>(`/jobs/${encodeURIComponent(slug)}`);
  const job = data && data.slug === slug ? data : undefined;

  const [tab, setTab] = useState<'details' | 'apply'>('details');
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);
  const [closed, setClosed] = useState(false);
  const [f, setF] = useState({ name: '', email: '', phone: '', city: '', portfolio: '', linkedin: '' });
  const [answers, setAnswers] = useState<Answers>({});
  const [consent, setConsent] = useState(false);
  const [cv, setCv] = useState<Cv | null>(null);
  const [drag, setDrag] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadSeq = useRef(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsAnchor = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const title = job ? L(job.title) : '';
  useEffect(() => {
    if (!title) return;
    const old = document.title;
    document.title = `${title} — Minto Media`;
    return () => { document.title = old; };
  }, [title]);

  // after a failed send, move focus to the first field with a problem
  useEffect(() => {
    if (!focusTick || !formRef.current) return;
    const order = ['name', 'email', 'phone', 'city', 'cv', 'portfolio', 'linkedin', ...(job?.questions || []).map((q) => 'q:' + q.id), 'consent'];
    const first = order.find((k) => errors[k]);
    const el = first ? document.getElementById(idFor(first)) : formRef.current.querySelector<HTMLElement>('[role="alert"]');
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearErr = (k: string) => setErrors((e) => {
    if (!e[k] && !e.general) return e;
    const n = { ...e }; delete n[k]; delete n.general; return n;
  });
  const setField = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement>) => { setF((x) => ({ ...x, [k]: ev.target.value })); clearErr(k); };

  const goTab = (t: 'details' | 'apply', focus = false) => {
    setTab(t);
    // the tab bar sticks under the header, so go to where the new tab's content starts (otherwise you land mid-page)
    const el = tabsAnchor.current;
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 81;
      if (window.scrollY > y) window.scrollTo({ top: y, behavior: 'auto' });
    }
    if (focus) requestAnimationFrame(() => document.getElementById('tab-' + t)?.focus());
  };
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    goTab(tab === 'details' ? 'apply' : 'details', true);
  };

  // ---------- CV upload ----------
  const pickFile = async (file?: File | null) => {
    setDrag(false);
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) { setErrors((e) => ({ ...e, cv: 'type' })); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors((e) => ({ ...e, cv: 'size' })); return; }
    clearErr('cv');
    const seq = ++uploadSeq.current;
    setCv({ name: file.name, size: file.size, ext: ext.toUpperCase(), progress: 0 });
    try {
      const r = await uploadFile(file, { path: '/apply/upload-url', body: { filename: file.name, size: file.size } }, (pr) => {
        if (seq === uploadSeq.current) setCv((c) => (c ? { ...c, progress: pr } : c));
      });
      if (seq === uploadSeq.current) setCv((c) => (c ? { ...c, progress: 1, key: r.key } : c));
    } catch (e) {
      if (seq !== uploadSeq.current) return;
      const code = e instanceof ApiError && (e.data?.error === 'type' || e.data?.error === 'size') ? e.data.error : 'upload';
      setCv(null);
      setErrors((x) => ({ ...x, cv: code }));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  const removeCv = () => { uploadSeq.current++; setCv(null); if (fileInput.current) fileInput.current.value = ''; };
  const uploading = !!cv && !cv.key;

  // ---------- answers ----------
  const setAnswer = (q: Question, v: string | string[]) => { setAnswers((a) => ({ ...a, [q.id]: v })); clearErr('q:' + q.id); };
  const toggleMulti = (q: Question, v: string) => {
    const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
    setAnswer(q, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };

  // ---------- send ----------
  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!job || sending) return;
    const e: Record<string, string> = {};
    if (f.name.trim().length < 3) e.name = 'name';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'email';
    if (f.phone.replace(/[^0-9]/g, '').length < 8) e.phone = 'phone';
    if (!cv) e.cv = 'cv'; else if (!cv.key) e.cv = 'wait';
    for (const q of job.questions || []) {
      const v = answers[q.id];
      if (q.required && (Array.isArray(v) ? !v.length : !String(v || '').trim())) e['q:' + q.id] = 'req';
    }
    if (!consent) e.consent = 'consent';
    setErrors(e);
    if (Object.keys(e).length) { setFocusTick((t) => t + 1); return; }

    setSending(true);
    try {
      const clean: Answers = {};
      for (const q of job.questions || []) {
        const v = answers[q.id];
        if (Array.isArray(v) ? v.length : String(v || '').trim()) clean[q.id] = Array.isArray(v) ? v : String(v).trim();
      }
      await api(`/jobs/${encodeURIComponent(job.slug)}/apply`, {
        body: {
          fullName: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), city: f.city.trim(), answers: clean,
          cvKey: cv!.key, cvName: cv!.name, portfolio: f.portfolio.trim(), linkedin: f.linkedin.trim(), consent: true, lang,
        },
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (er) {
      const x = er instanceof ApiError ? er : null;
      const se: Record<string, string> = {};
      if (x?.status === 404) { setClosed(true); se.general = 'closed'; }
      else if (x?.status === 400 && (x.data?.fields || x.data?.missing)) {
        const map: Record<string, string> = { fullName: 'name', email: 'email', phone: 'phone', city: 'city', cvKey: 'cv', cvName: 'cv', portfolio: 'portfolio', linkedin: 'linkedin', consent: 'consent' };
        const own: Record<string, string> = { name: 'name', email: 'email', phone: 'phone', cv: 'cv', consent: 'consent' };
        Object.keys(x.data.fields || {}).forEach((k) => { const m = map[k]; if (m) se[m] = own[m] || 'invalid'; else se.general = 'general'; });
        (x.data.missing || []).forEach((id: string) => { se['q:' + id] = 'req'; });
      } else se.general = 'general';
      setErrors(se);
      setFocusTick((t) => t + 1);
    } finally {
      setSending(false);
    }
  };

  const header = <InnerHeader current="careers" />;
  const backLink = <Link to="/careers" className="pg-back mm-rise"><IconArrow dir="left" size={16} />{p.allRoles}</Link>;

  // ---------- not loaded / closed ----------
  if (!job || (closed && !done)) {
    const isClosed = closed || error?.status === 404;
    return (
      <SiteShell header={header}>
        <section id="main" style={{ background: 'var(--bg)' }}>
          <div className="mm-wrap pg-hero" style={{ paddingTop: 120, paddingBottom: 140, display: 'flex', flexDirection: 'column', gap: 24, minHeight: '50vh' }}>
            {backLink}
            {isClosed ? (
              <>
                <h1 className="mm-h1 jb-h1 mm-rise" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 110, lineHeight: 0.95, textTransform: 'uppercase' }}>{p.closedTitle}</h1>
                <p className="mm-rise" style={{ margin: 0, maxWidth: 620, fontSize: 20, lineHeight: 1.6, color: 'var(--muted)' }}>{p.closedText}</p>
                <Link to="/careers" className="mm-btn mm-rise" style={{ alignSelf: 'flex-start' }}>{p.seeRoles}</Link>
              </>
            ) : <PageState loading={loading || !error} error={error} />}
          </div>
        </section>
      </SiteShell>
    );
  }

  // ---------- success ----------
  if (done) {
    const first = f.name.trim().split(/\s+/)[0] || p.friend;
    return (
      <SiteShell header={header}>
        <section id="main" style={{ background: 'var(--bg)' }}>
          <div className="mm-rise jb-done" role="status" style={{ maxWidth: 900, margin: '0 auto', padding: '160px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}>
            <span className="mm-popin" style={{ width: 120, height: 120, borderRadius: 999, background: '#F68B1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#0E1B33" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
            </span>
            <h1 className="mm-h1 jb-h1" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 110, lineHeight: 0.95, textTransform: 'uppercase' }}>{p.thanks} <span style={{ color: '#F68B1F' }}>{first}</span></h1>
            <p style={{ margin: 0, maxWidth: 560, fontSize: 20, lineHeight: 1.6, color: 'var(--muted)' }}>{p.gotApp} <strong style={{ color: 'var(--fg)' }}>{title}</strong>{p.gotApp2}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <Link to="/careers" className="mm-btn" style={{ padding: '18px 28px' }}>{p.backCareers}</Link>
              <Link to="/work" style={{ textDecoration: 'none', border: '1px solid var(--line2)', color: 'var(--fg)', fontWeight: 800, fontSize: 14, letterSpacing: '.12em', textTransform: 'uppercase', padding: '18px 28px', borderRadius: 999 }}>{p.seeWork}</Link>
            </div>
          </div>
        </section>
      </SiteShell>
    );
  }

  // ---------- job page ----------
  const dept = L(job.department);
  const deadline = job.deadline ? fmtDate(job.deadline, lang) : '';
  const chips = [L(job.location), L(job.job_type), L(job.level), deadline && `${p.deadlineChip} ${deadline}`].filter(Boolean);
  const facts: [string, string][] = ([[p.team, dept], [p.placeL, L(job.location)], [p.typeL, L(job.job_type)], [p.levelL, L(job.level)], [p.deadline, deadline]] as [string, string][]).filter(([, v]) => v);
  const questions = job.questions || [];
  const hasQ = questions.length > 0;
  const n = (i: number) => String(i).padStart(2, '0');
  const errMsg = (k: string) => (errors[k] ? p.err[errors[k]] || p.err.invalid : '');
  const inv = (k: string) => (errors[k] ? true : undefined);
  const desc = (k: string) => (errors[k] ? `${idFor(k)}-err` : undefined);
  const Err = ({ k }: { k: string }) => (errors[k] ? <span id={`${idFor(k)}-err`} className="mm-err">{errMsg(k)}</span> : null);
  const req = <span aria-hidden="true"> *</span>;
  const opt = <span className="pg-opt"> {p.optional}</span>;
  const tabBtn = (t: 'details' | 'apply', num: string, label: string) => (
    <button type="button" role="tab" id={'tab-' + t} aria-selected={tab === t} aria-controls={'panel-' + t} tabIndex={tab === t ? 0 : -1} className="jb-tab"
      onClick={() => goTab(t)} onKeyDown={onTabKey}
      style={{ borderBottom: `3px solid ${tab === t ? '#F68B1F' : 'transparent'}`, color: tab === t ? 'var(--fg)' : 'var(--muted2)' }}>
      <span style={{ color: '#F68B1F' }}>{num}</span> {label}
    </button>
  );
  const kbv = cv ? cv.size / 1024 : 0;
  const sizeTxt = kbv > 1024 ? (kbv / 1024).toFixed(1) + p.mb : Math.max(1, Math.round(kbv)) + p.kb;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <SiteShell header={header}>
      {/* JOB HERO */}
      <section id="main" style={{ background: 'var(--bg)' }}>
        <div className="mm-wrap pg-hero" style={{ paddingTop: 72, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {backLink}
          <span className="mm-rise" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F68B1F', animationDelay: '.05s' }}>{[dept, p.hiring].filter(Boolean).join(' · ')}</span>
          <h1 className="mm-h1 jb-h1 mm-rise" style={{ margin: 0, fontFamily: "'Minto Head', sans-serif", fontWeight: 400, fontSize: 130, lineHeight: 0.9, textTransform: 'uppercase', animationDelay: '.1s' }}>{title}</h1>
          {chips.length > 0 && (
            <div className="mm-rise" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, animationDelay: '.2s' }}>
              {chips.map((c, i) => <span key={i} style={chipSt}>{c}</span>)}
            </div>
          )}
          {L(job.summary) && <p className="mm-rise" style={{ margin: 0, maxWidth: 760, fontSize: 20, lineHeight: 1.6, color: 'var(--muted)', animationDelay: '.25s' }}>{L(job.summary)}</p>}
        </div>
      </section>

      {/* TABS */}
      <div ref={tabsAnchor} aria-hidden="true" />
      <div ref={tabsRef} className="jb-tabs" style={{ position: 'sticky', top: 81, zIndex: 30, background: 'var(--bg)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="mm-wrap" role="tablist" aria-label={p.aJob} style={{ display: 'flex', gap: 8 }}>
          {tabBtn('details', '01', p.tabDetails)}
          {tabBtn('apply', '02', p.tabApply)}
        </div>
      </div>

      {tab === 'details' ? (
        /* TAB 1: JOB DETAILS */
        <section id="panel-details" role="tabpanel" aria-labelledby="tab-details" style={{ background: 'var(--bg)' }}>
          <div className="mm-wrap mm-two mm-tabin jb-panel" style={{ paddingTop: 64, paddingBottom: 140, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 56, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
              {(job.sections || []).map((s, i) => <JobSection key={i} s={s} />)}
              <div className="jb-cta" style={{ borderRadius: 28, background: '#F68B1F', color: '#0E1B33', padding: 48, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                <span className="jb-cta-h" style={{ fontFamily: "'Minto Head', sans-serif", fontSize: 52, lineHeight: 0.95, textTransform: 'uppercase' }}>{p.soundsLike}</span>
                <button type="button" className="mm-btn mm-dark-btn" onClick={() => goTab('apply', true)} style={{ height: 64, padding: '0 36px', fontSize: 15 }}>{p.applyArrow} <IconArrow dir="right" size={18} /></button>
              </div>
            </div>
            <aside className="mm-side" style={{ position: 'sticky', top: 180, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ ...card, gap: 18 }}>
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#F68B1F' }}>{p.summary}</h2>
                {facts.length > 0 && (
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px 16px', fontSize: 15 }}>
                    {facts.map(([k, v]) => [<dt key={k + 't'} style={{ color: 'var(--muted2)' }}>{k}</dt>, <dd key={k + 'd'} style={{ margin: 0, fontWeight: 700 }}>{v}</dd>])}
                  </dl>
                )}
                <button type="button" className="mm-btn" onClick={() => goTab('apply', true)} style={{ height: 58, padding: '0 24px' }}>{p.tabApply}</button>
                <button type="button" className="nw-share" onClick={async () => setCopied(await copyHere())}><span aria-live="polite">{copied ? p.copied : p.copy}</span></button>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        /* TAB 2: APPLY */
        <section id="panel-apply" role="tabpanel" aria-labelledby="tab-apply" style={{ background: 'var(--bg)' }}>
          <div className="mm-wrap mm-two mm-tabin jb-panel" style={{ paddingTop: 64, paddingBottom: 140, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 56, alignItems: 'start' }}>
            <form ref={formRef} onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
              {/* 01 ABOUT YOU (same for every job) */}
              <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                <legend className="jb-legend" style={legend}><span style={{ color: '#F68B1F' }}>01</span> {p.fsYou}</legend>
                <div className="mm-two" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="mm-lbl" htmlFor="ap-name">{p.fullName}{req}</label>
                    <input className="mm-in" id="ap-name" name="fullName" type="text" autoComplete="name" placeholder={p.phName} value={f.name} onChange={setField('name')} maxLength={120} required aria-invalid={inv('name')} aria-describedby={desc('name')} />
                    <Err k="name" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="mm-lbl" htmlFor="ap-email">{p.emailL}{req}</label>
                    <input className="mm-in" id="ap-email" name="email" type="email" autoComplete="email" dir="ltr" placeholder="you@example.com" value={f.email} onChange={setField('email')} maxLength={160} required aria-invalid={inv('email')} aria-describedby={desc('email')} />
                    <Err k="email" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="mm-lbl" htmlFor="ap-phone">{p.phoneL}{req}</label>
                    <input className="mm-in" id="ap-phone" name="phone" type="tel" autoComplete="tel" dir="ltr" placeholder="+20 1X XXXX XXXX" value={f.phone} onChange={setField('phone')} maxLength={30} required aria-invalid={inv('phone')} aria-describedby={desc('phone')} style={{ textAlign: isAr ? 'right' : 'left' }} />
                    <Err k="phone" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="mm-lbl" htmlFor="ap-city">{p.city}{opt}</label>
                    <input className="mm-in" id="ap-city" name="city" type="text" autoComplete="address-level2" placeholder={p.phCity} value={f.city} onChange={setField('city')} maxLength={80} aria-invalid={inv('city')} aria-describedby={desc('city')} />
                    <Err k="city" />
                  </div>
                </div>

                {/* CV */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="mm-lbl" id="ap-cv-label">{p.cvL}{req}</span>
                  <input ref={fileInput} id="ap-cv" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="mm-sr" tabIndex={-1} aria-hidden="true"
                    onChange={(e) => pickFile(e.target.files?.[0])} />
                  {!cv ? (
                    <button type="button" id="ap-cv-btn" className="mm-drop" onClick={() => fileInput.current?.click()}
                      aria-labelledby="ap-cv-label ap-cv-hint" aria-describedby={desc('cv')} aria-invalid={inv('cv')}
                      onDragOver={(e: DragEvent) => { e.preventDefault(); if (!drag) setDrag(true); }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e: DragEvent) => { e.preventDefault(); pickFile(e.dataTransfer?.files?.[0]); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: 220, padding: 32, borderRadius: 20, border: `2px dashed ${drag ? '#F68B1F' : errors.cv ? '#E5553F' : 'var(--line2)'}`, background: drag ? 'var(--bg2)' : 'var(--card)', color: 'var(--fg)', fontFamily: 'inherit', textAlign: 'center', cursor: 'pointer', width: '100%' }}>
                      <span style={{ width: 64, height: 64, borderRadius: 999, background: '#F68B1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0E1B33" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>
                      </span>
                      <span id="ap-cv-hint" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>{p.drag} <span style={{ color: '#F68B1F', textDecoration: 'underline' }}>{p.choose}</span></span>
                        <span style={{ fontSize: 14, color: 'var(--muted2)' }}>{p.fileTypes}</span>
                      </span>
                    </button>
                  ) : (
                    <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer?.files?.[0]); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 18, background: 'var(--card)', border: '1px solid #F68B1F' }}>
                      <span aria-hidden="true" style={{ width: 52, height: 52, flex: 'none', borderRadius: 12, background: '#F68B1F', color: '#0E1B33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{cv.ext}</span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="mm-ltr" style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: isAr ? 'right' : 'left' }}>{cv.name}</span>
                        <span style={{ fontSize: 13, color: 'var(--muted2)' }} aria-live="polite">{sizeTxt} · {uploading ? `${p.uploading} ${Math.round(cv.progress * 100)}%` : p.ready}</span>
                        {uploading && (
                          <span className="jb-bar" role="progressbar" aria-label={p.uploading} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cv.progress * 100)}>
                            <span style={{ width: `${Math.max(4, cv.progress * 100)}%` }} />
                          </span>
                        )}
                      </span>
                      <button type="button" id="ap-cv-btn" onClick={() => fileInput.current?.click()} className="nw-share" style={{ height: 44, padding: '0 16px', flex: 'none' }}>{p.replaceCv}</button>
                      <button type="button" onClick={removeCv} aria-label={p.removeCv} title={p.removeCv} className="mm-hbtn" style={{ width: 44, height: 44, flex: 'none' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
                      </button>
                    </div>
                  )}
                  <Err k="cv" />
                </div>

                <div className="mm-two" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="mm-lbl" htmlFor="ap-portfolio">{p.portfolio}{opt}</label>
                    <input className="mm-in" id="ap-portfolio" name="portfolio" type="url" inputMode="url" dir="ltr" placeholder={p.phPortfolio} value={f.portfolio} onChange={setField('portfolio')} maxLength={400} aria-invalid={inv('portfolio')} aria-describedby={desc('portfolio')} style={{ textAlign: isAr ? 'right' : 'left' }} />
                    <Err k="portfolio" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="mm-lbl" htmlFor="ap-linkedin">{p.linkedin}{opt}</label>
                    <input className="mm-in" id="ap-linkedin" name="linkedin" type="url" inputMode="url" dir="ltr" placeholder="linkedin.com/in/your-name" value={f.linkedin} onChange={setField('linkedin')} maxLength={400} aria-invalid={inv('linkedin')} aria-describedby={desc('linkedin')} style={{ textAlign: isAr ? 'right' : 'left' }} />
                    <Err k="linkedin" />
                  </div>
                </div>
              </fieldset>

              {/* 02 YOUR EXPERIENCE (the job's own questions) */}
              {hasQ && (
                <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
                  <legend className="jb-legend" style={legend}><span style={{ color: '#F68B1F' }}>02</span> {p.fsExp}</legend>
                  {questions.map((q) => {
                    const k = 'q:' + q.id;
                    const id = idFor(k);
                    const label = L(q.label);
                    const v = answers[q.id];
                    if (q.type === 'single' || q.type === 'multi') {
                      const many = q.type === 'multi';
                      const sel = (o: string) => (many ? Array.isArray(v) && v.includes(o) : v === o);
                      return (
                        <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <span className="mm-lbl" id={id + '-l'}>{label}{q.required ? req : opt}{many && <span className="pg-opt"> · {p.chooseMany}</span>}</span>
                          <div className="jb-pills" role={many ? 'group' : 'radiogroup'} aria-labelledby={id + '-l'} aria-required={!many && q.required ? true : undefined} aria-invalid={inv(k)} aria-describedby={desc(k)} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {(q.options || []).map((o, oi) => {
                              const val = optValue(o);
                              const on = sel(val);
                              return (
                                <label key={oi} className="mm-chip jb-pill" style={{ border: `1px solid ${on ? '#F68B1F' : 'var(--line2)'}`, background: on ? '#F68B1F' : 'transparent', color: on ? '#0E1B33' : 'var(--fg)' }}>
                                  <input id={oi === 0 ? id : undefined} type={many ? 'checkbox' : 'radio'} name={id} value={val} checked={on}
                                    onChange={() => (many ? toggleMulti(q, val) : setAnswer(q, val))}
                                    style={{ accentColor: '#0E1B33', margin: 0, width: 18, height: 18, flex: 'none' }} />
                                  {L(o)}
                                </label>
                              );
                            })}
                          </div>
                          <Err k={k} />
                        </div>
                      );
                    }
                    const big = q.type === 'textarea';
                    const val = typeof v === 'string' ? v : '';
                    const max = big ? 4000 : 300;
                    return (
                      <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="mm-lbl" htmlFor={id}>{label}{q.required ? req : opt}</label>
                        {big
                          ? <textarea className="mm-in" id={id} value={val} maxLength={max} required={q.required} aria-invalid={inv(k)} aria-describedby={desc(k)} onChange={(e) => setAnswer(q, e.target.value)} />
                          : <input className="mm-in" id={id} type="text" value={val} maxLength={max} required={q.required} aria-invalid={inv(k)} aria-describedby={desc(k)} onChange={(e) => setAnswer(q, e.target.value)} />}
                        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <Err k={k} />
                          {big && <span style={{ fontSize: 13, color: 'var(--muted2)', marginInlineStart: 'auto' }}>{val.length} / {max}</span>}
                        </span>
                      </div>
                    );
                  })}
                </fieldset>
              )}

              {/* SEND */}
              <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                <legend className="jb-legend" style={legend}><span style={{ color: '#F68B1F' }}>{n(hasQ ? 3 : 2)}</span> {p.fsSend}</legend>
                <label htmlFor="ap-consent" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>
                  <input className="mm-check" id="ap-consent" name="consent" type="checkbox" checked={consent} required aria-invalid={inv('consent')} aria-describedby={desc('consent')}
                    onChange={(e) => { setConsent(e.target.checked); clearErr('consent'); }}
                    style={{ width: 22, height: 22, margin: '2px 0 0', accentColor: '#F68B1F', flex: 'none' }} />
                  <span>{p.consent}{req}</span>
                </label>
                <Err k="consent" />
                {hasErrors && (
                  <div role="alert" tabIndex={-1} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--errbg)', border: '1px solid #E5553F', color: 'var(--errfg)', fontSize: 15 }}>
                    {errors.general ? p.err[errors.general] : p.fixErr}
                  </div>
                )}
                <button type="submit" className="mm-btn" disabled={sending || uploading} aria-busy={sending} style={{ alignSelf: 'flex-start', height: 64, padding: '0 40px', fontSize: 15 }}>
                  {sending ? <><span className="jb-spin" aria-hidden="true" />{p.sendingApp}</> : <>{p.sendApp} <IconArrow dir="right" size={20} /></>}
                </button>
              </fieldset>
            </form>

            <aside className="mm-side mm-rise" style={{ position: 'sticky', top: 180, display: 'flex', flexDirection: 'column', gap: 20, animationDelay: '.35s' }}>
              <div style={{ ...card, gap: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#F68B1F' }}>{p.applyingFor}</span>
                <span style={{ fontFamily: "'Minto Head', sans-serif", fontSize: 36, lineHeight: 1.1, textTransform: 'uppercase' }}>{title}</span>
                {(L(job.location) || L(job.job_type)) && (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[L(job.location), L(job.job_type)].filter(Boolean).map((c, i) => <span key={i} style={{ ...chipSt, fontSize: 12, padding: '6px 12px' }}>{c}</span>)}
                  </span>
                )}
                {L(job.summary) && <span style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--muted2)' }}>{L(job.summary)}</span>}
              </div>
              <div style={{ ...card, gap: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted2)' }}>{p.next}</span>
                {[p.next1, p.next2, p.next3].map((t, i) => (
                  <span key={i} style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}><strong style={{ color: 'var(--fg)' }}>{i + 1}.</strong> {t}</span>
                ))}
              </div>
            </aside>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
