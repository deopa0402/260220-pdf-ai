"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Crop, Menu } from 'lucide-react';
import { store, type Annotation } from '@/lib/store';
import { useAppStore } from '@/lib/app-store';
import type { AnalysisData } from '@/components/MainApp';
import { AnnotationTooltip } from './AnnotationTooltip';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const documentOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

interface PdfViewerProps {
  fileUrl: string;
  sessionId?: string | null;
  targetPageNumber?: number;
  analysisData?: AnalysisData | null;
  onOpenSidebar?: () => void;
  onPageChange?: (page: number) => void;
}

export function PdfViewer({
  fileUrl,
  sessionId,
  targetPageNumber,
  analysisData,
  onOpenSidebar,
  onPageChange,
}: PdfViewerProps) {
  const [documentFile, setDocumentFile] = useState<string | { data: Uint8Array } | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.0);

  // Crop State
  const [isCapturing, setIsCapturing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentPos, setCurrentPos] = useState<{x: number, y: number} | null>(null);
  const annotationsBySession = useAppStore((s) => s.annotationsBySession);
  const annotations = useMemo(
    () => (sessionId ? annotationsBySession[sessionId] ?? [] : []),
    [annotationsBySession, sessionId]
  );
  const setAnnotationsForSession = useAppStore((s) => s.setAnnotationsForSession);

  const pageContainerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setPageInput("1");
    onPageChange?.(1);
  }

  useEffect(() => {
    let cancelled = false;

    const prepareDocumentFile = async () => {
      if (!fileUrl) {
        setDocumentFile(null);
        return;
      }

      setDocumentError(null);

      if (!fileUrl.startsWith("blob:")) {
        setDocumentFile(fileUrl);
        return;
      }

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`PDF fetch failed (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        setDocumentFile({ data: new Uint8Array(arrayBuffer) });
      } catch (error) {
        if (cancelled) return;

        setDocumentFile(fileUrl);
        setDocumentError(error instanceof Error ? error.message : "PDF 파일을 불러오지 못했습니다.");
      }
    };

    void prepareDocumentFile();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  const moveToPage = useCallback((nextPage: number) => {
    const maxPage = numPages > 0 ? numPages : 1;
    const clamped = Math.min(Math.max(nextPage, 1), maxPage);
    setPageNumber(clamped);
    setPageInput(String(clamped));
    onPageChange?.(clamped);
  }, [numPages, onPageChange]);

  useEffect(() => {
    if (typeof targetPageNumber !== "number") return;
    if (numPages <= 0) return;
    moveToPage(targetPageNumber);
  }, [targetPageNumber, numPages, moveToPage]);

  // Load annotations from session
  useEffect(() => {
    if (sessionId) {
      store.getSession(sessionId).then(session => {
        if (session && session.annotations) {
          setAnnotationsForSession(sessionId, session.annotations);
        } else {
          setAnnotationsForSession(sessionId, []);
        }
      });
    }
  }, [sessionId, setAnnotationsForSession]);

  // Intercept Ctrl+Scroll for zooming PDF instead of browser zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        setScale(prev => {
          const ZOOM_STEP = 0.1;
          const MIN_SCALE = 0.5;
          const MAX_SCALE = 3.0;

          if (e.deltaY < 0) {
            return Math.min(prev + ZOOM_STEP, MAX_SCALE);
          } else {
            return Math.max(prev - ZOOM_STEP, MIN_SCALE);
          }
        });
      }
    };

    // Passive false is needed to allow e.preventDefault()
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const saveAnnotationsToStore = async (newAnnots: Annotation[]) => {
    if (sessionId) {
      setAnnotationsForSession(sessionId, newAnnots);
    }
    if (!sessionId) return;
    const session = await store.getSession(sessionId);
    if (session) {
      session.annotations = newAnnots;
      await store.saveSession(session);
    }
  };

  // Mouse Handlers for Cropping
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCapturing || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCapturing || !startPos || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (!isCapturing || !startPos || !currentPos || !pageContainerRef.current) {
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // Ignore accidental small clicks
    if (width > 20 && height > 20) {
      const canvas = pageContainerRef.current.querySelector('canvas');
      if (canvas) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
           const rect = canvas.getBoundingClientRect();
           const scaleX = canvas.width / rect.width;
           const scaleY = canvas.height / rect.height;

           ctx.drawImage(
              canvas,
              x * scaleX, y * scaleY, width * scaleX, height * scaleY,
              0, 0, width, height
           );

           const imgData = tempCanvas.toDataURL('image/png');

           if (e) {
             const newAnnot: Annotation = {
               id: store.createNewSessionId(),
               position: { x: x / scale, y: (y + height + 15) / scale, width: 0, height: 0, pageNumber },
               imageOriginBase64: imgData,
               messages: [],
               createdAt: Date.now()
             };
             saveAnnotationsToStore([...annotations, newAnnot]);
           }
        }
      }
    }

    setStartPos(null);
    setCurrentPos(null);
    setIsCapturing(false); // Auto-exit capture mode
  };

  const handleMouseLeave = () => {
    if (isCapturing && startPos) handleMouseUp();
  };

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  return (
    <div className="flex flex-col h-full bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200/60 shadow-inner">
      <div className="grid grid-cols-[auto_1fr_auto] items-center px-4 py-3 bg-white border-b border-gray-200/60 z-10 shadow-sm gap-3">
        <div className="flex items-center">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
              title="사이드바 열기"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

        </div>

        <div className="flex items-center justify-center gap-2 md:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsCapturing(prev => !prev)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 ${isCapturing ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            title="영역 캡처 모드 (드래그하여 캡처)"
          >
            <Crop className="w-3.5 h-3.5" />
            영역 선택
          </button>

          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 shrink-0">
            <button
              type="button"
              onClick={() => moveToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => {
                  const parsed = Number.parseInt(pageInput, 10);
                  if (Number.isNaN(parsed)) {
                    setPageInput(String(pageNumber));
                    return;
                  }
                  moveToPage(parsed);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const parsed = Number.parseInt(pageInput, 10);
                    if (Number.isNaN(parsed)) {
                      setPageInput(String(pageNumber));
                      return;
                    }
                    moveToPage(parsed);
                  }
                }}
                className="w-14 px-2 py-1 text-sm font-medium text-center text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="페이지 번호 입력"
              />
              <span className="text-sm text-gray-400 font-normal">/ {numPages || "-"}</span>
            </div>

            <button
              type="button"
              onClick={() => moveToPage(pageNumber + 1)}
              disabled={pageNumber >= numPages}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all text-gray-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 shrink-0">
          <button type="button" onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-700">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-12 text-center text-gray-700">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale(prev => Math.min(prev + 0.2, 3))} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-700">
            <ZoomIn className="w-4 h-4" />
          </button>
          </div>
        </div>

        <div className="w-8" aria-hidden="true" />
      </div>

      <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-gray-100/50 relative">
        <div className="max-w-fit mx-auto min-w-[700px] w-fit flex justify-center pb-12">
          {documentError && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              PDF 로딩 중 경고: {documentError}
            </div>
          )}

          {!documentFile ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
          <Document
            file={documentFile}
            options={documentOptions}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => {
              setDocumentError(error.message);
            }}
            className="drop-shadow-xl"
            loading={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Used for capturing area coords */}
          <div
            ref={pageContainerRef}
            className={`relative inline-block ${isCapturing ? 'cursor-crosshair select-none' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={!isCapturing} // Disable text selection while capturing
              renderAnnotationLayer={!isCapturing}
              className="bg-white rounded-sm overflow-hidden"
            />

            {/* Capture UI Overlays */}
            {isCapturing && (
              <div className="absolute inset-0 z-40 bg-blue-900/5 mix-blend-multiply pointer-events-none" />
            )}

            {isCapturing && startPos && currentPos && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-50 ring-1 ring-white/50 shadow-sm"
                style={{
                  left: Math.min(startPos.x, currentPos.x),
                  top: Math.min(startPos.y, currentPos.y),
                  width: Math.abs(currentPos.x - startPos.x),
                  height: Math.abs(currentPos.y - startPos.y)
                }}
              />
            )}


            {/* Persistent Annotations (Mini Chatbots) */}
            {annotations.filter(a => a.position.pageNumber === pageNumber).map((annot) => (
               <AnnotationTooltip
                 key={annot.id}
                 annotation={annot}
                 analysisData={analysisData}
                 scale={scale}
                 onUpdate={(updated) => saveAnnotationsToStore(annotations.map(a => a.id === updated.id ? updated : a))}
                 onClose={() => saveAnnotationsToStore(annotations.filter(a => a.id !== annot.id))}
               />
            ))}
          </div>
        </Document>
          )}
        </div>
      </div>
    </div>
  );
}
