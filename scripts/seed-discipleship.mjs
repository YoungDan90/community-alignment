// Seeds the Discipleship Pathway tables (tracks/modules/lessons/
// knowledge_check_questions) from a JSON fixture. Idempotent — safe
// to re-run against the same file, upserts on each table's natural
// unique key rather than inserting duplicates.
//
// Run with:
//   node --env-file=.env.local scripts/seed-discipleship.mjs data/discipleship/foundations.json
//
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local.

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const filePath = process.argv[2] ?? 'data/discipleship/foundations.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const data = JSON.parse(readFileSync(filePath, 'utf-8'));

const fail = (label, error) => {
  console.error(`✗ ${label} failed:`, error);
  process.exit(1);
};

let counts = { tracks: 0, modules: 0, lessons: 0, questions: 0 };

const { data: track, error: trackError } = await supabase
  .from('tracks')
  .upsert(data.track, { onConflict: 'slug' })
  .select()
  .single();
if (trackError) fail('track upsert', trackError);
counts.tracks += 1;

for (const mod of data.modules) {
  const { lessons, ...modFields } = mod;

  const { data: modRow, error: modError } = await supabase
    .from('modules')
    .upsert({ ...modFields, track_id: track.id }, { onConflict: 'track_id,slug' })
    .select()
    .single();
  if (modError) fail(`module upsert (${mod.slug})`, modError);
  counts.modules += 1;

  for (const lesson of lessons) {
    const { questions, ...lessonFields } = lesson;

    const { data: lessonRow, error: lessonError } = await supabase
      .from('lessons')
      .upsert({ ...lessonFields, module_id: modRow.id }, { onConflict: 'module_id,slug' })
      .select()
      .single();
    if (lessonError) fail(`lesson upsert (${lesson.slug})`, lessonError);
    counts.lessons += 1;

    for (const question of questions) {
      // Fixture question objects may carry their own string `id` (e.g.
      // "revelation-q1") for readability — the table's id is a uuid with
      // its own default, so drop the fixture id rather than pass it through.
      const { id: _fixtureId, ...questionFields } = question;
      const { error: questionError } = await supabase
        .from('knowledge_check_questions')
        .upsert({ ...questionFields, lesson_id: lessonRow.id }, { onConflict: 'lesson_id,order_index' });
      if (questionError) fail(`question upsert (lesson ${lesson.slug}, order ${question.order_index})`, questionError);
      counts.questions += 1;
    }
  }
}

console.log(`✓ tracks: ${counts.tracks} upserted`);
console.log(`✓ modules: ${counts.modules} upserted`);
console.log(`✓ lessons: ${counts.lessons} upserted`);
console.log(`✓ knowledge_check_questions: ${counts.questions} upserted`);
console.log('Done.');
