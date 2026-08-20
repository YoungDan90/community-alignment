-- Discipleship Pathway (Phase 1) — schema, RLS, and a placeholder
-- module (4 lessons) to prove browse → read → reflect → quiz →
-- gate → next-lesson-unlocks end-to-end. Full 45-lesson content and
-- automated mentor-pairing assignment land in a later migration.

-- Defensive: get_my_role() already exists live (applied via dashboard,
-- no migration file in this repo yet) but a fresh/CI environment won't
-- have it. Re-declaring is a no-op against the live DB.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── tracks ──────────────────────────────────────────────────────
CREATE TABLE public.tracks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  title        text NOT NULL,
  description  text,
  order_index  int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ── modules ─────────────────────────────────────────────────────
CREATE TABLE public.modules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id     uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  title        text NOT NULL,
  description  text,
  order_index  int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (track_id, slug)
);

-- ── lessons ─────────────────────────────────────────────────────
CREATE TABLE public.lessons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id           uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  slug                text NOT NULL,
  title               text NOT NULL,
  subtitle            text,
  content_md          text NOT NULL DEFAULT '',
  reflection_prompt   text NOT NULL DEFAULT '',
  further_reading     jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_index         int NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (module_id, slug)
);

-- ── knowledge_check_questions ───────────────────────────────────
CREATE TABLE public.knowledge_check_questions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id           uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  prompt              text NOT NULL,
  options             jsonb NOT NULL,          -- [{ id: 'a', text: '...' }, ...]
  correct_option_id   text NOT NULL,
  explanation         text NOT NULL DEFAULT '',
  order_index         int NOT NULL DEFAULT 0,
  UNIQUE (lesson_id, order_index)
);

-- ── mentor_pairings ─────────────────────────────────────────────
-- (created before user_progress/quiz_attempts since their RLS
-- policies reference this table)
CREATE TABLE public.mentor_pairings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id     uuid REFERENCES public.tracks(id),
  status       text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused')),
  started_at   timestamptz DEFAULT now()
);

-- ── user_progress ───────────────────────────────────────────────
CREATE TABLE public.user_progress (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id           uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at        timestamptz,
  reflection_answer   text,
  UNIQUE (user_id, lesson_id)
);

-- ── quiz_attempts ───────────────────────────────────────────────
CREATE TABLE public.quiz_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id     uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  score         int NOT NULL,
  passed        boolean NOT NULL,
  attempted_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- RLS — enabled and policies applied now that all tables exist,
-- since several policies reference sibling tables.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any member can read tracks"
  ON public.tracks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pastor can manage tracks"
  ON public.tracks FOR ALL
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('pastor', 'admin'));

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any member can read modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pastor can manage modules"
  ON public.modules FOR ALL
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('pastor', 'admin'));

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any member can read lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pastor can manage lessons"
  ON public.lessons FOR ALL
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('pastor', 'admin'));

ALTER TABLE public.knowledge_check_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any member can read knowledge check questions"
  ON public.knowledge_check_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pastor can manage knowledge check questions"
  ON public.knowledge_check_questions FOR ALL
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('pastor', 'admin'));

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own progress"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Mentor can read mentee progress"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_pairings mp
      WHERE mp.mentee_id = user_progress.user_id
        AND mp.mentor_id = auth.uid()
        AND mp.status = 'active'
    )
  );

CREATE POLICY "Pastor can read all progress"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'));

CREATE POLICY "User can insert own progress"
  ON public.user_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can update own progress"
  ON public.user_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Mentor can read mentee quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_pairings mp
      WHERE mp.mentee_id = quiz_attempts.user_id
        AND mp.mentor_id = auth.uid()
        AND mp.status = 'active'
    )
  );

CREATE POLICY "Pastor can read all quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'));

CREATE POLICY "User can insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.mentor_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentee can read own pairings"
  ON public.mentor_pairings FOR SELECT
  TO authenticated
  USING (mentee_id = auth.uid());

CREATE POLICY "Mentor can read own pairings"
  ON public.mentor_pairings FOR SELECT
  TO authenticated
  USING (mentor_id = auth.uid());

