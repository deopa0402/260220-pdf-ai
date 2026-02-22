"use client";

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
}

export function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  return (
    <div className="flex flex-col h-full bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200/60 shadow-inner">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200/60 z-10 shadow-sm">
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
      
      <div className="flex-1 overflow-auto p-4 flex justify-center custom-scrollbar">
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
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="bg-white rounded-sm overflow-hidden"
          />
        </Document>
      </div>
    </div>
  );
}
