import { Hash } from "lucide-react";

interface Props {
  keywords?: string[];
}

export function Keywords({ keywords }: Props) {
  if (!keywords || keywords.length === 0) return null;
  
  return (
    <div className="mb-5 animate-in fade-in duration-500 delay-75">
      <div className="text-[12px] font-bold text-gray-500 mb-2 uppercase tracking-tight flex items-center">
        <Hash className="w-3.5 h-3.5 mr-1" /> 키워드 리스트
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: order of keywords is static
          <span key={`${kw}-${i}`} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[12.5px] font-medium border border-gray-200/50 hover:bg-gray-200 transition-colors cursor-default whitespace-nowrap">
            #{kw}
          </span>
        ))}
      </div>
    </div>
  );
}
