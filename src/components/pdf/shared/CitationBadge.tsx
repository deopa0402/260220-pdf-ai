"use client";

interface CitationBadgeProps {
  page: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function CitationBadge({ page, onClick, onMouseEnter, onMouseLeave }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded cursor-pointer transition-colors ml-1 border bg-sky-100 text-sky-800 border-sky-200 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-200 shadow-sm"
    >
      [{page}p]
    </button>
  );
}
