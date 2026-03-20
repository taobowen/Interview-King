'use client';

import { useEffect, useState } from 'react';
import type { ApplicationStatus } from '@/lib/contracts/gmail-api.contracts';
import { apiClient } from '@/lib/api-client';

const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'No response', 'Rejected', 'Closed'
];

interface ApplicationSearchModalProps {
  onSelectApplication: (appId: string, applyStatus?: ApplicationStatus) => void;
  onCreateNew: () => void;
  onClose: () => void;
  isSaving: boolean;
  detectedCompany?: string;
  detectedRole?: string;
}

interface ApplicationRow {
  id: string;
  company: string;
  role?: string;
  title?: string;
  titleText?: string;
  status: ApplicationStatus;
  createdAt: string;
}

export default function ApplicationSearchModal({
  onSelectApplication,
  onCreateNew,
  onClose,
  isSaving,
  detectedCompany,
  detectedRole,
}: ApplicationSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState(detectedCompany || '');
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [applyStatus, setApplyStatus] = useState<ApplicationStatus | ''>('');

  useEffect(() => {
    const loadApplications = async () => {
      if (!searchQuery.trim()) {
        setApplications([]);
        return;
      }

      setLoading(true);
      try {
        const query = new URLSearchParams({
          company: searchQuery,
          limit: '20',
        });
        const response = await apiClient.get(`/api/applications/search?${query}`);
        if (response.ok) {
          const data = await response.json();
          const normalized = Array.isArray(data.applications)
            ? data.applications.map((app: ApplicationRow) => ({
                ...app,
                role: app.role || app.title || app.titleText,
              }))
            : [];
          setApplications(normalized);
        } else {
          setApplications([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(loadApplications, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelect = () => {
    if (!selectedAppId) return;
    onSelectApplication(selectedAppId, (applyStatus as ApplicationStatus) || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Match to Application</h2>
          <p className="text-sm text-slate-600">Search for an existing application to link this email to.</p>
        </div>

        <div className="space-y-4 px-6 py-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Search by company or role
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter company name, role, or search term..."
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {loading && <p className="text-sm text-slate-600 text-center py-4">Searching…</p>}
            {!loading && applications.length === 0 && searchQuery && (
              <p className="text-sm text-slate-600 text-center py-4">
                No applications found. Try a different search or{' '}
                <button onClick={onCreateNew} className="text-blue-600 hover:underline font-medium">
                  create a new one
                </button>
                .
              </p>
            )}
            {!loading && applications.length === 0 && !searchQuery && (
              <p className="text-sm text-slate-600 text-center py-4">Start typing to search applications</p>
            )}

            {applications.length > 0 && (
              <div className="space-y-1">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`p-3 rounded border cursor-pointer ${
                      selectedAppId === app.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="application"
                        checked={selectedAppId === app.id}
                        onChange={() => setSelectedAppId(app.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{app.company}</p>
                        {app.role && <p className="text-sm text-slate-600">{app.role}</p>}
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-slate-500">Status: {app.status}</span>
                          <span className="text-xs text-slate-500">
                            Applied: {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Apply Status (optional) */}
          {selectedAppId && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Status to apply (optional)
              </label>
              <select
                value={applyStatus}
                onChange={(e) => setApplyStatus(e.target.value as ApplicationStatus | '')}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Don't apply a status change</option>
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 flex gap-2 justify-end">
            <button
              onClick={onCreateNew}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Create New
            </button>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedAppId || isSaving}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? 'Matching…' : 'Select Application'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
