interface ReviewActionsBarProps {
  selectedCount: number;
  onBulkDiscard: () => void;
  onBulkPending: () => void;
}

export default function ReviewActionsBar({
  selectedCount,
  onBulkDiscard,
  onBulkPending,
}: ReviewActionsBarProps) {
  return (
    <div className="rounded border border-blue-300 bg-blue-50 p-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-blue-900">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </p>
        <div className="flex gap-2">
          <button
            onClick={onBulkPending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Keep for Later
          </button>
          <button
            onClick={onBulkDiscard}
            className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Discard Selected
          </button>
        </div>
      </div>
    </div>
  );
}
