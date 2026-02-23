import localforage from "localforage";
import { v4 as uuidv4 } from "uuid";
import { AnalysisData } from "@/components/MainApp";

export interface Message {
  role: "user" | "ai";
  content: string;
}

export interface PdfSession {
  id: string;
  fileName: string;
  pdfBase64: string; // Used to reconstruct the PDF view and send to API
  analysisData: AnalysisData | null;
  messages: Message[];
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
    await localforage.iterate((value: PdfSession) => {
      sessions.push(value);
    });
    // Sort descending by creation time
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getSession(id: string): Promise<PdfSession | null> {
    if (typeof window === "undefined") return null;
    return await localforage.getItem<PdfSession>(id);
  },

  async saveSession(session: PdfSession): Promise<void> {
    if (typeof window === "undefined") return;
    await localforage.setItem(session.id, session);
  },

  async deleteSession(id: string): Promise<void> {
    if (typeof window === "undefined") return;
    await localforage.removeItem(id);
  },

  createNewSessionId(): string {
    return uuidv4();
  }
};
