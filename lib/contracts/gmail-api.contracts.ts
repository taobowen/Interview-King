export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type AuthMode =
  | 'jwt-user'      // API Gateway JWT authorizer (users.cognito_sub derived server-side)
  | 'hmac-internal' // Scanner Lambda -> internal endpoint
  | 'none';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'COOLDOWN_ACTIVE'
  | 'HMAC_INVALID'
  | 'HMAC_EXPIRED'
  | 'HMAC_REPLAY'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

export interface ApiSuccessMeta {
  requestId?: string;
  timestamp: string;
}

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  auth: AuthMode;
  summary: string;
  requestType?: string;
  responseType?: string;
  idempotency: string;
  authorization: string;
}

// -----------------------------------------------------------------------------
// Shared domain types
// -----------------------------------------------------------------------------

export type ApplicationStatus =
  | 'Saved'
  | 'Applied'
  | 'OA'
  | 'Screen'
  | 'Tech'
  | 'Onsite'
  | 'Offer'
  | 'Accepted'
  | 'No response'
  | 'Rejected'
  | 'Closed';

export type ScanTriggerType = 'manual' | 'scheduled';
export type ScanJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ReviewDecision = 'needs_review' | 'auto_applied' | 'approved' | 'rejected' | 'dismissed';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read' | 'dismissed';
export type NotificationChannel = 'in_app' | 'email' | 'push';
export type NotificationType =
  | 'gmail_status_detected'
  | 'scan_complete'
  | 'scan_failed'
  | 'action_required';

// -----------------------------------------------------------------------------
// 1) POST /gmail/scan
// -----------------------------------------------------------------------------

export interface PostGmailScanRequest {
  fullRescan?: boolean; // default false
  lookbackHours?: number; // manual scan lookback override, independent from schedule settings
  reason?: 'manual_click' | 'manual_retry' | 'debug';
}

export interface PostGmailScanResponse {
  job: {
    id: string;
    userId: string;
    triggerType: 'manual';
    status: ScanJobStatus;
    createdAt: string;
    cooldownUntil?: string;
  };
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 2) GET /gmail/scan/status
// -----------------------------------------------------------------------------

export interface GetGmailScanStatusQuery {
  jobId?: string;
  latest?: boolean; // default true when jobId not supplied
}

export interface GetGmailScanStatusResponse {
  job: {
    id: string;
    status: ScanJobStatus;
    triggerType: ScanTriggerType;
    messagesScanned: number;
    detectionsFound: number;
    startedAt?: string;
    completedAt?: string;
    errors: Array<{ code: string; message: string }>;
  } | null;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 3) GET /gmail/settings
// -----------------------------------------------------------------------------

export interface GetGmailSettingsResponse {
  settings: {
    gmailEnabled: boolean;
    gmailAiEnabled: boolean;
    gmailStatus: string | null;
    gmailEmail: string | null;
    hasRefreshToken: boolean;
    gmailLastHistoryId: string | null;
    aiDeploymentEnabled: boolean;
    aiModel: string | null;
    updatedAt?: string;
  };
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 4) PATCH /gmail/settings
// -----------------------------------------------------------------------------

export interface PatchGmailSettingsRequest {
  gmailEnabled?: boolean;
  gmailAiEnabled?: boolean;
  gmailStatus?: string | null;
  gmailEmail?: string | null;
}

export interface PatchGmailSettingsResponse {
  settings: {
    gmailEnabled: boolean;
    gmailAiEnabled: boolean;
    gmailStatus: string | null;
    gmailEmail: string | null;
    hasRefreshToken: boolean;
    gmailLastHistoryId: string | null;
    aiDeploymentEnabled: boolean;
    aiModel: string | null;
    updatedAt?: string;
  };
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 5) GET /gmail/connect-url
// -----------------------------------------------------------------------------

export interface GetGmailConnectUrlResponse {
  authUrl: string;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 6) POST /gmail/connect/callback
// -----------------------------------------------------------------------------

