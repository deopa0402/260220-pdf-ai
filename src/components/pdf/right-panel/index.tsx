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
  onShareSession?: () => void;
  showImageTab?: boolean;
  sharedChatConfig?: {
    publicId: string;
    password: string;
  };
}

export function RightPanel({
  analysisData,
  isAnalyzing,
  sessionId,
  fileName,
  onCitationClick,
  onShareSession,
  showImageTab = true,
  sharedChatConfig,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "image">("summary");
  const currentFileName = useAppStore((s) => s.currentFileName);
  const effectiveTab = showImageTab ? activeTab : "summary";

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <RightPanelHeader fileName={fileName || currentFileName} onShareSession={onShareSession} />
      <RightPanelTabs activeTab={effectiveTab} onChange={setActiveTab} showImageTab={showImageTab} />

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {effectiveTab === "summary" ? (
          <SummaryPanel
            analysisData={analysisData}
            isAnalyzing={isAnalyzing}
            sessionId={sessionId}
            onCitationClick={onCitationClick}
            sharedChatConfig={sharedChatConfig}
          />
        ) : (
          <ImageChatPanel sessionId={sessionId} />
        )}
      </div>
    </div>
  );
}
