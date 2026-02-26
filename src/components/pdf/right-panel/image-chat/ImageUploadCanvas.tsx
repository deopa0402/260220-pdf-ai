"use client";

import { useEffect, useRef, useState } from "react";
import { Brush, Check, Redo2, RotateCcw, Undo2, X } from "lucide-react";

interface ImageUploadCanvasProps {
  imageDataUrl: string;
  disabled?: boolean;
  onClose: () => void;
  onApply: (nextImageDataUrl: string) => void;
}

export function ImageUploadCanvas({ imageDataUrl, disabled, onClose, onApply }: ImageUploadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [baseImageDataUrl, setBaseImageDataUrl] = useState(imageDataUrl);
  const [history, setHistory] = useState<string[]>([imageDataUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    setBaseImageDataUrl(imageDataUrl);
    setHistory([imageDataUrl]);
    setHistoryIndex(0);
  }, [imageDataUrl]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const maxWidth = 1280;
      const scale = Math.min(1, maxWidth / image.width);
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = baseImageDataUrl;
  }, [baseImageDataUrl]);

  const drawPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing || disabled) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();

    const nextSnapshot = canvas.toDataURL("image/png");
    const truncated = history.slice(0, historyIndex + 1);
    if (truncated[truncated.length - 1] === nextSnapshot) return;
    const nextHistory = [...truncated, nextSnapshot].slice(-50);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const applySnapshot = (snapshot: string) => {
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = snapshot;
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    applySnapshot(history[nextIndex]);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    applySnapshot(history[nextIndex]);
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onApply(canvas.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Brush className="w-4 h-4 text-blue-600" />
            이미지 체크 편집
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={disabled || historyIndex <= 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" />
            이전
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={disabled || historyIndex >= history.length - 1}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40"
          >
            <Redo2 className="w-3.5 h-3.5" />
            앞으로
          </button>
        </div>

        <div className="p-4 bg-gray-100/50">
          <div className="rounded-lg border border-gray-200 bg-white overflow-auto max-h-[70vh]">
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              onPointerDown={handlePointerDown}
              onPointerMove={drawPoint}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full h-auto cursor-crosshair"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => {
              setBaseImageDataUrl(imageDataUrl);
              setHistory([imageDataUrl]);
              setHistoryIndex(0);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            disabled={disabled}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            원본으로 되돌리기
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={disabled}
          >
            <Check className="w-3.5 h-3.5" />
            편집 적용
          </button>
        </div>
      </div>
    </div>
  );
}
