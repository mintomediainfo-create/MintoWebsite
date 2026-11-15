// Home page content: hero video, intro media, services, work, client logos, testimonials, our story.
import { useEffect, useState } from 'react';
import { api, L } from '../lib/api';
import Resource from './Resource';
import {
  Any, Badge, Card, ColorIn, ErrorBox, LInput, LListEditor, MediaInput, PageHead, SaveBar, Segmented, Skeleton, TextIn, Thumb, Toggle,
  asL, emptyL, en, useDirty, useDraft, useLoad, useUi,
} from './ui';

/* ------------------------------------------------------------------ settings helper */

/** Loads one settings group and gives a draft + save for it. */
export function useSetting<T extends Any>(key: string) {
  const { data, error, loading, reload, setData } = useLoad<Any>('/admin/settings');
  const d = useDraft<T>(undefined);
  const { toast, fail } = useUi();
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data && !d.dirty) d.reset(data[key] as T); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useDirty(d.dirty);
  async function save(value?: T, msg = 'Saved. The site is updated.') {
    const v = value ?? d.draft;
    setSaving(true);
    try {
      await api('/admin/settings/' + key, { method: 'PUT', body: v });
      d.reset(v as T);
      setData({ ...(data || {}), [key]: v });
      toast(msg);
    } catch (e) { fail(e); } finally { setSaving(false); }
  }
  return { ...d, error, loading: loading && !data, reload, save, saving };
}

/* ------------------------------------------------------------------ intro media */

export function IntroMedia() {
  return (
    <Resource res="intro-media" title="“We support your success” media" noun="photo or video" site="/"
      intro={<>The home page has <b>3 spots</b> here. Upload as many photos or short videos as you like, but only <b>3 can be shown at the same time</b>. To swap one, hide a shown piece (turn off “Show on site”) and show another. Drag to change the order. A 4th piece you add is saved hidden. These are just pictures for the look of the page: visitors cannot click them.</>}
      grid
      blank={() => ({ kind: 'image', url: '', poster_url: '', active: true })}
      validate={(d) => (!d.url ? 'Please upload a photo or video first.' : null)}
      row={(it) => ({
        thumb: <Thumb url={it.url} poster={it.poster_url} kind={it.kind} />,
        title: it.kind === 'video' ? 'Video' : 'Photo',
        badges: <Badge tone={it.kind === 'video' ? 'blue' : 'grey'}>{it.kind === 'video' ? 'Video' : 'Photo'}</Badge>,
      })}
      form={(d, set) => (
        <>
          <Segmented label="Type" value={d.kind} onChange={(k) => set({ kind: k })} options={[['image', 'Photo'], ['video', 'Video']]} />
          <MediaInput label={d.kind === 'video' ? 'Video' : 'Photo'} accept={d.kind === 'video' ? 'video' : 'image'} folder="intro" value={d.url}
            onChange={(u) => set({ url: u })} hint={d.kind === 'video' ? 'Keep videos short and small (under 10 MB). They play by themselves, without sound.' : undefined} />
        </>
      )} />
  );
}

/* ------------------------------------------------------------------ services */

function ServicePreview({ d, lang }: { d: Any; lang: 'en' | 'ar' }) {
  const t = (v: any) => asL(v)[lang] || asL(v)[lang === 'en' ? 'ar' : 'en'];
  return (
    <div className="adm-svc-card" style={{ background: d.bg, color: d.fg }} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      <h4>{t(d.title) || (lang === 'en' ? 'Service name' : 'اسم الخدمة')}</h4>
      <p>{t(d.short) || (lang === 'en' ? 'Short text about this service.' : 'نص قصير عن الخدمة.')}</p>
      <div className="adm-svc-tags">
        {(d.tags || []).map((x: L, i: number) => <span key={i} style={{ borderColor: d.fg }}>{t(x)}</span>)}
      </div>
    </div>
  );
}

