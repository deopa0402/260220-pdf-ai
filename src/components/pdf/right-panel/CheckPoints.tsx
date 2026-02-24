"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { ReferenceLine } from "../../MainApp";
import { MarkdownRenderer } from "../shared/MarkdownRenderer";
import { CitationBadge } from "../shared/CitationBadge";

interface Props {
  issues?: string | ReferenceLine[];
  onCitationClick?: (page: number) => void;
}

export function CheckPoints({ issues, onCitationClick }: Props) {
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  if (!issues) return null;
  const issueLines: ReferenceLine[] = Array.isArray(issues) ? issues : [];

  return (
    <div className="mb-6 animate-in fade-in duration-500 delay-300">
      <div className="text-[12px] font-bold text-rose-600 mb-2.5 flex items-center tracking-tight">
        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> 확인 필요 사항
      </div>
      <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl space-y-2.5">
        <div className="text-[13px] text-rose-800 leading-snug font-medium">
          {issueLines.length > 0 ? (
            <div className="space-y-2.5">
              {issueLines.map((line, idx) => (
                <div
                  key={`issue-line-${idx}-${line.text}`}
                  className={`rounded-md px-2 py-1 transition-all duration-150 ${
                    hoveredLineIndex === idx
                      ? "bg-amber-50/70 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35),0_2px_10px_rgba(0,0,0,0.08)]"
                      : ""
                  }`}
                >
                  <span>{line.text}</span>
                  {line.pages.map((page, pageIdx) => (
                    <span key={`issue-line-${idx}-${line.text}-page-${page}-${pageIdx}`}>
                      <CitationBadge
                        page={page}
                        onClick={onCitationClick ? () => onCitationClick(page) : undefined}
                        onMouseEnter={() => setHoveredLineIndex(idx)}
                        onMouseLeave={() => setHoveredLineIndex(null)}
                      />
                      {pageIdx < line.pages.length - 1 && <span className="text-rose-300">,</span>}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <MarkdownRenderer content={typeof issues === "string" ? issues : ""} onCitationClick={onCitationClick} />
          )}
        </div>
      </div>
    </div>
  );
}
