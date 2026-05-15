-- Phase 6: Push Subscriptions
-- Run this migration in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint     text        UNIQUE NOT NULL,
  subscription jsonb       NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow unauthenticated subscriptions (guest users)
CREATE POLICY "Anyone can insert subscription"
  ON push_subscriptions FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
