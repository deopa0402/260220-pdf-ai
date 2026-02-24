import { AlertTriangle } from "lucide-react";
import { MarkdownRenderer } from "../shared/MarkdownRenderer";

interface Props {
  issues?: string;
  onCitationClick?: (page: number) => void;
}

export function CheckPoints({ issues, onCitationClick }: Props) {
  if (!issues) return null;

  return (
    <div className="mb-6 animate-in fade-in duration-500 delay-300">
      <div className="text-[12px] font-bold text-rose-600 mb-2.5 flex items-center tracking-tight">
        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> 확인 필요 사항
      </div>
      <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl space-y-2.5">
        <div className="text-[13px] text-rose-800 leading-snug font-medium">
          <MarkdownRenderer content={issues} onCitationClick={onCitationClick} />
        </div>
      </div>
    </div>
  );
}
