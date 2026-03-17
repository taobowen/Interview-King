'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/useUser';
import type { ApplicationStatus, ApplicationStatusEventReviewDto } from '@/lib/contracts/gmail-api.contracts';
import {
  ApiErrorLike,
  approveReviewItem,
  listReviewQueue,
  rejectReviewItem,
} from '@/lib/gmail-feature.api';

function toErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as ApiErrorLike).message || fallback);
  }
  return fallback;
}

export default function ReviewQueuePage() {
  const { uid, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApplicationStatusEventReviewDto[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    if (!uid) return;

    setLoading(true);
    setError(null);

    try {
      const data = await listReviewQueue();
      setRows(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load review queue.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [uid]);

  const approve = async (row: ApplicationStatusEventReviewDto) => {
    setSavingId(row.id);
    setError(null);
    try {
      await approveReviewItem(row.id, {
        applyStatus: row.detectedStatus as ApplicationStatus | undefined,
      });
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to approve update.'));
    } finally {
      setSavingId(null);
    }
  };

  const reject = async (row: ApplicationStatusEventReviewDto) => {
    setSavingId(row.id);
    setError(null);
    try {
      await rejectReviewItem(row.id, { reason: 'incorrect_status' });
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to reject update.'));
    } finally {
      setSavingId(null);
    }
  };

  if (userLoading) return <p className="text-slate-600">Loading…</p>;
  if (!uid) return <p className="text-slate-600">Sign in to view review queue.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Gmail Review Queue</h1>
      <p className="text-sm text-slate-600">Review Gmail-detected updates before they change application status.</p>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-slate-600">Loading review items…</p>
      ) : rows.length === 0 ? (
        <p className="rounded border bg-white p-4 text-slate-600">No items need review.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded border bg-white p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{row.subject || 'No subject'}</p>
                  <p className="text-sm text-slate-700">From: {row.senderEmail || 'Unknown sender'}</p>
                  <p className="text-sm text-slate-700">
                    Detected status: <span className="font-medium">{row.detectedStatus || 'Unknown'}</span>
                  </p>
                  {typeof row.confidenceScore === 'number' && (
                    <p className="text-sm text-slate-700">Confidence: {(row.confidenceScore * 100).toFixed(1)}%</p>
                  )}
                  {row.rawSnippet && (
                    <p className="rounded bg-slate-50 p-2 text-xs text-slate-600">Evidence: {row.rawSnippet}</p>
                  )}
                  <p className="text-xs text-slate-500">Received: {new Date(row.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => approve(row)}
                    disabled={savingId === row.id}
                    className="rounded bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {savingId === row.id ? 'Saving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => reject(row)}
                    disabled={savingId === row.id}
                    className="rounded border px-3 py-2 text-sm text-red-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
