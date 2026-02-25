"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import { X, Sparkles, GripHorizontal, Send } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { type Annotation } from '@/lib/store';
import type { AnalysisData } from '@/components/MainApp';

interface AnnotationTooltipProps {
  annotation: Annotation;
  analysisData?: AnalysisData | null;
  scale: number;
  onClose: () => void;
  onUpdate: (updated: Annotation) => void;
}

const buildContextText = (analysisData?: AnalysisData | null) => {
  if (!analysisData) return "";

  const summaryLines = analysisData.summaries
    .flatMap((item) => item.lines?.map((line) => line.text) ?? [])
    .filter(Boolean)
    .slice(0, 6);

  const keywordText = analysisData.keywords?.length
    ? `\n- 키워드: ${analysisData.keywords.slice(0, 8).join(", ")}`
    : "";

  const summaryText = summaryLines.length
    ? `\n- 핵심 요약: ${summaryLines.join(" | ")}`
    : "";

  const issueLines = Array.isArray(analysisData.issues)
    ? analysisData.issues.map((item) => item.text).filter(Boolean)
    : typeof analysisData.issues === 'string'
      ? [analysisData.issues]
      : [];

  const issueText = issueLines.length
    ? `\n- 점검 항목: ${issueLines.slice(0, 4).join(" | ")}`
    : "";

  return [
    `문서 제목: ${analysisData.title}`,
    summaryText,
    keywordText,
    issueText,
  ].join('\n').trim();
};

const isImageGenerationRequest = (text: string) => {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return false;

  return [
    /이미지\S*\s*(생성|만들|그려)/i,
    /그림\S*\s*(생성|만들|그려)/i,
    /(create|generate|draw)\s+(an?\s+)?(image|picture)/i,
    /(image|picture)\s+(create|generate|draw)/i,
  ].some((pattern) => pattern.test(normalized));
};

