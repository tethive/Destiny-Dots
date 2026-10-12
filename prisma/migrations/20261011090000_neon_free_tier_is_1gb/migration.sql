-- Neon's free tier is 1 GB per project, not the 0.5 GB this shipped with.
-- Only corrects installations still on the old default; an admin's own value is left alone.
UPDATE "AppSetting"
SET "value" = jsonb_set("value"::jsonb, '{neonStorageGb}', '1'::jsonb)
WHERE "key" = 'usage'
  AND "value"::jsonb -> 'neonStorageGb' = '0.5'::jsonb;
