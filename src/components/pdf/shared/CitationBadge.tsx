"use client";

interface CitationBadgeProps {
  index: number;
}

export function CitationBadge({ index }: CitationBadgeProps) {
  return (
    <sup className="inline-flex items-center align-super ml-0.5">
      <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium text-blue-700 bg-blue-100 rounded-full border border-blue-200 hover:bg-blue-200 cursor-pointer transition-colors">
        {index}
      </span>
    </sup>
  );
}
