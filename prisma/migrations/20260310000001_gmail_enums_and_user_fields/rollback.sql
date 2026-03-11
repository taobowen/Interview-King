-- =============================================================================
-- Rollback: 20260310000001_gmail_enums_and_user_fields
-- Run this AFTER rollback_002.sql
-- WARNING: Removes Gmail columns from users and status_events. Irreversible.
-- =============================================================================

-- 1. Remove detection_event_id column from status_events
--    (FK already dropped by rollback_002.sql)
DROP INDEX IF EXISTS idx_status_events_source;

ALTER TABLE status_events
  DROP COLUMN IF EXISTS detection_event_id,
  DROP COLUMN IF EXISTS source;

-- 2. Remove Gmail columns from users
DROP INDEX IF EXISTS idx_users_gmail_enabled;
DROP INDEX IF EXISTS idx_users_gmail_email;

ALTER TABLE users
  DROP COLUMN IF EXISTS gmail_enabled,
  DROP COLUMN IF EXISTS gmail_email,
  DROP COLUMN IF EXISTS gmail_refresh_token_encrypted,
  DROP COLUMN IF EXISTS gmail_scopes,
  DROP COLUMN IF EXISTS gmail_last_history_id,
  DROP COLUMN IF EXISTS gmail_status,
  DROP COLUMN IF EXISTS last_manual_scan_at;

-- 3. Drop enums (only safe after all columns using them are gone)
DROP TYPE IF EXISTS event_source;
DROP TYPE IF EXISTS gmail_connection_status;
