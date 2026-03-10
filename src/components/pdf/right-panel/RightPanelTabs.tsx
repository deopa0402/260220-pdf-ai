import { IMAGE_MODELS, QNA_MODELS, type ImageModel, type QnaModel } from "@/lib/ai-models";

interface RightPanelTabsProps {
  activeTab: "summary" | "image";
  onChange: (tab: "summary" | "image") => void;
  showImageTab?: boolean;
  selectedQnaModel: QnaModel;
  selectedImageModel: ImageModel;
  onChangeQnaModel: (model: QnaModel) => void;
  onChangeImageModel: (model: ImageModel) => void;
}

export function RightPanelTabs({
  activeTab,
  onChange,
  showImageTab = true,
  selectedQnaModel,
  selectedImageModel,
  onChangeQnaModel,
  onChangeImageModel,
}: RightPanelTabsProps) {
  return (
    <div className="shrink-0 px-4 pt-3 pb-2 bg-white border-b border-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
          {showImageTab && (
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
          )}
        </div>

        {activeTab === "summary" ? (
          <select
            value={selectedQnaModel}
            onChange={(e) => onChangeQnaModel(e.target.value as QnaModel)}
            className="h-8 max-w-[220px] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 outline-none focus:border-blue-500"
            aria-label="QnA 모델 선택"
          >
            {QNA_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={selectedImageModel}
            onChange={(e) => onChangeImageModel(e.target.value as ImageModel)}
            className="h-8 max-w-[220px] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 outline-none focus:border-blue-500"
            aria-label="이미지 모델 선택"
          >
            {IMAGE_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
