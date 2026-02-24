interface RightPanelHeaderProps {
  fileName?: string;
}

export function RightPanelHeader({ fileName }: RightPanelHeaderProps) {
  if (!fileName) return null;

  return (
    <header className="shrink-0 px-4 py-3 border-b border-gray-200/60 bg-gray-50/50 sticky top-0 z-10">
      <h2 className="text-sm font-semibold text-gray-800 truncate">{fileName}</h2>
    </header>
  );
}
