export interface ImageChatMessage {
  role: "user" | "ai";
  content: string;
  imageDataUrl?: string;
}