export function AnnotationTooltip({
  annotation,
  analysisData,
  scale,
  onClose,
  onUpdate
}: AnnotationTooltipProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: annotation.position.x * scale, y: annotation.position.y * scale });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didAutoSendRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);

  const handleSend = useCallback(async (content: string, isInitial = false) => {
    if (!content.trim() || isTyping) return;

    let currentMessages = annotation.messages;
    if (!isInitial) {
      currentMessages = [...annotation.messages, { role: "user" as const, content: content.trim() }];
      onUpdate({ ...annotation, messages: currentMessages });
    }

    setInput("");
    setIsTyping(true);

    try {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (!apiKey) throw new Error("API 키가 없습니다.");

      const genAI = new GoogleGenerativeAI(apiKey);

      const historyParts = currentMessages.map(m => `[${m.role === "user" ? "사용자" : "AI"}]: ${m.content}`).join("\n\n");
      const contextText = isInitial ? buildContextText(analysisData) : "";
      const basePrompt = "선택된 이미지 영역의 핵심 내용을 3문장 이내로 짧고 명확하게 한국어로 요약 및 설명해줘. 불필요한 인사말이나 부연 설명은 생략해.";
      const heuristicImageRequest = !isInitial && isImageGenerationRequest(content);

      const prompt = isInitial
        ? `${contextText ? `${contextText}\n\n` : ""}${basePrompt}`
        : `이전 대화:\n${historyParts}\n\n사용자: ${content}\n\n위 이미지와 이전 대화를 기반으로 한국어로 간결하고 명확하게 답변해줘.`;

      const base64Data = annotation.imageOriginBase64.split(",")[1];
      const mimeType = annotation.imageOriginBase64.split(";")[0].split(":")[1];

      let isImageRequest = heuristicImageRequest;
      if (!isInitial) {
        try {
          const classifierModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const classifierResult = await classifierModel.generateContent(
            `다음 사용자 요청이 이미지 생성 요청인지 판별해줘.\n요청: "${content}"\n응답은 IMAGE 또는 TEXT 중 하나만 출력.`
          );
          const decision = classifierResult.response.text()?.trim().toUpperCase() ?? "";
          isImageRequest = heuristicImageRequest || decision.includes("IMAGE");
        } catch (classificationError) {
          console.error("Image request classification failed", classificationError);
          isImageRequest = heuristicImageRequest;
        }
      }

      if (isImageRequest) {
        const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
        const imageResponse = await imageModel.generateContent([
          `사용자 요청: ${content}\n\n아래 이미지를 참고해서 요청에 맞는 새 이미지를 생성해줘.`,
          {
            inlineData: { data: base64Data, mimeType }
          }
        ]);

        const parts = imageResponse.response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
        const generatedImagePart = parts.find((part) => part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/"));
        const generatedImageDataUrl = generatedImagePart?.inlineData
          ? `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`
          : undefined;

        const aiMessage = {
          role: "ai" as const,
          content: generatedImageDataUrl
            ? "요청과 참고 이미지를 반영해 이미지를 생성했습니다."
            : "이미지를 생성하지 못했습니다. 다시 시도해주세요.",
          generatedImageDataUrl,
        };
        onUpdate({ ...annotation, messages: [...currentMessages, aiMessage] });
      } else {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContentStream([
          prompt,
          {
            inlineData: { data: base64Data, mimeType }
          }
        ]);

        let botResponse = "";
        const streamingMessages = [...currentMessages, { role: "ai" as const, content: "" }];
        onUpdate({ ...annotation, messages: streamingMessages });

        const flush = () => {
          onUpdate({ ...annotation, messages: [...currentMessages, { role: "ai" as const, content: botResponse }] });
          frameIdRef.current = null;
        };

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (!chunkText) continue;

          botResponse += chunkText;

          if (frameIdRef.current === null) {
            frameIdRef.current = requestAnimationFrame(flush);
          }
        }

        if (frameIdRef.current !== null) {
          cancelAnimationFrame(frameIdRef.current);
        }
        flush();
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
      onUpdate({
        ...annotation,
        messages: [...currentMessages, { role: "ai" as const, content: `응답 중 오류가 발생했습니다: ${errorMessage}` }]
      });
    } finally {
        setIsTyping(false);
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    }
  }, [annotation, analysisData, isTyping, onUpdate]);

  // Update position when scale changes
  useEffect(() => {
    setPosition({ x: annotation.position.x * scale, y: annotation.position.y * scale });
  }, [scale, annotation.position.x, annotation.position.y]);

  useEffect(() => {
    const messageCount = annotation.messages.length;
    if (!scrollRef.current) return;
    if (messageCount === 0 && !isTyping) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [annotation.messages.length, isTyping]);

  useEffect(() => {
    if (didAutoSendRef.current || isTyping) return;
    if (annotation.messages.length !== 0) return;
    didAutoSendRef.current = true;
    void handleSend("이 영역에 대해 분석하고 설명해줘", true);
  }, [annotation.messages.length, isTyping, handleSend]);

  const handleStop = (_: unknown, data: { x: number; y: number }) => {
    const newX = data.x / scale;
    const newY = data.y / scale;
    setPosition({ x: data.x, y: data.y });
    onUpdate({
      ...annotation,
      position: { ...annotation.position, x: newX, y: newY }
    });
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      scale={scale}
      handle=".drag-handle-chat"
      position={position}
      onStop={handleStop}
    >
      <div ref={nodeRef} className="absolute top-0 left-0 m-0 z-50 cursor-auto">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} className="bg-white rounded-r-2xl shadow-xl shadow-black/10 border border-gray-200/80 flex flex-col min-w-[272px] w-[272px] max-w-[640px] min-h-[288px] max-h-[640px] overflow-hidden resize">
          <div className="drag-handle-chat bg-white border-b border-gray-100 flex justify-between items-center cursor-move hover:bg-gray-50 transition-colors shrink-0">
            <div className="flex items-center px-2.5 py-2 flex-1 overflow-hidden">
               <GripHorizontal className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0"/>
               <div className="h-5 w-5 shrink-0 bg-blue-50 rounded flex items-center justify-center mr-1.5">
                 <Sparkles className="w-3 h-3 text-blue-600"/>
               </div>
               <span className="text-[11px] font-bold text-gray-800 truncate">선택 영역 분석 내용</span>
            </div>
            <div className="flex items-center pr-2 gap-1">
               <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="닫기 및 삭제">
                 <X className="w-3.5 h-3.5"/>
               </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div ref={scrollRef} className="flex-1 flex flex-col p-2.5 overflow-y-auto space-y-2.5 bg-white custom-scrollbar text-[11px]">
             {annotation.messages.length === 0 && isTyping ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 space-y-2.5 h-full animate-pulse">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <p className="font-medium text-[10.5px]">분석 중...</p>
              </div>
             ) : (
               annotation.messages.map((msg, i) => (
                 // biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only
                 <div key={`msg-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-sm' : 'bg-gray-50 text-gray-800 border border-gray-200/60 rounded-2xl rounded-tl-sm'}`}>
                    {msg.content}
                    {msg.generatedImageDataUrl && (
                      <img
                        src={msg.generatedImageDataUrl}
                        alt="AI generated"
                        className="mt-2 rounded-lg border border-gray-200/70 max-w-full h-auto"
                      />
                    )}
                  </div>
                </div>
               ))
             )}

             {isTyping && annotation.messages.length > 0 && annotation.messages[annotation.messages.length - 1].role !== "ai" && (
                <div className="flex justify-start">
                 <div className="bg-gray-50 text-gray-800 border border-gray-200/60 rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm flex items-center space-x-1.5">
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
             )}
          </div>

          {/* Input */}
          <div className="p-2 bg-white border-t border-gray-100 shrink-0">
             <div className="flex relative rounded-xl bg-gray-50/80 border border-gray-200/80 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all group">
               <input
                 type="text"
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                 placeholder="궁금한 내용에 대해 질문하세요..."
                 disabled={isTyping}
                className="w-full flex-1 bg-transparent border-transparent rounded-xl pl-3 pr-9 py-2.5 text-[11px] outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50"
              />
               <button
                 type="button"
                 onClick={() => handleSend(input)}
                 disabled={isTyping || !input.trim()}
                className="absolute right-1 top-1 bottom-1 p-1.5 text-gray-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                <Send className="w-3.5 h-3.5 ml-0.5" />
              </button>
             </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
}
