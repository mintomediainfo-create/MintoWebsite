-- Work page filter tabs: Podcasts / Reels / Campaigns.
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'campaign' CHECK (category IN ('podcast', 'reel', 'campaign'));
UPDATE work_items SET category = 'reel' WHERE kind = 'reel' AND category = 'campaign';
