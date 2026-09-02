-- Multi-role support: a pastor can also carry prophetic_team access (or
-- vice versa) so they see both dashboards, without inventing a combined
-- role string. profiles.role stays the single "primary" role exactly as
-- before — this table only holds additional roles on top of it.
--
-- Deliberately scoped to pastor/prophetic_team only: admin already has
-- full access and doesn't need a second role, and member is the base
-- everyone already has via profiles.role.

CREATE TABLE public.profile_secondary_roles (
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('pastor', 'prophetic_team')),
  granted_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, role)
);

ALTER TABLE public.profile_secondary_roles ENABLE ROW LEVEL SECURITY;

-- Church-wide read so the app can show "also: Prophetic Team" badges;
-- write restricted to a TRUE primary pastor/admin (get_my_role(), not
-- get_my_roles()) so someone who only holds a secondary pastor grant
-- can't turn around and grant further secondary roles themselves.
CREATE POLICY "Church members can read secondary roles"
  ON public.profile_secondary_roles FOR SELECT
  TO authenticated
  USING (
    get_my_status() = 'approved'
    AND profile_id IN (
      SELECT id FROM public.profiles
      WHERE church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Pastor can manage secondary roles"
  ON public.profile_secondary_roles FOR ALL
  TO authenticated
  USING (get_my_role() IN ('pastor', 'admin'))
  WITH CHECK (get_my_role() IN ('pastor', 'admin'));

-- Returns the caller's full role set: primary role + any secondary roles.
-- Existing get_my_role() is untouched (still returns just the primary
-- role) so any policy not listed below keeps working unchanged.
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS text[]
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT role FROM public.profiles WHERE id = auth.uid()
    UNION
    SELECT role FROM public.profile_secondary_roles WHERE profile_id = auth.uid()
  );
$$;

-- ── Widen every pastor/admin/prophetic_team RLS check from the single
-- profiles.role column to get_my_roles(), so a secondary role grant is
-- honoured everywhere a primary role already was. Generated directly
-- from the live pg_policy definitions (not hand-transcribed) to avoid
-- any risk of a manual copy error across ~47 policies on a live app.
-- Confirmed zero policies still reference profiles.role / get_my_role()
-- for pastor/admin/prophetic_team checks after this runs (excluding the
-- "Pastor can manage secondary roles" policy above, which is deliberately
-- get_my_role()-only per the comment on it).

DROP POLICY IF EXISTS "Church members can read announcements" ON public.announcements;

CREATE POLICY "Church members can read announcements" ON public.announcements FOR SELECT TO authenticated
  USING (((church_id = ( SELECT profiles.church_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))) AND ((audience = 'all'::text) OR (audience = 'members'::text) OR ((audience = 'leaders'::text) AND (get_my_roles() && ARRAY['pastor'::text, 'admin'::text, 'prophetic_team'::text])) OR ((audience = 'specific_group'::text) AND (group_id IN ( SELECT group_members.group_id
   FROM group_members
  WHERE (group_members.member_id = auth.uid())))))));

DROP POLICY IF EXISTS "Pastor can manage announcements" ON public.announcements;

CREATE POLICY "Pastor can manage announcements" ON public.announcements FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can read contact messages" ON public.contact_messages;

CREATE POLICY "Pastor can read contact messages" ON public.contact_messages FOR SELECT TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can read all downloads" ON public.document_downloads;

CREATE POLICY "Pastor can read all downloads" ON public.document_downloads FOR SELECT TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Members can read accessible documents" ON public.documents;

CREATE POLICY "Members can read accessible documents" ON public.documents FOR SELECT TO authenticated
  USING (((church_id = ( SELECT profiles.church_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))) AND ((access_level = 'all'::text) OR (access_level = 'members'::text) OR ((access_level = 'leaders'::text) AND (get_my_roles() && ARRAY['pastor'::text, 'admin'::text, 'prophetic_team'::text])) OR ((access_level = 'pastor'::text) AND (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])))));

DROP POLICY IF EXISTS "Pastor can manage documents" ON public.documents;

CREATE POLICY "Pastor can manage documents" ON public.documents FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage families" ON public.families;

CREATE POLICY "Pastor can manage families" ON public.families FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Group leader and pastor can delete announcements" ON public.group_announcements;

CREATE POLICY "Group leader and pastor can delete announcements" ON public.group_announcements FOR DELETE TO authenticated
  USING (((posted_by = auth.uid()) OR (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Group leader and pastor can post announcements" ON public.group_announcements;

CREATE POLICY "Group leader and pastor can post announcements" ON public.group_announcements FOR INSERT TO authenticated
  WITH CHECK (((posted_by = auth.uid()) AND ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]) OR (group_id IN ( SELECT groups.id
   FROM groups
  WHERE (groups.leader_id = auth.uid()))))));

