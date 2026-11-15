// Generic screen for an ordered list of content (services, work, clients, ...):
// list or grid, drag/up-down reorder, inline "show on site" toggle, delete, edit in a side panel.
import { ReactNode, useState } from 'react';
import { api } from '../lib/api';
import {
  Any, Badge, Drawer, Empty, ErrorBox, Icon, PageHead, Skeleton, SortList, Toggle, clone, same, useDirty, useLoad, useUi,
} from './ui';

export interface Filter { key: string; label: string; test: (it: Any) => boolean }

export interface ResourceProps {
  res: string;
  title: string;
  intro?: ReactNode;
  site?: string;
  siteLabel?: string;
  /** e.g. "service" — used in buttons: "Add service" */
  noun: string;
  blank: () => Any;
  /** how an item shows in the list */
  row: (it: Any) => { thumb?: ReactNode; title: ReactNode; sub?: ReactNode; badges?: ReactNode };
  /** the form in the side panel */
  form: (d: Any, set: (p: Any) => void) => ReactNode;
  grid?: boolean;
  hasActive?: boolean;
  filters?: Filter[];
  /** checks before saving; return a message to stop */
  validate?: (d: Any) => string | null;
  /** clean the data just before it is sent (e.g. drop empty lines) */
  prepare?: (d: Any) => Any;
  /** runs after a save with the saved row and the whole list */
  afterSave?: (saved: Any, list: Any[]) => Promise<void>;
  /** extra content above the list */
  top?: ReactNode;
  wide?: boolean;
}

