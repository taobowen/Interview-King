-- =============================================================================
-- Migration: 20260310000002_gmail_scan_tables
-- Purpose  : Create gmail_scan_schedules, gmail_scan_jobs,
--            gmail_scan_schedule_runs, gmail_detection_events,
--            and notifications tables.
--            Also close the deferred FK from migration 1.
-- Depends  : 20260310000001_gmail_enums_and_user_fields
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Additional ENUM types
-- ---------------------------------------------------------------------------

-- ASSUMPTION: 'pending' means the Lambda has created the job row but the
--   scan worker has not yet started. 'cancelled' is set by the backend when
--   a user disconnects Gmail mid-job.
CREATE TYPE scan_job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE scan_trigger_type AS ENUM (
  'manual',
  'scheduled'
);

-- Review state of a single Gmail detection. Auto-applied detections skip
-- 'pending_review' and land directly in 'auto_applied'.
CREATE TYPE detection_review_status AS ENUM (
  'pending_review',
  'auto_applied',
  'approved',
  'rejected',
  'dismissed'
);

-- ASSUMPTION: 'in_app' is always supported. 'email' and 'push' are future
--   channels; the worker skips unsupported channels gracefully.
CREATE TYPE notification_channel AS ENUM (
  'in_app',
  'email',
  'push'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'read',
  'dismissed'
);

-- ASSUMPTION: Additional notification types will be added via ALTER TYPE.
CREATE TYPE notification_type AS ENUM (
  'gmail_status_detected',
  'scan_complete',
  'scan_failed',
  'action_required'
);

CREATE TYPE schedule_run_status AS ENUM (
  'triggered',
  'completed',
  'failed',
  'skipped'
);

