"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { PdfUploader } from "./PdfUploader";
import { AnalysisPanel } from "./AnalysisPanel";
import { ChatPanel } from "./ChatPanel";
import { Sidebar } from "./Sidebar";
import { ApiKeyModal } from "./ApiKeyModal";
import { Sparkles, ArrowLeft, Menu, Key } from "lucide-react";
import { store, PdfSession, Message } from "@/lib/store";

const PdfViewer = dynamic(() => import("./PdfViewer").then((mod) => mod.PdfViewer), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12 h-full w-full bg-gray-50/50 rounded-xl">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

export interface SummaryVariant {
  title: string;
  content: string;
}

export interface AnalysisData {
  summaries: SummaryVariant[];
  keywords: string[];
  insights: string;
}

export function MainApp({ initialSessionId }: { initialSessionId?: string }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [chatContext, setChatContext] = useState<string | null>(null);

  const [docText, setDocText] = useState<string | null>(null);

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
    setChatContext(null);
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
    setChatContext(null);
    
    // Auto-update URL bar without Next.js React re-rendering
    if (!skipHistory && window.location.pathname !== `/${id}`) {
        window.history.pushState(null, "", `/${id}`);
    }

    if (session.analysisData) {
      setDocText(`
[원본 PDF Base64 데이터]
${session.pdfBase64}

[시스템이 자동 분석한 내용 - 맞춤형 핵심 요약 3선]
${JSON.stringify(session.analysisData.summaries, null, 2)}

[시스템이 자동 추출한 키워드]
${JSON.stringify(session.analysisData.keywords, null, 2)}

[자동 생성된 인사이트]
${session.analysisData.insights}
      `);
      setAnalysisData(session.analysisData);
    } else {
      setDocText(null);
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
      const systemInstruction = `You are an expert document analyzer. 
Analyze the provided document and return a JSON object with EXACTLY the following structure:
{
  "summaries": [
    { "title": "1. 초보자를 위한 쉬운 설명 (개념 위주)", "content": "..." },
    { "title": "2. 실무자를 위한 핵심 요약 (빠른 파악)", "content": "..." },
    { "title": "3. 개발자 관점 심층 분석 (기술 & 보안 중심)", "content": "..." }
  ],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "insights": "List 1-3 highly actionable insights or suggestions based on the document."
}
Ensure the response is valid JSON and written in Korean.`;

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
      
      const fullContextInfo = `
[원본 PDF Base64 데이터]
${data.rawText}

[시스템이 자동 분석한 내용 - 맞춤형 핵심 요약 3선]
${JSON.stringify(data.summaries, null, 2)}

[시스템이 자동 추출한 키워드]
${JSON.stringify(data.keywords, null, 2)}

[자동 생성된 인사이트]
${data.insights}
      `;
      
      const updatedSession = { ...session, analysisData: data };
      await store.saveSession(updatedSession);
      
      setDocText(fullContextInfo);
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

  const handleUpdateMessages = async (newMessages: Message[]) => {
    if (!currentSessionId) return;
    const session = await store.getSession(currentSessionId);
    if (session) {
      session.messages = newMessages;
      await store.saveSession(session);
      loadSessions();
    }
  };

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
          <div className="h-full flex flex-col lg:flex-row p-4 gap-4 animate-in fade-in duration-500">
            {/* Left side: PDF Viewer */}
            <div className="flex-1 lg:w-1/2 h-[45vh] lg:h-full">
              <PdfViewer fileUrl={fileUrl} />
            </div>
            
            {/* Right side: Analysis & Chat */}
            <div className="flex-1 lg:w-1/2 h-[50vh] lg:h-full flex flex-col gap-4">
              <div className="h-1/2 lg:flex-1 min-h-[45vh]">
                <AnalysisPanel data={analysisData} onSelectContext={setChatContext} isLoading={isAnalyzing} />
              </div>
              <div className="h-1/2 lg:flex-1 min-h-[45vh]">
                  <ChatPanel 
                   sessionId={currentSessionId}
                   documentContext={docText}
                   initialContext={chatContext} 
                   onClearContext={() => setChatContext(null)} 
                   savedMessages={sessions.find(s => s.id === currentSessionId)?.messages || []}
                   onUpdateMessages={handleUpdateMessages}
                   isDisabled={isAnalyzing || !analysisData}
                 />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
