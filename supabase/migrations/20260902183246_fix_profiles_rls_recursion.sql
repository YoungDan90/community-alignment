-- Fixes a real production bug: "Users can read profiles in their church"
-- (added in the signup-approval-gate migration) queried profiles from
-- within a policy defined ON profiles itself:
--
--   church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
--
-- Postgres re-evaluates profiles' RLS for that subquery, which re-enters
-- the same policy — infinite recursion. Every profiles SELECT errored,
-- so every profile fetch in the app silently returned null and every
-- page fell back to its default state ("Member", 0 stats, etc.) with no
-- visible error. This is what caused an actual admin account to display
-- as "Member" throughout the app.
--
-- get_my_church_id() already exists as a SECURITY DEFINER helper that
-- does the same lookup but bypasses RLS internally, so it doesn't
-- recurse — same pattern the working "Users can read church members"
-- policy already used. Swapping to it fixes this policy.

DROP POLICY IF EXISTS "Users can read profiles in their church" ON public.profiles;

CREATE POLICY "Users can read profiles in their church"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      get_my_status() = 'approved'
      AND church_id = get_my_church_id()
    )
  );

-- Same cleanup on profile_secondary_roles' read policy — not recursive
-- (different table), but had the same raw double-nested profiles
-- subquery instead of the existing helper. Tidied for consistency.
DROP POLICY IF EXISTS "Church members can read secondary roles" ON public.profile_secondary_roles;

CREATE POLICY "Church members can read secondary roles"
  ON public.profile_secondary_roles FOR SELECT
  TO authenticated
  USING (
    get_my_status() = 'approved'
    AND profile_id IN (
      SELECT id FROM public.profiles WHERE church_id = get_my_church_id()
    )
  );