export default function Resource(p: ResourceProps) {
  const { data, error, loading, reload, setData } = useLoad<Any[]>('/admin/r/' + p.res);
  const { toast, confirm, fail } = useUi();
  const [edit, setEdit] = useState<{ orig: Any; draft: Any } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const hasActive = p.hasActive !== false;
  const dirty = !!edit && !same(edit.orig, edit.draft);
  useDirty(dirty);

  const list = data || [];
  const f = p.filters?.find((x) => x.key === filter);
  const shown = f ? list.filter(f.test) : list;
  const noun = p.noun;
  const Noun = noun[0].toUpperCase() + noun.slice(1);

  const open = (it?: Any) => {
    const d = it ? clone(it) : p.blank();
    setEdit({ orig: clone(d), draft: d });
  };
  const close = async () => {
    if (dirty && !(await confirm({ title: 'Close without saving?', message: 'Your changes to this ' + noun + ' will be lost.', ok: 'Close', cancel: 'Keep editing', danger: true }))) return;
    setEdit(null);
  };

  async function save() {
    if (!edit) return;
    const msg = p.validate?.(edit.draft);
    if (msg) { toast(msg, 'error'); return; }
    setSaving(true);
    try {
      const { id, ...body } = p.prepare ? p.prepare(edit.draft) : edit.draft;
      const saved = id
        ? await api<Any>(`/admin/r/${p.res}/${id}`, { method: 'PUT', body })
        : await api<Any>(`/admin/r/${p.res}`, { method: 'POST', body });
      const next = id ? list.map((x) => (x.id === id ? saved : x)) : [...list, saved];
      setData(next);
      setEdit(null);
      toast(id ? `${Noun} saved.` : `${Noun} added.`);
      if (p.afterSave) { await p.afterSave(saved, next); }
      reload();
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(it: Any) {
    const v = !it.active;
    setData(list.map((x) => (x.id === it.id ? { ...x, active: v } : x)));
    try {
      await api(`/admin/r/${p.res}/${it.id}`, { method: 'PUT', body: { active: v } });
      toast(v ? 'Now showing on the site.' : 'Hidden from the site.');
    } catch (e) { fail(e); reload(); }
  }

  async function remove(it: Any) {
    const name = String(rowTitleText(p.row(it).title) || 'this ' + noun);
    const ok = await confirm({ title: `Delete this ${noun}?`, message: <>“{name}” will be removed for good. If you only want to hide it, turn off “Show on site” instead.</>, ok: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/r/${p.res}/${it.id}`, { method: 'DELETE' });
      setData(list.filter((x) => x.id !== it.id));
      toast(`${Noun} deleted.`);
    } catch (e) { fail(e); }
  }

  async function reorder(next: Any[]) {
    setData(next);
    try {
      await api(`/admin/r/${p.res}/reorder`, { body: { ids: next.map((x) => x.id) } });
      toast('New order saved.');
    } catch (e) { fail(e); reload(); }
  }

  const addBtn = (
    <button type="button" className="adm-btn primary" onClick={() => open()}><Icon name="plus" /> Add {noun}</button>
  );

  return (
    <div className="adm-page">
      <PageHead title={p.title} intro={p.intro} site={p.site} siteLabel={p.siteLabel} actions={addBtn} />
      {p.top}
      <ErrorBox error={error} retry={reload} />
      {p.filters && list.length > 0 && (
        <div className="adm-filters" role="group" aria-label="Filter">
          {[{ key: 'all', label: 'All' } as { key: string; label: string; test?: (it: Any) => boolean }, ...p.filters].map((x) => (
            <button key={x.key} type="button" className={'adm-chip' + (filter === x.key ? ' on' : '')} aria-pressed={filter === x.key} onClick={() => setFilter(x.key)}>
              {x.label} <span className="adm-chip-n">{x.test ? list.filter(x.test).length : list.length}</span>
            </button>
          ))}
        </div>
      )}
      {filter !== 'all' && shown.length > 1 && <p className="adm-hint">To change the order, choose “All” first.</p>}
      {loading && !data ? (
        <Skeleton rows={p.grid ? 6 : 4} grid={p.grid} />
      ) : list.length === 0 && !error ? (
        <Empty title="Nothing here yet" text={`Add your first ${noun} and it will show on the site.`}
          action={<button type="button" className="adm-btn primary" onClick={() => open()}><Icon name="plus" /> Add first {noun}</button>} />
      ) : shown.length === 0 ? (
        <p className="adm-muted">Nothing matches this filter.</p>
      ) : (
        <SortList items={shown as (Any & { id: number })[]} grid={p.grid} disabled={filter !== 'all'} onMove={reorder} noun={noun}
          labelOf={(it) => String(rowTitleText(p.row(it).title) || noun)}
          render={(it) => {
            const r = p.row(it);
            return (
              <div className={'adm-row' + (hasActive && !it.active ? ' off' : '')}>
                {r.thumb && <button type="button" className="adm-row-thumb" onClick={() => open(it)} aria-label={'Edit ' + (rowTitleText(r.title) || noun)}>{r.thumb}</button>}
                <div className="adm-row-main">
                  <button type="button" className="adm-row-title" onClick={() => open(it)}>{r.title || <span className="adm-muted">(no title)</span>}</button>
                  {r.sub && <div className="adm-row-sub">{r.sub}</div>}
                  {(r.badges || (hasActive && !it.active)) && (
                    <div className="adm-row-badges">{hasActive && !it.active && <Badge tone="grey">Hidden</Badge>}{r.badges}</div>
                  )}
                </div>
                <div className="adm-row-actions">
                  {hasActive && <Toggle checked={!!it.active} onChange={() => toggleActive(it)} label="Show on site" />}
                  <button type="button" className="adm-icon-btn" aria-label={'Edit ' + (rowTitleText(r.title) || noun)} onClick={() => open(it)}><Icon name="edit" /></button>
                  <button type="button" className="adm-icon-btn danger" aria-label={'Delete ' + (rowTitleText(r.title) || noun)} onClick={() => remove(it)}><Icon name="trash" /></button>
                </div>
              </div>
            );
          }} />
      )}
      {edit && (
        <Drawer title={edit.draft.id ? `Edit ${noun}` : `New ${noun}`} onClose={close} wide={p.wide}
          footer={
            <>
              {dirty && <span className="adm-unsaved">Unsaved changes</span>}
              <button type="button" className="adm-btn ghost" onClick={close}>Cancel</button>
              <button type="button" className="adm-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : edit.draft.id ? 'Save' : `Add ${noun}`}</button>
            </>
          }>
          <form className="adm-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            {p.form(edit.draft, (patch) => setEdit((s) => (s ? { ...s, draft: { ...s.draft, ...patch } } : s)))}
            {hasActive && (
              <Toggle checked={!!edit.draft.active} onChange={(v) => setEdit((s) => (s ? { ...s, draft: { ...s.draft, active: v } } : s))}
                label="Show on site" hint="Turn off to hide it without deleting it." />
            )}
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
        </Drawer>
      )}
    </div>
  );
}

function rowTitleText(t: ReactNode): string {
  return typeof t === 'string' || typeof t === 'number' ? String(t) : '';
}
