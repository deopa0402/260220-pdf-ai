import { useState, useEffect } from "react";
import { Key, AlertCircle, X, ChevronRight } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onClose?: () => void;
}

export function ApiKeyModal({ isOpen, onSave, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setApiKey(localStorage.getItem("gemini_api_key") || "");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith("AIzaSy")) {
      setError("유효한 Gemini API Key 형식이 아닙니다. (AIzaSy... 로 시작)");
      return;
    }
    localStorage.setItem("gemini_api_key", trimmed);
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-100 flex flex-col">
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-blue-100" />
            <h2 className="font-bold text-lg tracking-tight">API Key 설정</h2>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 text-blue-200 hover:text-white rounded-md hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            대용량 PDF 문서 분석을 위해 Google Gemini API Key가 필요합니다. 
            해당 키는 서버로 전송되지 않으며 <strong className="text-blue-600">오직 회원님의 브라우저(Local)에만 안전하게 저장</strong>되어 직접 구글과 통신합니다.
          </p>
          
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-semibold text-gray-700 ml-1">Gemini API Key</label>
            <input 
              id="apiKey"
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 text-gray-900"
            />
            {error && (
              <div className="flex items-center text-red-500 text-sm mt-2 ml-1">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="pt-2">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium group">
               API Key 무료 발급받기
               <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
             </a>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          {onClose && (
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg mr-2 transition-colors"
            >
              취소
            </button>
          )}
          <button 
            type="button"
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
          >
            저장 및 시작
          </button>
        </div>
      </div>
    </div>
  );
}
