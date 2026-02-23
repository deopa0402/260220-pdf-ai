"use client";

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import Draggable from 'react-draggable';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Crop, X, Sparkles, GripHorizontal, Send } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { store, type Annotation } from '@/lib/store';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
  sessionId?: string | null;
}

export function PdfViewer({ fileUrl, sessionId }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // Crop State
  const [isCapturing, setIsCapturing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentPos, setCurrentPos] = useState<{x: number, y: number} | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  const pageContainerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  // Load annotations from session
  useEffect(() => {
    if (sessionId) {
      store.getSession(sessionId).then(session => {
        if (session && session.annotations) {
          setAnnotations(session.annotations);
        } else {
          setAnnotations([]);
        }
      });
    } else {
      setAnnotations([]);
    }
  }, [sessionId]);

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
    setAnnotations(newAnnots);
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

  return (
    <div className="flex flex-col h-full bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200/60 shadow-inner">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200/60 z-10 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button 
              type="button" 
              onClick={() => setIsCapturing(!isCapturing)} 
              className={`p-1.5 rounded-md transition-all flex items-center justify-center ${isCapturing ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white hover:shadow-sm text-gray-700'}`}
              title="영역 캡처 모드 (드래그하여 캡처)"
            >
              <Crop className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-16 text-center text-gray-700">
            {pageNumber} <span className="text-gray-400 font-normal">/ {numPages || '-'}</span>
          </span>
          <button
            type="button"
            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
            disabled={pageNumber >= numPages}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all text-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        </div>
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button type="button" onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-700">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-12 text-center text-gray-700">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale(prev => Math.min(prev + 0.2, 3))} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-700">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-gray-100/50 relative">
        <div className="mx-auto min-w-[700px] w-fit flex justify-center pb-12 px-[400px]">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
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
                 scale={scale}
                 onUpdate={(updated) => saveAnnotationsToStore(annotations.map(a => a.id === updated.id ? updated : a))}
                 onClose={() => saveAnnotationsToStore(annotations.filter(a => a.id !== annot.id))}
               />
            ))}
          </div>
        </Document>
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual annotation tooltips
function AnnotationTooltip({ 
  annotation, 
  scale, 
  onClose,
  onUpdate
}: { 
  annotation: Annotation;
  scale: number;
  onClose: () => void;
  onUpdate: (updated: Annotation) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: annotation.position.x * scale, y: annotation.position.y * scale });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update position when scale changes
  useEffect(() => {
    setPosition({ x: annotation.position.x * scale, y: annotation.position.y * scale });
  }, [scale, annotation.position.x, annotation.position.y]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [annotation.messages, isTyping]);

  useEffect(() => {
    // Initial auto-send
    if (annotation.messages.length === 0 && !isTyping) {
      handleSend("이 영역에 대해 분석하고 설명해줘", true);
    }
  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-send once
  }, []);

  const handleStop = (_: unknown, data: { x: number; y: number }) => {
    const newX = data.x / scale;
    const newY = data.y / scale;
    setPosition({ x: data.x, y: data.y });
    onUpdate({
      ...annotation,
      position: { ...annotation.position, x: newX, y: newY }
    });
  };

  const handleSend = async (content: string, isInitial = false) => {
    if (!content.trim() || isTyping) return;
    
    let currentMessages = annotation.messages;
    if (!isInitial) {
      currentMessages = [...annotation.messages, { role: "user" as const, content: content.trim() }];
      onUpdate({ ...annotation, messages: currentMessages });
    }
    
    setInput("");
    setIsTyping(true);

    try {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (!apiKey) throw new Error("API 키가 없습니다.");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const historyParts = currentMessages.map(m => `[${m.role === "user" ? "사용자" : "AI"}]: ${m.content}`).join("\\n\\n");
      const prompt = isInitial 
        ? "선택된 이미지 영역의 핵심 내용을 3문장 이내로 짧고 명확하게 한국어로 요약 및 설명해줘. 불필요한 인사말이나 부연 설명은 생략해."
        : `이전 대화:\\n${historyParts}\\n\\n사용자: ${content}\\n\\n위 이미지와 이전 대화를 기반으로 한국어로 간결하고 명확하게 답변해줘.`;

      const base64Data = annotation.imageOriginBase64.split(",")[1];
      const mimeType = annotation.imageOriginBase64.split(";")[0].split(":")[1];

      const result = await model.generateContentStream([
        prompt,
        {
          inlineData: { data: base64Data, mimeType }
        }
      ]);

      let botResponse = "";
      // Initialize empty AI response chunk for streaming effect
      const streamingMessages = [...currentMessages, { role: "ai" as const, content: "" }];
      onUpdate({ ...annotation, messages: streamingMessages });

      for await (const chunk of result.stream) {
        botResponse += chunk.text();
        const updated = [...currentMessages, { role: "ai" as const, content: botResponse }];
        onUpdate({ ...annotation, messages: updated });
      }

    } catch (err) {
      console.error(err);
      onUpdate({
        ...annotation,
        messages: [...currentMessages, { role: "ai" as const, content: "응답 중 오류가 발생했습니다." }]
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      scale={scale}
      handle=".drag-handle-chat"
      position={position}
      onStop={handleStop}
    >
      <div ref={nodeRef} className="absolute top-0 left-0 m-0 z-50 cursor-auto">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} className="bg-white rounded-r-2xl shadow-xl shadow-black/10 border border-gray-200/80 flex flex-col min-w-[340px] w-[340px] max-w-[800px] min-h-[360px] max-h-[800px] overflow-hidden resize">
          <div className="drag-handle-chat bg-white border-b border-gray-100 flex justify-between items-center cursor-move hover:bg-gray-50 transition-colors shrink-0">
            <div className="flex items-center px-3 py-2.5 flex-1 overflow-hidden">
               <GripHorizontal className="w-4 h-4 mr-2 text-gray-400 shrink-0"/>
               <div className="h-6 w-6 shrink-0 bg-blue-50 rounded flex items-center justify-center mr-2">
                 <Sparkles className="w-3.5 h-3.5 text-blue-600"/>
               </div>
               <span className="text-[13px] font-bold text-gray-800 truncate">캡처 영역 분석 챗봇</span>
            </div>
            <div className="flex items-center pr-2 gap-1">
               <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="닫기 및 삭제">
                 <X className="w-4 h-4"/>
               </button>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div ref={scrollRef} className="flex-1 flex flex-col p-3 overflow-y-auto space-y-3 bg-white custom-scrollbar text-[13px]">
             {annotation.messages.length === 0 && isTyping ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 space-y-3 h-full animate-pulse">
                 <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                   <Sparkles className="w-4 h-4 text-blue-500" />
                 </div>
                 <p className="font-medium text-[12.5px]">이미지를 심층 분석하고 있습니다...</p>
               </div>
             ) : (
               annotation.messages.map((msg, i) => (
                 // biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only
                 <div key={`msg-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] px-3.5 py-2.5 leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-sm' : 'bg-gray-50 text-gray-800 border border-gray-200/60 rounded-2xl rounded-tl-sm'}`}>
                     {msg.content}
                   </div>
                 </div>
               ))
             )}
             
             {isTyping && annotation.messages.length > 0 && annotation.messages[annotation.messages.length - 1].role !== "ai" && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 text-gray-800 border border-gray-200/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center space-x-1.5">
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
             )}
          </div>
          
          {/* Input */}
          <div className="p-2.5 bg-white border-t border-gray-100 shrink-0">
             <div className="flex relative rounded-xl bg-gray-50/80 border border-gray-200/80 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all group">
               <input
                 type="text"
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                 placeholder="이미지 내용에 대해 질문하세요..."
                 disabled={isTyping}
                 className="w-full flex-1 bg-transparent border-transparent rounded-xl pl-3.5 pr-10 py-3 text-[13px] outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50"
               />
               <button 
                 type="button" 
                 onClick={() => handleSend(input)} 
                 disabled={isTyping || !input.trim()}
                 className="absolute right-1 top-1 bottom-1 p-1.5 text-gray-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
               >
                 <Send className="w-4 h-4 ml-0.5" />
               </button>
             </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
}
