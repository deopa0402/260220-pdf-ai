interface RightPanelTabsProps {
  activeTab: "summary" | "image";
  onChange: (tab: "summary" | "image") => void;
}

export function RightPanelTabs({ activeTab, onChange }: RightPanelTabsProps) {
  return (
    <div className="shrink-0 px-4 pt-3 pb-2 bg-white border-b border-gray-100">
      <div className="inline-flex items-center rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => onChange("summary")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === "summary"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          요약
        </button>
        <button
          type="button"
          onClick={() => onChange("image")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === "image"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          이미지 생성
        </button>
      </div>
    </div>
  );
}