CREATE POLICY "Pastor can manage mentor pairings"
  ON public.mentor_pairings FOR ALL
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('pastor', 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- Phase 1 placeholder content — proves the flow end-to-end.
-- Idempotent: safe to re-run this migration file (or re-seed via
-- scripts/seed-discipleship.mjs against the same slugs) without
-- duplicating rows, thanks to the unique constraints above.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.tracks (slug, title, description, order_index)
VALUES ('foundations', 'Foundations', 'The starting track for every new disciple — who God is, who you are in Him, and how to walk with Him daily.', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.modules (track_id, slug, title, description, order_index)
SELECT t.id, 'knowing-god', 'Knowing God', 'A first module proving the Discipleship Pathway flow — placeholder content, not final teaching.', 0
FROM public.tracks t WHERE t.slug = 'foundations'
ON CONFLICT (track_id, slug) DO NOTHING;

INSERT INTO public.lessons (module_id, slug, title, subtitle, content_md, reflection_prompt, further_reading, order_index)
SELECT m.id, v.slug, v.title, v.subtitle, v.content_md, v.reflection_prompt, v.further_reading::jsonb, v.order_index
FROM public.modules m
JOIN (VALUES
  ('who-is-god', 'Who Is God?', 'Placeholder lesson 1 of 4',
   E'## Placeholder content\n\nThis is placeholder lesson content for **Phase 1**. It exists to prove the pathway flow works end-to-end, not as final teaching.\n\n> "In the beginning God created the heavens and the earth." — Genesis 1:1',
   'Placeholder reflection prompt — what stood out to you in this lesson?',
   '[{"reference":"Genesis 1","note":"the creation account this lesson references"}]', 0),
  ('who-am-i-in-christ', 'Who Am I in Christ?', 'Placeholder lesson 2 of 4',
   E'## Placeholder content\n\nMore placeholder content for lesson 2. This lesson unlocks only after lesson 1 is completed.\n\n> "Therefore, if anyone is in Christ, he is a new creation." — 2 Corinthians 5:17',
   'Placeholder reflection prompt — how does this truth change how you see yourself?',
   '[{"reference":"2 Corinthians 5","note":"the new creation passage this lesson references"}]', 1),
  ('walking-with-god-daily', 'Walking With God Daily', 'Placeholder lesson 3 of 4',
   E'## Placeholder content\n\nPlaceholder lesson 3 content, covering rhythms of prayer and Scripture.\n\n> "But seek first the kingdom of God." — Matthew 6:33',
   'Placeholder reflection prompt — what rhythm will you commit to this week?',
   '[{"reference":"Matthew 6","note":"the \"seek first the kingdom\" passage this lesson references"}]', 2),
  ('hearing-gods-voice', 'Hearing God''s Voice', 'Placeholder lesson 4 of 4',
   E'## Placeholder content\n\nFinal placeholder lesson in this module.\n\n> "My sheep hear my voice, and I know them, and they follow me." — John 10:27',
   'Placeholder reflection prompt — describe a time you sensed God speaking to you.',
   '[{"reference":"John 10","note":"the good shepherd passage this lesson references"}]', 3)
) AS v(slug, title, subtitle, content_md, reflection_prompt, further_reading, order_index)
  ON true
WHERE m.slug = 'knowing-god'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO public.knowledge_check_questions (lesson_id, prompt, options, correct_option_id, explanation, order_index)
SELECT l.id, q.prompt, q.options::jsonb, q.correct_option_id, q.explanation, q.order_index
FROM public.lessons l
JOIN (VALUES
  ('who-is-god', 'According to Genesis 1:1, who created the heavens and the earth?',
   '[{"id":"a","text":"Angels"},{"id":"b","text":"God"},{"id":"c","text":"Nature itself"}]', 'b',
   'Genesis 1:1 opens Scripture with God as the sole Creator.', 0),
  ('who-is-god', 'This lesson is placeholder content for which phase of the project?',
   '[{"id":"a","text":"Phase 1"},{"id":"b","text":"Phase 3"},{"id":"c","text":"Final release"}]', 'a',
   'This is Phase 1 scaffolding to prove the flow, not final content.', 1),
  ('who-am-i-in-christ', 'According to 2 Corinthians 5:17, what happens to someone in Christ?',
   '[{"id":"a","text":"Nothing changes"},{"id":"b","text":"They become a new creation"},{"id":"c","text":"They must earn approval"}]', 'b',
   '"He is a new creation" — identity change is immediate and total.', 0),
  ('who-am-i-in-christ', 'Placeholder check question 2 — pick the correct option.',
   '[{"id":"a","text":"Option A (correct)"},{"id":"b","text":"Option B"},{"id":"c","text":"Option C"}]', 'a',
   'Placeholder explanation.', 1),
  ('walking-with-god-daily', 'Matthew 6:33 says to seek first what?',
   '[{"id":"a","text":"Comfort"},{"id":"b","text":"The kingdom of God"},{"id":"c","text":"Success"}]', 'b',
   '"Seek first the kingdom of God" — priority defines pursuit.', 0),
  ('walking-with-god-daily', 'Placeholder check question 2 — pick the correct option.',
   '[{"id":"a","text":"Option A (correct)"},{"id":"b","text":"Option B"},{"id":"c","text":"Option C"}]', 'a',
   'Placeholder explanation.', 1),
  ('hearing-gods-voice', 'In John 10:27, what do the sheep do?',
   '[{"id":"a","text":"Hear His voice and follow"},{"id":"b","text":"Wander off"},{"id":"c","text":"Ignore the shepherd"}]', 'a',
   '"My sheep hear my voice... and follow me" — relationship precedes recognition.', 0),
  ('hearing-gods-voice', 'Placeholder check question 2 — pick the correct option.',
   '[{"id":"a","text":"Option A (correct)"},{"id":"b","text":"Option B"},{"id":"c","text":"Option C"}]', 'a',
   'Placeholder explanation.', 1)
) AS q(lesson_slug, prompt, options, correct_option_id, explanation, order_index)
  ON q.lesson_slug = l.slug
WHERE l.module_id = (SELECT id FROM public.modules WHERE slug = 'knowing-god')
ON CONFLICT (lesson_id, order_index) DO NOTHING;
