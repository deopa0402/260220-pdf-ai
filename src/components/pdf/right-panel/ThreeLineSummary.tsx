import { FileText } from "lucide-react";
import type { SummaryVariant } from "../../MainApp";

interface Props {
  summary?: SummaryVariant;
}

export function ThreeLineSummary({ summary }: Props) {
  if (!summary) return null;

  return (
    <div className="mb-5 animate-in fade-in duration-500 delay-150">
      <div className="text-[12px] font-bold text-gray-800 mb-2.5 flex items-center tracking-tight">
        <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> {summary.title}
      </div>
      <div className="bg-blue-50/40 border border-blue-100/60 rounded-xl p-4">
        <div className="text-[13.5px] text-gray-700 leading-snug whitespace-pre-wrap">
          {summary.content}
        </div>
      </div>
    </div>
  );
}