export function Services() {
  return (
    <Resource res="services" title="Services" noun="service" site="/#services" wide
      intro="The service cards on the home page. Drag to change the order."
      blank={() => ({ title: emptyL(), short: emptyL(), tags: [], bg: '#0B4A94', fg: '#ffffff', active: true })}
      validate={(d) => (!asL(d.title).en && !asL(d.title).ar ? 'Please give the service a name.' : null)}
      prepare={(d) => ({ ...d, tags: (d.tags || []).filter((t: L) => t.en.trim() || t.ar.trim()) })}
      row={(it) => ({
        thumb: <span className="adm-svc-dot" style={{ background: it.bg, color: it.fg }}>Aa</span>,
        title: en(it.title),
        sub: (it.tags || []).map((x: L) => en(x)).join(' · '),
      })}
      form={(d, set) => (
        <>
          <LInput label="Service name" value={d.title} onChange={(v) => set({ title: v })} />
          <LInput label="Short text" textarea rows={2} value={d.short} onChange={(v) => set({ short: v })} hint="One sentence works best." />
          <LListEditor label="Tags" itemName="Tag" addLabel="Add tag" items={d.tags || []} onChange={(v) => set({ tags: v })}
            hint="Small labels on the card, e.g. “Strategy”." empty="No tags yet." />
          <div className="adm-two">
            <ColorIn label="Card colour" value={d.bg} onChange={(v) => set({ bg: v })} />
            <ColorIn label="Text colour" value={d.fg} onChange={(v) => set({ fg: v })} />
          </div>
          <div className="adm-field">
            <span className="adm-label">Preview</span>
            <div className="adm-two">
              <ServicePreview d={d} lang="en" />
              <ServicePreview d={d} lang="ar" />
            </div>
          </div>
        </>
      )} />
  );
}

/* ------------------------------------------------------------------ work */

const KIND: Record<string, string> = { photo: 'Photo', video: 'Video', reel: 'Reel' };
const CATEGORY: Record<string, string> = { social: 'Social media', branding: 'Branding', photography: 'Photography', video: 'Video production', ads: 'Ad campaign', web: 'Web design' };

function WorkOrder() {
  const s = useSetting<{ order: string }>('work_display');
  const order = s.draft?.order || 'manual';
  return (
    <Card title="Order on the website" className="adm-mb">
      {!s.draft ? <Skeleton rows={1} /> : (
        <>
          <Segmented label="How should the pieces be arranged?" value={order}
            onChange={(v) => s.save({ order: v }, v === 'weekly' ? 'Done. The order will change by itself every week.' : 'Done. The site follows your order.')}
            options={[['manual', 'My order (drag to arrange)'], ['weekly', 'Shuffle by itself every week']]} />
          <p className="adm-hint">{order === 'weekly'
            ? 'The Our Work page and the home page get a new random order every Monday. The Featured piece stays the big card until you change it. Visitors can still press Shuffle on the page.'
            : 'The Our Work page and the home page follow the order you set below. Visitors can still press Shuffle on the page.'}</p>
        </>
      )}
    </Card>
  );
}

