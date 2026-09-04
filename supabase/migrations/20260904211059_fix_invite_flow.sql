-- Fixes the broken "Add Member" invite flow. Previously
-- app/api/members/invite/route.ts tried to insert a profiles row with
-- no id (profiles.id is NOT NULL, PK, references auth.users(id), no
-- default) — that insert silently failed every time (swallowed by a
-- best-effort .then(() => {})), so inviting someone did nothing but
-- send an email. No orphaned rows exist because it never succeeded.
--
-- The real fix: use supabase.auth.admin.inviteUserByEmail() to create
-- a genuine auth.users row. The existing handle_new_user trigger then
-- creates the profiles row correctly and automatically the moment the
-- invite is sent, with no placeholder/manual insert needed.
--
-- One gap: handle_new_user always defaults status to 'pending' (via
-- the profiles table default), which is right for public signups but
-- wrong for someone a pastor personally invited — they shouldn't need
-- a second approval from the same pastor who just invited them. This
-- redeclaration reads an `invited_by` flag from the invite's user
-- metadata and sets status='approved' when present.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_church_id uuid;
BEGIN
  SELECT id INTO default_church_id FROM churches LIMIT 1;

  INSERT INTO public.profiles (id, full_name, role, church_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    'member',
    default_church_id,
    CASE WHEN NEW.raw_user_meta_data->>'invited_by' IS NOT NULL THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