export interface PostGmailConnectCallbackRequest {
  code: string;
  state: string;
  redirectUri?: string;
}

export interface PostGmailConnectCallbackResponse {
  settings: {
    gmailEnabled: boolean;
    gmailAiEnabled: boolean;
    gmailStatus: string | null;
    gmailEmail: string | null;
    hasRefreshToken: boolean;
    gmailLastHistoryId: string | null;
    aiDeploymentEnabled: boolean;
    aiModel: string | null;
    updatedAt?: string;
  };
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 7) POST /gmail/disconnect
// -----------------------------------------------------------------------------

export interface PostGmailDisconnectResponse {
  settings: {
    gmailEnabled: boolean;
    gmailAiEnabled: boolean;
    gmailStatus: string | null;
    gmailEmail: string | null;
    hasRefreshToken: boolean;
    gmailLastHistoryId: string | null;
    aiDeploymentEnabled: boolean;
    aiModel: string | null;
    updatedAt?: string;
  };
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 8) GET /gmail/schedules
// -----------------------------------------------------------------------------

export interface GetGmailSchedulesResponse {
  schedules: GmailScheduleDto[];
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 9) POST /gmail/schedules
// -----------------------------------------------------------------------------

export interface PostGmailSchedulesRequest {
  name: string;
  cronExpression: string; // 5-field cron
  timezone: string; // IANA tz, ex: America/Toronto
  isActive?: boolean; // default true
  autoApplyThreshold?: number | null; // 0..1, null = never auto-apply
  gmailQueryFilter?: string;
}

export interface PostGmailSchedulesResponse {
  schedule: GmailScheduleDto;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 10) PATCH /gmail/schedules/:id
// -----------------------------------------------------------------------------

export interface PatchGmailSchedulePath {
  id: string;
}

export interface PatchGmailSchedulesRequest {
  name?: string;
  cronExpression?: string;
  timezone?: string;
  isActive?: boolean;
  autoApplyThreshold?: number | null;
  gmailQueryFilter?: string | null;
}

export interface PatchGmailSchedulesResponse {
  schedule: GmailScheduleDto;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 11) DELETE /gmail/schedules/:id
// -----------------------------------------------------------------------------

export interface DeleteGmailSchedulePath {
  id: string;
}

export interface DeleteGmailSchedulesResponse {
  deleted: true;
  id: string;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 7) POST /internal/email-events (HMAC protected)
// -----------------------------------------------------------------------------

export interface InternalEmailEventItem {
  gmailMessageId: string;
  gmailThreadId?: string;
  gmailHistoryId?: string;
  senderEmail?: string;
  subject?: string;
  receivedAt?: string;
  matchedApplicationId?: string;
  detectedStatus?: ApplicationStatus;
  fromStatus?: ApplicationStatus;
  confidenceScore?: number; // 0..1
  rawSnippet?: string; // scanner should send already-truncated snippet
  bodyPreview?: string;
  rawBodyText?: string;
  rawBodyHtml?: string;
  usefulLinks?: string[];
  reason?: 'ai' | 'none' | 'ai_failed';
  aiReasonText?: string;
  isRelevant?: boolean;
  aiCategory?: 'applied' | 'interview' | 'offer' | 'rejection' | 'other';
  company?: string;
  role?: string;
  location?: string;
  jobUrl?: string;
  eventTimeText?: string;
  externalJobId?: string;
  shouldCreateApplication?: boolean;
  shouldCreateEvent?: boolean;
  aiRawJson?: string;
}

export interface PostInternalEmailEventsRequest {
  scanJobId: string;
  userCognitoSub: string; // scanner resolves by sub contract, backend maps to users.id
  triggerType: ScanTriggerType;
  events: InternalEmailEventItem[];
}

export interface PostInternalEmailEventsResponse {
  accepted: true;
  scanJobId: string;
  totals: {
    received: number;
    inserted: number;
    duplicatesSkipped: number;
    needsReview: number;
    autoApplied: number;
    notificationsQueued: number;
  };
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 8) GET /notifications
// -----------------------------------------------------------------------------

