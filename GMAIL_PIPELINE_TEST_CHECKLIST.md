# Gmail Scan + Notification Pipeline Testing Checklist

## Preconditions

- Backend Lambda deployed with updated routes and helper modules.
- Scanner Lambda and Notification Worker Lambda deployed.
- Required env vars are configured (see section at bottom).
- Database migrations for Gmail tables are applied.

---

## 1) Backend internal endpoints

### 1.1 HMAC verification
- Send `POST /internal/gmail-scan/targets` without HMAC headers.
- Expect `401` with `HMAC_INVALID`.
- Send with valid signed headers.
- Expect `200` and `users` array.

### 1.2 Email event ingestion
- Call `POST /internal/email-events` with valid payload:
  - `scanJobId`
  - `userCognitoSub`
  - `triggerType`
  - `events[]`
- Verify:
  - rows inserted into `gmail_detection_events`
  - rows inserted into `notifications`
  - SQS jobs enqueued for inserted notifications
  - response totals reflect inserted/duplicates/review/auto-applied

### 1.3 Notification worker handshake endpoints
- `POST /internal/notifications/claim` for pending notification.
- Expect `canDeliver=true` with notification payload.
- `POST /internal/notifications/mark-sent` and recheck DB status.
- `POST /internal/notifications/mark-failed` on another pending row and verify status.

---

## 2) Scanner Lambda manual invocation

### 2.1 Trigger via API
- Call `POST /gmail/scan` as authenticated user.
- Expect a job object in response with `status=pending`.
- Verify scanner Lambda async invoke happened (CloudWatch logs).

### 2.2 Scanner run
- Confirm scanner calls backend internal routes:
  - `/internal/gmail-scan/targets`
  - `/internal/gmail-scan/job`
  - `/internal/email-events`
  - `/internal/gmail-scan/checkpoint`
- Verify scan job status transitions to completed/failed.

### 2.3 Status API
- Call `GET /gmail/scan/status?latest=true`.
- Verify `messagesScanned`, `detectionsFound`, and `errors` fields.

---

## 3) Notification Worker via SQS message

### 3.1 Enqueue test message
- Push message body:
```json
{ "notificationId": "<existing-notification-id>", "attempt": 1 }
```
- Wait for worker trigger.

### 3.2 Verify worker behavior
- Worker claims notification from backend.
- For `email` channel: sends SES email and marks sent.
- For `in_app` channel: marks sent with in-app no-op provider id.
- Retryable failures appear in `batchItemFailures`.

### 3.3 Idempotency
- Re-send same message.
- Expect backend claim to return non-deliverable reason (already sent/read/etc).

---

## 4) End-to-end pipeline

1. User triggers `POST /gmail/scan`.
2. Scanner fetches Gmail updates and sends `/internal/email-events`.
3. Backend writes detection + notification rows and enqueues SQS jobs.
4. Worker consumes queue, claims notification, delivers, and marks sent/failed.
5. Frontend verifies:
   - `/notifications` unread count/list
   - `/application-status-events?decision=needs_review`
   - approve/reject flow updates

---

## Quick verification SQL

- latest scan jobs:
```sql
SELECT id, user_id, trigger_type, status, messages_scanned, detections_found, created_at
FROM gmail_scan_jobs
ORDER BY created_at DESC
LIMIT 20;
```

- latest detection events:
```sql
SELECT id, user_id, gmail_message_id, detected_status, review_status, created_at
FROM gmail_detection_events
ORDER BY created_at DESC
LIMIT 20;
```

- latest notifications:
```sql
SELECT id, user_id, channel, status, title, sent_at, read_at, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 30;
```

---

## Environment variables checklist

### Backend Lambda
- `DATABASE_URL`
- `HMAC_SECRET_NAME` (or `INTERNAL_HMAC_SECRET`)
- `INTERNAL_HMAC_KEY_ID` (recommended)
- `NOTIFICATION_QUEUE_URL`
- `SCANNER_LAMBDA_FUNCTION_NAME`
- `SCHEDULER_TARGET_LAMBDA_ARN`
- `SCHEDULER_INVOKE_ROLE_ARN`
- `GMAIL_MANUAL_SCAN_COOLDOWN_SECONDS` (optional)

### Scanner Lambda
- `BACKEND_INTERNAL_BASE_URL` or `SCANNER_BACKEND_BASE_URL`
- `SCANNER_INTERNAL_HMAC_KEY_ID` (or `INTERNAL_HMAC_KEY_ID`)
- `SCANNER_INTERNAL_HMAC_SECRET` (or `INTERNAL_HMAC_SECRET`)
- `GOOGLE_CLIENT_ID` (or `GMAIL_CLIENT_ID`)
- `GOOGLE_CLIENT_SECRET` (or `GMAIL_CLIENT_SECRET`)

### Notification Worker Lambda
- `BACKEND_INTERNAL_BASE_URL` (or `NOTIFICATION_BACKEND_BASE_URL`)
- `HMAC_SECRET_NAME` (or `NOTIFICATION_WORKER_SECRET_ID`)
- `NOTIFICATION_EMAIL_FROM_ADDRESS` / secret `EMAIL_FROM_ADDRESS`
- `NOTIFICATION_EMAIL_PROVIDER` (`ses` or `noop`)
