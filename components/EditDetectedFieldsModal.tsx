'use client';

import { useEffect, useState } from 'react';
import type { ApplicationStatus, ApplicationStatusEventReviewDto } from '@/lib/contracts/gmail-api.contracts';
import type { JobTitleOption } from '@/lib/gmail-feature.api';

const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'No response', 'Rejected', 'Closed'
];

interface EditDetectedFieldsModalProps {
  item: ApplicationStatusEventReviewDto;
  roleOptions: JobTitleOption[];
  onSave: (data: any) => void;
  onClose: () => void;
  isSaving: boolean;
}

export default function EditDetectedFieldsModal({
  item,
  roleOptions,
  onSave,
  onClose,
  isSaving,
}: EditDetectedFieldsModalProps) {
  const [status, setStatus] = useState(item.detectedStatus || '');
  const [company, setCompany] = useState(item.aiCompany || '');
  const [role, setRole] = useState(item.aiRole || '');
  const [location, setLocation] = useState(item.aiLocation || '');
  const [jobUrl, setJobUrl] = useState(item.aiJobUrl || '');
  const [eventTime, setEventTime] = useState(item.aiEventTime || '');

  useEffect(() => {
    console.debug('[Review] Edit modal hydrated', {
      id: item.id,
      detectedStatus: item.detectedStatus || null,
      aiCompany: item.aiCompany || null,
      aiRole: item.aiRole || null,
      aiLocation: item.aiLocation || null,
    });
    setStatus(item.detectedStatus || '');
    setCompany(item.aiCompany || '');
    setRole(item.aiRole || '');
    setLocation(item.aiLocation || '');
    setJobUrl(item.aiJobUrl || '');
    setEventTime(item.aiEventTime || '');
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.debug('[Review] Edit modal submit', { id: item.id });
    onSave({
      detectedStatus: status || undefined,
      aiCompany: company || undefined,
      aiRole: role || undefined,
      aiLocation: location || undefined,
      aiJobUrl: jobUrl || undefined,
      aiEventTime: eventTime || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Edit Detected Information</h2>
          <p className="text-sm text-slate-600">Review and correct the extracted information from this email.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Application Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select status</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Company name"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Role
            </label>
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
              list="review-edit-role-options"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Job title/role"
            />
            <datalist id="review-edit-role-options">
              {roleOptions.map((option) => (
                <option key={option.id} value={option.title} />
              ))}
            </datalist>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Location
            </label>
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
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Job URL
            </label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>

          {/* Event Time */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Event Time (e.g., "2 days ago", "March 19")
            </label>
            <input
              type="text"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="When did this event occur"
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
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
