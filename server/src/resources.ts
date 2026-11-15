// The content types the dashboard can edit. Each one maps to a table and lists the columns
// the dashboard is allowed to write (anything else in the request is ignored).
type Col = 'text' | 'json' | 'bool' | 'int' | 'date';

export interface Resource {
  table: string;
  cols: Record<string, Col>;
  order: string;
  slugFrom?: string; // column whose English text makes the URL slug
}

const L = 'json' as const;

export const resources: Record<string, Resource> = {
  'intro-media': {
    table: 'intro_media',
    cols: { kind: 'text', url: 'text', poster_url: 'text', caption: L, sort: 'int', active: 'bool' },
    order: 'sort, id',
  },
  services: {
    table: 'services',
    cols: { title: L, short: L, tags: L, bg: 'text', fg: 'text', sort: 'int', active: 'bool' },
    order: 'sort, id',
  },
  work: {
    table: 'work_items',
    cols: { kind: 'text', category: 'text', url: 'text', poster_url: 'text', title: L, client_name: L, caption: L, tags: L, on_home: 'bool', featured: 'bool', sort: 'int', active: 'bool' },
    order: 'sort, id DESC',
  },
  clients: {
    table: 'clients',
    cols: { name: 'text', logo_light_url: 'text', logo_dark_url: 'text', sort: 'int', active: 'bool' },
    order: 'sort, id',
  },
  testimonials: {
    table: 'testimonials',
    cols: { quote: L, name: L, role: L, avatar_url: 'text', video_url: 'text', poster_url: 'text', sort: 'int', active: 'bool' },
    order: 'sort, id',
  },
  story: {
    table: 'story',
    cols: { year: 'text', title: L, text: L, sort: 'int', active: 'bool' },
    order: 'sort, id',
  },
  news: {
    table: 'news',
    cols: { slug: 'text', type: 'text', title: L, summary: L, body: L, cover_url: 'text', featured: 'bool', status: 'text', published_at: 'date' },
    order: 'published_at DESC, id DESC',
    slugFrom: 'title',
  },
  jobs: {
    table: 'jobs',
    cols: { slug: 'text', title: L, department: L, location: L, job_type: L, level: L, summary: L, sections: L, questions: L, deadline: 'date', status: 'text', sort: 'int' },
    order: 'sort, id DESC',
    slugFrom: 'title',
  },
};

export function slugify(s: string) {
  return (s || 'item')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'item';
}

/** Turns a request body into column/value pairs the table accepts. */
export function pickColumns(res: Resource, body: any) {
  const out: Record<string, unknown> = {};
  for (const [k, type] of Object.entries(res.cols)) {
    if (!(k in (body || {}))) continue;
    const v = body[k];
    if (type === 'json') out[k] = JSON.stringify(v ?? null);
    else if (type === 'bool') out[k] = !!v;
    else if (type === 'int') out[k] = Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0;
    else if (type === 'date') out[k] = v ? String(v) : null;
    else out[k] = v == null ? '' : String(v);
  }
  return out;
}
