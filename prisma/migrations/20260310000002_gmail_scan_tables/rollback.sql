-- =============================================================================
-- Rollback: 20260310000002_gmail_scan_tables
-- Run this BEFORE rollback_001.sql
-- WARNING: Drops all Gmail scan tables and their data. Irreversible.
-- =============================================================================

-- 1. Remove FK from status_events (added at end of migration 2)
ALTER TABLE status_events
  DROP CONSTRAINT IF EXISTS status_events_detection_event_fk;

DROP INDEX IF EXISTS idx_status_events_detection_event_id;

-- 2. Drop notifications
DROP TABLE IF EXISTS notifications;

-- 3. Drop gmail_detection_events (after notifications which FK-refs it)
DROP TABLE IF EXISTS gmail_detection_events;

-- 4. Drop gmail_scan_schedule_runs (after scan_jobs)
DROP TABLE IF EXISTS gmail_scan_schedule_runs;

-- 5. Drop gmail_scan_jobs (after schedule_runs)
DROP TABLE IF EXISTS gmail_scan_jobs;

-- 6. Drop gmail_scan_schedules
DROP TABLE IF EXISTS gmail_scan_schedules;

-- 7. Drop enums (only safe after all tables using them are gone)
DROP TYPE IF EXISTS schedule_run_status;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS notification_channel;
DROP TYPE IF EXISTS detection_review_status;
DROP TYPE IF EXISTS scan_trigger_type;
DROP TYPE IF EXISTS scan_job_status;
