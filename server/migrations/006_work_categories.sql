-- Work page tabs from the client's content: Social media / Branding / Photography / Video production / Ad campaigns / Web design.
ALTER TABLE work_items DROP CONSTRAINT IF EXISTS work_items_category_check;
UPDATE work_items SET category = CASE category WHEN 'campaign' THEN 'ads' ELSE 'video' END WHERE category IN ('podcast', 'reel', 'campaign');
ALTER TABLE work_items ALTER COLUMN category SET DEFAULT 'social';
ALTER TABLE work_items ADD CONSTRAINT work_items_category_check CHECK (category IN ('social', 'branding', 'photography', 'video', 'ads', 'web'));
