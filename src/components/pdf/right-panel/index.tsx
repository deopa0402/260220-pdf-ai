"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import type { AnalysisData } from "../../MainApp";
import { ImageChatPanel } from "./image-chat";
import { RightPanelHeader } from "./RightPanelHeader";
import { RightPanelTabs } from "./RightPanelTabs";
import { SummaryPanel } from "./summary";

interface RightPanelProps {
  analysisData: AnalysisData | null;
  isAnalyzing?: boolean;
  sessionId?: string | null;
  fileName?: string;
  onCitationClick?: (page: number) => void;
}

export function RightPanel({ analysisData, isAnalyzing, sessionId, fileName, onCitationClick }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "image">("summary");
  const currentFileName = useAppStore((s) => s.currentFileName);

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <RightPanelHeader fileName={fileName || currentFileName} />
      <RightPanelTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {activeTab === "summary" ? (
          <SummaryPanel
            analysisData={analysisData}
            isAnalyzing={isAnalyzing}
            sessionId={sessionId}
            onCitationClick={onCitationClick}
          />
        ) : (
          <ImageChatPanel sessionId={sessionId} />
        )}
      </div>
    </div>
  );
}
