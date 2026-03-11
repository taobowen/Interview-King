-- =============================================================================
-- Migration: 20260310000001_gmail_enums_and_user_fields
-- Purpose  : Add Gmail integration fields to users table and extend
--            status_events with a source column.
-- Safe     : All changes are additive. Existing rows get safe defaults.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New ENUM types
-- ---------------------------------------------------------------------------

-- ASSUMPTION: gmail_connection_status values cover the full OAuth lifecycle.
--   'pending_auth' = user initiated connect but has not completed OAuth flow.
--   'connected'    = valid refresh token stored.
--   'disconnected' = user manually revoked / disconnected.
--   'error'        = last token refresh failed; re-auth required.
CREATE TYPE gmail_connection_status AS ENUM (
  'pending_auth',
  'connected',
  'disconnected',
  'error'
);

-- Source of a status_event (what triggered the change).
-- ASSUMPTION: 'import' covers CSV/bulk import flows that may arrive later.
CREATE TYPE event_source AS ENUM (
  'manual',
  'gmail_scan',
  'import'
);

-- ---------------------------------------------------------------------------
-- 2. Add Gmail integration columns to users
-- ---------------------------------------------------------------------------
-- ASSUMPTION: gmail_refresh_token_encrypted is encrypted at rest by the
--   Lambda before persisting (e.g. AWS KMS envelope encryption). The DB
--   column is type TEXT to accommodate any ciphertext encoding.
-- ASSUMPTION: gmail_scopes stores the exact scope strings returned by Google
--   (e.g. 'https://www.googleapis.com/auth/gmail.readonly').
-- ASSUMPTION: gmail_last_history_id is the Gmail History API historyId
--   (opaque string, up to ~20 digits). VARCHAR(50) is ample.
-- NOTE: uid is intentionally untouched.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gmail_enabled               BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gmail_email                 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gmail_refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS gmail_scopes                TEXT[],
  ADD COLUMN IF NOT EXISTS gmail_last_history_id       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gmail_status                gmail_connection_status,
  ADD COLUMN IF NOT EXISTS last_manual_scan_at         TIMESTAMPTZ;

-- Index: fast lookup of all users with Gmail enabled (scheduler polling)
CREATE INDEX IF NOT EXISTS idx_users_gmail_enabled
  ON users (gmail_enabled)
  WHERE gmail_enabled = TRUE;

-- Index: find user by gmail_email (OAuth callback resolution)
CREATE INDEX IF NOT EXISTS idx_users_gmail_email
  ON users (gmail_email)
  WHERE gmail_email IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Extend status_events with source tracking
-- ---------------------------------------------------------------------------
-- ASSUMPTION: All pre-existing rows are from manual user actions.
--   Default 'manual' is therefore accurate for historical data.

ALTER TABLE status_events
  ADD COLUMN IF NOT EXISTS source              event_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS detection_event_id  UUID;
  -- FK to gmail_detection_events added in migration 2 after that table exists.

CREATE INDEX IF NOT EXISTS idx_status_events_source
  ON status_events (source);
