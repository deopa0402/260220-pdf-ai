import { AlertTriangle } from "lucide-react";

interface Props {
  issues?: string;
}

export function Issues({ issues }: Props) {
  if (!issues) return null;

  return (
    <div className="mb-5 animate-in fade-in duration-500 delay-75">
      <div className="text-[12px] font-bold text-gray-800 mb-2.5 flex items-center tracking-tight">
        <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-orange-500" /> 확인 필요 사항
      </div>
      <div className="bg-orange-50/40 border border-orange-100/60 rounded-xl p-4">
        <div className="text-[13.5px] text-gray-700 leading-snug whitespace-pre-wrap">
          {issues}
        </div>
      </div>
    </div>
  );
}
