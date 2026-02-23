import { MessageSquare, Trash2, Plus, X } from "lucide-react";
import { PdfSession } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  sessions: PdfSession[];
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}

export function Sidebar({ isOpen, sessions, currentSessionId, onSelect, onDelete, onNew, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile/tablet */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-md shadow-2xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">이전 대화 내역</h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => { onNew(); onClose(); }}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 문서 분석
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              저장된 대화 내역이 없습니다.
            </div>
          ) : (
            sessions.map(session => (
              <div 
                key={session.id}
                className={cn(
                  "group relative flex flex-col p-3 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer",
                  currentSessionId === session.id && "bg-blue-50/50 border-blue-200/60 shadow-xs"
                )}
                onClick={() => { onSelect(session.id); onClose(); }}
              >
                <div className="flex items-center text-sm font-semibold text-gray-800 mb-1 truncate pr-8">
                  <MessageSquare className={cn("w-4 h-4 mr-2 shrink-0", currentSessionId === session.id ? "text-blue-600" : "text-gray-400")} />
                  <span className="truncate">{session.fileName}</span>
                </div>
                <div className="text-xs text-gray-400 ml-6">
                  {new Date(session.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("이 대화 내역을 정말 삭제하시겠습니까?")) {
                      onDelete(session.id);
                    }
                  }}
                  className="absolute right-3 top-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
