-- Public "join the church" enquiry storage.
-- Backs the public /join page (anon INSERT) and a pastor triage tab
-- (pastor/admin SELECT + UPDATE via the existing get_my_role() helper).

CREATE TABLE public.join_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  phone       text,
  heard_via   text,               -- how they found the church
  visited     boolean,            -- been to a service before?
  message     text,               -- their note / prayer need
  wants_call  boolean DEFAULT false,
  status      text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'joined', 'archived')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Public form: anyone (anon or signed-in) may submit an enquiry.
CREATE POLICY "Anyone can submit a join request"
  ON public.join_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only pastors/admins may read and triage enquiries.
CREATE POLICY "Pastor can read join requests"
  ON public.join_requests FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'));

CREATE POLICY "Pastor can update join requests"
  ON public.join_requests FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('pastor', 'admin'));
