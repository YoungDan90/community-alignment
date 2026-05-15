'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProgressTrack from '@/components/word-to-walk/ProgressTrack';
import StageCard, { type WTWVerse } from '@/components/word-to-walk/StageCard';
import CompletionScreen from '@/components/word-to-walk/CompletionScreen';
import { createClient } from '@/lib/supabase/client';

// ── Stage definitions ──────────────────────────────────────────
const WTW_STAGES = [
  {
    id: 'receive',
    label: 'Receive',
    icon: '✦',
    prompt: 'What is the verse or passage?',
    secondary: 'Read it slowly, at least three times. What single word or phrase stands out?',
    placeholder: "The week's verse is pre-loaded — or type your own reference…",
  },
  {
    id: 'understand',
    label: 'Understand',
    icon: '◈',
    prompt: 'In your own words, what is this saying?',
    secondary:
      'Explain it as if to someone who has never heard it — strip away all religious language.',
    placeholder: 'Write it in plain language, as if explaining to a child…',
  },
  {
    id: 'believe',
    label: 'Believe',
    icon: '◉',
    prompt: 'Do you actually live as though this is true?',
    secondary: 'Where specifically does your behaviour contradict what this verse declares?',
    placeholder: 'Be honest. Where does your life contradict what this verse says?',
  },
  {
    id: 'identify',
    label: 'Identify',
    icon: '⊕',
    prompt: 'Where exactly does this apply in your life right now?',
    secondary: 'Not in general — name the specific situation, person, or pattern.',
    placeholder: 'Name the specific situation, relationship, or pattern…',
  },
  {
    id: 'decide',
    label: 'Decide',
    icon: '◆',
    prompt: 'What is the one thing you will do in response?',
    secondary:
      'One thing only. Make it concrete enough that someone watching could confirm you did it.',
    placeholder: 'Make it so specific that someone could observe whether you did it…',
  },
  {
    id: 'do',
    label: 'Do',
    icon: '▶',
    prompt: 'Write your commitment — when, where, how.',
    secondary: 'Set an exact time. Name the place. Describe precisely what doing it looks like.',
    placeholder: 'I will… today/this week when… by doing…',
  },
  {
    id: 'review',
    label: 'Review',
    icon: '↺',
    prompt: 'Did you do it? What happened?',
    secondary: 'What did obedience produce in you? What will you carry forward?',
    placeholder: 'Reflect honestly. What did obedience produce?',
  },
];

const FALLBACK_VERSE: WTWVerse = {
  id: 'fallback',
  reference: 'Psalm 1:2–3',
  nkjv_text:
    'But his delight is in the law of the LORD, and in His law he meditates day and night. He shall be like a tree planted by the rivers of water, that brings forth its fruit in its season.',
  nlt_text:
    'But they delight in the law of the LORD, meditating on it day and night. They are like trees planted along the riverbank, bearing fruit each season. Their leaves never wither, and they prosper in all they do.',
  sermon_series: 'Rooted — A Series on the Word',
};

type StageResponse = { primary: string; secondary: string };
type ResponseMap = Record<string, StageResponse>;

const S = {
  font: {
    display: 'var(--font-cormorant), Georgia, serif',
    body: "Georgia, 'Times New Roman', serif",
  },
  gold: '#c6a75e',
  goldBorder: 'rgba(198,167,94,0.25)',
  border: '#162030',
  dark: '#070c12',
  text: '#ddd0b8',
  textLight: '#f0e8d4',
  soft: '#6a8aaa',
  muted: '#c6a75e',
};

