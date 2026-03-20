'use client';

import { apiClient } from './api-client';
import type {
  ApplicationStatusEventReviewDto,
  GetApplicationStatusEventsResponse,
  GetGmailConnectUrlResponse,
  GetGmailScanStatusResponse,
  GetGmailSettingsResponse,
  GetGmailSchedulesResponse,
  GetNotificationsResponse,
  GmailScheduleDto,
  PostGmailConnectCallbackRequest,
  PostGmailConnectCallbackResponse,
  PostGmailDisconnectResponse,
  PatchGmailSettingsRequest,
  PatchGmailSettingsResponse,
  PatchGmailSchedulesRequest,
  PatchGmailSchedulesResponse,
  PostApplicationStatusEventApproveRequest,
  PostApplicationStatusEventApproveResponse,
  PostApplicationStatusEventRejectRequest,
  PostApplicationStatusEventRejectResponse,
  PostApplicationStatusEventDiscardRequest,
  PostApplicationStatusEventDiscardResponse,
  PostApplicationStatusEventEditRequest,
  PostApplicationStatusEventEditResponse,
  PostApplicationStatusEventMatchRequest,
  PostApplicationStatusEventMatchResponse,
  PostApplicationStatusEventCreateAndMatchRequest,
  PostApplicationStatusEventCreateAndMatchResponse,
  PostApplicationStatusEventsBulkDiscardRequest,
  PostApplicationStatusEventsBulkDiscardResponse,
  PostApplicationStatusEventsBulkPendingRequest,
  PostApplicationStatusEventsBulkPendingResponse,
  PostGmailScanRequest,
  PostGmailScanResponse,
  PostGmailSchedulesRequest,
  PostGmailSchedulesResponse,
  PostNotificationsReadResponse,
} from './contracts/gmail-api.contracts';

export type SchedulePreset = 'daily' | 'weekdays' | 'weekly';

export interface ScheduleDraft {
  id?: string;
  name: string;
  timezone: string;
  preset: SchedulePreset;
  hour: number;
  minute: number;
  weekday: number;
  isActive: boolean;
  autoApplyThreshold: number | null;
  lookbackHours: number | null;
  gmailQueryFilter: string;
}

const LOOKBACK_DIRECTIVE_PREFIX = 'lookback_hours:';

function parseLookbackDirective(raw: string | null | undefined): {
  lookbackHours: number | null;
  gmailQueryFilter: string;
} {
  const tokens = (raw || '').trim().split(/\s+/).filter(Boolean);
  let lookbackHours: number | null = null;
  const filterTokens: string[] = [];

  for (const token of tokens) {
    const match = token.match(/^lookback_hours:(\d+)$/i);
    if (match && lookbackHours === null) {
      lookbackHours = clampInt(Number(match[1]), 1, 24 * 30);
      continue;
    }
    filterTokens.push(token);
  }

  return {
    lookbackHours,
    gmailQueryFilter: filterTokens.join(' '),
  };
}

function composeQueryFilter(input: { lookbackHours: number | null; gmailQueryFilter: string }): string {
  const parts: string[] = [];
  if (typeof input.lookbackHours === 'number') {
    parts.push(`${LOOKBACK_DIRECTIVE_PREFIX}${clampInt(input.lookbackHours, 1, 24 * 30)}`);
  }
  const cleanedFilter = input.gmailQueryFilter.trim();
  if (cleanedFilter) {
    parts.push(cleanedFilter);
  }
  return parts.join(' ');
}

export interface ApiErrorLike {
  message: string;
  status?: number;
}

export interface JobTitleOption {
  id: string;
  title: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  let message = `Request failed (${response.status})`;
  try {
    const data = await response.json();
    message = data?.message || data?.error?.message || data?.error || message;
  } catch {
    // ignore JSON parse error and keep default message
  }

  const err: ApiErrorLike = { message, status: response.status };
  throw err;
}

export function toCronExpression(draft: Pick<ScheduleDraft, 'preset' | 'hour' | 'minute' | 'weekday'>): string {
  const minute = clampInt(draft.minute, 0, 59);
  const hour = clampInt(draft.hour, 0, 23);

  if (draft.preset === 'daily') {
    return `${minute} ${hour} * * *`;
  }

  if (draft.preset === 'weekdays') {
    return `${minute} ${hour} * * 1-5`;
  }

  return `${minute} ${hour} * * ${clampInt(draft.weekday, 0, 6)}`;
}

