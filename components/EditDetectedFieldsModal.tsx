'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ApplicationStatus, ApplicationStatusEventReviewDto } from '@/lib/contracts/gmail-api.contracts';
import type { JobTitleOption } from '@/lib/gmail-feature.api';

const URL_PATTERN = /https?:\/\/[^\s)\]}>,"']+/gi;
const LOW_VALUE_LINK_MARKERS = [
  'unsubscribe',
  'privacy',
  'help',
  'support',
  'tracking',
  'pixel',
  'optout',
  'preferences',
  'settings',
  'static',
  'cdn',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  'doubleclick',
  'facebook.com/tr',
  'linkedin.com/comm/',
  'utm_',
];
const HIGH_VALUE_LINK_MARKERS = [
  'job',
  'jobs',
  'career',
  'careers',
  'apply',
  'application',
  'greenhouse',
  'lever.co',
  'workday',
  'myworkdayjobs',
  'ashby',
  'smartrecruiters',
  'icims',
  'taleo',
  'jobvite',
  'recruitee',
  'linkedin.com/jobs',
  'indeed.com/viewjob',
];

function isLowValueLink(url: string): boolean {
  const normalized = url.toLowerCase();
  return LOW_VALUE_LINK_MARKERS.some((marker) => normalized.includes(marker));
}

function isHighValueLink(url: string): boolean {
  const normalized = url.toLowerCase();
  return HIGH_VALUE_LINK_MARKERS.some((marker) => normalized.includes(marker));
}

function sanitizePreviewText(text: string): string {
  return text.replace(URL_PATTERN, (rawUrl) => (isHighValueLink(rawUrl) ? '[Job Link]' : '[Link]'));
}

function filterUsefulLinks(links: string[]): string[] {
  const deduped = Array.from(new Set(links.filter((link) => typeof link === 'string' && link.startsWith('http'))));
  const highValue = deduped.filter((link) => isHighValueLink(link) && !isLowValueLink(link));
  const fallback = deduped.filter((link) => !isLowValueLink(link));
  const selected = highValue.length > 0 ? highValue : fallback;
  return selected.slice(0, 3);
}

function toShortLinkLabel(url: string, isHighValue: boolean, index: number): string {
  if (isHighValue) {
    return index === 0 ? 'Open job posting' : `Open related job link ${index + 1}`;
  }

  try {
    const parsed = new URL(url);
    const cleanPath = parsed.pathname
      .split('/')
      .filter(Boolean)
      .slice(0, 2)
      .join('/');
    return cleanPath ? `${parsed.hostname}/${cleanPath}` : parsed.hostname;
  } catch {
    return `Open link ${index + 1}`;
  }
}

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
  const usefulLinks = useMemo(() => {
    return Array.isArray(item.usefulLinks) ? filterUsefulLinks(item.usefulLinks) : [];
  }, [item.usefulLinks]);
  const previewText = useMemo(() => {
    return sanitizePreviewText(item.bodyPreview || item.rawSnippet || '');
  }, [item.bodyPreview, item.rawSnippet]);
  const rawDetailsText = item.gmailSnippet || item.rawSnippet || '';

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
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Edit Detected Information</h2>
            <p className="text-sm text-slate-600">Review and correct the extracted information from this email.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="ml-4 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close edit modal"
            title="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">{item.subject || 'No subject'}</p>
            <p className="text-slate-600">From: {item.senderEmail || 'Unknown sender'}</p>
            {previewText && (
              <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-slate-700">{previewText}</p>
            )}
            {usefulLinks.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-xs font-medium text-slate-600">Useful links</p>
                <div className="space-y-1">
                  {usefulLinks.map((url, index) => {
                    const label = toShortLinkLabel(url, isHighValueLink(url), index);
                    return (
                    <a
                      key={`${url}-${index}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-blue-700 hover:underline"
                    >
                      {label}
                    </a>
                    );
                  })}
                </div>
              </div>
            )}
            {rawDetailsText && (
              <details className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900">
                <summary className="cursor-pointer font-medium">Show raw snippet</summary>
                <p className="mt-2 whitespace-pre-wrap break-words">{rawDetailsText}</p>
              </details>
            )}
            <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 md:grid-cols-2">
              <p>AI category: <span className="font-medium text-slate-800">{item.aiCategory || 'n/a'}</span></p>
              <p>AI confidence: <span className="font-medium text-slate-800">{typeof item.aiConfidence === 'number' ? `${(item.aiConfidence * 100).toFixed(1)}%` : 'n/a'}</span></p>
              <p className="md:col-span-2">AI reason: <span className="font-medium text-slate-800">{item.aiReason || 'n/a'}</span></p>
            </div>
            </div>

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
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
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