export default function WordToWalkPage() {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [responses, setResponses] = useState<ResponseMap>({});
  const [activeVerse, setActiveVerse] = useState<WTWVerse | null>(null);
  const [translation, setTranslation] = useState<'nkjv' | 'nlt'>('nkjv');
  const [isShared, setIsShared] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [phase, setPhase] = useState<'journey' | 'complete'>('journey');
  const [meditationId, setMeditationId] = useState<string | null>(null);
  const [stageRecordIds, setStageRecordIds] = useState<Record<string, string>>({});

  const currentStage = WTW_STAGES[stage];
  const response = responses[currentStage.id] ?? { primary: '', secondary: '' };
  const canContinue = response.primary.trim().length > 0;

  // ── Fetch active verse ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('verses')
        .select('id, reference, nkjv_text, nlt_text, sermon_series')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveVerse(data ?? FALLBACK_VERSE);
    })();
  }, []);

  // ── Pre-populate Receive stage with selah note or verse ──────
  useEffect(() => {
    if (!activeVerse) return;
    setResponses((prev) => {
      if (prev.receive?.primary) return prev; // already set — don't overwrite
      const selahNote =
        typeof window !== 'undefined' ? sessionStorage.getItem('selah_note') : null;
      if (selahNote) {
        sessionStorage.removeItem('selah_note');
        return { ...prev, receive: { primary: selahNote, secondary: '' } };
      }
      const verseText =
        translation === 'nkjv' ? activeVerse.nkjv_text : activeVerse.nlt_text;
      return { ...prev, receive: { primary: verseText ?? '', secondary: '' } };
    });
  }, [activeVerse, translation]);

  const updateResponse = useCallback(
    (field: 'primary' | 'secondary', value: string) => {
      setResponses((prev) => ({
        ...prev,
        [currentStage.id]: {
          ...(prev[currentStage.id] ?? { primary: '', secondary: '' }),
          [field]: value,
        },
      }));
    },
    [currentStage.id],
  );

  // ── Supabase helpers ─────────────────────────────────────────
  const ensureMeditation = async (): Promise<string | null> => {
    if (meditationId) return meditationId;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('meditations')
        .insert({
          user_id: user?.id ?? null,
          verse_id: activeVerse?.id === 'fallback' ? null : (activeVerse?.id ?? null),
          is_shared: isShared,
          status: 'in_progress',
        })
        .select('id')
        .single();
      if (data?.id) {
        setMeditationId(data.id);
        return data.id;
      }
    } catch { /* best-effort */ }
    return null;
  };

  const saveStageResponse = async (medId: string, stageId: string, primary: string, secondary: string) => {
    try {
      const supabase = createClient();
      const existingId = stageRecordIds[stageId];
      if (existingId) {
        await supabase
          .from('meditation_stages')
          .update({ primary_response: primary, secondary_response: secondary || null, updated_at: new Date().toISOString() })
          .eq('id', existingId);
      } else {
        const { data } = await supabase
          .from('meditation_stages')
          .insert({ meditation_id: medId, stage_id: stageId, primary_response: primary, secondary_response: secondary || null })
          .select('id')
          .single();
        if (data?.id) setStageRecordIds((prev) => ({ ...prev, [stageId]: data.id }));
      }
    } catch { /* best-effort */ }
  };

  const completeJourney = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const medId = meditationId ?? await ensureMeditation();
      if (!medId) return;

      // Update meditation status
      await supabase
        .from('meditations')
        .update({ status: 'completed', completed_at: new Date().toISOString(), is_shared: isShared })
        .eq('id', medId);

      // Save commitment from Do stage
      const doResponse = responses['do'];
      if (doResponse?.primary.trim()) {
        await supabase.from('commitments').insert({
          meditation_id: medId,
          user_id: user?.id ?? null,
          commitment_text: doResponse.primary,
          is_done: false,
        });
      }
    } catch { /* best-effort */ }
  };

  // ── Navigation ───────────────────────────────────────────────
  const goForward = async () => {
    setAnimating(true);

    // Fire-and-forget stage save
    const medId = meditationId ?? await ensureMeditation();
    if (medId) {
      saveStageResponse(medId, currentStage.id, response.primary, response.secondary);
    }

    setTimeout(async () => {
      if (stage < WTW_STAGES.length - 1) {
        setStage((s) => s + 1);
      } else {
        await completeJourney();
        setPhase('complete');
      }
      setAnimating(false);
    }, 250);
  };

  const goBack = () => {
    setAnimating(true);
    setTimeout(() => {
      setStage((s) => s - 1);
      setAnimating(false);
    }, 250);
  };

  const handleBeginNew = () => {
    setStage(0);
    setResponses({});
    setMeditationId(null);
    setStageRecordIds({});
    setIsShared(false);
    setPhase('journey');
  };

  // ── Completion screen ────────────────────────────────────────
  if (phase === 'complete') {
    const journeyData = WTW_STAGES.map((s) => ({
      label: s.label,
      icon: s.icon,
      primary: responses[s.id]?.primary ?? '',
      secondary: responses[s.id]?.secondary ?? '',
    }));
    return (
      <CompletionScreen
        commitment={responses['do']?.primary ?? ''}
        journey={journeyData}
        onBeginNew={handleBeginNew}
        onShareTestimony={() => router.push('/prayer-wall')}
      />
    );
  }

  // ── Journey ──────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: '28px 20px',
        maxWidth: 680,
        margin: '0 auto',
        fontFamily: S.font.body,
      }}
    >
      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            margin: '0 0 2px',
            fontSize: 10,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: S.gold,
          }}
        >
          Word to Walk
        </p>
        <h1
          style={{
            margin: '0 0 4px',
            fontSize: 22,
            fontWeight: 'normal',
            color: S.textLight,
            fontFamily: S.font.display,
          }}
        >
          {activeVerse?.sermon_series ?? 'Seven-Stage Meditation Journey'}
        </h1>
        {activeVerse && activeVerse.id !== 'fallback' && (
          <p style={{ margin: 0, fontSize: 12, color: S.muted, fontStyle: 'italic' }}>
            {activeVerse.reference}
          </p>
        )}
      </div>

      {/* Progress */}
      <ProgressTrack stages={WTW_STAGES} currentStage={stage} />

      {/* Stage card */}
      <StageCard
        stage={currentStage}
        stageIndex={stage}
        totalStages={WTW_STAGES.length}
        verse={activeVerse}
        translation={translation}
        onTranslationChange={setTranslation}
        primaryValue={response.primary}
        onPrimaryChange={(v) => updateResponse('primary', v)}
        secondaryValue={response.secondary}
        onSecondaryChange={(v) => updateResponse('secondary', v)}
        showVerseAnchor={stage > 0}
        animating={animating}
        isShared={isShared}
        onSharedChange={setIsShared}
      />

      {/* Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          gap: 10,
        }}
      >
        {stage > 0 ? (
          <button
            onClick={goBack}
            style={{
              padding: '10px 22px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${S.border}`,
              borderRadius: 2,
              color: S.soft,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: S.font.body,
              letterSpacing: '0.06em',
              transition: 'all 0.2s',
            }}
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={goForward}
          disabled={!canContinue}
          style={{
            padding: '11px 28px',
            background: canContinue ? S.gold : 'rgba(198,167,94,0.2)',
            border: 'none',
            borderRadius: 2,
            color: canContinue ? S.dark : S.muted,
            fontSize: 13,
            fontWeight: 'bold',
            cursor: canContinue ? 'pointer' : 'not-allowed',
            fontFamily: S.font.body,
            letterSpacing: '0.06em',
            minWidth: 140,
            transition: 'all 0.2s',
          }}
        >
          {stage === WTW_STAGES.length - 1 ? 'Complete ✦' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
