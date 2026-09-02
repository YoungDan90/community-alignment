-- New signups must be approved by a pastor/admin before they can see
-- any church data. Previously /signup created a 'member' profile with
-- immediate access — this closes that gap.
--
-- Existing real members are backfilled to 'approved' so nobody currently
-- using the app gets locked out.

ALTER TABLE public.profiles
  ADD COLUMN status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined'));

UPDATE public.profiles SET status = 'approved';

CREATE OR REPLACE FUNCTION public.get_my_status()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid();
$$;

-- Replace the church-wide profile SELECT policy: a pending/declined user
-- may still read their own row (needed for the pending-approval screen
-- and profile settings) but not other members' data. Approved users keep
-- the existing church-wide visibility.
DROP POLICY IF EXISTS "Users can read profiles in their church" ON public.profiles;

CREATE POLICY "Users can read profiles in their church"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      get_my_status() = 'approved'
      AND church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Pastor/admin can update other members' role and status (approve/decline,
-- promote to prophetic team, etc). Kept separate from the existing
-- "own row" update policy rather than replacing it.
CREATE POLICY "Pastor can update member profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('pastor', 'admin'));

-- The church_id-only SELECT policies below let a pending member read
-- verses/prayer requests/testimonies directly via the Supabase client even
-- though middleware blocks them from the pages — close that gap too.
DROP POLICY IF EXISTS "Verses readable by church members" ON public.verses;

CREATE POLICY "Verses readable by church members"
  ON public.verses FOR SELECT
  TO authenticated
  USING (
    get_my_status() = 'approved'
    AND church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Church members can read approved prayer requests" ON public.prayer_requests;

CREATE POLICY "Church members can read approved prayer requests"
  ON public.prayer_requests FOR SELECT
  TO authenticated
  USING (
    (
      status = 'approved'
      AND get_my_status() = 'approved'
      AND church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Church members can read approved testimonies" ON public.testimonies;

CREATE POLICY "Church members can read approved testimonies"
  ON public.testimonies FOR SELECT
  TO authenticated
  USING (
    (
      status = 'approved'
      AND get_my_status() = 'approved'
      AND church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    )
    OR user_id = auth.uid()
    OR (get_my_status() = 'approved' AND get_my_role() IN ('prophetic_team', 'pastor', 'admin'))
  );
