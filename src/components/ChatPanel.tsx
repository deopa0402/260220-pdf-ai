"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Sparkles } from "lucide-react";

export interface Message {
  role: "user" | "ai";
  content: string;
}

interface ChatPanelProps {
  sessionId: string | null;
  documentContext: string | null;
  initialContext?: string | null;
  onClearContext?: () => void;
  savedMessages?: Message[];
  onUpdateMessages?: (messages: Message[]) => void;
  isDisabled?: boolean;
}

export function ChatPanel({ sessionId, documentContext, initialContext, onClearContext, savedMessages = [], onUpdateMessages, isDisabled }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(savedMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(savedMessages);
  }, [savedMessages]);

  const appendUserMessage = useCallback((text: string) => {
    setMessages(prev => {
      const updated: Message[] = [...prev, { role: "user", content: text }];
      onUpdateMessages?.(updated);
      return updated;
    });
    setIsTyping(true);
  }, [onUpdateMessages]);

  const fetchAiResponse = useCallback(async (chatMessages: Message[]) => {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) throw new Error("API Key가 설정되지 않았습니다. 우측 상단에서 키를 입력해주세요.");

    let base64Pdf = documentContext;
    let extraContextText = "";

    if (documentContext?.includes("[원본 PDF Base64 데이터]")) {
      base64Pdf = documentContext.split("[원본 PDF Base64 데이터]")[1].split("[시스템이 자동 분석한 내용 - 맞춤형 핵심 요약 3선]")[0].trim();
      extraContextText = documentContext.split("[시스템이 자동 분석한 내용 - 맞춤형 핵심 요약 3선]")[1].trim();
    }

    const contents = chatMessages.map((msg, index) => {
      const parts: { text?: string; inlineData?: { data: string; mimeType: string } }[] = [{ text: msg.content }];
      
      if (documentContext && msg.role === "user" && index === chatMessages.findIndex(m => m.role === "user")) {
        if (extraContextText) {
          parts.unshift({ text: "[이전 분석 내용 요약입니다. 참조하세요]\n" + extraContextText });
        }
        parts.unshift({ inlineData: { data: base64Pdf || "", mimeType: "application/pdf" } });
      }

      return {
        role: msg.role === "ai" ? "model" : "user",
        parts
      };
    });

    const systemInstruction = `You are an intelligent document assistant.
You must answer the user's questions based primarily on the context of the provided document.
If the answer is not in the document, acknowledge that it's not present and do your best to answer based on external knowledge, clearly stating the distinction.
Answer in a friendly, conversational Korean tone.`;

    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("AI API error");
    
    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("No text response from AI");
    
    return responseText;
  }, [documentContext]);

  useEffect(() => {
    if (initialContext) {
      appendUserMessage(initialContext);
      onClearContext?.();
      
      const sendInitial = async () => {
        setIsTyping(true);
        try {
          const responseText = await fetchAiResponse([{ role: "user", content: initialContext }]);
          setMessages(prev => {
            const updated: Message[] = [...prev, { role: "ai", content: responseText }];
            onUpdateMessages?.(updated);
            return updated;
          });
        } catch (e) {
          console.error(e);
          setMessages(prev => {
            const errorMsg = e instanceof Error ? e.message : "챗봇 연결 중 오류가 발생했습니다.";
            const updated: Message[] = [...prev, { role: "ai", content: errorMsg }];
            onUpdateMessages?.(updated);
            return updated;
          });
        } finally {
          setIsTyping(false);
        }
      };
      
      sendInitial();
    }
  }, [initialContext, appendUserMessage, onClearContext, onUpdateMessages, fetchAiResponse]);

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

    try {
      const chatHistory = [...messages, { role: "user" as const, content: userMessage }];
      const responseText = await fetchAiResponse(chatHistory);
      
      setMessages(prev => {
        const updated: Message[] = [...prev, { role: "ai", content: responseText }];
        if (onUpdateMessages) onUpdateMessages(updated);
        return updated;
      });
    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const errorMsg = e instanceof Error ? e.message : "챗봇 연결 중 오류가 발생했습니다.";
        const updated: Message[] = [...prev, { role: "ai", content: errorMsg }];
        if (onUpdateMessages) onUpdateMessages(updated);
        return updated;
      });
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
          AI 활성화
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-gray-50/30" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={`${msg.role}-${msg.content}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
            disabled={isTyping || isDisabled}
            placeholder={isDisabled ? "문서 분석이 끝날 때까지 기다려주세요..." : "이 문서에 대해 질문하세요..."}
            className="w-full flex-1 bg-transparent border-transparent rounded-full pl-5 pr-14 py-3.5 text-sm outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isDisabled}
            className="absolute right-1.5 top-1.5 bottom-1.5 p-2 bg-linear-to-br from-blue-600 to-indigo-600 text-white rounded-full hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4 -translate-x-px translate-y-px" />
          </button>
        </div>
      </div>
    </div>
  );
}
