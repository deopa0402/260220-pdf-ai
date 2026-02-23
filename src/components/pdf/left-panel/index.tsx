"use client";

import dynamic from "next/dynamic";

const PdfViewerComponent = dynamic(() => import("../../PdfViewer").then((mod) => mod.PdfViewer), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12 h-full w-full bg-gray-50/50 rounded-2xl border border-gray-200/60">
      <div className="flex flex-col gap-4 items-center animate-in fade-in duration-500 delay-150">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">문서를 화면에 띄우는 중입니다...</p>
      </div>
    </div>
  ),
});

interface LeftPanelProps {
  fileUrl: string | null;
  sessionId: string | null;
}

export function LeftPanel({ fileUrl, sessionId }: LeftPanelProps) {
  if (!fileUrl) return null;

  return (
    <div className="h-full bg-white rounded-2xl border border-gray-200/60 shadow-lg overflow-hidden flex flex-col relative z-10">
      <PdfViewerComponent fileUrl={fileUrl} sessionId={sessionId} />
    </div>
  );
}
