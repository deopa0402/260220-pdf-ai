"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { ReferenceLine, SummaryVariant } from "../../MainApp";
import { MarkdownRenderer } from "../shared/MarkdownRenderer";
import { CitationBadge } from "../shared/CitationBadge";

interface Props {
  summary?: SummaryVariant;
  onCitationClick?: (page: number) => void;
}

export function ThreeLineSummary({ summary, onCitationClick }: Props) {
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  if (!summary) return null;

  const lines: ReferenceLine[] = Array.isArray(summary.lines) ? summary.lines : [];

  return (
    <div className="mb-5 animate-in fade-in duration-500 delay-150">
      <div className="text-[12px] font-bold text-gray-800 mb-2.5 flex items-center tracking-tight">
        <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> {summary.title}
      </div>
      <div className="bg-blue-50/40 border border-blue-100/60 rounded-xl p-4">
        {lines.length > 0 ? (
          <div className="space-y-2">
            {lines.slice(0, 3).map((line, idx) => (
              <div
                key={`three-line-${idx}-${line.text}`}
                className={`text-[13.5px] text-gray-700 leading-snug rounded-md px-2 py-1 transition-all duration-150 ${
                  hoveredLineIndex === idx
                    ? "bg-amber-50/70 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35),0_2px_10px_rgba(0,0,0,0.08)]"
                    : ""
                }`}
              >
                <span className="font-semibold mr-1">{idx + 1}.</span>
                <span>{line.text}</span>
                {line.pages.map((page, pageIdx) => (
                  <span key={`three-line-${idx}-${line.text}-page-${page}-${pageIdx}`}>
                    <CitationBadge
                      page={page}
                      onClick={onCitationClick ? () => onCitationClick(page) : undefined}
                      onMouseEnter={() => setHoveredLineIndex(idx)}
                      onMouseLeave={() => setHoveredLineIndex(null)}
                    />
                    {pageIdx < line.pages.length - 1 && <span className="text-gray-400">,</span>}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[13.5px] text-gray-700 leading-snug">
            <MarkdownRenderer content={summary.content ?? ""} onCitationClick={onCitationClick} />
          </div>
        )}
      </div>
    </div>
  );
}
