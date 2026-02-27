"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { LeftPanel } from "@/components/pdf/left-panel";
import { RightPanel } from "@/components/pdf/right-panel";
import type { AnalysisData } from "@/components/MainApp";
import { useAppStore } from "@/lib/app-store";
import type { Message } from "@/lib/store";

interface ShareSessionClientProps {
  publicId: string;
}

export function ShareSessionClient({ publicId }: ShareSessionClientProps) {
  const [password, setPassword] = useState("");
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [fileName, setFileName] = useState<string>("공유 문서");
  const [pageNumber, setPageNumber] = useState(1);

  const setChatMessagesForSession = useAppStore((s) => s.setChatMessagesForSession);
  const sharedSessionId = useMemo(() => `share-${publicId}`, [publicId]);

  useEffect(() => {
    return () => {
      if (fileUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const openSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/share/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "세션을 열 수 없습니다.");

      const nextAnalysisData = (data.payload?.analysisData ?? null) as AnalysisData | null;
      const nextFileName = (data.payload?.fileName as string | undefined) || "공유 문서";
      const nextMessages = Array.isArray(data.payload?.messages)
        ? (data.payload.messages as Message[])
        : [];

      const blob = await fetch(`data:application/pdf;base64,${data.pdfBase64}`).then((res) => res.blob());
      const nextFileUrl = URL.createObjectURL(blob);

      if (fileUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(fileUrl);
      }

      setFileUrl(nextFileUrl);
      setAnalysisData(nextAnalysisData);
      setFileName(nextFileName);
      setChatMessagesForSession(sharedSessionId, nextMessages);
      setOpened(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!opened || !fileUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-3">공유 세션 열기</h1>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="button"
            disabled={loading || !password.trim()}
            onClick={openSession}
            className="mt-3 w-full bg-blue-600 text-white text-sm font-medium rounded-lg px-3 py-2 disabled:opacity-50"
          >
            {loading ? "열는 중..." : "열기"}
          </button>
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full p-2 lg:p-4 bg-gray-50/80">
      <PanelGroup autoSaveId="pdf-share-panel-layout" direction="horizontal" className="h-full w-full rounded-2xl overflow-hidden border border-gray-200/60 bg-white">
        <Panel defaultSize={60} minSize={30} className="relative z-10">
          <LeftPanel
            fileUrl={fileUrl}
            sessionId={sharedSessionId}
            pageNumber={pageNumber}
            analysisData={analysisData}
            onPageChange={setPageNumber}
          />
        </Panel>

        <PanelResizeHandle className="w-2 md:w-3 bg-gray-50 hover:bg-blue-50 transition-colors flex items-center justify-center cursor-col-resize z-20 group border-x border-gray-200/50">
          <div className="h-8 w-1 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors" />
        </PanelResizeHandle>

        <Panel defaultSize={40} minSize={15}>
          <RightPanel
            analysisData={analysisData}
            isAnalyzing={false}
            sessionId={sharedSessionId}
            fileName={fileName}
            onCitationClick={setPageNumber}
            showImageTab={false}
            sharedChatConfig={{ publicId, password }}
          />
        </Panel>
      </PanelGroup>
      {error && <p className="fixed top-3 left-1/2 -translate-x-1/2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">{error}</p>}
    </div>
  );
}
