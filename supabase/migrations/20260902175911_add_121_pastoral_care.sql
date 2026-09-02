-- 1:1 pastoral care: a member is assigned a pastor, and together they
-- track holistic goals (not tied to any category — freeform, with a
-- status and progress indicator). Lives under Grow in the app nav.

CREATE TABLE public.pastoral_assignments (
  member_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pastor_id    uuid NOT NULL REFERENCES public.profiles(id),
  assigned_by  uuid REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.pastoral_assignments ENABLE ROW LEVEL SECURITY;

-- A member reads their own assignment; the assigned pastor reads it too
-- (so they can see their own caseload); pastor/admin read all (for the
-- assignment picker in the dashboard).
CREATE POLICY "Member and assigned pastor can read assignment"
  ON public.pastoral_assignments FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid()
    OR pastor_id = auth.uid()
    OR get_my_roles() && ARRAY['pastor', 'admin']
  );

CREATE POLICY "Pastor can manage assignments"
  ON public.pastoral_assignments FOR ALL
  TO authenticated
  USING (get_my_roles() && ARRAY['pastor', 'admin'])
  WITH CHECK (get_my_roles() && ARRAY['pastor', 'admin']);

CREATE TABLE public.holistic_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  progress     int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by   uuid REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.holistic_goals ENABLE ROW LEVEL SECURITY;

-- Member can read/write their own goals. Their assigned pastor can also
-- read/write (shared 1:1 space — both sides add goals and update
-- progress). Any pastor/admin can read/write too, matching how
-- pastoral_notes already works (any pastor, not just the assigned one,
-- can step in — e.g. covering for someone on leave).
CREATE POLICY "Member can manage own goals"
  ON public.holistic_goals FOR ALL
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "Pastor can manage member goals"
  ON public.holistic_goals FOR ALL
  TO authenticated
  USING (
    get_my_roles() && ARRAY['pastor', 'admin']
    OR member_id IN (SELECT member_id FROM public.pastoral_assignments WHERE pastor_id = auth.uid())
  )
  WITH CHECK (
    get_my_roles() && ARRAY['pastor', 'admin']
    OR member_id IN (SELECT member_id FROM public.pastoral_assignments WHERE pastor_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER holistic_goals_set_updated_at
  BEFORE UPDATE ON public.holistic_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
