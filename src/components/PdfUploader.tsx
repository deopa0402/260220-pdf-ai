"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfUploaderProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export function PdfUploader({ onFileUpload, isLoading }: PdfUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer bg-white flex flex-col items-center justify-center min-h-[300px]",
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 hover:shadow-md",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      {isLoading ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-lg font-medium text-gray-700">AI가 문서를 분석하고 있습니다...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
            <UploadCloud className="w-10 h-10" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {isDragActive ? "여기에 PDF 파일을 놓으세요" : "PDF 파일을 업로드하세요"}
          </p>
          <p className="text-base text-gray-500">드래그 앤 드롭하거나 클릭해서 파일을 선택하세요.</p>
        </div>
      )}
    </div>
  );
}
