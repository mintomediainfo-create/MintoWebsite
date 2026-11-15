-- Newsletter: one private token per subscriber (for the unsubscribe link), their language, and a "already emailed" mark on each post.
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS token UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'en';
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_token_idx ON subscribers (token);
ALTER TABLE news ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
-- posts that exist today were never meant to be emailed
UPDATE news SET notified_at = now() WHERE notified_at IS NULL;
