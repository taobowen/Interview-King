'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/useUser';
import type { NotificationDto } from '@/lambda/contracts/gmail-api.contracts';
import {
  ApiErrorLike,
  listNotifications,
  markNotificationRead,
} from '@/lib/gmail-feature.api';

function toErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as ApiErrorLike).message || fallback);
  }
  return fallback;
}

export default function NotificationsPage() {
  const { uid, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<NotificationDto[]>([]);

  const load = async () => {
    if (!uid) return;

    setLoading(true);
    setError(null);

    try {
      const data = await listNotifications(true);
      setRows(data.notifications || []);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load notifications.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [uid]);

  const markRead = async (id: string) => {
    setSavingId(id);
    setError(null);
    try {
      await markNotificationRead(id);
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to mark notification as read.'));
    } finally {
      setSavingId(null);
    }
  };

  if (userLoading) return <p className="text-slate-600">Loading…</p>;
  if (!uid) return <p className="text-slate-600">Sign in to view notifications.</p>;

  const unreadCount = rows.filter((row) => !row.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <span className="text-sm text-slate-600">Unread: {unreadCount}</span>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-slate-600">Loading notifications…</p>
      ) : rows.length === 0 ? (
        <p className="rounded border bg-white p-4 text-slate-600">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isRead = !!row.readAt;

            return (
              <div key={row.id} className="rounded border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{row.title}</p>
                    {row.body && <p className="mt-1 text-sm text-slate-700">{row.body}</p>}
                    <p className="mt-2 text-xs text-slate-500">
                      {row.channel} • {row.type} • {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isRead ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isRead ? 'Read' : 'Unread'}
                    </span>
                    {!isRead && (
                      <button
                        onClick={() => markRead(row.id)}
                        disabled={savingId === row.id}
                        className="rounded border px-2 py-1 text-sm disabled:opacity-60"
                      >
                        {savingId === row.id ? 'Saving…' : 'Mark as read'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
