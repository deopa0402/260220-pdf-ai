import { AlignLeft } from "lucide-react";
import type { SummaryVariant } from "../../MainApp";

interface Props {
  summary?: SummaryVariant;
}

export function DetailedSummary({ summary }: Props) {
  if (!summary) return null;

  return (
    <div className="mb-5 animate-in fade-in duration-500 delay-200">
      <div className="text-[12px] font-bold text-gray-800 mb-2.5 flex items-center tracking-tight">
        <AlignLeft className="w-3.5 h-3.5 mr-1.5 text-gray-500" /> {summary.title}
      </div>
      <div className="text-gray-600 text-[13.5px] leading-relaxed bg-gray-50/80 p-4 rounded-xl border border-gray-200/50 whitespace-pre-wrap">
        {summary.content}
      </div>
    </div>
  );
}
