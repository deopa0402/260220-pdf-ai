"use client";

interface CitationBadgeProps {
  page: number;
  onClick?: () => void;
}

export function CitationBadge({ page, onClick }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer transition-colors ml-1"
    >
      [{page}페이지]
    </button>
  );
}
