import { Send } from "lucide-react";
import { useState } from "react";

interface Props {
  onSend: (msg: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };
  return (
    <div className="p-3 bg-white border-t border-gray-200 mt-auto sticky bottom-0 z-20">
      <div className="flex relative rounded-xl bg-gray-50/50 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all group">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          disabled={disabled}
          placeholder="문서 내용에 대해 질문하세요..."
          className="w-full flex-1 bg-transparent border-transparent rounded-xl pl-4 pr-12 py-3 text-[13.5px] outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="absolute right-1 top-1 bottom-1 p-2 bg-gray-100/50 text-gray-400 focus-within:text-white focus-within:bg-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center peer group-focus-within:bg-blue-600 group-focus-within:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    </div>
  );
}
