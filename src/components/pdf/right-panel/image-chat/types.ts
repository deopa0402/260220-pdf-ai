export interface ImageChatMessage {
  role: "user" | "ai";
  content: string;
  imageDataUrls?: string[];
}