export function Work() {
  return (
    <Resource res="work" top={<WorkOrder />} title="Work" noun="work item" site="/work" siteLabel="View Our Work page" grid wide
      intro={<>Upload the photos and videos you want on the <b>Our Work</b> page. They all play by themselves. Turn on “Show on home page” for up to <b>5</b> pieces, and choose <b>one Featured</b> piece: it shows on the home page as the big card.</>}
      filters={[
        { key: 'home', label: 'On home page', test: (x) => !!x.on_home },
        ...Object.entries(CATEGORY).map(([key, label]) => ({ key, label, test: (x: any) => x.category === key })),
      ]}
      blank={() => ({ kind: 'photo', category: 'social', url: '', poster_url: '', client_name: emptyL(), on_home: false, featured: false, active: true })}
      validate={(d) => (!d.url ? 'Please upload a ' + (d.kind === 'photo' ? 'photo' : 'video') + '.' : null)}
      row={(it) => ({
        thumb: <Thumb url={it.url} poster={it.poster_url} kind={it.kind} />,
        title: en(it.client_name) || (it.client_name?.ar || '') || 'No client name',
        badges: (
          <>
            <Badge tone={it.kind === 'photo' ? 'grey' : 'blue'}>{KIND[it.kind] || it.kind}</Badge>
            <Badge tone="purple">{CATEGORY[it.category] || it.category}</Badge>
            {it.on_home && !it.featured && <Badge tone="green">Home</Badge>}
            {it.featured && <Badge tone="orange">★ Featured</Badge>}
          </>
        ),
      })}
      form={(d, set) => (
        <>
          <Segmented label="Which tab is it in?" value={d.category || 'social'} onChange={(k) => set({ category: k })} options={Object.entries(CATEGORY)} />
          <Segmented label="File type" value={d.kind} onChange={(k) => set({ kind: k })} options={[['photo', 'Photo'], ['video', 'Video'], ['reel', 'Reel (vertical video)']]} />
          <MediaInput label={d.kind === 'photo' ? 'Photo' : 'Video'} accept={d.kind === 'photo' ? 'image' : 'video'} folder="work" value={d.url} onChange={(u) => set({ url: u })}
            hint={d.kind === 'photo' ? undefined : 'Plays by itself, without sound, and repeats. The first frame shows until it starts.'} />
          <LInput label="Client name" value={d.client_name} onChange={(v) => set({ client_name: v })} />
          <div className="adm-two">
            <Toggle checked={!!d.on_home} onChange={(v) => set({ on_home: v })} label="Show on home page" hint="Up to 5 pieces, plus the Featured one." />
            <Toggle checked={!!d.featured} onChange={(v) => set({ featured: v, ...(v ? { on_home: true } : {}) })} label="Featured (big card)" hint="Only one. It always shows on the home page. If another piece is Featured, it stops being Featured." />
          </div>
        </>
      )} />
  );
}

/* ------------------------------------------------------------------ client logos */

export function Clients() {
  return (
    <Resource res="clients" title="Client logos" noun="client" site="/" wide
      intro="The logos in the clients strip. Upload a logo for the light theme, and if you have one, a version for the dark theme."
      blank={() => ({ name: '', logo_light_url: '', logo_dark_url: '', active: true })}
      validate={(d) => (!d.name.trim() ? 'Please type the client name.' : null)}
      row={(it) => ({
        thumb: (
          <span className="adm-logo-pair">
            <span className="light">{it.logo_light_url ? <img src={it.logo_light_url} alt="" /> : <em>No logo</em>}</span>
            <span className="dark">{it.logo_dark_url || it.logo_light_url ? <img src={it.logo_dark_url || it.logo_light_url} alt="" style={it.logo_dark_url ? undefined : { filter: 'brightness(0) invert(1)' }} /> : <em>No logo</em>}</span>
          </span>
        ),
        title: it.name,
        badges: !it.logo_light_url ? <Badge tone="orange">Logo missing</Badge> : undefined,
      })}
      form={(d, set) => (
        <>
          <TextIn label="Client name" value={d.name} onChange={(v) => set({ name: v })} hint="Used as the logo description for screen readers." />
          <div className="adm-two">
            <MediaInput label="Logo for LIGHT theme" accept="image" folder="clients" bg="light" value={d.logo_light_url} onChange={(u) => set({ logo_light_url: u })}
              hint="A dark or coloured logo. SVG or transparent PNG is best." />
            <div>
              <MediaInput label="Logo for DARK theme (optional)" accept="image" folder="clients" bg="dark" value={d.logo_dark_url} onChange={(u) => set({ logo_dark_url: u })}
                hint="A white or light logo." />
              {!d.logo_dark_url && d.logo_light_url && (
                <div className="adm-note">
                  <p>No dark logo? The site turns the light logo white automatically, like this:</p>
                  <div className="adm-media bg-dark"><div className="adm-media-preview small"><img src={d.logo_light_url} alt="" style={{ filter: 'brightness(0) invert(1)' }} /></div></div>
                </div>
              )}
            </div>
          </div>
        </>
      )} />
  );
}

/* ------------------------------------------------------------------ testimonials */

