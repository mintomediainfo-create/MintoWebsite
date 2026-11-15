// News, announcements and events: list + full-page editor.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  Any, Badge, Card, Empty, ErrorBox, GLink, Icon, LInput, MediaInput, PageHead, SaveBar, SelectIn, Skeleton, TextIn, Thumb, Toggle,
  emptyL, en, fmtDate, toDateInput, useDirty, useDraft, useLoad, useUi,
} from './ui';

const TYPES: [string, string][] = [['news', 'News'], ['announcement', 'Announcement'], ['event', 'Event']];
const TYPE_TONE: Record<string, string> = { news: 'blue', announcement: 'orange', event: 'green' };
const typeName = (t: string) => TYPES.find((x) => x[0] === t)?.[1] || t;

export function NewsList() {
  const { data, error, loading, reload, setData } = useLoad<Any[]>('/admin/r/news');
  const { confirm, toast, fail } = useUi();
  const [type, setType] = useState('');
  const list = (data || []).filter((x) => !type || x.type === type);

  async function remove(it: Any) {
    if (!(await confirm({ title: 'Delete this post?', message: `“${en(it.title)}” will be removed for good. To hide it instead, set it to Draft.`, ok: 'Delete', danger: true }))) return;
    try {
      await api('/admin/r/news/' + it.id, { method: 'DELETE' });
      setData((data || []).filter((x) => x.id !== it.id));
      toast('Post deleted.');
    } catch (e) { fail(e); }
  }

  return (
    <div className="adm-page">
      <PageHead title="News" intro="News, announcements and events. Drafts are not shown on the site." site="/news"
        actions={<GLink className="adm-btn primary" to="/admin/news/new"><Icon name="plus" /> Write a post</GLink>} />
      <ErrorBox error={error} retry={reload} />
      {data && data.length > 0 && (
        <div className="adm-filters" role="group" aria-label="Filter by type">
          {[['', 'All'] as [string, string], ...TYPES].map(([k, t]) => (
            <button key={k} type="button" className={'adm-chip' + (type === k ? ' on' : '')} aria-pressed={type === k} onClick={() => setType(k)}>
              {t} <span className="adm-chip-n">{(data || []).filter((x) => !k || x.type === k).length}</span>
            </button>
          ))}
        </div>
      )}
      {loading && !data ? <Skeleton rows={5} /> : data && data.length === 0 ? (
        <Empty title="No posts yet" text="Share news, announcements and events with your visitors."
          action={<GLink className="adm-btn primary" to="/admin/news/new"><Icon name="plus" /> Write first post</GLink>} />
      ) : (
        <ul className="adm-sort">
          {list.map((it) => (
            <li key={it.id} className="adm-sort-item">
              <div className="adm-row">
                <GLink to={'/admin/news/' + it.id} className="adm-row-thumb" aria-label={'Edit ' + en(it.title)}><Thumb url={it.cover_url} /></GLink>
                <div className="adm-row-main">
                  <GLink to={'/admin/news/' + it.id} className="adm-row-title">{en(it.title) || '(no title)'}</GLink>
                  <div className="adm-row-sub">{fmtDate(it.published_at)}</div>
                  <div className="adm-row-badges">
                    <Badge tone={TYPE_TONE[it.type]}>{typeName(it.type)}</Badge>
                    {it.status === 'draft' ? <Badge tone="grey">Draft</Badge> : <Badge tone="green">Published</Badge>}
                    {it.featured && <Badge tone="orange">★ Featured</Badge>}
                  </div>
                </div>
                <div className="adm-row-actions">
                  {it.status === 'published' && <a className="adm-icon-btn" href={'/news/' + it.slug} target="_blank" rel="noreferrer" aria-label={'View ' + en(it.title) + ' on site'}><Icon name="ext" /></a>}
                  <GLink className="adm-icon-btn" to={'/admin/news/' + it.id} aria-label={'Edit ' + en(it.title)}><Icon name="edit" /></GLink>
                  <button type="button" className="adm-icon-btn danger" aria-label={'Delete ' + en(it.title)} onClick={() => remove(it)}><Icon name="trash" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const blankPost = (): Any => ({
  type: 'news', title: emptyL(), summary: emptyL(), body: emptyL(), cover_url: '', featured: false, status: 'draft',
  published_at: toDateInput(new Date().toISOString()), slug: '',
});

export function NewsEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { data, error, reload } = useLoad<Any>(isNew ? null : '/admin/r/news/' + id);
  const d = useDraft<Any>(undefined);
  const { toast, fail } = useUi();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  useDirty(d.dirty);

  useEffect(() => {
    if (isNew) d.reset(blankPost());
    else if (data) d.reset({ ...data, published_at: toDateInput(data.published_at) });
  }, [isNew, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = d.draft;
  const words = useMemo(() => (v ? (v.body?.en || '').split(/\s+/).filter(Boolean).length : 0), [v]);

  async function save() {
    if (!v) return;
    if (!v.title.en.trim() && !v.title.ar.trim()) { toast('Please write a title.', 'error'); return; }
    setSaving(true);
    try {
      const { id: _id, created_at, ...body } = v;
      if (!body.slug) delete body.slug;
      if (!body.published_at) body.published_at = toDateInput(new Date().toISOString());
      const saved = isNew ? await api<Any>('/admin/r/news', { body }) : await api<Any>('/admin/r/news/' + v.id, { method: 'PUT', body: { ...body, slug: v.slug || '' } });
      d.reset({ ...saved, published_at: toDateInput(saved.published_at) });
      toast(saved.status === 'published' ? 'Post saved and published.' : 'Draft saved.');
      if (isNew) navigate('/admin/news/' + saved.id, { replace: true });
    } catch (e) { fail(e); } finally { setSaving(false); }
  }

  if (error) return <div className="adm-page"><ErrorBox error={error} retry={reload} /><GLink to="/admin/news" className="adm-back"><Icon name="left" size={16} /> All posts</GLink></div>;
  if (!v) return <div className="adm-page"><Skeleton rows={6} /></div>;

  return (
    <div className="adm-page">
      <GLink to="/admin/news" className="adm-back"><Icon name="left" size={16} /> All posts</GLink>
      <PageHead title={isNew ? 'New post' : en(v.title) || 'Edit post'}
        site={!isNew && d.orig?.status === 'published' ? '/news/' + d.orig.slug : undefined} siteLabel="View post" />
      <div className="adm-editor">
        <div className="adm-editor-main">
          <Card>
            <LInput label="Title" value={v.title} onChange={(x) => d.patch({ title: x })} />
            <LInput label="Summary" textarea rows={2} value={v.summary} onChange={(x) => d.patch({ summary: x })} hint="One or two sentences shown on the news list." />
            <LInput label="Full text" textarea rows={14} value={v.body} onChange={(x) => d.patch({ body: x })}
              hint={<>Leave an empty line to start a new paragraph. {words > 0 && <span>({words} words in English)</span>}</>} />
          </Card>
        </div>
        <aside className="adm-editor-side">
          <Card title="Publishing">
            <SelectIn label="Status" value={v.status} onChange={(x) => d.patch({ status: x })} options={[['draft', 'Draft (hidden)'], ['published', 'Published (on the site)']]} />
            <SelectIn label="Type" value={v.type} onChange={(x) => d.patch({ type: x })} options={TYPES} />
            <TextIn label="Date" type="date" value={v.published_at} onChange={(x) => d.patch({ published_at: x })} hint="Shown on the post. Newest posts come first." />
            <Toggle checked={!!v.featured} onChange={(x) => d.patch({ featured: x })} label="Featured" hint="Featured posts show first on the News page." />
          </Card>
          <Card title="Cover picture">
            <MediaInput label="Cover" accept="image" folder="news" value={v.cover_url} onChange={(u) => d.patch({ cover_url: u })} hint="Wide picture, about 1600 × 900." />
          </Card>
          <Card title="Link">
            <TextIn label="Web address (slug)" mono value={v.slug} onChange={(x) => d.patch({ slug: x.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="made from the title"
              hint={<>The post will be at <code>/news/{v.slug || '…'}</code>. Leave empty to make it from the English title.</>} />
          </Card>
        </aside>
      </div>
      <SaveBar dirty={d.dirty || isNew} saving={saving} onSave={save} onReset={isNew ? undefined : () => d.orig && d.reset(d.orig)}
        label={isNew ? (v.status === 'published' ? 'Publish post' : 'Save draft') : 'Save changes'} />
    </div>
  );
}