DROP POLICY IF EXISTS "Group leader and pastor can update announcements" ON public.group_announcements;

CREATE POLICY "Group leader and pastor can update announcements" ON public.group_announcements FOR UPDATE TO authenticated
  USING (((posted_by = auth.uid()) OR (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Group members can read announcements" ON public.group_announcements;

CREATE POLICY "Group members can read announcements" ON public.group_announcements FOR SELECT TO authenticated
  USING (((group_id IN ( SELECT group_members.group_id
   FROM group_members
  WHERE (group_members.member_id = auth.uid()))) OR (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Pastor can manage group members" ON public.group_members;

CREATE POLICY "Pastor can manage group members" ON public.group_members FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Group members can read group prayer requests" ON public.group_prayer_requests;

CREATE POLICY "Group members can read group prayer requests" ON public.group_prayer_requests FOR SELECT TO authenticated
  USING (((group_id IN ( SELECT group_members.group_id
   FROM group_members
  WHERE (group_members.member_id = auth.uid()))) OR (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Pastor can manage groups" ON public.groups;

CREATE POLICY "Pastor can manage groups" ON public.groups FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can read join requests" ON public.join_requests;

CREATE POLICY "Pastor can read join requests" ON public.join_requests FOR SELECT TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can update join requests" ON public.join_requests;

CREATE POLICY "Pastor can update join requests" ON public.join_requests FOR UPDATE TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]))
  WITH CHECK ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage knowledge check questions" ON public.knowledge_check_questions;

CREATE POLICY "Pastor can manage knowledge check questions" ON public.knowledge_check_questions FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]))
  WITH CHECK ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage lessons" ON public.lessons;

CREATE POLICY "Pastor can manage lessons" ON public.lessons FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]))
  WITH CHECK ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage mentor pairings" ON public.mentor_pairings;

CREATE POLICY "Pastor can manage mentor pairings" ON public.mentor_pairings FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]))
  WITH CHECK ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage modules" ON public.modules;

CREATE POLICY "Pastor can manage modules" ON public.modules FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]))
  WITH CHECK ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage pastoral notes" ON public.pastoral_notes;

CREATE POLICY "Pastor can manage pastoral notes" ON public.pastoral_notes FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Team can moderate prayer requests" ON public.prayer_requests;

