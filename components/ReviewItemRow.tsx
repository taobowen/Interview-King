import type { ApplicationStatusEventReviewDto } from '@/lib/contracts/gmail-api.contracts';

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
  const displayConfidence = typeof item.aiConfidence === 'number'
    ? item.aiConfidence
    : typeof item.confidenceScore === 'number'
      ? item.confidenceScore
      : null;
  const confidencePercentage = typeof displayConfidence === 'number' ? (displayConfidence * 100).toFixed(1) : null;
  const hasExtractedData = item.aiCompany || item.aiRole || item.aiLocation;
  const statusLabel = item.detectedStatus || (item.reviewStatus === 'needs_review' ? 'Needs review' : 'Unknown');
  const showAiReason = Boolean(item.aiReason && item.aiReason !== 'scanner_ai_match' && item.aiReason !== 'scanner_no_match');

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
                  {item.aiCompany && <span>Company: <strong>{item.aiCompany}</strong></span>}
                  {item.aiRole && <span>Role: <strong>{item.aiRole}</strong></span>}
                  {item.aiLocation && <span>Location: <strong>{item.aiLocation}</strong></span>}
                </div>
              </div>
            )}

            {item.rawSnippet && (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">
                <span className="font-medium">Evidence:</span> {item.rawSnippet}
              </p>
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