-- ---------------------------------------------------------------------------
-- 2. gmail_scan_schedules
--    One schedule = one recurring cron definition per user.
--    A single user may have multiple schedules (different times/filters).
-- ---------------------------------------------------------------------------
CREATE TABLE gmail_scan_schedules (
  id                    UUID          NOT NULL DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL,

  -- Human label, e.g. "Morning daily scan"
  name                  VARCHAR(255)  NOT NULL,

  -- Standard cron expression (5-part). Evaluated in `timezone`.
  -- ASSUMPTION: cron is executed by the Lambda scheduler; validation is
  --   enforced in application code, not at DB level.
  cron_expression       VARCHAR(100)  NOT NULL,

  -- IANA timezone string, e.g. 'America/New_York'.
  timezone              VARCHAR(100)  NOT NULL DEFAULT 'UTC',

  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Confidence threshold [0,1] above which a detection is auto-applied to
  -- the application status without requiring user review.
  -- NULL = never auto-apply regardless of confidence.
  auto_apply_threshold  NUMERIC(5, 4)
                          CHECK (auto_apply_threshold IS NULL
                              OR (auto_apply_threshold >= 0
                              AND auto_apply_threshold <= 1)),

  -- Optional extra Gmail search filter appended to the base query,
  -- e.g. 'from:lever.co OR from:greenhouse.io'.
  gmail_query_filter    VARCHAR(500),

  last_run_at           TIMESTAMPTZ,
  next_run_at           TIMESTAMPTZ,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT gmail_scan_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT gmail_scan_schedules_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_gmail_schedules_user_id
  ON gmail_scan_schedules (user_id);

-- Fast lookup for the scheduler: active schedules due to run
CREATE INDEX idx_gmail_schedules_active_next_run
  ON gmail_scan_schedules (next_run_at)
  WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- 3. gmail_scan_jobs
--    One row per scan execution (manual or scheduled).
--    Both trigger types share this table so the scan pipeline is unified.
-- ---------------------------------------------------------------------------
CREATE TABLE gmail_scan_jobs (
  id                UUID          NOT NULL DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL,

  -- Nullable: set when trigger_type = 'scheduled'
  schedule_id       UUID,

  trigger_type      scan_trigger_type   NOT NULL,
  status            scan_job_status     NOT NULL DEFAULT 'pending',

  -- Gmail History API range covered by this scan.
  -- ASSUMPTION: NULL history_id_from means a full re-scan was requested
  --   (e.g. first-time connect or explicit full-scan).
  history_id_from   VARCHAR(50),
  history_id_to     VARCHAR(50),

  -- Running counters updated by the scan Lambda as it progresses.
  messages_scanned  INTEGER       NOT NULL DEFAULT 0,
  detections_found  INTEGER       NOT NULL DEFAULT 0,

  -- Structured error log. Array of {code, message, context} objects.
  -- ASSUMPTION: non-fatal per-message errors are stored here; fatal errors
  --   also set status = 'failed'.
  errors            JSONB         NOT NULL DEFAULT '[]'::JSONB,

  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT gmail_scan_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT gmail_scan_jobs_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT gmail_scan_jobs_schedule_fk
    FOREIGN KEY (schedule_id) REFERENCES gmail_scan_schedules (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_gmail_scan_jobs_user_id
  ON gmail_scan_jobs (user_id);

CREATE INDEX idx_gmail_scan_jobs_schedule_id
  ON gmail_scan_jobs (schedule_id)
  WHERE schedule_id IS NOT NULL;

-- Fast dashboard query: recent jobs per user
CREATE INDEX idx_gmail_scan_jobs_user_created
  ON gmail_scan_jobs (user_id, created_at DESC);

-- Scheduler polling: jobs stuck in 'running' for health-checks
CREATE INDEX idx_gmail_scan_jobs_status
  ON gmail_scan_jobs (status)
  WHERE status IN ('pending', 'running');

-- ---------------------------------------------------------------------------
-- 4. gmail_scan_schedule_runs
--    One row per cron slot. Decoupled from scan_jobs so a skipped slot is
--    recorded without creating a job.
--    UNIQUE(schedule_id, scheduled_for) prevents double-firing a slot.
-- ---------------------------------------------------------------------------
CREATE TABLE gmail_scan_schedule_runs (
  id             UUID                  NOT NULL DEFAULT uuid_generate_v4(),
  schedule_id    UUID                  NOT NULL,

  -- FK to the job that was spawned. NULL when status = 'skipped'.
  scan_job_id    UUID,

  -- Nominal wall-clock time this slot was supposed to start (UTC).
  scheduled_for  TIMESTAMPTZ           NOT NULL,

  triggered_at   TIMESTAMPTZ,
  status         schedule_run_status   NOT NULL DEFAULT 'triggered',

  -- Populated when status = 'skipped', e.g. 'gmail_disabled', 'previous_run_still_running'
  skip_reason    TEXT,

  created_at     TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT gmail_scan_schedule_runs_pkey PRIMARY KEY (id),
  CONSTRAINT gmail_scan_schedule_runs_schedule_fk
    FOREIGN KEY (schedule_id) REFERENCES gmail_scan_schedules (id) ON DELETE CASCADE,
  CONSTRAINT gmail_scan_schedule_runs_job_fk
    FOREIGN KEY (scan_job_id) REFERENCES gmail_scan_jobs (id) ON DELETE SET NULL,

  -- Idempotency: one DB row per (schedule, slot). The scheduler upserts on
  -- this constraint to avoid duplicate runs when Lambda retries.
  CONSTRAINT uq_schedule_run_slot UNIQUE (schedule_id, scheduled_for)
);

CREATE INDEX idx_gmail_schedule_runs_schedule_id
  ON gmail_scan_schedule_runs (schedule_id);

CREATE INDEX idx_gmail_schedule_runs_job_id
  ON gmail_scan_schedule_runs (scan_job_id)
  WHERE scan_job_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. gmail_detection_events
--    One row per Gmail message per user that the scanner evaluated.
--    UNIQUE(user_id, gmail_message_id) is the primary dedup guard: the same
--    Gmail message will never produce two rows for the same user, even if
--    the Lambda retries or the SQS message is delivered twice.
-- ---------------------------------------------------------------------------
CREATE TABLE gmail_detection_events (
  id                UUID                      NOT NULL DEFAULT uuid_generate_v4(),
  user_id           UUID                      NOT NULL,

  -- Matched application. NULL when the scanner found a relevant email but
  -- could not match it to a known application (needs_review).
  application_id    UUID,

  -- The scan job that produced this detection.
  scan_job_id       UUID,

  -- Gmail message & thread IDs (immutable Gmail identifiers).
  gmail_message_id  VARCHAR(255)              NOT NULL,
  gmail_thread_id   VARCHAR(255),

  -- History ID at the time of detection (useful for debugging history gaps).
  gmail_history_id  VARCHAR(50),

  -- Email metadata
  sender_email      VARCHAR(255),
  subject           TEXT,
  received_at       TIMESTAMPTZ,

  -- What the scanner read from the email
  detected_status   application_status,           -- detected new status
  from_status       application_status,           -- application's status before detection
  confidence_score  NUMERIC(5, 4)
                      CHECK (confidence_score IS NULL
                          OR (confidence_score >= 0 AND confidence_score <= 1)),

  -- The sentences/snippet that triggered the detection, stored for audit.
  -- ASSUMPTION: raw_snippet is truncated to ~2000 chars by the Lambda before
  --   storing; full email body is never persisted.
  raw_snippet       TEXT,

  review_status     detection_review_status   NOT NULL DEFAULT 'pending_review',

  -- Set once the detection is applied (auto or manual) to a StatusEvent.
  status_event_id   UUID,

  auto_applied      BOOLEAN                   NOT NULL DEFAULT FALSE,
  reviewed_at       TIMESTAMPTZ,

  created_at        TIMESTAMPTZ               NOT NULL DEFAULT NOW(),

  CONSTRAINT gmail_detection_events_pkey PRIMARY KEY (id),
  CONSTRAINT gmail_detection_events_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT gmail_detection_events_application_fk
    FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE SET NULL,
  CONSTRAINT gmail_detection_events_scan_job_fk
    FOREIGN KEY (scan_job_id) REFERENCES gmail_scan_jobs (id) ON DELETE SET NULL,
  CONSTRAINT gmail_detection_events_status_event_fk
    FOREIGN KEY (status_event_id) REFERENCES status_events (id) ON DELETE SET NULL,

  -- PRIMARY idempotency constraint: one detection per Gmail message per user.
  CONSTRAINT uq_detection_user_message UNIQUE (user_id, gmail_message_id)
);

CREATE INDEX idx_gmail_detections_user_id
  ON gmail_detection_events (user_id);

CREATE INDEX idx_gmail_detections_application_id
  ON gmail_detection_events (application_id)
  WHERE application_id IS NOT NULL;

CREATE INDEX idx_gmail_detections_scan_job_id
  ON gmail_detection_events (scan_job_id)
  WHERE scan_job_id IS NOT NULL;

-- Reviewer queue: pending events for a user ordered by arrival
CREATE INDEX idx_gmail_detections_review_queue
  ON gmail_detection_events (user_id, created_at DESC)
  WHERE review_status = 'pending_review';

-- ---------------------------------------------------------------------------
-- 6. notifications
--    Channel-agnostic notification store.
--    idempotency_key (UNIQUE) is the dedup guard for the notification worker:
--    the worker inserts with ON CONFLICT DO NOTHING before sending.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id                  UUID                  NOT NULL DEFAULT uuid_generate_v4(),
  user_id             UUID                  NOT NULL,

  type                notification_type     NOT NULL,
  channel             notification_channel  NOT NULL DEFAULT 'in_app',
  status              notification_status   NOT NULL DEFAULT 'pending',

  title               VARCHAR(255)          NOT NULL,
  body                TEXT,

  -- Soft polymorphic reference so a single notifications table covers
  -- references to applications, scan jobs, detections, etc.
  -- ASSUMPTION: reference_type values are: 'application', 'scan_job',
  --   'detection_event'. Validated in application code.
  reference_type      VARCHAR(50),
  reference_id        UUID,

  -- Convenience FKs for the most common relationships.
  detection_event_id  UUID,
  scan_job_id         UUID,

  -- Hash produced by the notification worker, e.g.:
  --   sha256(user_id || type || channel || reference_id || date_trunc('hour', now()))
  -- ASSUMPTION: the worker computes this before insert and uses
  --   INSERT ... ON CONFLICT (idempotency_key) DO NOTHING to prevent
  --   duplicate sends when SQS delivers the message more than once.
  idempotency_key     VARCHAR(512)          NOT NULL,

  sent_at             TIMESTAMPTZ,
  read_at             TIMESTAMPTZ,

  -- Populated on terminal failure so engineers can diagnose send errors.
  failed_reason       TEXT,

  created_at          TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT notifications_detection_event_fk
    FOREIGN KEY (detection_event_id) REFERENCES gmail_detection_events (id)
    ON DELETE SET NULL,
  CONSTRAINT notifications_scan_job_fk
    FOREIGN KEY (scan_job_id) REFERENCES gmail_scan_jobs (id) ON DELETE SET NULL,

  -- Dedup guard for the notification worker
  CONSTRAINT uq_notifications_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX idx_notifications_user_id
  ON notifications (user_id);

-- Inbox query: unread in_app notifications for a user
CREATE INDEX idx_notifications_user_inbox
  ON notifications (user_id, created_at DESC)
  WHERE status IN ('pending', 'sent') AND channel = 'in_app';

CREATE INDEX idx_notifications_status
  ON notifications (status)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 7. Close deferred FK: status_events.detection_event_id
--    Added as a bare column in migration 1; FK added here after
--    gmail_detection_events exists.
-- ---------------------------------------------------------------------------
ALTER TABLE status_events
  ADD CONSTRAINT status_events_detection_event_fk
    FOREIGN KEY (detection_event_id) REFERENCES gmail_detection_events (id)
    ON DELETE SET NULL;

CREATE INDEX idx_status_events_detection_event_id
  ON status_events (detection_event_id)
  WHERE detection_event_id IS NOT NULL;
