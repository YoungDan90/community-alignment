-- ── Tables ────────────────────────────────────────────────────

CREATE TABLE churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id uuid REFERENCES churches(id),
  full_name text,
  role text DEFAULT 'member' CHECK (role IN ('member', 'prophetic_team', 'pastor', 'admin')),
  avatar_url text,
  preferred_translation text DEFAULT 'nkjv' CHECK (preferred_translation IN ('nkjv', 'nlt')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE verses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES churches(id),
  assigned_by uuid REFERENCES profiles(id),
  reference text NOT NULL,
  nkjv_text text,
  nlt_text text,
  sermon_series text,
  playlist_url text,
  week_start date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE meditations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  verse_id uuid REFERENCES verses(id),
  custom_verse text,
  custom_reference text,
  is_shared boolean DEFAULT false,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE meditation_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meditation_id uuid REFERENCES meditations(id) ON DELETE CASCADE,
  stage_id text NOT NULL,
  primary_response text,
  secondary_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE selah_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  verse_id uuid REFERENCES verses(id),
  duration_minutes int NOT NULL,
  focus_type text,
  translation text DEFAULT 'nkjv',
  music_url text,
  session_note text,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  church_id uuid REFERENCES churches(id),
  content text NOT NULL,
  category text,
  is_anonymous boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'held', 'declined')),
  prayer_count int DEFAULT 0,
  expires_at timestamptz DEFAULT now() + interval '30 days',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE prophetic_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid REFERENCES prayer_requests(id),
  testimony_id uuid,
  added_by uuid REFERENCES profiles(id),
  response_text text NOT NULL,
  scripture_reference text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE prayer_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid REFERENCES prayer_requests(id),
  user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(prayer_request_id, user_id)
);

CREATE TABLE testimonies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  church_id uuid REFERENCES churches(id),
  meditation_id uuid REFERENCES meditations(id),
  verse_reference text,
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  prophetic_note text,
  is_featured boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meditation_id uuid REFERENCES meditations(id),
  user_id uuid REFERENCES profiles(id),
  commitment_text text NOT NULL,
  is_done boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) UNIQUE,
  push_enabled boolean DEFAULT true,
  morning_time text DEFAULT '06:30',
  evening_time text DEFAULT '19:00',
  created_at timestamptz DEFAULT now()
);

-- ── Row Level Security ─────────────────────────────────────────

ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meditation_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE selah_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prophetic_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- churches: readable by any authenticated user, writable only by admins/pastors
CREATE POLICY "Churches are readable by authenticated users"
  ON churches FOR SELECT
  TO authenticated
  USING (true);

-- profiles: users can read their own church members, write only their own row
CREATE POLICY "Users can read profiles in their church"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- verses: readable by church members, writable by pastor/admin
CREATE POLICY "Verses readable by church members"
  ON verses FOR SELECT
  TO authenticated
  USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Verses writable by pastor or admin"
  ON verses FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'admin')
  );

CREATE POLICY "Verses updatable by pastor or admin"
  ON verses FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'admin')
  );

-- meditations: users own their own rows
CREATE POLICY "Users can read own meditations"
  ON meditations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own meditations"
  ON meditations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own meditations"
  ON meditations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- meditation_stages: scoped via parent meditation ownership
CREATE POLICY "Users can read own meditation stages"
  ON meditation_stages FOR SELECT
  TO authenticated
  USING (
    meditation_id IN (SELECT id FROM meditations WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own meditation stages"
  ON meditation_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    meditation_id IN (SELECT id FROM meditations WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own meditation stages"
  ON meditation_stages FOR UPDATE
  TO authenticated
  USING (
    meditation_id IN (SELECT id FROM meditations WHERE user_id = auth.uid())
  );

-- selah_sessions: users own their own rows
CREATE POLICY "Users can read own selah sessions"
  ON selah_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own selah sessions"
  ON selah_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own selah sessions"
  ON selah_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- prayer_requests: approved requests visible to church; own requests always visible
CREATE POLICY "Church members can read approved prayer requests"
  ON prayer_requests FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can submit own prayer requests"
  ON prayer_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own prayer requests"
  ON prayer_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- prophetic_responses: readable by church; writable by prophetic_team/pastor/admin
CREATE POLICY "Church members can read prophetic responses"
  ON prophetic_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Prophetic team can add responses"
  ON prophetic_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('prophetic_team', 'pastor', 'admin')
  );

-- prayer_support: users can see and add their own
CREATE POLICY "Users can read prayer support"
  ON prayer_support FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add own prayer support"
  ON prayer_support FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own prayer support"
  ON prayer_support FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- testimonies: approved visible to church; own always visible; prophetic_team can update
CREATE POLICY "Church members can read approved testimonies"
  ON testimonies FOR SELECT
  TO authenticated
  USING (
    (status = 'approved'
    AND church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()))
    OR user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('prophetic_team', 'pastor', 'admin')
  );

CREATE POLICY "Users can submit own testimonies"
  ON testimonies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Prophetic team can approve testimonies"
  ON testimonies FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('prophetic_team', 'pastor', 'admin')
  );

-- commitments: users own their own rows
CREATE POLICY "Users can read own commitments"
  ON commitments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own commitments"
  ON commitments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own commitments"
  ON commitments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- notification_preferences: users own their own row
CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
