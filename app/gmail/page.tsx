'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/useUser';
import type { GmailScheduleDto, GetGmailScanStatusResponse, GetGmailSettingsResponse } from '@/lib/contracts/gmail-api.contracts';
import {
  ApiErrorLike,
  ScheduleDraft,
  disconnectGmail,
  createSchedule,
  deleteSchedule,
  draftToCreatePayload,
  draftToPatchPayload,
  formatTimeLabel,
  getGmailConnectUrl,
  getGmailSettings,
  getLatestScanStatus,
  listSchedules,
  scheduleToDraft,
  triggerScanNow,
  updateGmailSettings,
  updateSchedule,
  weekdayLabel,
} from '@/lib/gmail-feature.api';

const DEFAULT_DRAFT: ScheduleDraft = {
  name: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  preset: 'daily',
  hour: 9,
  minute: 0,
  weekday: 1,
  isActive: true,
  autoApplyThreshold: null,
  lookbackHours: null,
  gmailQueryFilter: '',
};

const ACTIVE_SCAN_STATUSES = new Set(['pending', 'running']);

function formatScanStatusLabel(status: string | undefined): string {
  if (!status) return 'No scan job found yet.';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getScanProgressPercent(job: GetGmailScanStatusResponse['job']): number {
  if (!job) return 0;
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') return 100;
  if (job.status === 'pending') return 8;

  // Running scans do not expose total messages, so use a bounded heuristic based on work completed.
  return Math.min(95, 15 + Math.floor(Math.log10(job.messagesScanned + 1) * 40));
}

function formatTimestamp(value?: string): string {
  if (!value) return 'N/A';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleString();
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as ApiErrorLike).message || fallback);
  }
  return fallback;
}

