"use client";

import { useState, useEffect } from "react";
import { PdfUploader } from "./PdfUploader";
import { Sidebar } from "./Sidebar";
import { ApiKeyModal } from "./ApiKeyModal";
import { Sparkles, ArrowLeft, Menu, Key } from "lucide-react";
import { store, PdfSession } from "@/lib/store";
import { LeftPanel } from "./pdf/left-panel";
import { RightPanel } from "./pdf/right-panel";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export interface SummaryVariant {
  title: string;
  content: string;
}

export interface AnalysisData {
  summaries: SummaryVariant[];
  keywords: string[];
  insights: string;
  issues: string; // "확인 필요 사항"
}

export function MainApp({ initialSessionId }: { initialSessionId?: string }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  // Session Data & Sidebar States
  const [sessions, setSessions] = useState<PdfSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Load Sessions on Mount and Handle History Popstate
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial setup only
  useEffect(() => {
    loadSessions().then(() => {
      if (initialSessionId) {
        handleSelectSession(initialSessionId, true);
      }
    });

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/" || path === "") {
        handleReset(true);
      } else {
        const id = path.substring(1);
        handleSelectSession(id, true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId]);

  const loadSessions = async () => {
    const data = await store.getSessions();
    setSessions(data);
  };

  const handleFileUpload = async (file: File) => {
    const key = localStorage.getItem("gemini_api_key");
    if (!key) {
      setPendingFile(file);
      setIsKeyModalOpen(true);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Data = dataUrl.split(",")[1];
      
      const newSession: PdfSession = {
        id: store.createNewSessionId(),
        fileName: file.name,
        pdfBase64: base64Data,
        analysisData: null,
        messages: [],
        createdAt: Date.now(),
      };
      
      await store.saveSession(newSession);
      // Immediately trigger UI update instead of waiting for router
      handleSelectSession(newSession.id);
    } catch (e: unknown) {
      console.error(e);
      alert("파일 저장 중 에러가 발생했습니다.");
      setIsAnalyzing(false);
    }
  };

  const handleReset = (skipHistory = false) => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFileUrl(null);
    setAnalysisData(null);
    setCurrentSessionId(null);
    if (!skipHistory) {
      window.history.pushState(null, "", "/");
    }
  };

  const handleSelectSession = async (id: string, skipHistory = false) => {
    const session = await store.getSession(id);
    if (!session) {
      if (!skipHistory) window.history.pushState(null, "", "/");
      return;
    }
    
    // Set UI states from session
    const blob = await fetch(`data:application/pdf;base64,${session.pdfBase64}`).then(res => res.blob());
    const restoredUrl = URL.createObjectURL(blob);
      
    setFileUrl(restoredUrl);
    setCurrentSessionId(session.id);
    
    // Auto-update URL bar without Next.js React re-rendering
    if (!skipHistory && window.location.pathname !== `/${id}`) {
        window.history.pushState(null, "", `/${id}`);
    }

    if (session.analysisData) {
      setAnalysisData(session.analysisData);
    } else {
      setAnalysisData(null);
      runAnalysisForSession(session);
    }
  };

  const runAnalysisForSession = async (session: PdfSession) => {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
      setIsKeyModalOpen(true);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const systemInstruction = `당신은 전문 문서 분석가입니다. 제공된 문서를 분석하여 아래 JSON 구조로 완벽히 답변해 주세요.

{
  "summaries": [
    {
      "title": "3줄 요약",
      "content": "문서 핵심 내용을 3개 문장으로 정리"
    },
    {
      "title": "요약",
      "content": "문서 전체의 주요 흐름 요약"
    }
  ],
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "insights": "문서 내 수치나 사실에서 바로 답을 찾을 수 있는 짧은 질문 3가지 (형식: 1. 질문? \\n 2. 질문? \\n 3. 질문?)",
  "issues": "논리적으로 오류가 있는 사항이나 확인이 필요한 휴먼에러 요소"
}

작성 가이드:
1. insights: 배경지식이 필요한 깊은 분석 대신, 본문 내 데이터로 즉각 답변 가능한 '팩트 체크형' 질문을 작성하세요. 
2. 간결성: 질문은 최대한 짧고 명확하게 한 줄로 구성하세요.
3. 언어 및 형식: 반드시 한국어로 작성하고, Array와 String 타입이 위 구조와 일치하는 유효한 JSON 형식만을 반환해야 합니다. Markdown 백틱이나 다른 설명을 덧붙이지 마세요.`;

      const payload = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: "Here is the document to analyze. Please provide the JSON summary." },
              { inlineData: { data: session.pdfBase64, mimeType: "application/pdf" } }
            ]
          }
        ],
        generationConfig: { responseMimeType: "application/json" }
      };

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API Error:", res.status, errText);
        throw new Error(`Gemini API error: ${res.statusText}`);
      }

      const resData = await res.json();
      const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) throw new Error("No response from Gemini API");

      const data = JSON.parse(responseText);
      data.rawText = session.pdfBase64;
      
      const updatedSession = { ...session, analysisData: data };
      await store.saveSession(updatedSession);
      
      setAnalysisData(data);
      loadSessions();
    } catch (e) {
      console.error(e);
      alert("문서 분석 중 에러가 발생했습니다: " + (e instanceof Error ? e.message : "API 통신 오류. 키가 올바른지 확인해주세요."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    await store.deleteSession(id);
    if (currentSessionId === id) {
      handleReset();
    }
    loadSessions();
  };

  const isSessionPage = Boolean(fileUrl && currentSessionId);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 text-gray-900 font-sans">
      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onSave={() => {
          setIsKeyModalOpen(false);
          if (pendingFile) {
            handleFileUpload(pendingFile);
            setPendingFile(null);
          } else if (currentSessionId && !analysisData) {
            handleSelectSession(currentSessionId);
          }
        }} 
      />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        sessions={sessions} 
        currentSessionId={currentSessionId} 
        onSelect={handleSelectSession} 
        onDelete={handleDeleteSession} 
        onNew={() => handleReset()} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {!isSessionPage && (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 h-16 shrink-0 flex items-center px-4 sm:px-6 shadow-sm z-30">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 mr-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex flex-col items-center justify-center mr-3 shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight">
              Gemini <span className="text-blue-600 font-extrabold">PDF AI</span>
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!fileUrl && (
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(true)}
                className="text-sm font-medium text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg px-3 py-2 transition-colors flex items-center shadow-sm"
                title="API Key 설정"
              >
                <Key className="w-4 h-4 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">API Key 설정</span>
              </button>
            )}

            {fileUrl && (
              <button
                type="button"
                onClick={() => handleReset()}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg px-4 py-2 transition-colors flex items-center shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                새 문서 분석
              </button>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-hidden relative">
        {!fileUrl ? (
          <div className="absolute inset-0 max-w-4xl mx-auto flex flex-col items-center justify-center p-6 sm:p-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full">
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center bg-blue-100/50 text-blue-700 rounded-full px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide border border-blue-200 shadow-sm">
                  Powered by Google Gemini
                </div>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
                  문서를 업로드하고 <br className="hidden sm:block" />
                  <span className="bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI 인사이트</span>를 얻으세요
                </h2>
                <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
                  복잡하고 긴 PDF 문서를 빠르게 요약하고, 핵심 키워드를 파악하며 자유롭게 대화할 수 있습니다.
                </p>
              </div>
              <div className="max-w-3xl mx-auto px-4">
                <PdfUploader onFileUpload={handleFileUpload} isLoading={isAnalyzing} />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full w-full p-2 lg:p-4 bg-gray-50/80 animate-in fade-in zoom-in-95 duration-700 relative">
            <PanelGroup autoSaveId="pdf-panel-layout" direction="horizontal" className="h-full w-full rounded-2xl overflow-hidden border border-gray-200/60 bg-white">
              <Panel defaultSize={60} minSize={30} className="relative z-10">
                <LeftPanel
                  fileUrl={fileUrl}
                  sessionId={currentSessionId}
                  onOpenSidebar={isSessionPage ? () => setIsSidebarOpen(true) : undefined}
                />
              </Panel>
              
              <PanelResizeHandle className="w-2 md:w-3 bg-gray-50 hover:bg-blue-50 transition-colors flex items-center justify-center cursor-col-resize z-20 group border-x border-gray-200/50">
                <div className="h-8 w-1 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors" />
              </PanelResizeHandle>
              
              <Panel defaultSize={40} minSize={15}>
               <RightPanel analysisData={analysisData} isAnalyzing={isAnalyzing} sessionId={currentSessionId} />
              </Panel>
            </PanelGroup>
          </div>
        )}
      </main>
    </div>
  );
}
