-- RLS fixes — re-scoped 2026-07-09 after verifying the live DB.
-- The original version of this file also patched the profiles
-- recursion and pastor-profile-update policies, but the live DB
-- already has correct versions of those (SECURITY DEFINER helpers
-- get_my_role() / get_my_church_id(), applied via dashboard), and a
-- "Team can read all prayer requests" SELECT policy. Only two gaps
-- remain:

-- ── 1. prayer_requests: team moderation (UPDATE) ──────────────────
-- The UI lets prophetic_team/pastor/admin approve/decline requests,
-- but the only live UPDATE policy is "Users can update own prayer
-- requests" (user_id = auth.uid()), so moderation silently fails.
CREATE POLICY "Team can moderate prayer requests"
  ON public.prayer_requests FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('prophetic_team', 'pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('prophetic_team', 'pastor', 'admin'));

-- ── 2. increment_prayer_count RPC ─────────────────────────────────
-- Called by PrayerRequestCard's "I'm Praying" button; confirmed absent
-- from the live DB, so prayer counts never increment. SECURITY DEFINER
-- because members may pray for requests they can't UPDATE via RLS.
CREATE OR REPLACE FUNCTION public.increment_prayer_count(request_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE prayer_requests
  SET prayer_count = prayer_count + 1
  WHERE id = request_id;
$$;

REVOKE ALL ON FUNCTION public.increment_prayer_count(uuid) FROM anon;
