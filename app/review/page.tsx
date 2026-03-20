'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/useUser';
import type { ApplicationStatusEventReviewDto, ApplicationStatus } from '@/lib/contracts/gmail-api.contracts';
import {
  ApiErrorLike,
  listReviewQueue,
  listJobTitles,
  discardReviewItem,
  editReviewItem,
  matchReviewItemToApplication,
  createApplicationFromReviewItem,
  bulkDiscardReviewItems,
  bulkMarkReviewItemsPending,
  type JobTitleOption,
} from '@/lib/gmail-feature.api';
import ReviewItemRow from '@/components/ReviewItemRow';
import ReviewActionsBar from '@/components/ReviewActionsBar';
import EditDetectedFieldsModal from '@/components/EditDetectedFieldsModal';
import ApplicationSearchModal from '@/components/ApplicationSearchModal';
import CreateApplicationModal from '@/components/CreateApplicationModal';

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
  const [roleOptions, setRoleOptions] = useState<JobTitleOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modal states
  const [editingItem, setEditingItem] = useState<ApplicationStatusEventReviewDto | null>(null);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const load = async () => {
    if (!uid) return;

    setLoading(true);
    setError(null);
    setSelectedIds(new Set());

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

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    (async () => {
      try {
        const titles = await listJobTitles();
        if (!cancelled) {
          setRoleOptions(titles);
        }
      } catch (err) {
        console.error('[Review] Failed to load job titles', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDiscard = async (id: string) => {
    setSavingId(id);
    setError(null);
    try {
      await discardReviewItem(id, { reason: 'irrelevant' });
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to discard item.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleBulkDiscard = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = confirm(`Discard ${selectedIds.size} item(s)? They will be marked as irrelevant.`);
    if (!confirmed) return;

    setError(null);
    try {
      await bulkDiscardReviewItems({
        ids: Array.from(selectedIds),
        reason: 'irrelevant',
      });
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to bulk discard items.'));
    }
  };

  const handleBulkPending = async () => {
    if (selectedIds.size === 0) return;
    setError(null);
    try {
      await bulkMarkReviewItemsPending({
        ids: Array.from(selectedIds),
      });
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to mark items as pending.'));
    }
  };

  const handleEditSave = async (id: string, data: any) => {
    console.debug('[Review] Saving edit for review item', { id, data });
    setSavingId(id);
    setError(null);
    try {
      await editReviewItem(id, data);
      setEditingItem(null);
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to save changes.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleMatchSave = async (id: string, applicationId: string, applyStatus?: ApplicationStatus) => {
    setSavingId(id);
    setError(null);
    try {
      await matchReviewItemToApplication(id, { applicationId, applyStatus });
      setMatchingId(null);
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to match application.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateSave = async (id: string, data: any) => {
    setSavingId(id);
    setError(null);
    try {
      await createApplicationFromReviewItem(id, data);
      setCreatingId(null);
      await load();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create application.'));
    } finally {
      setSavingId(null);
    }
  };

  if (userLoading) return <p className="text-slate-600">Loading…</p>;
  if (!uid) return <p className="text-slate-600">Sign in to view review queue.</p>;

  const currentMatchingItem = matchingId ? rows.find(r => r.id === matchingId) : null;
  const currentCreatingItem = creatingId ? rows.find(r => r.id === creatingId) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Email Review Queue</h1>
          <p className="text-sm text-slate-600">Review AI-detected emails and take action.</p>
        </div>
        {rows.length > 0 && (
          <div className="text-sm text-slate-600">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${rows.length} item${rows.length !== 1 ? 's' : ''}`}
          </div>
        )}
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-slate-600">Loading review items…</p>
      ) : rows.length === 0 ? (
        <p className="rounded border bg-white p-4 text-slate-600">No items need review.</p>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <ReviewActionsBar
              selectedCount={selectedIds.size}
              onBulkDiscard={handleBulkDiscard}
              onBulkPending={handleBulkPending}
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selectedIds.size === rows.length && rows.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>{selectedIds.size === rows.length && rows.length > 0 ? 'Deselect all' : 'Select all'}</span>
            </div>

            {rows.map((row) => (
              <ReviewItemRow
                key={row.id}
                item={row}
                isSelected={selectedIds.has(row.id)}
                onToggleSelect={() => toggleSelect(row.id)}
                onDiscard={() => handleDiscard(row.id)}
                onEdit={() => {
                  console.debug('[Review] Edit clicked', {
                    id: row.id,
                    subject: row.subject || null,
                    aiCompany: row.aiCompany || null,
                    aiRole: row.aiRole || null,
                  });
                  setEditingItem(row);
                }}
                onMatch={() => setMatchingId(row.id)}
                onCreateApp={() => setCreatingId(row.id)}
                isSaving={savingId === row.id}
              />
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditDetectedFieldsModal
          key={editingItem.id}
          item={editingItem}
          roleOptions={roleOptions}
          onSave={(data: {
            detectedStatus?: ApplicationStatus;
            aiCompany?: string;
            aiRole?: string;
            aiLocation?: string;
            aiJobUrl?: string;
            aiEventTime?: string;
          }) => handleEditSave(editingItem.id, data)}
          onClose={() => setEditingItem(null)}
          isSaving={savingId === editingItem.id}
        />
      )}

      {/* Match Modal */}
      {currentMatchingItem && (
        <ApplicationSearchModal
          onSelectApplication={(appId: string, applyStatus?: ApplicationStatus) => handleMatchSave(currentMatchingItem.id, appId, applyStatus)}
          onCreateNew={() => {
            setMatchingId(null);
            setCreatingId(currentMatchingItem.id);
          }}
          onClose={() => setMatchingId(null)}
          isSaving={savingId === currentMatchingItem.id}
          detectedCompany={currentMatchingItem.aiCompany}
          detectedRole={currentMatchingItem.aiRole}
        />
      )}

      {/* Create Application Modal */}
      {currentCreatingItem && (
        <CreateApplicationModal
          item={currentCreatingItem}
          roleOptions={roleOptions}
          onSave={(data: {
            company: string;
            role?: string;
            location?: string;
            jobUrl?: string;
            status?: ApplicationStatus;
            notes?: string;
          }) => handleCreateSave(currentCreatingItem.id, data)}
          onClose={() => setCreatingId(null)}
          isSaving={savingId === currentCreatingItem.id}
        />
      )}
    </div>
  );
}

