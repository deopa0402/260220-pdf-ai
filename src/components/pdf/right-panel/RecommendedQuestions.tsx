import { Sparkles } from "lucide-react";

interface Props {
  insights?: string;
  onSelectQuestion: (q: string) => void;
}

export function RecommendedQuestions({ insights, onSelectQuestion }: Props) {
  const defaultQuestions = [
    "비용 최적화 구조에 대해 더 설명해줘",
    "보안 모델의 한계점은 뭐야?",
    "최종 결론만 3줄 다이제스트해줘"
  ];

  const questions = insights 
    ? insights.split('\n').map(q => q.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
    : defaultQuestions;

  return (
    <div className="mb-2 mt-2">
      <div className="flex items-center text-[10.5px] font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wide">
        <Sparkles className="w-3 h-3 mr-1" /> 추천 질문
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q) => (
          <button 
            key={`rec-${q}`}
            type="button"
            onClick={() => onSelectQuestion(q)}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 text-gray-500 text-[12px] font-medium border border-gray-200 rounded-full transition-all text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