export function fromCronExpression(
  cronExpression: string
): Pick<ScheduleDraft, 'preset' | 'hour' | 'minute' | 'weekday'> {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { preset: 'daily', hour: 9, minute: 0, weekday: 1 };
  }

  const minute = clampInt(Number(parts[0]), 0, 59);
  const hour = clampInt(Number(parts[1]), 0, 23);
  const dayOfWeek = parts[4];

  if (dayOfWeek === '*') {
    return { preset: 'daily', hour, minute, weekday: 1 };
  }

  if (dayOfWeek === '1-5') {
    return { preset: 'weekdays', hour, minute, weekday: 1 };
  }

  if (/^[0-6]$/.test(dayOfWeek)) {
    return { preset: 'weekly', hour, minute, weekday: Number(dayOfWeek) };
  }

  return { preset: 'daily', hour, minute, weekday: 1 };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function scheduleToDraft(schedule: GmailScheduleDto): ScheduleDraft {
  const parsed = fromCronExpression(schedule.cronExpression);
  const parsedFilter = parseLookbackDirective(schedule.gmailQueryFilter || '');
  return {
    id: schedule.id,
    name: schedule.name,
    timezone: schedule.timezone,
    preset: parsed.preset,
    hour: parsed.hour,
    minute: parsed.minute,
    weekday: parsed.weekday,
    isActive: schedule.isActive,
    autoApplyThreshold:
      typeof schedule.autoApplyThreshold === 'number' ? schedule.autoApplyThreshold : null,
    lookbackHours: parsedFilter.lookbackHours,
    gmailQueryFilter: parsedFilter.gmailQueryFilter,
  };
}

export function draftToCreatePayload(draft: ScheduleDraft): PostGmailSchedulesRequest {
  const queryFilter = composeQueryFilter({
    lookbackHours: draft.lookbackHours,
    gmailQueryFilter: draft.gmailQueryFilter,
  });

  return {
    name: draft.name,
    cronExpression: toCronExpression(draft),
    timezone: draft.timezone,
    isActive: draft.isActive,
    autoApplyThreshold: draft.autoApplyThreshold,
    gmailQueryFilter: queryFilter || undefined,
  };
}

export function draftToPatchPayload(draft: ScheduleDraft): PatchGmailSchedulesRequest {
  const queryFilter = composeQueryFilter({
    lookbackHours: draft.lookbackHours,
    gmailQueryFilter: draft.gmailQueryFilter,
  });

  return {
    name: draft.name,
    cronExpression: toCronExpression(draft),
    timezone: draft.timezone,
    isActive: draft.isActive,
    autoApplyThreshold: draft.autoApplyThreshold,
    gmailQueryFilter: queryFilter || null,
  };
}

export async function triggerScanNow(input: PostGmailScanRequest = {}): Promise<PostGmailScanResponse> {
  const response = await apiClient.post('/api/gmail/scan', input);
  return parseJsonOrThrow<PostGmailScanResponse>(response);
}

export async function getLatestScanStatus(): Promise<GetGmailScanStatusResponse> {
  const response = await apiClient.get('/api/gmail/scan/status?latest=true');
  return parseJsonOrThrow<GetGmailScanStatusResponse>(response);
}

export async function getGmailSettings(): Promise<GetGmailSettingsResponse> {
  const response = await apiClient.get('/api/gmail/settings');
  return parseJsonOrThrow<GetGmailSettingsResponse>(response);
}

export async function updateGmailSettings(input: PatchGmailSettingsRequest): Promise<PatchGmailSettingsResponse> {
  const response = await apiClient.patch('/api/gmail/settings', input);
  return parseJsonOrThrow<PatchGmailSettingsResponse>(response);
}

export async function getGmailConnectUrl(redirectUri?: string): Promise<GetGmailConnectUrlResponse> {
  const query = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : '';
  const response = await apiClient.get(`/api/gmail/connect-url${query}`);
  return parseJsonOrThrow<GetGmailConnectUrlResponse>(response);
}

export async function completeGmailConnect(
  input: PostGmailConnectCallbackRequest
): Promise<PostGmailConnectCallbackResponse> {
  const response = await apiClient.post('/api/gmail/connect/callback', input);
  return parseJsonOrThrow<PostGmailConnectCallbackResponse>(response);
}

export async function disconnectGmail(): Promise<PostGmailDisconnectResponse> {
  const response = await apiClient.post('/api/gmail/disconnect');
  return parseJsonOrThrow<PostGmailDisconnectResponse>(response);
}

export async function listSchedules(): Promise<GmailScheduleDto[]> {
  const response = await apiClient.get('/api/gmail/schedules');
  const data = await parseJsonOrThrow<GetGmailSchedulesResponse>(response);
  return data.schedules || [];
}

export async function createSchedule(input: PostGmailSchedulesRequest): Promise<GmailScheduleDto> {
  const response = await apiClient.post('/api/gmail/schedules', input);
  const data = await parseJsonOrThrow<PostGmailSchedulesResponse>(response);
  return data.schedule;
}

