import { Bot, Copy, Sparkles } from "lucide-react";
import type { ImageChatMessage } from "./types";

interface ImageChatTimelineProps {
  messages: ImageChatMessage[];
  isTyping: boolean;
  onCopyImage: (imageDataUrl: string) => void;
}

export function ImageChatTimeline({ messages, isTyping, onCopyImage }: ImageChatTimelineProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400 space-y-2">
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
          <Sparkles className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-[12.5px] font-medium text-center">이미지 편집 요청이나 생성 프롬프트를 입력해보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1 pb-4">
      {messages.map((msg, index) => {
        const imageDataUrl = msg.imageDataUrl;
        return (
        <div key={`image-chat-${index}-${msg.role}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "ai" && (
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 shrink-0 border border-blue-200 mt-1">
              <Bot className="w-4 h-4 text-blue-700" />
            </div>
          )}
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-sm ${
              msg.role === "user"
                ? "bg-blue-600 text-white rounded-tr-sm"
                : "bg-white border text-gray-800 rounded-tl-sm"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {imageDataUrl && (
              <div className="relative mt-2">
                <img
                  src={imageDataUrl}
                  alt="chat attachment"
                  className="rounded-lg border border-gray-200/70 w-full max-w-[160px] sm:max-w-[200px] md:max-w-[240px] h-auto"
                />
                <button
                  type="button"
                  onClick={() => onCopyImage(imageDataUrl)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/45 text-white hover:bg-black/60 transition-colors"
                  title="이미지 복사"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )})}

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
