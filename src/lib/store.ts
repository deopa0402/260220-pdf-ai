import localforage from "localforage";
import { v4 as uuidv4 } from "uuid";
import type { AnalysisData } from "@/components/MainApp";
import { pdfSessionSchema } from "@/lib/analysis-schema";

export interface Message {
  role: "user" | "ai";
  content: string;
  citations?: number[];
}

export interface AnnotationMessage {
  role: "user" | "ai";
  content: string;
  citations?: number[];
}

export interface Annotation {
  id: string; // unique uuid for the annotation
  position: { x: number; y: number; width: number; height: number; pageNumber: number }; // Absolute position normalized to scale 1.0 (PDF coordinate system)
  imageOriginBase64: string; // The base64 crop image to be sent to Gemini
  messages: AnnotationMessage[]; // Mini-chat conversation related to this crop
  createdAt: number;
}

export interface PdfSession {
  id: string;
  fileName: string;
  pdfBase64: string; // Used to reconstruct the PDF view and send to API
  analysisData: AnalysisData | null;
  messages: Message[];
  annotations?: Annotation[]; // New field for persistent tooltip chats
  createdAt: number;
}

// Ensure localforage uses IndexedDB, but only on the client side
if (typeof window !== "undefined") {
  localforage.config({
    driver: localforage.INDEXEDDB,
    name: "PdfAiApp",
    version: 1.0,
    storeName: "pdf_sessions",
  });
}

export const store = {
  async getSessions(): Promise<PdfSession[]> {
    if (typeof window === "undefined") return [];
    
    const sessions: PdfSession[] = [];
    await localforage.iterate((value: unknown) => {
      const parsed = pdfSessionSchema.safeParse(value);
      if (parsed.success) {
        sessions.push(parsed.data as PdfSession);
      }
    });
    // Sort descending by creation time
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getSession(id: string): Promise<PdfSession | null> {
    if (typeof window === "undefined") return null;
    const value = await localforage.getItem<unknown>(id);
    const parsed = pdfSessionSchema.safeParse(value);
    return parsed.success ? (parsed.data as PdfSession) : null;
  },

  async saveSession(session: PdfSession): Promise<void> {
    if (typeof window === "undefined") return;
    const parsed = pdfSessionSchema.safeParse(session);
    if (!parsed.success) {
      throw new Error("Invalid session data shape");
    }
    await localforage.setItem(session.id, parsed.data);
  },

  async deleteSession(id: string): Promise<void> {
    if (typeof window === "undefined") return;
    await localforage.removeItem(id);
  },

  createNewSessionId(): string {
    return uuidv4();
  }
};
