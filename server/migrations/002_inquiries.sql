-- Messages sent from the "Let's talk" form on the website.
CREATE TABLE IF NOT EXISTS inquiries (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  company    TEXT NOT NULL DEFAULT '',
  services   JSONB NOT NULL DEFAULT '[]'::jsonb,   -- service names the visitor ticked
  budget     TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL,
  lang       TEXT NOT NULL DEFAULT 'en',
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'closed')),
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inquiries_created_idx ON inquiries (created_at DESC);