function GmailSettingsInner() {
  const { uid, loading: userLoading } = useUser();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scanNowLoading, setScanNowLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const [schedules, setSchedules] = useState<GmailScheduleDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScheduleDraft>(DEFAULT_DRAFT);

  const [latestScanJob, setLatestScanJob] = useState<GetGmailScanStatusResponse['job']>(null);
  const [manualLookbackHours, setManualLookbackHours] = useState<string>('24');
  const [gmailSettings, setGmailSettings] = useState<GetGmailSettingsResponse['settings'] | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [gmailEmailDraft, setGmailEmailDraft] = useState('');

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  const needsReconnect = useMemo(() => {
    const status = (gmailSettings?.gmailStatus || '').toLowerCase();
    return status === 'reauthorization_required' || status === 'token_expired' || status === 'error';
  }, [gmailSettings?.gmailStatus]);

  const scanProgress = useMemo(() => getScanProgressPercent(latestScanJob), [latestScanJob]);
  const hasActiveScan = useMemo(
    () => !!latestScanJob && ACTIVE_SCAN_STATUSES.has(latestScanJob.status),
    [latestScanJob]
  );

  const refreshScanStatus = async () => {
    const status = await getLatestScanStatus();
    setLatestScanJob(status.job);
    return status.job;
  };

  const loadData = async () => {
    if (!uid) return;

    setLoading(true);
    setError(null);

    try {
      const [scheduleRows, status, settings] = await Promise.all([
        listSchedules(),
        getLatestScanStatus(),
        getGmailSettings(),
      ]);
      setSchedules(scheduleRows);
      setGmailSettings(settings.settings);
      setLatestScanJob(status.job);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load Gmail settings.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [uid]);

  useEffect(() => {
    const connected = searchParams.get('gmailConnected');
    const connectError = searchParams.get('gmailConnectError');
    if (connected === '1') {
      setScanMessage('Gmail connected successfully.');
      setError(null);
      loadData();
    } else if (connectError) {
      setError(connectError);
    }
  }, [searchParams]);

  useEffect(() => {
    setGmailEmailDraft(gmailSettings?.gmailEmail || '');
  }, [gmailSettings?.gmailEmail]);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const job = await refreshScanStatus();
        if (cancelled) return;
        if (job && ACTIVE_SCAN_STATUSES.has(job.status)) {
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(toErrorMessage(err, 'Failed to refresh scan progress.'));
      }
    };

    const timerId = window.setInterval(poll, 5000);
    poll();

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, [uid]);

  const resetDraft = () => {
    setDraft(DEFAULT_DRAFT);
    setEditingId(null);
  };

  const onSaveSchedule = async () => {
    if (!uid || !draft.name.trim()) {
      setError('Schedule name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingId) {
        await updateSchedule(editingId, draftToPatchPayload(draft));
      } else {
        await createSchedule(draftToCreatePayload(draft));
      }

      await loadData();
      resetDraft();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to save schedule.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteSchedule = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;

    setSubmitting(true);
    setError(null);

    try {
      await deleteSchedule(id);
      await loadData();
      if (editingId === id) resetDraft();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to delete schedule.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleSchedule = async (row: GmailScheduleDto) => {
    setSubmitting(true);
    setError(null);

    try {
      await updateSchedule(row.id, { isActive: !row.isActive });
      await loadData();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to update schedule status.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onEditSchedule = (row: GmailScheduleDto) => {
    setEditingId(row.id);
    setDraft(scheduleToDraft(row));
    setError(null);
  };

  const onScanNow = async () => {
    setScanNowLoading(true);
    setScanMessage(null);
    setError(null);

    try {
      const parsedLookback = Number(manualLookbackHours);
      const lookbackHours = Number.isFinite(parsedLookback) && parsedLookback > 0
        ? Math.max(1, Math.min(24 * 30, Math.floor(parsedLookback)))
        : undefined;

      const result = await triggerScanNow({
        reason: 'manual_click',
        lookbackHours,
      });
      setScanMessage(`Scan started. Job ID: ${result.job.id}`);
      await refreshScanStatus();
      await loadData();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to trigger scan now.'));
    } finally {
      setScanNowLoading(false);
    }
  };

  const onToggleGmailEnabled = async () => {
    if (!gmailSettings) return;
    setSettingsSaving(true);
    setError(null);

    try {
      const result = await updateGmailSettings({ gmailEnabled: !gmailSettings.gmailEnabled });
      setGmailSettings(result.settings);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to update Gmail enabled flag.'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const onConnectGmail = async () => {
    setSettingsSaving(true);
    setError(null);
    try {
      const result = await getGmailConnectUrl();
      window.location.href = result.authUrl;
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to start Gmail OAuth flow.'));
      setSettingsSaving(false);
    }
  };

  const onDisconnectGmail = async () => {
    setSettingsSaving(true);
    setError(null);
    try {
      const result = await disconnectGmail();
      setGmailSettings(result.settings);
      setScanMessage('Gmail disconnected.');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to disconnect Gmail.'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const onToggleConnectionSwitch = async () => {
    if (!gmailSettings) return;
    const isConnected = gmailSettings.gmailStatus === 'connected';
    if (isConnected) {
      await onDisconnectGmail();
      return;
    }
    await onConnectGmail();
  };

  const onSaveGmailEmail = async () => {
    if (!gmailSettings) return;
    setSettingsSaving(true);
    setError(null);
    try {
      const nextEmail = gmailEmailDraft.trim();
      const result = await updateGmailSettings({ gmailEmail: nextEmail === '' ? null : nextEmail });
      setGmailSettings(result.settings);
      setScanMessage('Gmail email updated.');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to update Gmail email.'));
    } finally {
      setSettingsSaving(false);
    }
  };

  if (userLoading) {
    return <p className="text-slate-600">Loading…</p>;
  }

  if (!uid) {
    return <p className="text-slate-600">Sign in to manage Gmail scan settings.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gmail Scan Settings</h1>
        <button
          onClick={onScanNow}
          disabled={scanNowLoading || loading}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
        >
          {scanNowLoading ? 'Scanning…' : 'Scan now'}
        </button>
      </div>

      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">Scan status</h2>
        {!latestScanJob ? (
          <p className="mt-2 text-sm text-slate-700">No scan job found yet.</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-slate-800">
                <span className="font-medium">{formatScanStatusLabel(latestScanJob.status)}</span>
                {` • scanned ${latestScanJob.messagesScanned} messages • detections ${latestScanJob.detectionsFound}`}
              </p>
              {hasActiveScan && (
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  Polling every 5s
                </span>
              )}
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scanProgress}>
              <div
                className={`h-full transition-all duration-500 ${
                  latestScanJob.status === 'failed'
                    ? 'bg-red-500'
                    : latestScanJob.status === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
              <p>
                <span className="text-slate-500">Job ID:</span> {latestScanJob.id}
              </p>
              <p>
                <span className="text-slate-500">Trigger:</span> {latestScanJob.triggerType}
              </p>
              <p>
                <span className="text-slate-500">Started:</span> {formatTimestamp(latestScanJob.startedAt)}
              </p>
              <p>
                <span className="text-slate-500">Completed:</span> {formatTimestamp(latestScanJob.completedAt)}
              </p>
            </div>

            {latestScanJob.errors.length > 0 && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <p className="font-medium">Scan errors</p>
                <ul className="mt-1 list-disc pl-5">
                  {latestScanJob.errors.map((scanErr, idx) => (
                    <li key={`${scanErr.code}-${idx}`}>
                      {scanErr.code}: {scanErr.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        <div className="mt-3 grid gap-2 md:max-w-sm">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Manual scan lookback hours</span>
            <input
              type="number"
              min={1}
              max={720}
              value={manualLookbackHours}
              onChange={(e) => setManualLookbackHours(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="24"
            />
          </label>
          <p className="text-xs text-slate-500">
            This only affects "Scan now" and is independent from schedule lookback.
          </p>
        </div>
        {scanMessage && <p className="mt-2 text-sm text-green-700">{scanMessage}</p>}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">Gmail connection</h2>
        {!gmailSettings ? (
          <p className="mt-2 text-sm text-slate-600">Loading connection settings…</p>
        ) : (
          <>
            {needsReconnect && (
              <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Gmail authorization expired. Reconnect Gmail to resume scheduled scans.</span>
                  <button
                    type="button"
                    onClick={onConnectGmail}
                    disabled={settingsSaving || loading}
                    className="rounded border border-amber-400 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  >
                    Reconnect Gmail
                  </button>
                </div>
              </div>
            )}
            {(() => {
              const isConnected = gmailSettings.gmailStatus === 'connected';
              const emailChanged = gmailEmailDraft.trim() !== (gmailSettings.gmailEmail || '');
              const aiDeploymentEnabled = !!gmailSettings.aiDeploymentEnabled;
              const aiModel = gmailSettings.aiModel || process.env.NEXT_PUBLIC_SCANNER_AI_MODEL || 'gpt-4o-mini';

              return (
                <>
            <div className="mt-2 grid gap-2 text-sm text-slate-700">
              <p>
                <span className="text-slate-500">Enabled:</span> {gmailSettings.gmailEnabled ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="text-slate-500">Status:</span> {gmailSettings.gmailStatus || 'unknown'}
              </p>
              <p>
                <span className="text-slate-500">Email:</span> {gmailSettings.gmailEmail || 'not set'}
              </p>
              <p>
                <span className="text-slate-500">Refresh token:</span> {gmailSettings.hasRefreshToken ? 'Present' : 'Missing'}
              </p>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={gmailEmailDraft}
                onChange={(e) => setGmailEmailDraft(e.target.value)}
                placeholder="name@gmail.com"
                className="rounded border px-3 py-2 text-sm"
                disabled={settingsSaving || loading}
              />
              <button
                onClick={onSaveGmailEmail}
                disabled={settingsSaving || loading || !emailChanged}
                className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              >
                Save email
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={isConnected}
                  onChange={onToggleConnectionSwitch}
                  disabled={settingsSaving || loading}
                />
                <span>{settingsSaving ? 'Saving…' : 'Gmail account connected'}</span>
              </label>

              <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={gmailSettings.gmailEnabled}
                  onChange={onToggleGmailEnabled}
                  disabled={settingsSaving || loading}
                />
                <span>
                  Gmail scan {settingsSaving ? 'Saving…' : gmailSettings.gmailEnabled ? 'On' : 'Off'}
                </span>
              </label>

              <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm opacity-80">
                <input
                  type="checkbox"
                  checked={!!gmailSettings.gmailAiEnabled}
                  onChange={async () => {
                    try {
                      setSettingsSaving(true);
                      setError(null);
                      const result = await updateGmailSettings({
                        gmailAiEnabled: !gmailSettings.gmailAiEnabled,
                      });
                      setGmailSettings(result.settings);
                    } catch (err) {
                      setError(toErrorMessage(err, 'Failed to update AI classification setting.'));
                    } finally {
                      setSettingsSaving(false);
                    }
                  }}
                  disabled={settingsSaving || loading || !aiDeploymentEnabled}
                />
                <span>
                  AI classification {gmailSettings.gmailAiEnabled ? 'On' : 'Off'}
                  {aiDeploymentEnabled ? '' : ' (disabled by deployment)'}
                  {` • model ${aiModel}`}
                </span>
              </label>

            </div>
                </>
              );
            })()}
          </>
        )}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">Schedules</h2>
        <p className="mt-1 text-sm text-slate-600">Simple schedule presets with exact time.</p>

        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading schedules…</p>
        ) : sortedSchedules.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No schedules yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Timezone</th>
                  <th className="py-2 pr-4">Lookback</th>
                  <th className="py-2 pr-4">Enabled</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSchedules.map((row) => {
                  const draftView = scheduleToDraft(row);
                  const whenLabel =
                    draftView.preset === 'daily'
                      ? `Daily at ${formatTimeLabel(draftView.hour, draftView.minute)}`
                      : draftView.preset === 'weekdays'
                        ? `Weekdays at ${formatTimeLabel(draftView.hour, draftView.minute)}`
                        : `${weekdayLabel(draftView.weekday)} at ${formatTimeLabel(draftView.hour, draftView.minute)}`;

                  return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.name}</td>
                      <td className="py-2 pr-4">{whenLabel}</td>
                      <td className="py-2 pr-4">{row.timezone}</td>
                      <td className="py-2 pr-4">{draftView.lookbackHours ? `${draftView.lookbackHours}h` : 'Default'}</td>
                      <td className="py-2 pr-4">{row.isActive ? 'Yes' : 'No'}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => onEditSchedule(row)}
                            className="rounded border px-2 py-1"
                            disabled={submitting}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onToggleSchedule(row)}
                            className="rounded border px-2 py-1"
                            disabled={submitting}
                          >
                            {row.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => onDeleteSchedule(row.id)}
                            className="rounded border px-2 py-1 text-red-700"
                            disabled={submitting}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">{editingId ? 'Edit schedule' : 'Create schedule'}</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded border px-3 py-2"
              placeholder="Morning scan"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Timezone</span>
            <input
              value={draft.timezone}
              onChange={(e) => setDraft((s) => ({ ...s, timezone: e.target.value }))}
              className="w-full rounded border px-3 py-2"
              placeholder="America/Toronto"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Preset</span>
            <select
              value={draft.preset}
              onChange={(e) => setDraft((s) => ({ ...s, preset: e.target.value as ScheduleDraft['preset'] }))}
              className="w-full rounded border px-3 py-2"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          {draft.preset === 'weekly' && (
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Day of week</span>
              <select
                value={draft.weekday}
                onChange={(e) => setDraft((s) => ({ ...s, weekday: Number(e.target.value) }))}
                className="w-full rounded border px-3 py-2"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </label>
          )}

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Hour (0-23)</span>
            <input
              type="number"
              min={0}
              max={23}
              value={draft.hour}
              onChange={(e) => setDraft((s) => ({ ...s, hour: Number(e.target.value) }))}
              className="w-full rounded border px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Minute (0-59)</span>
            <input
              type="number"
              min={0}
              max={59}
              value={draft.minute}
              onChange={(e) => setDraft((s) => ({ ...s, minute: Number(e.target.value) }))}
              className="w-full rounded border px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Auto-apply threshold (0-1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={draft.autoApplyThreshold ?? ''}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  autoApplyThreshold: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              className="w-full rounded border px-3 py-2"
              placeholder="Leave empty to disable auto-apply"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-slate-600">Lookback hours (optional)</span>
            <input
              type="number"
              min={1}
              max={720}
              value={draft.lookbackHours ?? ''}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  lookbackHours: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              className="w-full rounded border px-3 py-2"
              placeholder="24"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Example: set 24 to only include messages from the last 24 hours during fallback scans.
            </span>
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-slate-600">Gmail filter (optional)</span>
            <input
              value={draft.gmailQueryFilter}
              onChange={(e) => setDraft((s) => ({ ...s, gmailQueryFilter: e.target.value }))}
              className="w-full rounded border px-3 py-2"
              placeholder="from:lever.co OR from:greenhouse.io"
            />
          </label>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((s) => ({ ...s, isActive: e.target.checked }))}
            />
            <span>Enabled</span>
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onSaveSchedule}
            disabled={submitting}
            className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60"
          >
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create schedule'}
          </button>
          {editingId && (
            <button onClick={resetDraft} className="rounded border px-3 py-2" disabled={submitting}>
              Cancel
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          TODO: Advanced cron mode can be added once product UX is finalized.
        </p>
      </section>
    </div>
  );
}

export default function GmailSettingsPage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
      <GmailSettingsInner />
    </Suspense>
  );
}
