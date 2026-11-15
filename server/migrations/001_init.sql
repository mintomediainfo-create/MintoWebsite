-- Minto Media website — first schema.
-- Text that shows on the site in two languages is stored as JSON: {"en": "...", "ar": "..."}

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- one row per settings group: hero, contact, social, testimonials_display, seo ...
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- the photos / short videos under "We support your success"
CREATE TABLE IF NOT EXISTS intro_media (
  id         SERIAL PRIMARY KEY,
  kind       TEXT NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'video')),
  url        TEXT NOT NULL DEFAULT '',
  poster_url TEXT NOT NULL DEFAULT '',
  caption    JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  sort       INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS services (
  id     SERIAL PRIMARY KEY,
  title  JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  short  JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  tags   JSONB NOT NULL DEFAULT '[]'::jsonb,           -- [{"en":"","ar":""}]
  bg     TEXT NOT NULL DEFAULT '#0B4A94',
  fg     TEXT NOT NULL DEFAULT '#ffffff',
  sort   INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

-- photos and videos made for clients: the Work wall, and the "Work we are proud of" grid on the home page
CREATE TABLE IF NOT EXISTS work_items (
  id           SERIAL PRIMARY KEY,
  kind         TEXT NOT NULL DEFAULT 'photo' CHECK (kind IN ('photo', 'video', 'reel')),
  url          TEXT NOT NULL DEFAULT '',
  poster_url   TEXT NOT NULL DEFAULT '',
  title        JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  client_name  JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  caption      JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  tags         JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  on_home      BOOLEAN NOT NULL DEFAULT false,
  featured     BOOLEAN NOT NULL DEFAULT false,
  sort         INT NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL DEFAULT '',
  logo_light_url TEXT NOT NULL DEFAULT '',   -- shown in light mode
  logo_dark_url  TEXT NOT NULL DEFAULT '',   -- shown in dark mode (empty = light logo turned white)
  sort           INT NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS testimonials (
  id         SERIAL PRIMARY KEY,
  quote      JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  name       JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  role       JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  avatar_url TEXT NOT NULL DEFAULT '',
  video_url  TEXT NOT NULL DEFAULT '',     -- optional video testimonial
  poster_url TEXT NOT NULL DEFAULT '',
  sort       INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS story (
  id     SERIAL PRIMARY KEY,
  year   TEXT NOT NULL DEFAULT '',
  title  JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  text   JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  sort   INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS news (
  id           SERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL DEFAULT 'news' CHECK (type IN ('news', 'announcement', 'event')),
  title        JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  summary      JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  body         JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  cover_url    TEXT NOT NULL DEFAULT '',
  featured     BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  title      JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  department JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  location   JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  job_type   JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  level      JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  summary    JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  -- the job details page: [{ "title": {en,ar}, "style": "text"|"bullets"|"checks"|"cards", "text": {en,ar}, "items": [{en,ar}] }]
  sections   JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- the "Your experience" part of the form, set by the admin:
  -- [{ "id": "q1", "label": {en,ar}, "type": "text"|"textarea"|"single"|"multi", "required": true, "options": [{en,ar}] }]
  questions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  deadline   DATE,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
  sort       INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id         SERIAL PRIMARY KEY,
  job_id     INT REFERENCES jobs(id) ON DELETE SET NULL,
  job_title  TEXT NOT NULL DEFAULT '',     -- kept even if the job is deleted
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,
  city       TEXT NOT NULL DEFAULT '',
  answers    JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ "question": "...", "answer": "..." }]
  cv_key     TEXT NOT NULL,
  cv_name    TEXT NOT NULL DEFAULT '',
  portfolio  TEXT NOT NULL DEFAULT '',
  linkedin   TEXT NOT NULL DEFAULT '',
  lang       TEXT NOT NULL DEFAULT 'en',
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS applications_job_idx ON applications (job_id);

CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
