-- Lightweight comment thread on a single holistic goal — a shared,
-- visible-to-both-sides space distinct from the private Pastoral Notes
-- tab (which the member never sees). Either the member or their
-- assigned pastor (or any pastor/admin, matching how goal editing
-- already works) can leave a short note of encouragement or a question
-- tied to a specific goal.

CREATE TABLE public.goal_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     uuid NOT NULL REFERENCES public.holistic_goals(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id),
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.goal_comments ENABLE ROW LEVEL SECURITY;

-- Same read/write bar as the goal itself: the member who owns it, their
-- assigned pastor, or any pastor/admin.
CREATE POLICY "Goal participants can read comments"
  ON public.goal_comments FOR SELECT
  TO authenticated
  USING (
    goal_id IN (
      SELECT id FROM public.holistic_goals
      WHERE member_id = auth.uid()
         OR member_id IN (SELECT member_id FROM public.pastoral_assignments WHERE pastor_id = auth.uid())
    )
    OR get_my_roles() && ARRAY['pastor', 'admin']
  );

CREATE POLICY "Goal participants can add comments"
  ON public.goal_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      goal_id IN (
        SELECT id FROM public.holistic_goals
        WHERE member_id = auth.uid()
           OR member_id IN (SELECT member_id FROM public.pastoral_assignments WHERE pastor_id = auth.uid())
      )
      OR get_my_roles() && ARRAY['pastor', 'admin']
    )
  );

-- Authors can delete their own comment (e.g. a typo or a note sent to
-- the wrong goal); no editing to keep this simple.
CREATE POLICY "Authors can delete own comments"
  ON public.goal_comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());
