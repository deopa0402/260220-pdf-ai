"use client";

import { useState, useEffect, useRef } from "react";
import { store, type Message, type PdfSession } from "@/lib/store";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Keywords } from "./Keywords";

import { ThreeLineSummary } from "./ThreeLineSummary";
import { DetailedSummary } from "./DetailedSummary";
import { CheckPoints } from "./CheckPoints";
import { ChatTimeline } from "./ChatTimeline";
import { RecommendedQuestions } from "./RecommendedQuestions";
import { ChatInput } from "./ChatInput";
import type { AnalysisData } from "../../MainApp";

interface RightPanelProps {
  analysisData: AnalysisData | null;
  isAnalyzing?: boolean;
  sessionId?: string | null;
  onCitationClick?: (page: number) => void;
}

export function RightPanel({ analysisData, isAnalyzing, sessionId, onCitationClick }: RightPanelProps) {
  const [session, setSession] = useState<PdfSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      store.getSession(sessionId).then(s => {
        if (s) {
          setSession(s);
          setMessages(s.messages || []);
        }
      });
    }
  }, [sessionId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll down when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !session || isTyping) return;
    
    const newMessages = [...messages, { role: "user" as const, content }];
    setMessages(newMessages);
    setIsTyping(true);

    // Save user message
    const tempSession = { ...session, messages: newMessages };
    setSession(tempSession);
    await store.saveSession(tempSession);

    try {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (!apiKey) {
        throw new Error("API 키가 없습니다. 다시 로그인해주세요.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "당신은 문서 분석 AI 챗봇입니다. 제공된 문서와 사용자의 이전 대화 내역에 기반하여 사용자의 질문에 정확한 답변을 제공하세요."
      });

      const historyParts = newMessages.map(m => `[${m.role === "user" ? "사용자" : "AI"}]: ${m.content}`).join("\\n\\n");
      const prompt = `이전 대화 내역:\n${historyParts}\n\n위 문서를 기반으로 답변해주세요.`;

      const result = await model.generateContentStream([
        prompt,
        {
          inlineData: {
            data: session.pdfBase64,
            mimeType: "application/pdf"
          }
        }
      ]);

      let botResponse = "";
      setMessages((prev) => [...prev, { role: "ai", content: "" }]);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        botResponse += chunkText;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content = botResponse;
          return updated;
        });
      }

      const finalSession = { ...session, messages: [...newMessages, { role: "ai" as const, content: botResponse }] };
      setSession(finalSession);
      await store.saveSession(finalSession);
      
    } catch(err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "ai", content: "죄송합니다, 응답을 가져오는 중 오류가 발생했습니다." }]);
    } finally {
      setIsTyping(false);
    }
  };
  if (isAnalyzing || !analysisData) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white relative overflow-hidden">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium text-gray-500 animate-pulse">AI가 문서를 심층 분석하고 있습니다...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="p-5 md:p-6 lg:p-7 w-full">
          {/* Analysis View Sections */}
          {/* Analysis View Sections */}
          {analysisData && (
            <>
              <Keywords keywords={analysisData.keywords} />
              <ThreeLineSummary summary={analysisData.summaries[0]} />
              <DetailedSummary summary={analysisData.summaries[1]} />
              <CheckPoints issues={analysisData.issues} />
            </>
          )}
          
          {/* Subtle separator */}
          <div className="flex items-center my-6 opacity-40">
            <div className="flex-1 border-t border-gray-300"></div>
            <div className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Q&A Chat</div>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
          
          {/* Chat Sections */}
          <ChatTimeline messages={messages} isTyping={isTyping} />
          <RecommendedQuestions 
            insights={analysisData?.insights} 
            onSelectQuestion={(q) => handleSendMessage(q)} 
          />
          <div ref={chatBottomRef} />
        </div>
      </div>
      
      {/* Sticky Bottom Input Area */}
      <ChatInput onSend={handleSendMessage} disabled={isTyping} />
    </div>
  );
}
