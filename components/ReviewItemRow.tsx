import { useMemo, useState } from 'react';
import type { ApplicationStatusEventReviewDto } from '@/lib/contracts/gmail-api.contracts';

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
  'mailto:',
  'tel:',
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

function filterUsefulLinks(links: string[]): string[] {
  const deduped = Array.from(new Set(links.filter((link) => typeof link === 'string' && link.startsWith('http'))));
  const highValue = deduped.filter((link) => isHighValueLink(link) && !isLowValueLink(link));
  const fallback = deduped.filter((link) => !isLowValueLink(link));
  const selected = highValue.length > 0 ? highValue : fallback;
  return selected.slice(0, 3);
}

interface ReviewItemRowProps {
  item: ApplicationStatusEventReviewDto;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDiscard: () => void;
  onEdit: () => void;
  onMatch: () => void;
  onCreateApp: () => void;
  isSaving: boolean;
}

export default function ReviewItemRow({
  item,
  isSelected,
  onToggleSelect,
  onDiscard,
  onEdit,
  onMatch,
  onCreateApp,
  isSaving,
}: ReviewItemRowProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const displayConfidence = typeof item.aiConfidence === 'number'
    ? item.aiConfidence
    : typeof item.confidenceScore === 'number'
      ? item.confidenceScore
      : null;
  const confidencePercentage = typeof displayConfidence === 'number' ? (displayConfidence * 100).toFixed(1) : null;
  const hasExtractedData = item.aiCategory || item.aiCompany || item.aiRole || item.aiLocation;
  const statusLabel = item.detectedStatus || (item.reviewStatus === 'needs_review' ? 'Needs review' : 'Unknown');
  const showAiReason = Boolean(item.aiReason && item.aiReason !== 'scanner_ai_match' && item.aiReason !== 'scanner_no_match');
  const rawPreviewText = item.bodyPreview || item.rawSnippet || '';
  const previewText = useMemo(() => sanitizePreviewText(rawPreviewText), [rawPreviewText]);
  const shouldCollapsePreview = previewText.length > 260 || previewText.split(/\r?\n/).length > 4;
  const usefulLinks = useMemo(() => {
    return Array.isArray(item.usefulLinks) ? filterUsefulLinks(item.usefulLinks) : [];
  }, [item.usefulLinks]);
  const rawDetailsText = item.gmailSnippet || item.rawSnippet || '';

  return (
    <div className="rounded border bg-white p-4">
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />

        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            <div>
              <p className="font-medium text-slate-900 break-words">{item.subject || 'No subject'}</p>
              <p className="text-sm text-slate-600">
                From: <span className="font-medium">{item.senderEmail || 'Unknown sender'}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-slate-600">Status:</span>
                <span className="ml-1 font-medium text-slate-900">
                  {statusLabel}
                </span>
              </div>
              {confidencePercentage && (
                <div>
                  <span className="text-slate-600">Confidence:</span>
                  <span className="ml-1 font-medium text-slate-900">{confidencePercentage}%</span>
                </div>
              )}
              {item.applicationId && (
                <div>
                  <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    Matched
                  </span>
                </div>
              )}
            </div>

            {hasExtractedData && (
              <div className="rounded bg-slate-50 p-2 text-sm text-slate-700">
                <p className="text-xs font-medium text-slate-600 mb-1">Extracted data:</p>
                <div className="flex flex-wrap gap-3">
                  {item.aiCategory && <span>Category: <strong>{item.aiCategory}</strong></span>}
                  {item.aiCompany && <span>Company: <strong>{item.aiCompany}</strong></span>}
                  {item.aiRole && <span>Role: <strong>{item.aiRole}</strong></span>}
                  {item.aiLocation && <span>Location: <strong>{item.aiLocation}</strong></span>}
                </div>
              </div>
            )}

            {previewText && (
              <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
                <p className="font-medium">Body preview</p>
                <p
                  className="mt-1 whitespace-pre-wrap break-words"
                  style={
                    shouldCollapsePreview && !isPreviewExpanded
                      ? {
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 4,
                          overflow: 'hidden',
                        }
                      : undefined
                  }
                >
                  {previewText}
                </p>
                {shouldCollapsePreview && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewExpanded((value) => !value)}
                    className="mt-2 text-xs font-medium text-blue-700 hover:underline"
                  >
                    {isPreviewExpanded ? 'Collapse preview' : 'Expand preview'}
                  </button>
                )}
              </div>
            )}

            {usefulLinks.length > 0 && (
              <div className="rounded bg-slate-50 p-2 text-xs text-slate-700">
                <p className="mb-1 font-medium text-slate-600">Useful links:</p>
                <ul className="space-y-1">
                  {usefulLinks.map((url, index) => {
                    const highValue = isHighValueLink(url);
                    const label = toShortLinkLabel(url, highValue, index);
                    return (
                      <li key={`${url}-${index}`}>
                      <a href={url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                        {label}
                      </a>
                    </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {rawDetailsText && rawDetailsText !== rawPreviewText && (
              <details className="rounded bg-amber-50 p-2 text-xs text-amber-900">
                <summary className="cursor-pointer font-medium">Show raw snippet</summary>
                <p className="mt-2 whitespace-pre-wrap break-words">{rawDetailsText}</p>
              </details>
            )}

            {showAiReason && (
              <p className="rounded bg-slate-50 p-2 text-xs text-slate-700">
                <span className="font-medium">AI note:</span> {item.aiReason}
              </p>
            )}

            <p className="text-xs text-slate-500">
              Received: {new Date(item.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            disabled={isSaving}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 hover:bg-blue-700"
            title="Edit detected fields"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onMatch}
            disabled={isSaving}
            className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 hover:bg-purple-700"
            title="Match to existing application"
          >
            Match
          </button>
          <button
            type="button"
            onClick={onCreateApp}
            disabled={isSaving}
            className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 hover:bg-indigo-700"
            title="Create new application"
          >
            Create
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-60 hover:bg-red-50"
            title="Discard as irrelevant"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
