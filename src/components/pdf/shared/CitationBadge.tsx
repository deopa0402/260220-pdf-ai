"use client";

interface CitationBadgeProps {
  index: number;
  onClick?: () => void;
}

export function CitationBadge({ index, onClick }: CitationBadgeProps) {
  return (
    <sup className="inline-flex items-center align-super ml-0.5">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium text-red-700 bg-red-100 rounded-full border border-red-200 hover:bg-red-200 cursor-pointer transition-colors"
      >
        {index}
      </button>
    </sup>
  );
}
