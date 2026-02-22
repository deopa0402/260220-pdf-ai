"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface ChatPanelProps {
  documentContext: string | null;
  initialContext?: string | null;
  onClearContext?: () => void;
}

export function ChatPanel({ documentContext, initialContext, onClearContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const appendUserMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setIsTyping(true);

    // Mock response
    // removed mock timeout to ensure only actual API generates the response
  }, []);

  useEffect(() => {
    if (initialContext) {
      appendUserMessage(initialContext);
      if (onClearContext) {
        onClearContext();
      }
      
      const sendInitial = async () => {
        setIsTyping(true);
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: initialContext }],
              documentContext,
            }),
          });

          if (!res.ok) throw new Error("API request failed");
          const data = await res.json();
          setMessages(prev => [...prev, { role: "ai", content: data.response }]);
        } catch (e) {
          console.error(e);
          setMessages(prev => [...prev, { role: "ai", content: "챗봇 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }]);
        } finally {
          setIsTyping(false);
        }
      };
      
      sendInitial();
    }
  }, [initialContext, documentContext, appendUserMessage, onClearContext]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMessage = input.trim();
    appendUserMessage(userMessage);
    setInput("");

    // Call chat API
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          documentContext,
        }),
      });

      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: "ai", content: data.response }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "ai", content: "챗봇 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden relative">
      <div className="p-3.5 border-b border-gray-100 bg-white/80 backdrop-blur-sm shadow-[0_2px_10px_-10px_rgba(0,0,0,0.1)] z-10 flex items-center justify-between">
        <div className="flex items-center font-bold text-gray-800 tracking-tight">
          <Bot className="w-5 h-5 mr-2 text-blue-600" />
          문서 Q&A
        </div>
        <div className="flex items-center text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
          <Sparkles className="w-3 h-3 mr-1" />
          Gemini 활성화
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-gray-50/30" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={`msg-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center mr-3 mt-1 shadow-sm shrink-0">
                <Bot className="w-4 h-4 text-blue-700" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
              msg.role === "user" 
                ? "bg-linear-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm" 
                : "bg-white border border-gray-200/60 text-gray-800 rounded-tl-sm ring-1 ring-black/5"
            }`}>
              <div className="text-sm/relaxed whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center mr-3 mt-1 shadow-sm shrink-0">
              <Bot className="w-4 h-4 text-blue-700" />
            </div>
            <div className="bg-white border border-gray-200/60 text-gray-800 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm max-w-[75%] flex h-10 items-center ring-1 ring-black/5">
              <div className="flex space-x-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex relative shadow-sm rounded-full bg-white ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isTyping}
            placeholder="이 문서에 대해 질문하세요..."
            className="w-full flex-1 bg-transparent border-transparent rounded-full pl-5 pr-14 py-3.5 text-sm outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 top-1.5 bottom-1.5 p-2 bg-linear-to-br from-blue-600 to-indigo-600 text-white rounded-full hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4 -translate-x-px translate-y-px" />
          </button>
        </div>
      </div>
    </div>
  );
}
