import { ImagePlus, Send } from "lucide-react";
import { useRef, useState } from "react";

interface ImageChatInputProps {
  onSend: (content: string) => void;
  onPickImage: (file: File) => void;
  hasAttachment?: boolean;
  disabled?: boolean;
}

export function ImageChatInput({ onSend, onPickImage, hasAttachment, disabled }: ImageChatInputProps) {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if ((!input.trim() && !hasAttachment) || disabled) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const adjustHeight = (value: string) => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    if (!value) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="p-3 bg-white border-t border-gray-200 mt-auto sticky bottom-0 z-20">
      <div className="flex relative rounded-xl bg-gray-50/50 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all group">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="absolute left-1 top-1 bottom-1 px-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors disabled:opacity-40"
          title="이미지 첨부"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPickImage(file);
            event.currentTarget.value = "";
          }}
        />
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={(e) => {
            const next = e.target.value;
            setInput(next);
            adjustHeight(next);
          }}
          onPaste={(event) => {
            const items = event.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
              if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                  onPickImage(file);
                  event.preventDefault();
                }
                break;
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
          placeholder="예: 체크한 영역을 인포그래픽 스타일로 재생성해줘"
          className="w-full flex-1 bg-transparent border-transparent rounded-xl pl-11 pr-12 py-3 text-[13.5px] outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50 resize-none leading-5 max-h-36 overflow-y-auto"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!input.trim() && !hasAttachment)}
          className="absolute right-1 top-1 bottom-1 p-2 bg-gray-100/50 text-gray-400 focus-within:text-white focus-within:bg-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center group-focus-within:bg-blue-600 group-focus-within:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    </div>
  );
}
