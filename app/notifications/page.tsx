'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/useUser';
import type { NotificationDto } from '@/lib/contracts/gmail-api.contracts';
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
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<NotificationDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!uid) return;

    setLoading(true);
    setError(null);
    setSelectedIds(new Set());

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

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.map((row) => row.id)));
  };

  const markSelectedRead = async () => {
    if (selectedIds.size === 0) return;

    setBulkSaving(true);
    setError(null);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => markNotificationRead(id)));
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to mark selected notifications as read.'));
    } finally {
      setBulkSaving(false);
    }
  };

  if (userLoading) return <p className="text-slate-600">Loading…</p>;
  if (!uid) return <p className="text-slate-600">Sign in to view notifications.</p>;

  const unreadCount = rows.filter((row) => !row.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <div className="flex items-center gap-3">
          {rows.length > 0 && (
            <span className="text-sm text-slate-600">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${rows.length} total`}
            </span>
          )}
          <span className="text-sm text-slate-600">Unread: {unreadCount}</span>
        </div>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-slate-600">Loading notifications…</p>
      ) : rows.length === 0 ? (
        <p className="rounded border bg-white p-4 text-slate-600">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded border bg-white px-4 py-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={rows.length > 0 && selectedIds.size === rows.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300"
                disabled={bulkSaving}
              />
              <span>{selectedIds.size === rows.length ? 'Deselect all' : 'Select all'}</span>
            </label>

            <button
              onClick={markSelectedRead}
              disabled={selectedIds.size === 0 || bulkSaving}
              className="rounded border px-3 py-1 text-sm disabled:opacity-60"
            >
              {bulkSaving ? 'Saving…' : `Mark selected as read${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
            </button>
          </div>

          {rows.map((row) => {
            const isRead = !!row.readAt;

            return (
              <div key={row.id} className="rounded border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      disabled={bulkSaving || savingId === row.id}
                    />
                    <div>
                    <p className="font-medium text-slate-900">{row.title}</p>
                    {row.body && <p className="mt-1 text-sm text-slate-700">{row.body}</p>}
                    <p className="mt-2 text-xs text-slate-500">
                      {row.channel} • {row.type} • {new Date(row.createdAt).toLocaleString()}
                    </p>
                    </div>
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