export async function updateSchedule(id: string, input: PatchGmailSchedulesRequest): Promise<GmailScheduleDto> {
  const response = await apiClient.patch(`/api/gmail/schedules/${id}`, input);
  const data = await parseJsonOrThrow<PatchGmailSchedulesResponse>(response);
  return data.schedule;
}

export async function deleteSchedule(id: string): Promise<void> {
  const response = await apiClient.delete(`/api/gmail/schedules/${id}`);
  await parseJsonOrThrow(response);
}

export async function listNotifications(unreadOnly = false): Promise<GetNotificationsResponse> {
  const query = unreadOnly ? '?unreadOnly=true&limit=100' : '?limit=50';
  const response = await apiClient.get(`/api/notifications${query}`);
  return parseJsonOrThrow<GetNotificationsResponse>(response);
}

export async function markNotificationRead(id: string): Promise<PostNotificationsReadResponse> {
  const response = await apiClient.post(`/api/notifications/${id}/read`);
  return parseJsonOrThrow<PostNotificationsReadResponse>(response);
}

export async function listReviewQueue(): Promise<ApplicationStatusEventReviewDto[]> {
  const response = await apiClient.get('/api/application-status-events?decision=needs_review&limit=100');
  const data = await parseJsonOrThrow<GetApplicationStatusEventsResponse>(response);
  return data.events || [];
}

export async function listJobTitles(): Promise<JobTitleOption[]> {
  const response = await apiClient.get('/api/job-titles');
  const data = await parseJsonOrThrow<{ jobTitles?: JobTitleOption[] }>(response);
  return data.jobTitles || [];
}

export async function approveReviewItem(
  id: string,
  input: PostApplicationStatusEventApproveRequest = {}
): Promise<PostApplicationStatusEventApproveResponse> {
  const response = await apiClient.post(`/api/application-status-events/${id}/approve`, input);
  return parseJsonOrThrow<PostApplicationStatusEventApproveResponse>(response);
}

export async function rejectReviewItem(
  id: string,
  input: PostApplicationStatusEventRejectRequest = {}
): Promise<PostApplicationStatusEventRejectResponse> {
  const response = await apiClient.post(`/api/application-status-events/${id}/reject`, input);
  return parseJsonOrThrow<PostApplicationStatusEventRejectResponse>(response);
}

export async function discardReviewItem(
  id: string,
  input: PostApplicationStatusEventDiscardRequest = {}
): Promise<PostApplicationStatusEventDiscardResponse> {
  const response = await apiClient.post(`/api/application-status-events/${id}/discard`, input);
  return parseJsonOrThrow<PostApplicationStatusEventDiscardResponse>(response);
}

export async function editReviewItem(
  id: string,
  input: PostApplicationStatusEventEditRequest
): Promise<PostApplicationStatusEventEditResponse> {
  const response = await apiClient.post(`/api/application-status-events/${id}/edit`, input);
  return parseJsonOrThrow<PostApplicationStatusEventEditResponse>(response);
}

export async function matchReviewItemToApplication(
  id: string,
  input: PostApplicationStatusEventMatchRequest
): Promise<PostApplicationStatusEventMatchResponse> {
  const response = await apiClient.post(`/api/application-status-events/${id}/match`, input);
  return parseJsonOrThrow<PostApplicationStatusEventMatchResponse>(response);
}

export async function createApplicationFromReviewItem(
  id: string,
  input: PostApplicationStatusEventCreateAndMatchRequest
): Promise<PostApplicationStatusEventCreateAndMatchResponse> {
  const response = await apiClient.post(`/api/application-status-events/${id}/create-and-match`, input);
  return parseJsonOrThrow<PostApplicationStatusEventCreateAndMatchResponse>(response);
}

export async function bulkDiscardReviewItems(
  input: PostApplicationStatusEventsBulkDiscardRequest
): Promise<PostApplicationStatusEventsBulkDiscardResponse> {
  const response = await apiClient.post('/api/application-status-events/bulk/discard', input);
  return parseJsonOrThrow<PostApplicationStatusEventsBulkDiscardResponse>(response);
}

export async function bulkMarkReviewItemsPending(
  input: PostApplicationStatusEventsBulkPendingRequest
): Promise<PostApplicationStatusEventsBulkPendingResponse> {
  const response = await apiClient.post('/api/application-status-events/bulk/pending', input);
  return parseJsonOrThrow<PostApplicationStatusEventsBulkPendingResponse>(response);
}

export function formatTimeLabel(hour: number, minute: number): string {
  const safeHour = clampInt(hour, 0, 23);
  const safeMinute = clampInt(minute, 0, 59);
  const date = new Date();
  date.setHours(safeHour, safeMinute, 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function weekdayLabel(day: number): string {
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return labels[clampInt(day, 0, 6)];
}
