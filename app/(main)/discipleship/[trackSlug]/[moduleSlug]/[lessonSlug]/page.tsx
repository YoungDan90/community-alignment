import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LessonView from '@/components/discipleship/LessonView';
import type { Lesson, KnowledgeCheckQuestion } from '@/lib/types';

// Server Component (no 'use client') — the one deliberate deviation from
// this app's usual client-fetch pattern. Lesson content is readable by
// any authenticated user via RLS, so only a server-side check run before
// any HTML is sent can actually stop someone from jumping ahead via URL;
// a client component would fetch and render before a redirect could fire.
export default async function LessonPage({
  params,
}: {
  params: { trackSlug: string; moduleSlug: string; lessonSlug: string };
}) {
  const { trackSlug, moduleSlug, lessonSlug } = params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: track } = await supabase.from('tracks').select('id, slug').eq('slug', trackSlug).maybeSingle();
  if (!track) redirect('/discipleship');

  const { data: mod } = await supabase.from('modules').select('id, slug').eq('track_id', track.id).eq('slug', moduleSlug).maybeSingle();
  if (!mod) redirect(`/discipleship/${trackSlug}`);

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, slug, title, subtitle, content_md, reflection_prompt, further_reading, order_index, module_id, created_at')
    .eq('module_id', mod.id)
    .order('order_index');

  const allLessons = (lessons ?? []) as Lesson[];
  const lesson = allLessons.find(l => l.slug === lessonSlug);
  if (!lesson) redirect(`/discipleship/${trackSlug}/${moduleSlug}`);

  // Lock check: every lesson with a lower order_index must be completed
  // by this user. Cross-module locking is out of scope for Phase 1.
  // TODO(phase2): gate module 2's first lesson behind module 1's last lesson.
  const priorLessons = allLessons.filter(l => l.order_index < lesson.order_index);
  if (priorLessons.length > 0) {
    const priorIds = priorLessons.map(l => l.id);
    const { data: progress } = await supabase
      .from('user_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', user.id)
      .in('lesson_id', priorIds);

    const completedSet = new Set(
      (progress ?? []).filter((p: { completed_at: string | null }) => p.completed_at).map((p: { lesson_id: string }) => p.lesson_id),
    );
    const allPriorDone = priorIds.every(id => completedSet.has(id));
    if (!allPriorDone) redirect(`/discipleship/${trackSlug}/${moduleSlug}`);
  }

  const { data: questions } = await supabase
    .from('knowledge_check_questions')
    .select('id, lesson_id, prompt, options, correct_option_id, explanation, order_index')
    .eq('lesson_id', lesson.id)
    .order('order_index');

  const { data: existingProgress } = await supabase
    .from('user_progress')
    .select('completed_at, reflection_answer')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle();

  const nextLesson = allLessons.find(l => l.order_index === lesson.order_index + 1) ?? null;

  return (
    <LessonView
      trackSlug={trackSlug}
      moduleSlug={moduleSlug}
      lesson={lesson}
      questions={(questions ?? []) as KnowledgeCheckQuestion[]}
      existingProgress={existingProgress ?? null}
      nextLessonSlug={nextLesson?.slug ?? null}
    />
  );
}
