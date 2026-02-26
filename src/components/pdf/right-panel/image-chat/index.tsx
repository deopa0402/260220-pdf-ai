"use client";

import { useMemo, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pencil, X } from "lucide-react";
import { ImageChatInput } from "./ImageChatInput";
import { ImageChatTimeline } from "./ImageChatTimeline";
import { ImageUploadCanvas } from "./ImageUploadCanvas";
import type { ImageChatMessage } from "./types";
import { dataUrlToInlineData, looksLikeImageRequest } from "./utils";

interface ImageChatPanelProps {
  sessionId?: string | null;
}

const IMAGE_CLASSIFIER_PROMPT =
  '다음 사용자 요청을 분류해줘. 이미지 생성/편집 요청이면 IMAGE, 이미지 설명/질문 또는 일반 대화면 TEXT를 출력해. 응답은 IMAGE 또는 TEXT 한 단어만 출력.';

interface ToastState {
  message: string;
  type: "success" | "error";
}

export function ImageChatPanel({ sessionId }: ImageChatPanelProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [draftImageDataUrl, setDraftImageDataUrl] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ImageChatMessage[]>>({});
  const sessionKey = sessionId ?? "default-image-chat";
  const messages = useMemo(() => messagesBySession[sessionKey] ?? [], [messagesBySession, sessionKey]);

  const setSessionMessages = (next: ImageChatMessage[]) => {
    setMessagesBySession((prev) => ({ ...prev, [sessionKey]: next }));
  };

  const showToast = (message: string, type: ToastState["type"]) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 1800);
  };

  const handlePickImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setDraftImageDataUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (content: string) => {
    if (isTyping) return;

    const normalizedContent = content.trim();
    const editedImageDataUrl = draftImageDataUrl;
    const userContent = normalizedContent || (editedImageDataUrl ? "이미지 참고 요청" : "");
    if (!userContent && !editedImageDataUrl) return;

    const userMessage: ImageChatMessage = {
      role: "user",
      content: userContent,
      imageDataUrl: editedImageDataUrl ?? undefined,
    };

    const history = [...messages, userMessage];
    setSessionMessages(history);
    setIsTyping(true);
    setDraftImageDataUrl(null);

    try {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (!apiKey) throw new Error("API 키가 없습니다.");

      const genAI = new GoogleGenerativeAI(apiKey);
      const inlineData = editedImageDataUrl ? dataUrlToInlineData(editedImageDataUrl) : null;

      let isImageRequest = false;
      try {
        const classifier = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const classificationPrompt = `${IMAGE_CLASSIFIER_PROMPT}\n이미지 첨부 여부: ${inlineData ? "YES" : "NO"}\n사용자 요청: "${userContent}"`;
        const decisionResult = await classifier.generateContent(classificationPrompt);
        const decision = decisionResult.response.text()?.trim().toUpperCase() ?? "";
        isImageRequest = decision.includes("IMAGE");
      } catch (classificationError) {
        console.error("Image chat classification failed", classificationError);
        isImageRequest = looksLikeImageRequest(userContent) || Boolean(inlineData);
      }

      if (isImageRequest) {
        const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
        const imagePrompt = inlineData
          ? `사용자 요청: ${userContent}\n\n업로드된 이미지를 참고해 인포그래픽/편집 결과 이미지를 생성해줘.`
          : `사용자 요청: ${userContent}\n\n인포그래픽 스타일 결과 이미지를 생성해줘.`;

        const imageResult = await imageModel.generateContent(inlineData ? [imagePrompt, { inlineData }] : [imagePrompt]);

        const parts = imageResult.response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
        const generatedImagePart = parts.find(
          (part) => part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")
        );

        const generatedImageDataUrl = generatedImagePart?.inlineData
          ? `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`
          : undefined;

        const aiMessage: ImageChatMessage = {
          role: "ai",
          content: generatedImageDataUrl
            ? "요청에 맞는 이미지를 생성했습니다."
            : "이미지를 생성하지 못했습니다. 프롬프트를 조금 더 구체적으로 입력해 주세요.",
          imageDataUrl: generatedImageDataUrl,
        };

        setSessionMessages([...history, aiMessage]);
      } else {
        const textModel = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction:
            "당신은 이미지 기획/편집을 도와주는 AI 어시스턴트입니다. 사용자의 요청을 한국어로 간결하고 실무적으로 답변하세요.",
        });

        const prompt = `이전 대화:\n${history
          .map((m) => `[${m.role === "user" ? "사용자" : "AI"}] ${m.content}`)
          .join("\n\n")}\n\n사용자 최신 요청: ${userContent}`;

        const streamResult = await textModel.generateContentStream(inlineData ? [prompt, { inlineData }] : [prompt]);

        let botResponse = "";
        setSessionMessages([...history, { role: "ai", content: "" }]);

        for await (const chunk of streamResult.stream) {
          const text = chunk.text();
          if (!text) continue;
          botResponse += text;
          setSessionMessages([...history, { role: "ai", content: botResponse }]);
        }
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "오류가 발생했습니다.";
      setSessionMessages([...history, { role: "ai", content: `요청 처리 중 오류가 발생했습니다: ${message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyImage = async (imageDataUrl: string) => {
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("clipboard unsupported");
      }
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      showToast("이미지를 복사했습니다", "success");
    } catch (error) {
      console.error(error);
      showToast("이미지 복사에 실패했습니다", "error");
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-md border ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 md:p-6 lg:p-7 w-full flex flex-col justify-end">
        <ImageChatTimeline messages={messages} isTyping={isTyping} onCopyImage={handleCopyImage} />
      </div>

      {draftImageDataUrl && (
        <div className="px-3 pb-2 bg-white border-t border-gray-100">
          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="relative group"
              title="클릭하여 확대/드로잉 편집"
            >
              <img src={draftImageDataUrl} alt="첨부 이미지 미리보기" className="w-16 h-16 rounded-md object-cover border border-gray-200" />
              <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 text-white text-[10px] rounded-md">
                편집
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              <Pencil className="w-3.5 h-3.5" />
              확대/드로잉
            </button>
            <button
              type="button"
              onClick={() => setDraftImageDataUrl(null)}
              className="ml-1 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200"
              title="첨부 제거"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <ImageChatInput
        onSend={handleSend}
        onPickImage={handlePickImage}
        hasAttachment={Boolean(draftImageDataUrl)}
        disabled={isTyping}
      />

      {isEditorOpen && draftImageDataUrl && (
        <ImageUploadCanvas
          imageDataUrl={draftImageDataUrl}
          disabled={isTyping}
          onClose={() => setIsEditorOpen(false)}
          onApply={(next) => {
            setDraftImageDataUrl(next);
            setIsEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}