CREATE POLICY "Team can moderate prayer requests" ON public.prayer_requests FOR UPDATE TO authenticated
  USING ((get_my_roles() && ARRAY['prophetic_team'::text, 'pastor'::text, 'admin'::text]))
  WITH CHECK ((get_my_roles() && ARRAY['prophetic_team'::text, 'pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Team can read all prayer requests" ON public.prayer_requests;

CREATE POLICY "Team can read all prayer requests" ON public.prayer_requests FOR SELECT TO authenticated
  USING ((get_my_roles() && ARRAY['prophetic_team'::text, 'pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can read all profiles" ON public.profiles;

CREATE POLICY "Pastor can read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can update member profiles" ON public.profiles;

CREATE POLICY "Pastor can update member profiles" ON public.profiles FOR UPDATE TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]))
  WITH CHECK ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can update member roles" ON public.profiles;

CREATE POLICY "Pastor can update member roles" ON public.profiles FOR UPDATE TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Prophetic team can add responses" ON public.prophetic_responses;

CREATE POLICY "Prophetic team can add responses" ON public.prophetic_responses FOR INSERT TO authenticated
  WITH CHECK ((get_my_roles() && ARRAY['prophetic_team'::text, 'pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can read all subscriptions" ON public.push_subscriptions;

CREATE POLICY "Pastor can read all subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can read all quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Pastor can read all quiz attempts" ON public.quiz_attempts FOR SELECT TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Members can read their own rota slots" ON public.rota_slots;

CREATE POLICY "Members can read their own rota slots" ON public.rota_slots FOR SELECT TO authenticated
  USING (((member_id = auth.uid()) OR (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Pastor can manage rota slots" ON public.rota_slots;

CREATE POLICY "Pastor can manage rota slots" ON public.rota_slots FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage rotas" ON public.rotas;

CREATE POLICY "Pastor can manage rotas" ON public.rotas FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage service plan songs" ON public.service_plan_songs;

CREATE POLICY "Pastor can manage service plan songs" ON public.service_plan_songs FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Worship team and pastor can read service plan songs" ON public.service_plan_songs;

CREATE POLICY "Worship team and pastor can read service plan songs" ON public.service_plan_songs FOR SELECT TO authenticated
  USING (((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]) OR (EXISTS ( SELECT 1
   FROM (team_members tm
     JOIN serving_teams st ON ((tm.team_id = st.id)))
  WHERE ((tm.member_id = auth.uid()) AND (st.name = 'Worship Team'::text))))));

DROP POLICY IF EXISTS "Pastor can manage service plan team" ON public.service_plan_team;

CREATE POLICY "Pastor can manage service plan team" ON public.service_plan_team FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Worship team and pastor can read service plan team" ON public.service_plan_team;

CREATE POLICY "Worship team and pastor can read service plan team" ON public.service_plan_team FOR SELECT TO authenticated
  USING (((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]) OR (EXISTS ( SELECT 1
   FROM (team_members tm
     JOIN serving_teams st ON ((tm.team_id = st.id)))
  WHERE ((tm.member_id = auth.uid()) AND (st.name = 'Worship Team'::text))))));

DROP POLICY IF EXISTS "Pastor can manage service plans" ON public.service_plans;

CREATE POLICY "Pastor can manage service plans" ON public.service_plans FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Worship team and pastor can read service plans" ON public.service_plans;

CREATE POLICY "Worship team and pastor can read service plans" ON public.service_plans FOR SELECT TO authenticated
  USING (((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]) OR (EXISTS ( SELECT 1
   FROM (team_members tm
     JOIN serving_teams st ON ((tm.team_id = st.id)))
  WHERE ((tm.member_id = auth.uid()) AND (st.name = 'Worship Team'::text))))));

DROP POLICY IF EXISTS "Pastor can manage serving teams" ON public.serving_teams;

CREATE POLICY "Pastor can manage serving teams" ON public.serving_teams FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor and worship team can manage songs" ON public.songs;

CREATE POLICY "Pastor and worship team can manage songs" ON public.songs FOR ALL TO authenticated
  USING (((get_my_roles() && ARRAY['pastor'::text, 'admin'::text, 'prophetic_team'::text]) OR (EXISTS ( SELECT 1
   FROM (team_members tm
     JOIN serving_teams st ON ((tm.team_id = st.id)))
  WHERE ((tm.member_id = auth.uid()) AND (st.name = 'Worship Team'::text))))));

DROP POLICY IF EXISTS "Members can read own swap requests" ON public.swap_requests;

CREATE POLICY "Members can read own swap requests" ON public.swap_requests FOR SELECT TO authenticated
  USING (((requested_by = auth.uid()) OR (swap_with = auth.uid()) OR (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Pastor can manage swap requests" ON public.swap_requests;

CREATE POLICY "Pastor can manage swap requests" ON public.swap_requests FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can manage team members" ON public.team_members;

CREATE POLICY "Pastor can manage team members" ON public.team_members FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Church members can read approved testimonies" ON public.testimonies;

CREATE POLICY "Church members can read approved testimonies" ON public.testimonies FOR SELECT TO authenticated
  USING ((((status = 'approved'::text) AND (get_my_status() = 'approved'::text) AND (church_id = ( SELECT profiles.church_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))) OR (user_id = auth.uid()) OR ((get_my_status() = 'approved'::text) AND (get_my_roles() && ARRAY['prophetic_team'::text, 'pastor'::text, 'admin'::text]))));

DROP POLICY IF EXISTS "Prophetic team can approve testimonies" ON public.testimonies;

CREATE POLICY "Prophetic team can approve testimonies" ON public.testimonies FOR UPDATE TO authenticated
  USING (((user_id = auth.uid()) OR (get_my_roles() && ARRAY['prophetic_team'::text, 'pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Pastor can manage tracks" ON public.tracks;

CREATE POLICY "Pastor can manage tracks" ON public.tracks FOR ALL TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]))
  WITH CHECK ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can read all progress" ON public.user_progress;

CREATE POLICY "Pastor can read all progress" ON public.user_progress FOR SELECT TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Verses updatable by pastor or admin" ON public.verses;

CREATE POLICY "Verses updatable by pastor or admin" ON public.verses FOR UPDATE TO authenticated
  USING ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Verses writable by pastor or admin" ON public.verses;

CREATE POLICY "Verses writable by pastor or admin" ON public.verses FOR INSERT TO authenticated
  WITH CHECK ((get_my_roles() && ARRAY['pastor'::text, 'admin'::text]));

DROP POLICY IF EXISTS "Pastor can delete documents" ON storage.objects;

CREATE POLICY "Pastor can delete documents" ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'documents'::text) AND (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Pastor can upload any avatar" ON storage.objects;

CREATE POLICY "Pastor can upload any avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'avatars'::text) AND (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));

DROP POLICY IF EXISTS "Pastor can upload documents" ON storage.objects;

CREATE POLICY "Pastor can upload documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'documents'::text) AND (get_my_roles() && ARRAY['pastor'::text, 'admin'::text])));