export interface GetNotificationsQuery {
  status?: NotificationStatus;
  unreadOnly?: boolean;
  limit?: number;  // default 20, max 100
  cursor?: string; // opaque pagination token
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  body?: string;
  referenceType?: 'application' | 'scan_job' | 'detection_event';
  referenceId?: string;
  createdAt: string;
  sentAt?: string;
  readAt?: string;
}

export interface GetNotificationsResponse {
  notifications: NotificationDto[];
  nextCursor?: string;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 9) POST /notifications/:id/read
// -----------------------------------------------------------------------------

export interface PostNotificationsReadPath {
  id: string;
}

export interface PostNotificationsReadResponse {
  notification: NotificationDto;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 10) GET /application-status-events?decision=needs_review
// -----------------------------------------------------------------------------

export interface GetApplicationStatusEventsQuery {
  decision?: ReviewDecision; // expected: needs_review in current UI flow
  limit?: number; // default 20 max 100
  cursor?: string;
}

export interface ApplicationStatusEventReviewDto {
  id: string;
  userId: string;
  applicationId?: string;
  gmailMessageId: string;
  subject?: string;
  senderEmail?: string;
  detectedStatus?: ApplicationStatus;
  fromStatus?: ApplicationStatus;
  confidenceScore?: number;
  reviewStatus: ReviewDecision;
  createdAt: string;
  rawSnippet?: string;
  gmailSnippet?: string;
  bodyPreview?: string;
  usefulLinks?: string[];
  // AI extracted fields for review and editing
  aiConfidence?: number;
  aiCategory?: 'applied' | 'interview' | 'offer' | 'rejection' | 'other';
  aiReason?: string;
  aiCompany?: string;
  aiRole?: string;
  aiLocation?: string;
  aiJobUrl?: string;
  aiEventTime?: string;
  aiRawJson?: Record<string, unknown>;
}

export interface GetApplicationStatusEventsResponse {
  events: ApplicationStatusEventReviewDto[];
  nextCursor?: string;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 11) POST /application-status-events/:id/approve
// -----------------------------------------------------------------------------

export interface PostApplicationStatusEventApprovePath {
  id: string;
}

export interface PostApplicationStatusEventApproveRequest {
  applyStatus?: ApplicationStatus; // defaults to detectedStatus
  note?: string;
}

export interface PostApplicationStatusEventApproveResponse {
  event: ApplicationStatusEventReviewDto;
  statusEventId: string;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 12) POST /application-status-events/:id/reject
// -----------------------------------------------------------------------------

export interface PostApplicationStatusEventRejectPath {
  id: string;
}

export interface PostApplicationStatusEventRejectRequest {
  reason?: 'incorrect_match' | 'incorrect_status' | 'spam' | 'other';
  note?: string;
}

export interface PostApplicationStatusEventRejectResponse {
  event: ApplicationStatusEventReviewDto;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 13) POST /application-status-events/:id/discard
// Discard an email as irrelevant (clearer naming than "reject")
// -----------------------------------------------------------------------------

export interface PostApplicationStatusEventDiscardPath {
  id: string;
}

export interface PostApplicationStatusEventDiscardRequest {
  reason?: 'spam' | 'irrelevant' | 'system_noise' | 'other';
  note?: string;
}

export interface PostApplicationStatusEventDiscardResponse {
  event: ApplicationStatusEventReviewDto;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 14) POST /application-status-events/:id/edit
// Edit detected fields and save them
// -----------------------------------------------------------------------------

export interface PostApplicationStatusEventEditPath {
  id: string;
}

export interface PostApplicationStatusEventEditRequest {
  detectedStatus?: ApplicationStatus;
  aiCompany?: string;
  aiRole?: string;
  aiLocation?: string;
  aiJobUrl?: string;
  aiEventTime?: string;
}

export interface PostApplicationStatusEventEditResponse {
  event: ApplicationStatusEventReviewDto;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 15) POST /application-status-events/:id/match
