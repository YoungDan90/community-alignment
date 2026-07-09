-- Align live worship-module columns with what the code expects.
-- Verified 2026-07-09: no policies, constraints, or indexes reference
-- these columns by name; service_plan_songs and service_plan_team are
-- empty; service_plans has 3 rows (backfilled below before the drop).

-- 1. service_plans: boolean is_published → text status ('draft'|'published')
ALTER TABLE public.service_plans
  ADD COLUMN status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'published'));

UPDATE public.service_plans
  SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;

ALTER TABLE public.service_plans DROP COLUMN is_published;

-- 2. service_plan_songs: match code's plan_id / song_notes
ALTER TABLE public.service_plan_songs RENAME COLUMN service_plan_id TO plan_id;
ALTER TABLE public.service_plan_songs RENAME COLUMN notes TO song_notes;

-- 3. service_plan_team: match code's plan_id / role_in_plan
ALTER TABLE public.service_plan_team RENAME COLUMN service_plan_id TO plan_id;
ALTER TABLE public.service_plan_team RENAME COLUMN role_name TO role_in_plan;
