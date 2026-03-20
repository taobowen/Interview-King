'use client';

import { useEffect, useState } from 'react';
import type { ApplicationStatus, ApplicationStatusEventReviewDto } from '@/lib/contracts/gmail-api.contracts';
import type { JobTitleOption } from '@/lib/gmail-feature.api';

const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'No response', 'Rejected', 'Closed'
];

interface CreateApplicationModalProps {
  item: ApplicationStatusEventReviewDto;
  roleOptions: JobTitleOption[];
  onSave: (data: any) => void;
  onClose: () => void;
  isSaving: boolean;
}

export default function CreateApplicationModal({
  item,
  roleOptions,
  onSave,
  onClose,
  isSaving,
}: CreateApplicationModalProps) {
  const [company, setCompany] = useState(item.aiCompany || '');
  const [role, setRole] = useState(item.aiRole || '');
  const [location, setLocation] = useState(item.aiLocation || '');
  const [jobUrl, setJobUrl] = useState(item.aiJobUrl || '');
  const [status, setStatus] = useState((item.detectedStatus || 'Applied') as ApplicationStatus);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setCompany(item.aiCompany || '');
    setRole(item.aiRole || '');
    setLocation(item.aiLocation || '');
    setJobUrl(item.aiJobUrl || '');
    setStatus((item.detectedStatus || 'Applied') as ApplicationStatus);
    setNotes('');
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) {
      alert('Company name is required');
      return;
    }
    if (!role.trim()) {
      alert('Role is required');
      return;
    }
    onSave({
      company: company.trim(),
      role: role.trim(),
      location: location.trim() || undefined,
      jobUrl: jobUrl.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Create New Application</h2>
          <p className="text-sm text-slate-600">
            Create a new application from the information extracted from this email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {/* Company (required) */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Company <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Company name (required)"
              autoFocus
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Role</label>
            {roleOptions.length > 0 && (
              <select
                value={roleOptions.some((option) => option.title === role) ? role : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setRole(e.target.value);
                  }
                }}
                className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Choose from saved roles...</option>
                {roleOptions.map((option) => (
                  <option key={option.id} value={option.title}>
                    {option.title}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              list="review-create-role-options"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Job title or role"
            />
            <datalist id="review-create-role-options">
              {roleOptions.map((option) => (
                <option key={option.id} value={option.title} />
              ))}
            </datalist>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="City, country"
            />
          </div>

          {/* Job URL */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Job URL</label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Additional notes about this application"
              rows={3}
            />
          </div>

          <div className="border-t border-slate-200 pt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {isSaving ? 'Creating…' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