// Manually match to an existing application
// -----------------------------------------------------------------------------

export interface PostApplicationStatusEventMatchPath {
  id: string;
}

export interface PostApplicationStatusEventMatchRequest {
  applicationId: string;
  applyStatus?: ApplicationStatus; // status to apply if different from detected
}

export interface PostApplicationStatusEventMatchResponse {
  event: ApplicationStatusEventReviewDto;
  statusEventId?: string; // if status was applied
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 16) POST /application-status-events/:id/create-and-match
// Create a new application from the email and match it
// -----------------------------------------------------------------------------

export interface PostApplicationStatusEventCreateAndMatchPath {
  id: string;
}

export interface PostApplicationStatusEventCreateAndMatchRequest {
  company: string;
  role?: string;
  location?: string;
  jobUrl?: string;
  status?: ApplicationStatus;
  notes?: string;
}

export interface PostApplicationStatusEventCreateAndMatchResponse {
  event: ApplicationStatusEventReviewDto;
  application: {
    id: string;
    company: string;
    role?: string;
    location?: string;
    jobUrl?: string;
    status: ApplicationStatus;
  };
  statusEventId?: string;
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 17) POST /application-status-events/bulk/discard
// Bulk discard multiple review items
// -----------------------------------------------------------------------------

export interface PostApplicationStatusEventsBulkDiscardRequest {
  ids: string[];
  reason?: 'spam' | 'irrelevant' | 'system_noise' | 'other';
  note?: string;
}

export interface PostApplicationStatusEventsBulkDiscardResponse {
  discardedCount: number;
  events: ApplicationStatusEventReviewDto[];
  meta: ApiSuccessMeta;
}

// -----------------------------------------------------------------------------
// 18) POST /application-status-events/bulk/pending
// Bulk mark multiple review items as pending/review-later
// -----------------------------------------------------------------------------

export interface PostApplicationStatusEventsBulkPendingRequest {
  ids: string[];
}

export interface PostApplicationStatusEventsBulkPendingResponse {
  markedCount: number;
  events: ApplicationStatusEventReviewDto[];
  meta: ApiSuccessMeta;
}

// Shared DTOs
// -----------------------------------------------------------------------------

