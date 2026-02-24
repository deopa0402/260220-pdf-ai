"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { AnalysisData } from "@/components/MainApp";
import type { Annotation, Message } from "@/lib/store";

interface AppStoreState {
  fileUrl: string | null;
  isAnalyzing: boolean;
  analysisData: AnalysisData | null;
  pageNumber: number;
  currentSessionId: string | null;
  sessionIds: string[];  // 세션 ID 목록만 저장 (IndexedDB에서 상세 데이터 로드)
  isSidebarOpen: boolean;
  isKeyModalOpen: boolean;
  pendingFile: File | null;
  currentFileName: string | undefined;
  chatMessagesBySession: Record<string, Message[]>;
  annotationsBySession: Record<string, Annotation[]>;
  setFileUrl: (fileUrl: string | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisData: (analysisData: AnalysisData | null) => void;
  setPageNumber: (pageNumber: number) => void;
  setSessionIds: (sessionIds: string[]) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setIsKeyModalOpen: (open: boolean) => void;
  setPendingFile: (file: File | null) => void;
  setCurrentFileName: (name: string | undefined) => void;
  setChatMessagesForSession: (sessionId: string, messages: Message[]) => void;
  setAnnotationsForSession: (sessionId: string, annotations: Annotation[]) => void;
  resetViewState: () => void;
}

export const useAppStore = create<AppStoreState>()(
  devtools(
    persist(
      (set) => ({
        fileUrl: null,
        isAnalyzing: false,
        analysisData: null,
        pageNumber: 1,
        currentSessionId: null,
        sessionIds: [],  // 세션 ID 목록만 저장
        isSidebarOpen: false,
        isKeyModalOpen: false,
        pendingFile: null,
        currentFileName: undefined,
        chatMessagesBySession: {},
        annotationsBySession: {},
        setFileUrl: (fileUrl) => set({ fileUrl }, false, "app/setFileUrl"),
        setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }, false, "app/setIsAnalyzing"),
        setAnalysisData: (analysisData) => set({ analysisData }, false, "app/setAnalysisData"),
        setPageNumber: (pageNumber) => set({ pageNumber }, false, "app/setPageNumber"),
        setSessionIds: (sessionIds) => set({ sessionIds }, false, "app/setSessionIds"),
        setCurrentSessionId: (currentSessionId) => set({ currentSessionId }, false, "app/setCurrentSessionId"),
        setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }, false, "app/setIsSidebarOpen"),
        setIsKeyModalOpen: (isKeyModalOpen) => set({ isKeyModalOpen }, false, "app/setIsKeyModalOpen"),
        setPendingFile: (pendingFile) => set({ pendingFile }, false, "app/setPendingFile"),
        setCurrentFileName: (currentFileName) => set({ currentFileName }, false, "app/setCurrentFileName"),
        setChatMessagesForSession: (sessionId, messages) =>
          set((state) => {
            const chatMessagesBySession = { ...state.chatMessagesBySession };
            chatMessagesBySession[sessionId] = messages;
            return { chatMessagesBySession };
          }, false, "app/setChatMessagesForSession"),
        setAnnotationsForSession: (sessionId, annotations) =>
          set((state) => {
            const annotationsBySession = { ...state.annotationsBySession };
            annotationsBySession[sessionId] = annotations;
            return { annotationsBySession };
          }, false, "app/setAnnotationsForSession"),
        resetViewState: () =>
          set(
            {
              fileUrl: null,
              analysisData: null,
              currentSessionId: null,
              currentFileName: undefined,
              pageNumber: 1,
            },
            false,
            "app/resetViewState"
          ),
      }),
      {
        name: "pdf-ai-ui",
        partialize: (state) => ({
          sessionIds: state.sessionIds,
          currentSessionId: state.currentSessionId,
          isSidebarOpen: state.isSidebarOpen,
          isKeyModalOpen: state.isKeyModalOpen,
          // 대용량 데이터는 localStorage에 저장하지 않음:
          // - sessions (IndexedDB에만 저장)
          // - analysisData (IndexedDB에만 저장)
          // - chatMessagesBySession (IndexedDB에만 저장, 여기는 캐시만)
          // - annotationsBySession (IndexedDB에만 저장, 여기는 캐시만)
        }),
      }
    )
  )
);
