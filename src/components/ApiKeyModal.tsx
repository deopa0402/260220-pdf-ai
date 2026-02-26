import { useState, useEffect } from "react";
import { Key, AlertCircle, X } from "lucide-react";

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
      setError("올바른 API 키 형식이 아닙니다. (AIzaSy...)");
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
            <h2 className="font-bold text-lg tracking-tight">API 키 입력</h2>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 text-blue-200 hover:text-white rounded-md hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">문서 분석을 시작하려면 API 키를 입력하세요.</p>
          
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-semibold text-gray-700 ml-1">API 키</label>
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
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