export interface GmailScheduleDto {
  id: string;
  userId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  autoApplyThreshold: number | null;
  gmailQueryFilter?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Route table (single source of truth for API surface)
// -----------------------------------------------------------------------------

export const GMAIL_API_ROUTES: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/gmail/scan',
    auth: 'jwt-user',
    summary: 'Manually trigger Gmail scan for authenticated user',
    requestType: 'PostGmailScanRequest',
    responseType: 'PostGmailScanResponse',
    idempotency: 'Optional Idempotency-Key header (recommended). Cooldown enforced by backend per user.',
    authorization: 'Resolve user from JWT claims.sub -> users.cognito_sub. Ignore client userId.'
  },
  {
    method: 'GET',
    path: '/gmail/scan/status',
    auth: 'jwt-user',
    summary: 'Get latest scan status or specific job status',
    requestType: 'GetGmailScanStatusQuery',
    responseType: 'GetGmailScanStatusResponse',
    idempotency: 'Read-only.',
    authorization: 'Only jobs owned by current user may be returned.'
  },
  {
    method: 'GET',
    path: '/gmail/settings',
    auth: 'jwt-user',
    summary: 'Get Gmail connection settings for current user',
    requestType: 'none',
    responseType: 'GetGmailSettingsResponse',
    idempotency: 'Read-only.',
    authorization: 'Return settings for current user only.'
  },
  {
    method: 'PATCH',
    path: '/gmail/settings',
    auth: 'jwt-user',
    summary: 'Update Gmail connection settings for current user',
    requestType: 'PatchGmailSettingsRequest',
    responseType: 'PatchGmailSettingsResponse',
    idempotency: 'PATCH should be safe to retry when body is identical.',
    authorization: 'Update settings for current user only.'
  },
  {
    method: 'GET',
    path: '/gmail/connect-url',
    auth: 'jwt-user',
    summary: 'Create Google OAuth authorization URL for Gmail connection',
    requestType: 'none',
    responseType: 'GetGmailConnectUrlResponse',
    idempotency: 'Read-only URL generation.',
    authorization: 'Generate connect URL for current user only.'
  },
  {
    method: 'POST',
    path: '/gmail/connect/callback',
    auth: 'jwt-user',
    summary: 'Exchange Google OAuth code and save Gmail refresh token',
    requestType: 'PostGmailConnectCallbackRequest',
    responseType: 'PostGmailConnectCallbackResponse',
    idempotency: 'Safe to retry with same code/state until code expires.',
    authorization: 'Callback state must resolve to current user.'
  },
  {
    method: 'POST',
    path: '/gmail/disconnect',
    auth: 'jwt-user',
    summary: 'Disconnect Gmail and clear stored refresh token',
    requestType: 'none',
    responseType: 'PostGmailDisconnectResponse',
    idempotency: 'Idempotent clear operation.',
    authorization: 'Disconnect settings for current user only.'
  },
  {
    method: 'GET',
    path: '/gmail/schedules',
    auth: 'jwt-user',
    summary: 'List Gmail scan schedules for current user',
    requestType: 'none',
    responseType: 'GetGmailSchedulesResponse',
    idempotency: 'Read-only.',
    authorization: 'List by current user only.'
  },
  {
    method: 'POST',
    path: '/gmail/schedules',
    auth: 'jwt-user',
    summary: 'Create schedule for current user',
    requestType: 'PostGmailSchedulesRequest',
    responseType: 'PostGmailSchedulesResponse',
    idempotency: 'Optional Idempotency-Key header for create retries.',
    authorization: 'Create under user derived from JWT claims.sub.'
  },
  {
    method: 'PATCH',
    path: '/gmail/schedules/:id',
    auth: 'jwt-user',
    summary: 'Update one schedule owned by current user',
    requestType: 'PatchGmailSchedulesRequest',
    responseType: 'PatchGmailSchedulesResponse',
    idempotency: 'PATCH should be safe to retry when body is identical.',
    authorization: 'Schedule owner must match current user.'
  },
  {
    method: 'DELETE',
    path: '/gmail/schedules/:id',
    auth: 'jwt-user',
    summary: 'Delete one schedule owned by current user',
    requestType: 'none',
    responseType: 'DeleteGmailSchedulesResponse',
    idempotency: 'DELETE is idempotent (repeat returns deleted/not-found semantics per API policy).',
    authorization: 'Schedule owner must match current user.'
  },
  {
    method: 'POST',
    path: '/internal/email-events',
    auth: 'hmac-internal',
    summary: 'Ingest scanner events and create detection + notification records',
    requestType: 'PostInternalEmailEventsRequest',
    responseType: 'PostInternalEmailEventsResponse',
    idempotency: 'Required X-Idempotency-Key header + DB uniqueness on (user_id,gmail_message_id).',
    authorization: 'No JWT. HMAC secret + key-id must match trusted scanner caller.'
  },
  {
    method: 'GET',
    path: '/notifications',
    auth: 'jwt-user',
    summary: 'List current user notifications',
    requestType: 'GetNotificationsQuery',
    responseType: 'GetNotificationsResponse',
    idempotency: 'Read-only.',
    authorization: 'List by current user only.'
  },
  {
    method: 'POST',
    path: '/notifications/:id/read',
    auth: 'jwt-user',
    summary: 'Mark one notification as read for current user',
    requestType: 'none',
    responseType: 'PostNotificationsReadResponse',
    idempotency: 'Idempotent set read_at; repeated calls return same terminal state.',
    authorization: 'Notification owner must match current user.'
  },
  {
    method: 'GET',
    path: '/application-status-events',
    auth: 'jwt-user',
    summary: 'List reviewable detection events (e.g., decision=needs_review)',
    requestType: 'GetApplicationStatusEventsQuery',
    responseType: 'GetApplicationStatusEventsResponse',
    idempotency: 'Read-only.',
    authorization: 'List by current user only.'
  },
  {
    method: 'POST',
    path: '/application-status-events/:id/approve',
    auth: 'jwt-user',
    summary: 'Approve detection event and apply status update',
    requestType: 'PostApplicationStatusEventApproveRequest',
    responseType: 'PostApplicationStatusEventApproveResponse',
    idempotency: 'Use row-level lock + terminal-state check to prevent double-approval.',
    authorization: 'Event owner must match current user.'
  },
  {
    method: 'POST',
    path: '/application-status-events/:id/reject',
    auth: 'jwt-user',
    summary: 'Reject detection event and keep application unchanged',
    requestType: 'PostApplicationStatusEventRejectRequest',
    responseType: 'PostApplicationStatusEventRejectResponse',
    idempotency: 'Use row-level lock + terminal-state check to prevent duplicate transitions.',
    authorization: 'Event owner must match current user.'
  }
];

