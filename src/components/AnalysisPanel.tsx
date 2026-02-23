"use client";

import { useState } from "react";
import { FileText, Key, Lightbulb, MessageSquarePlus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type AnalysisData } from "./MainApp";

interface AnalysisPanelProps {
  data: AnalysisData | null;
  onSelectContext: (context: string) => void;
  isLoading?: boolean;
}

export function AnalysisPanel({ data, onSelectContext, isLoading }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "issues" | "insights">("summary");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-white rounded-xl border border-gray-200/60 shadow-sm">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium animate-pulse">AI가 문서를 심층 분석하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="flex items-center justify-center h-full text-gray-400 bg-white rounded-xl border border-gray-200/60 shadow-sm">
      <div className="flex flex-col items-center space-y-3">
        <p className="text-sm font-medium">분석 데이터가 없습니다.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="flex p-2 gap-2 bg-gray-50/80 border-b border-gray-100">
        <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")} icon={<FileText className="w-4 h-4 mr-2" />} label="핵심 요약" />
        <TabButton active={activeTab === "issues"} onClick={() => setActiveTab("issues")} icon={<AlertTriangle className="w-4 h-4 mr-2" />} label="확인 필요 사항" />
        <TabButton active={activeTab === "insights"} onClick={() => setActiveTab("insights")} icon={<Lightbulb className="w-4 h-4 mr-2" />} label="작업 제안" />
      </div>

      <div className="p-6 overflow-y-auto flex-1 text-gray-700 leading-relaxed custom-scrollbar bg-white min-h-0">
        {activeTab === "summary" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight px-1">맞춤형 핵심 요약 3선</h3>
            <p className="text-sm text-gray-500 mb-4 px-1">
              원하는 관점의 요약을 펼쳐보고, 질문 버튼을 눌러 해당 내용에 대해 Q&A를 진행해 보세요.
            </p>
            
            <Accordion type="single" collapsible className="w-full border border-gray-200/70 rounded-lg overflow-hidden bg-white shadow-sm" defaultValue="item-0">
              {data.summaries.map((variant, idx) => (
                <AccordionItem value={`item-${idx}`} key={variant.title}>
                  <AccordionTrigger className="hover:bg-blue-50/40 data-[state=open]:bg-blue-50/40 data-[state=open]:text-blue-700 transition-colors">
                    {variant.title}
                  </AccordionTrigger>
                  <AccordionContent className="bg-white pt-2 pb-4">
                    <div className="prose prose-blue max-w-none whitespace-pre-wrap text-[14px]">
                      {variant.content}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
        
        {activeTab === "issues" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">확인 필요 사항</h3>
            <div className="prose prose-blue max-w-none whitespace-pre-wrap">{data.issues}</div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">인사이트 및 실무 적용 방안</h3>
            <div className="prose prose-blue max-w-none whitespace-pre-wrap">{data.insights}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center py-2.5 text-sm font-semibold rounded-lg transition-all duration-200",
        active 
          ? "bg-white text-blue-600 shadow-sm border border-gray-200/50" 
          : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
