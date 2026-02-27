import { NextResponse } from "next/server";
import { z } from "zod";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { consumeChatQuota } from "@/lib/db/share-repository";

dotenv.config({ path: ".env", override: true });

const requestSchema = z.object({
  publicId: z.string().uuid(),
  password: z.string().min(1),
  message: z.string().min(1),
  history: z.array(z.object({ role: z.enum(["user", "ai"]), content: z.string() })).default([]),
});

function resolveGeminiApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY;
  if (!raw) return null;
  const normalized = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!normalized) return null;
  return normalized;
}

function buildSharedContext(payload: Record<string, unknown>): string {
  const fileName = typeof payload.fileName === "string" ? payload.fileName : "공유 문서";
  const analysisData = payload.analysisData as
    | {
        title?: string;
        summaries?: Array<{ lines?: Array<{ text?: string }> }>;
        keywords?: string[];
      }
    | undefined;

  const title = analysisData?.title || fileName;
  const summaryLines = analysisData?.summaries?.flatMap((item) => item.lines?.map((line) => line.text ?? "") ?? []) ?? [];
  const keywords = analysisData?.keywords ?? [];

  return [
    `문서 제목: ${title}`,
    summaryLines.length ? `요약: ${summaryLines.slice(0, 8).join(" | ")}` : "",
    keywords.length ? `키워드: ${keywords.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    const { publicId, password, message, history } = parsed.data;
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "서버 GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }
    if (!apiKey.startsWith("AIza")) {
      return NextResponse.json({ error: "서버 GEMINI_API_KEY 형식이 올바르지 않습니다." }, { status: 500 });
    }

    const row = await consumeChatQuota(publicId, password);
    if (!row) {
      return NextResponse.json({ error: "채팅 가능 횟수를 초과했거나 비밀번호가 올바르지 않습니다." }, { status: 403 });
    }

    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const context = buildSharedContext(payload);
    const promptHistory = [...history, { role: "user" as const, content: message }]
      .map((item) => `[${item.role === "user" ? "사용자" : "AI"}] ${item.content}`)
      .join("\n\n");

    const prompt = `${context}\n\n이전 대화:\n${promptHistory}\n\n위 공유 문서 컨텍스트를 기반으로 답변해주세요.`;

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const answer = result.text || "응답을 생성하지 못했습니다.";

    return NextResponse.json({
      answer,
      chatLimitTotal: row.chat_limit_total,
      chatLimitUsed: row.chat_limit_used,
      chatLimitRemaining: Math.max(0, row.chat_limit_total - row.chat_limit_used),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "공유 채팅 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