// -----------------------------------------------------------------------------
// Validation contract (implementation target for zod/joi/custom validator)
// -----------------------------------------------------------------------------

export const VALIDATION_RULES = {
  gmailScan: {
    manualCooldownSeconds: 300,
    maxManualScansPerHour: 6,
  },
  schedules: {
    maxSchedulesPerUser: 10,
    minIntervalMinutes: 15,
    cronFields: 5,
    maxNameLength: 255,
    maxQueryFilterLength: 500,
    timezoneMustBeIana: true,
    autoApplyThresholdRange: [0, 1] as const,
  },
  notifications: {
    maxPageSize: 100,
    defaultPageSize: 20,
  },
  statusEventsReview: {
    allowedDecisionFilter: ['needs_review', 'auto_applied', 'approved', 'rejected', 'dismissed'] as const,
    maxPageSize: 100,
    defaultPageSize: 20,
  },
  internalEmailEvents: {
    maxEventsPerRequest: 500,
    maxRawSnippetLength: 2000,
    confidenceRange: [0, 1] as const,
    requireScanJobId: true,
    requireUserCognitoSub: true,
  }
} as const;

// -----------------------------------------------------------------------------
// Authorization contract
// -----------------------------------------------------------------------------

export const AUTHORIZATION_RULES = {
  userResolution: 'MUST derive current user from JWT claims.sub -> users.cognito_sub. Never trust client userId.',
  legacyUidRule: 'users.uid is legacy Firebase UID and MUST never be modified by these endpoints.',
  ownership: {
    schedule: 'user_id must match resolved user',
    scanJob: 'user_id must match resolved user',
    notification: 'user_id must match resolved user',
    reviewEvent: 'user_id must match resolved user',
  },
} as const;

// -----------------------------------------------------------------------------
// HMAC verification contract for POST /internal/email-events
// -----------------------------------------------------------------------------

export interface InternalHmacHeaders {
  'x-itk-key-id': string;           // identifies active shared secret
  'x-itk-timestamp': string;        // unix epoch seconds
  'x-itk-signature': string;        // hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`))
  'x-idempotency-key': string;      // unique per scanner delivery attempt group
  'x-itk-delivery-id'?: string;     // optional explicit replay nonce
}

export const HMAC_CONTRACT = {
  algorithm: 'HMAC-SHA256',
  signedPayloadFormat: '${x-itk-timestamp}.${raw_request_body}',
  signatureEncoding: 'hex',
  requiredHeaders: ['x-itk-key-id', 'x-itk-timestamp', 'x-itk-signature', 'x-idempotency-key'],
  timestampSkewSeconds: 300,
  replayProtection: {
    requiredIdempotencyKey: true,
    dedupeTtlHours: 24,
    storage: 'Redis/DynamoDB/Postgres unique table (implementation choice)',
  },
  failureCodes: {
    badSignature: 'HMAC_INVALID',
    staleTimestamp: 'HMAC_EXPIRED',
    replayDetected: 'HMAC_REPLAY',
  }
} as const;