function TestimonialsDisplay() {
  const disp = useSetting<{ desktop: string; mobile: string }>('testimonials_display');
  const vid = useSetting<{ url: string }>('testimonials_video');
  const d = disp.draft;
  const v = vid.draft;
  return (
    <Card title="The testimonials video" className="adm-mb">
      {!d || !v ? <Skeleton rows={1} /> : (
        <>
          <p className="adm-hint">One short video (like a reel) that shows next to the quote cards, with the Minto badge on top. It plays by itself without sound; visitors can turn the sound on. Try 15 to 40 seconds, vertical (9:16), under 10 MB.</p>
          <MediaInput label="Video" accept="video" folder="testimonials" value={v.url || ''} onChange={(u) => vid.save({ url: u }, u ? 'Video saved. The site is updated.' : 'Video removed.')} />
          <hr className="adm-sep" />
          <Segmented label="On computers, show" value={d.desktop || 'both'} onChange={(m) => disp.save({ desktop: m, mobile: d.mobile || 'both' })}
            options={[['both', 'Cards and video'], ['cards', 'Cards only'], ['video', 'Video only']]} />
          <Segmented label="On phones, show" value={d.mobile || 'both'} onChange={(m) => disp.save({ desktop: d.desktop || 'both', mobile: m })}
            options={[['both', 'Cards and video'], ['cards', 'Cards only'], ['video', 'Video only']]} />
          <p className="adm-hint">{v.url ? 'On phones, “Cards and video” shows the cards first and the video under them.' : 'Upload the video first. Until then “Video only” falls back to the cards.'}</p>
        </>
      )}
    </Card>
  );
}

export function Testimonials() {
  return (
    <Resource res="testimonials" title="Testimonials" noun="testimonial" site="/" wide
      intro="What clients say about Minto. These are the quote cards. The video that sits beside them is set in the box above."
      top={<TestimonialsDisplay />}
      blank={() => ({ quote: emptyL(), name: emptyL(), role: emptyL(), avatar_url: '', active: true })}
      validate={(d) => (!asL(d.quote).en && !asL(d.quote).ar ? 'Please write the quote.' : null)}
      row={(it) => ({
        thumb: it.avatar_url ? <Thumb url={it.avatar_url} className="round" /> : <span className="adm-avatar">{(en(it.name) || '?').replace(/[[\]]/g, '').slice(0, 1)}</span>,
        title: en(it.name),
        sub: en(it.quote),
      })}
      form={(d, set) => (
        <>
          <LInput label="Quote" textarea rows={3} value={d.quote} onChange={(v) => set({ quote: v })} hint="One or two sentences in their own words." />
          <LInput label="Name" value={d.name} onChange={(v) => set({ name: v })} />
          <LInput label="Role and company" value={d.role} onChange={(v) => set({ role: v })} placeholder={{ en: 'Marketing manager, Company', ar: 'مدير التسويق، الشركة' }} />
          <MediaInput label="Photo (optional)" accept="image" folder="testimonials" value={d.avatar_url} onChange={(u) => set({ avatar_url: u })} hint="A square photo of the person or the company logo." />
        </>
      )} />
  );
}

/* ------------------------------------------------------------------ our story */

export function Story() {
  return (
    <Resource res="story" title="Our story" noun="story step" site="/#history"
      intro="The timeline on the home page, from first to last. Drag to change the order."
      blank={() => ({ year: '', title: emptyL(), text: emptyL(), active: true })}
      row={(it) => ({
        thumb: <span className="adm-year">{it.year || '—'}</span>,
        title: en(it.title),
        sub: en(it.text),
      })}
      form={(d, set) => (
        <>
          <TextIn label="Year" value={d.year} onChange={(v) => set({ year: v })} placeholder="2021" hint="Any short text, e.g. “2021” or “Today”." />
          <LInput label="Title" value={d.title} onChange={(v) => set({ title: v })} />
          <LInput label="Text" textarea rows={3} value={d.text} onChange={(v) => set({ text: v })} />
        </>
      )} />
  );
}
