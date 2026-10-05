-- Supports native push (iOS/Android via FCM, delivered through the
-- Capacitor-wrapped app) alongside the existing web push subscriptions
-- (browser PWA installs). A row is either a web subscription (endpoint +
-- subscription JSON, exactly as before) or an FCM row (fcm_token only) —
-- never both, enforced below. Existing web push rows are untouched:
-- platform defaults to 'web' and endpoint/subscription stay required
-- for that case.

ALTER TABLE public.push_subscriptions
  ADD COLUMN platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'fcm')),
  ADD COLUMN fcm_token text,
  ALTER COLUMN endpoint DROP NOT NULL,
  ALTER COLUMN subscription DROP NOT NULL;

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_shape_check CHECK (
    (platform = 'web' AND endpoint IS NOT NULL AND subscription IS NOT NULL AND fcm_token IS NULL)
    OR
    (platform = 'fcm' AND fcm_token IS NOT NULL AND endpoint IS NULL)
  );

-- push_subscriptions_endpoint_key (plain UNIQUE INDEX on endpoint)
-- already exists and is kept as-is — Postgres unique indexes never treat
-- NULLs as conflicting with each other, so FCM rows (endpoint always
-- NULL) don't collide against it. fcm_token gets the equivalent
-- guarantee so re-registering the same device updates its row instead
-- of creating a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_fcm_token_key
  ON public.push_subscriptions (fcm_token) WHERE fcm_token IS NOT NULL;
