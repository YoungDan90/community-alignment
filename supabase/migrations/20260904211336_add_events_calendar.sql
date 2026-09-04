-- Church calendar: one-off or weekly-recurring events (baptisms,
-- outreach nights, prayer meetings, etc.), created by pastor/admin.
-- Deliberately doesn't touch groups.meeting_schedule or rotas — those
-- stay as they are for now; the calendar surfaces events + published
-- Sunday service_plans only, scoped in this first version.

CREATE TABLE public.events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    uuid REFERENCES public.churches(id),
  title        text NOT NULL,
  description  text,
  location     text,
  start_at     timestamptz NOT NULL,
  end_at       timestamptz,
  recurrence   text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'weekly')),
  -- For a weekly-recurring event, occurrences stop generating after this
  -- date (open-ended recurrence otherwise runs forever, which the app
  -- caps to a rolling window anyway — this lets a pastor end a series).
  recurrence_until date,
  created_by   uuid REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members can read events"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    get_my_status() = 'approved'
    AND church_id = get_my_church_id()
  );

CREATE POLICY "Pastor can manage events"
  ON public.events FOR ALL
  TO authenticated
  USING (get_my_roles() && ARRAY['pastor', 'admin'])
  WITH CHECK (get_my_roles() && ARRAY['pastor', 'admin']);
