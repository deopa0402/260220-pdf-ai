import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true }); // fallback

function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/^"|"$/g, "").trim();
  return new GoogleGenerativeAI(apiKey);
}

export async function POST(req: NextRequest) {
  try {
    const ai = getGeminiClient();
    const { messages, documentContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
    }

    // 2. Format context and system instruction
    const systemInstruction = `You are an intelligent document assistant.
    You must answer the user's questions based primarily on the context of the provided document.
    If the answer is not in the document, acknowledge that it's not present and do your best to answer based on external knowledge, clearly stating the distinction.
    Answer in a friendly, conversational Korean tone.`;

    // 3. Convert messages format to Gemini format
    const isCombinedContext = documentContext && documentContext.includes("[원본 PDF Base64 데이터]");
    const base64Pdf = isCombinedContext ? documentContext.split("[원본 PDF Base64 데이터]")[1].split("[시스템이 자동 분석한 내용 - 맞춤형 핵심 요약 3선]")[0].trim() : documentContext;
    const extraContextText = isCombinedContext ? documentContext.split("[시스템이 자동 분석한 내용 - 맞춤형 핵심 요약 3선]")[1].trim() : "";

    const formattedHistory: Content[] = messages.slice(0, -1).map((msg: { role: string; content: string }, index: number, arr: { role: string; content: string }[]) => {
      const parts: Part[] = [{ text: msg.content }];
      
      if (documentContext && msg.role === 'user' && index === arr.findIndex(m => m.role === 'user')) {
        if (extraContextText) {
          parts.unshift({ text: "[이전 분석 내용 요약입니다. 참조하세요]\n" + extraContextText });
        }
        parts.unshift({ inlineData: { data: base64Pdf, mimeType: "application/pdf" } });
      }

      return {
        role: msg.role === 'ai' ? 'model' : 'user',
        parts
      };
    });

    const lastMessage = messages[messages.length - 1];
    const lastParts: Part[] = [];
    if (documentContext && !formattedHistory.some(m => m.role === 'user')) {
      if (extraContextText) {
        lastParts.push({ text: "[이전 분석 내용 요약입니다. 참조하세요]\n" + extraContextText });
      }
      lastParts.push({ inlineData: { data: base64Pdf, mimeType: "application/pdf" } });
    }
    lastParts.push({ text: lastMessage.content });
    
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction
    });

    const chatSession = model.startChat({
      history: formattedHistory
    });

    const response = await chatSession.sendMessage(lastParts);
    const responseText = response.response.text();

    return NextResponse.json({ response: responseText });

  } catch (error: unknown) {
    console.error("Error generating chat response:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate chat response" },
      { status: 500 }
    );
  }
}
