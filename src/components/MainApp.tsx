"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PdfUploader } from "./PdfUploader";
import { AnalysisPanel } from "./AnalysisPanel";
import { ChatPanel } from "./ChatPanel";
import { Sparkles, ArrowLeft } from "lucide-react";

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

export function MainApp() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [chatContext, setChatContext] = useState<string | null>(null);

  const [docText, setDocText] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    
    // Create local object URL for PDF Viewer
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    try {
      // Create FormData to send the file to the backend
      const formData = new FormData();
      formData.append("file", file);

      // Call API Endpoint for Analysis
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to analyze PDF");
      }

      const data = await res.json();
      
      // Update states
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
      setDocText(fullContextInfo);
      setAnalysisData(data);
    } catch (e: unknown) {
      console.error(e);
      alert("문서 분석 중 에러가 발생했습니다: " + (e instanceof Error ? e.message : "알 수 없는 에러"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFileUrl(null);
    setAnalysisData(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 h-16 shrink-0 flex items-center px-6 shadow-sm z-50">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex flex-col items-center justify-center mr-3 shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight">
            Gemini <span className="text-blue-600 font-extrabold">PDF AI</span>
          </h1>
        </div>
        
        {fileUrl && (
          <button 
            type="button"
            onClick={handleReset}
            className="ml-auto text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg px-4 py-2 transition-colors flex items-center shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            새 문서 분석
          </button>
        )}
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
                <AnalysisPanel data={analysisData} onSelectContext={setChatContext} />
              </div>
              <div className="h-1/2 lg:flex-1 min-h-[45vh]">
                 <ChatPanel 
                   documentContext={docText}
                   initialContext={chatContext} 
                   onClearContext={() => setChatContext(null)} 
                 />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
