interface RightPanelHeaderProps {
  fileName?: string;
  onShareSession?: () => void;
}

export function RightPanelHeader({ fileName, onShareSession }: RightPanelHeaderProps) {
  if (!fileName) return null;

  return (
    <header className="shrink-0 px-4 py-3 border-b border-gray-200/60 bg-gray-50/50 sticky top-0 z-10 flex items-center gap-2">
      <h2 className="text-sm font-semibold text-gray-800 truncate flex-1">{fileName}</h2>
      {onShareSession && (
        <button
          type="button"
          onClick={onShareSession}
          className="text-xs font-medium rounded-md px-2.5 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
        >
          공유
        </button>
      )}
    </header>
  );
}
