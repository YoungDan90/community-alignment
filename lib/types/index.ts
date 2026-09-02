export type UserRole = 'member' | 'prophetic_team' | 'pastor' | 'admin';
// Secondary roles a profile can additionally hold on top of its primary
// role (see profile_secondary_roles + get_my_roles() in the schema).
// Deliberately narrower than UserRole: 'admin' already has full access
// and 'member' is the base everyone already has via the primary role.
export type SecondaryRole = 'pastor' | 'prophetic_team';

export const hasAnyRole = (roles: string[], check: string[]): boolean =>
  check.some((r) => roles.includes(r));
export type Translation = 'nkjv' | 'nlt';
export type MeditationStatus = 'in_progress' | 'completed';
export type PrayerRequestStatus = 'pending' | 'approved' | 'held' | 'declined';
export type TestimonyStatus = 'pending' | 'approved' | 'declined';
export type MentorPairingStatus = 'active' | 'completed' | 'paused';

export interface Church {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Profile {
  id: string;
  church_id: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  preferred_translation: Translation;
  created_at: string;
}

export interface Verse {
  id: string;
  church_id: string | null;
  assigned_by: string | null;
  reference: string;
  nkjv_text: string | null;
  nlt_text: string | null;
  sermon_series: string | null;
  playlist_url: string | null;
  week_start: string;
  is_active: boolean;
  created_at: string;
}

export interface Meditation {
  id: string;
  user_id: string | null;
  verse_id: string | null;
  custom_verse: string | null;
  custom_reference: string | null;
  is_shared: boolean;
  status: MeditationStatus;
  completed_at: string | null;
  created_at: string;
}

export interface MeditationStage {
  id: string;
  meditation_id: string;
  stage_id: string;
  primary_response: string | null;
  secondary_response: string | null;
  created_at: string;
  updated_at: string;
}

export interface SelahSession {
  id: string;
  user_id: string | null;
  verse_id: string | null;
  duration_minutes: number;
  focus_type: string | null;
  translation: string;
  music_url: string | null;
  session_note: string | null;
  completed: boolean;
  created_at: string;
}

export interface PrayerRequest {
  id: string;
  user_id: string | null;
  church_id: string | null;
  content: string;
  category: string | null;
  is_anonymous: boolean;
  status: PrayerRequestStatus;
  prayer_count: number;
  expires_at: string;
  created_at: string;
}

export interface PropheticResponse {
  id: string;
  prayer_request_id: string | null;
  testimony_id: string | null;
  added_by: string | null;
  response_text: string;
  scripture_reference: string | null;
  created_at: string;
}

export interface PrayerSupport {
  id: string;
  prayer_request_id: string | null;
  user_id: string | null;
  created_at: string;
}

export interface Testimony {
  id: string;
  user_id: string | null;
  church_id: string | null;
  meditation_id: string | null;
  verse_reference: string | null;
  content: string;
  is_anonymous: boolean;
  status: TestimonyStatus;
  prophetic_note: string | null;
  is_featured: boolean;
  approved_by: string | null;
  created_at: string;
}

export interface Commitment {
  id: string;
  meditation_id: string | null;
  user_id: string | null;
  commitment_text: string;
  is_done: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string | null;
  push_enabled: boolean;
  morning_time: string;
  evening_time: string;
  created_at: string;
}

export interface Track {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface DiscipleshipModule {
  id: string;
  track_id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content_md: string;
  reflection_prompt: string;
  further_reading: { reference: string; note: string }[];
  order_index: number;
  created_at: string;
}

export interface KnowledgeCheckQuestion {
  id: string;
  lesson_id: string;
  prompt: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  explanation: string;
  order_index: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string | null;
  reflection_answer: string | null;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  lesson_id: string;
  score: number;
  passed: boolean;
  attempted_at: string;
}

export interface MentorPairing {
  id: string;
  mentee_id: string;
  mentor_id: string;
  track_id: string | null;
  status: MentorPairingStatus;
  started_at: string;
}

// Supabase database type map — expand with generated types once connected
export type Database = {
  public: {
    Tables: {
      churches: { Row: Church; Insert: Omit<Church, 'id' | 'created_at'>; Update: Partial<Omit<Church, 'id'>> };
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Omit<Profile, 'id'>> };
      verses: { Row: Verse; Insert: Omit<Verse, 'id' | 'created_at'>; Update: Partial<Omit<Verse, 'id'>> };
      meditations: { Row: Meditation; Insert: Omit<Meditation, 'id' | 'created_at'>; Update: Partial<Omit<Meditation, 'id'>> };
      meditation_stages: { Row: MeditationStage; Insert: Omit<MeditationStage, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<MeditationStage, 'id'>> };
      selah_sessions: { Row: SelahSession; Insert: Omit<SelahSession, 'id' | 'created_at'>; Update: Partial<Omit<SelahSession, 'id'>> };
      prayer_requests: { Row: PrayerRequest; Insert: Omit<PrayerRequest, 'id' | 'created_at'>; Update: Partial<Omit<PrayerRequest, 'id'>> };
      prophetic_responses: { Row: PropheticResponse; Insert: Omit<PropheticResponse, 'id' | 'created_at'>; Update: Partial<Omit<PropheticResponse, 'id'>> };
      prayer_support: { Row: PrayerSupport; Insert: Omit<PrayerSupport, 'id' | 'created_at'>; Update: Partial<Omit<PrayerSupport, 'id'>> };
      testimonies: { Row: Testimony; Insert: Omit<Testimony, 'id' | 'created_at'>; Update: Partial<Omit<Testimony, 'id'>> };
      commitments: { Row: Commitment; Insert: Omit<Commitment, 'id' | 'created_at'>; Update: Partial<Omit<Commitment, 'id'>> };
      notification_preferences: { Row: NotificationPreferences; Insert: Omit<NotificationPreferences, 'id' | 'created_at'>; Update: Partial<Omit<NotificationPreferences, 'id'>> };
      tracks: { Row: Track; Insert: Omit<Track, 'id' | 'created_at'>; Update: Partial<Omit<Track, 'id'>> };
      modules: { Row: DiscipleshipModule; Insert: Omit<DiscipleshipModule, 'id' | 'created_at'>; Update: Partial<Omit<DiscipleshipModule, 'id'>> };
      lessons: { Row: Lesson; Insert: Omit<Lesson, 'id' | 'created_at'>; Update: Partial<Omit<Lesson, 'id'>> };
      knowledge_check_questions: { Row: KnowledgeCheckQuestion; Insert: Omit<KnowledgeCheckQuestion, 'id'>; Update: Partial<Omit<KnowledgeCheckQuestion, 'id'>> };
      user_progress: { Row: UserProgress; Insert: Omit<UserProgress, 'id'>; Update: Partial<Omit<UserProgress, 'id'>> };
      quiz_attempts: { Row: QuizAttempt; Insert: Omit<QuizAttempt, 'id' | 'attempted_at'>; Update: Partial<Omit<QuizAttempt, 'id'>> };
      mentor_pairings: { Row: MentorPairing; Insert: Omit<MentorPairing, 'id' | 'started_at'>; Update: Partial<Omit<MentorPairing, 'id'>> };
    };
  };
};
