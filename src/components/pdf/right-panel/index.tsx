"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAppStore } from "@/lib/app-store";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { store } from "@/lib/store";
import { ChatTimeline } from "./ChatTimeline";
import { RecommendedQuestions } from "./RecommendedQuestions";
import { ChatInput } from "./ChatInput";
import type { AnalysisData } from "../../MainApp";
import { RightPanelHeader } from "./RightPanelHeader";
import { RightPanelAnalysis } from "./RightPanelAnalysis";

const buildContextText = (analysisData: AnalysisData | null) => {
  if (!analysisData) return "";

  const summaryLines = analysisData.summaries.flatMap(item => item.lines?.map((line) => line.text) ?? []);
  const keywordText = analysisData.keywords?.length
    ? `\n- 키워드: ${analysisData.keywords.join(", ")}`
    : "";
  const summaryText = summaryLines.length
    ? `\n- 요약: ${summaryLines.slice(0, 8).join(" | ")}`
    : "";

  const issueLines = Array.isArray(analysisData.issues)
    ? analysisData.issues.map((item) => item.text).filter(Boolean)
    : typeof analysisData.issues === "string"
      ? [analysisData.issues]
      : [];
  const issueText = issueLines.length
    ? `\n- 핵심 체크포인트: ${issueLines.slice(0, 5).join(" | ")}`
    : "";

  return [
    `문서 제목: ${analysisData.title}`,
    summaryText,
    keywordText,
    issueText,
  ].join("\n").trim();
};

interface RightPanelProps {
  analysisData: AnalysisData | null;
  isAnalyzing?: boolean;
  sessionId?: string | null;
  fileName?: string;
  onCitationClick?: (page: number) => void;
}

export function RightPanel({ analysisData, isAnalyzing, sessionId, fileName, onCitationClick }: RightPanelProps) {
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const firstTurnDoneBySessionRef = useRef(false);
  const chatMessagesBySession = useAppStore((s) => s.chatMessagesBySession);
  const currentFileName = useAppStore((s) => s.currentFileName);
  const messages = useMemo(
    () => (sessionId ? chatMessagesBySession[sessionId] ?? [] : []),
    [chatMessagesBySession, sessionId]
  );
  const setChatMessagesForSession = useAppStore((s) => s.setChatMessagesForSession);

  useEffect(() => {
    firstTurnDoneBySessionRef.current = Boolean(sessionId && messages.some((message) => message.role === "user"));
  }, [sessionId, messages]);

  useEffect(() => {
    if (messages.length === 0 && !isTyping) return;
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;

    const newMessages = [...messages, { role: "user" as const, content }];
    if (sessionId) {
      setChatMessagesForSession(sessionId, newMessages);
    }
    setIsTyping(true);

    try {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (!apiKey) {
        throw new Error("API 키가 없습니다. 다시 로그인해주세요.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "당신은 문서 분석 AI 챗봇입니다. 제공된 문서와 사용자의 이전 대화 내역에 기반하여 사용자의 질문에 정확한 답변을 제공하세요. 답변할 때 출처를 [Np] 형식으로 포함하세요. 여러 페이지는 [1p],[2p]처럼 표기하세요."
      });

      const isFirstTurn = !firstTurnDoneBySessionRef.current;
      const historyParts = newMessages
        .map((m) => `[${m.role === "user" ? "사용자" : "AI"}]: ${m.content}`)
        .join("\n\n");

      const contextText = isFirstTurn ? buildContextText(analysisData) : "";
      const prompt = `${contextText ? `${contextText}\n\n` : ""}이전 대화 내역:\n${historyParts}\n\n위 문서를 기반으로 답변해주세요.`;

      if (!sessionId) {
        throw new Error("세션 정보를 찾을 수 없습니다.");
      }

      const session = await store.getSession(sessionId);
      const pdfBase64 = session?.pdfBase64?.trim();

      if (!pdfBase64) {
        throw new Error("PDF 데이터를 불러오지 못했습니다. 문서를 다시 선택해주세요.");
      }

      const contents = isFirstTurn
        ? [
            prompt,
            {
              inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf",
              },
            },
          ]
            : [
                prompt,
              ];
      firstTurnDoneBySessionRef.current = true;

      const result = await model.generateContentStream(contents);

      let botResponse = "";
      if (sessionId) {
        setChatMessagesForSession(sessionId, [...newMessages, { role: "ai" as const, content: "" }]);
      }
      
      let frameId: number | null = null;
      const flush = () => {
        if (!sessionId) return;
        const updated = [...newMessages, { role: "ai" as const, content: botResponse }];
        setChatMessagesForSession(sessionId, updated);
        frameId = null;
      };

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (!chunkText) continue;

        botResponse += chunkText;
        if (!frameId && sessionId) {
          frameId = requestAnimationFrame(flush);
        }
      }

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      flush();
    } catch(err) {
      console.error(err);
      if (sessionId) {
        setChatMessagesForSession(sessionId, [...newMessages, { role: "ai" as const, content: "죄송합니다, 응답을 가져오는 중 오류가 발생했습니다." }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  if (isAnalyzing || !analysisData) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white relative overflow-hidden">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium text-gray-500 animate-pulse">AI가 문서를 분석하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <RightPanelHeader fileName={fileName || currentFileName} />
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="p-5 md:p-6 lg:p-7 w-full">
          {analysisData && (
            <RightPanelAnalysis analysisData={analysisData} onCitationClick={onCitationClick} />
          )}
          
          <div className="flex items-center my-6 opacity-40">
            <div className="flex-1 border-t border-gray-300"></div>
            <div className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Q&A Chat</div>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
          
          <ChatTimeline messages={messages} isTyping={isTyping} onCitationClick={onCitationClick} />
          <RecommendedQuestions 
            insights={analysisData?.insights} 
            onSelectQuestion={(q) => handleSendMessage(q)} 
          />
          <div ref={chatBottomRef} />
        </div>
      </div>
      
      <ChatInput onSend={handleSendMessage} disabled={isTyping} />
    </div>
  );
}