// -----------------------------------------------------------------------------
// Recommended service boundaries (no implementation in this task)
// -----------------------------------------------------------------------------

export interface UserContextService {
  resolveUserByCognitoSub(cognitoSub: string): Promise<{ id: string; cognitoSub: string }>;
}

export interface ScanService {
  createManualScanJob(input: {
    userId: string;
    fullRescan?: boolean;
    idempotencyKey?: string;
  }): Promise<PostGmailScanResponse['job']>;

  getScanStatus(input: {
    userId: string;
    jobId?: string;
  }): Promise<GetGmailScanStatusResponse['job']>;
}

export interface ScheduleService {
  listSchedules(userId: string): Promise<GmailScheduleDto[]>;
  createSchedule(userId: string, body: PostGmailSchedulesRequest): Promise<GmailScheduleDto>;
  patchSchedule(userId: string, scheduleId: string, body: PatchGmailSchedulesRequest): Promise<GmailScheduleDto>;
  deleteSchedule(userId: string, scheduleId: string): Promise<void>;
}

export interface InternalEmailEventIngestionService {
  verifyHmac(headers: InternalHmacHeaders, rawBody: string): Promise<void>;
  ingest(payload: PostInternalEmailEventsRequest): Promise<PostInternalEmailEventsResponse['totals']>;
}

export interface ReviewService {
  listEvents(userId: string, query: GetApplicationStatusEventsQuery): Promise<GetApplicationStatusEventsResponse>;
  approveEvent(userId: string, eventId: string, body: PostApplicationStatusEventApproveRequest): Promise<PostApplicationStatusEventApproveResponse>;
  rejectEvent(userId: string, eventId: string, body: PostApplicationStatusEventRejectRequest): Promise<PostApplicationStatusEventRejectResponse>;
}

export interface NotificationService {
  list(userId: string, query: GetNotificationsQuery): Promise<GetNotificationsResponse>;
  markRead(userId: string, notificationId: string): Promise<PostNotificationsReadResponse>;
  createFromDetectionEvent(input: {
    userId: string;
    detectionEventId: string;
    type: NotificationType;
    idempotencyKey: string;
  }): Promise<void>;
}

// -----------------------------------------------------------------------------
// Idempotency expectations
// -----------------------------------------------------------------------------

export const IDEMPOTENCY_EXPECTATIONS = {
  '/gmail/scan POST': 'Support Idempotency-Key. On duplicate key within 10 minutes for same user, return original job.',
  '/gmail/schedules POST': 'Support Idempotency-Key to avoid duplicate schedule creation from client retries.',
  '/internal/email-events POST': 'Require x-idempotency-key. Use DB unique (user_id,gmail_message_id) + dedupe key store.',
  '/notifications/:id/read POST': 'Idempotent state transition to read.',
  '/application-status-events/:id/approve POST': 'Single transition via SELECT ... FOR UPDATE + terminal state guard.',
  '/application-status-events/:id/reject POST': 'Single transition via SELECT ... FOR UPDATE + terminal state guard.',
} as const;

// -----------------------------------------------------------------------------
// TODO markers for implementation phase
// -----------------------------------------------------------------------------

export const IMPLEMENTATION_TODOS = [
  'TODO(api-router): Register these 12 routes in Lambda handler/router without business logic changes to existing endpoints.',
  'TODO(validation): Implement schema validators (zod/joi/custom) from VALIDATION_RULES.',
  'TODO(authz): Enforce ownership checks on schedule/job/notification/review resources.',
  'TODO(rate-limit): Add manual scan cooldown + per-hour limit keyed by user_id.',
  'TODO(hmac): Implement constant-time signature compare, freshness check, and replay dedupe store.',
  'TODO(txn): In approve/reject flows, use DB transaction + row lock to guarantee single transition.',
  'TODO(notifications): Ensure backend creates notification rows; scanner must never write notifications directly.',
  'TODO(observability): Add structured logs + requestId + metrics for accepted/duplicate/rejected internal events.',
] as const;
