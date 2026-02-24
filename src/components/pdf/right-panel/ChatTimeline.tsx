import { Bot, Sparkles } from "lucide-react";
import { MarkdownRenderer } from "../shared/MarkdownRenderer";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface Props {
  messages: Message[];
  isTyping: boolean;
  onCitationClick?: (page: number) => void;
}


export function ChatTimeline({ messages, isTyping, onCitationClick }: Props) {

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-400 space-y-2">
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
          <Sparkles className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-[12.5px] font-medium text-center">문서 내용에 대해 궁금한 점을<br/>무엇이든 물어보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1 pb-4">
      {messages.map((msg, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: order of messages is static within this session
        <div key={`msg-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "ai" && (
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 shrink-0 border border-blue-200 mt-1">
              <Bot className="w-4 h-4 text-blue-700" />
            </div>
          )}
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-sm ${
            msg.role === "user" 
              ? "bg-blue-600 text-white rounded-tr-sm" 
              : "bg-white border text-gray-800 rounded-tl-sm"
          }`}>
            <MarkdownRenderer content={msg.content} onCitationClick={onCitationClick} />
          </div>
        </div>
      ))}
      {isTyping && messages[messages.length - 1]?.role !== "ai" && (
        <div className="flex justify-start">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 shrink-0 border border-blue-200 mt-1">
            <Bot className="w-4 h-4 text-blue-700" />
          </div>
          <div className="bg-white border text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center space-x-1.5 h-11">
             <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
             <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
             <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
    </div>
  );
}
