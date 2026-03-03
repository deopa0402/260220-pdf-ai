import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createSharedSession } from "@/lib/db/share-repository";

const requestSchema = z.object({
  session: z.object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    analysisData: z.unknown().nullable(),
    messages: z.array(z.object({ role: z.enum(["user", "ai"]), content: z.string() })).default([]),
    annotations: z.array(z.unknown()).optional(),
    createdAt: z.number(),
  }),
  pdfS3Key: z.string().min(1),
  password: z.string().min(1),
  chatLimitTotal: z.number().int().min(0).max(200),
});

export async function POST(req: Request) {
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    const { session, pdfS3Key, password, chatLimitTotal } = parsed.data;
    const publicId = randomUUID();

    await createSharedSession({
      id: randomUUID(),
      public_id: publicId,
      password,
      pdf_s3_key: pdfS3Key,
      payload: {
        fileName: session.fileName,
        analysisData: session.analysisData,
        messages: session.messages,
        annotations: session.annotations ?? [],
        createdAt: session.createdAt,
      },
      chat_limit_total: chatLimitTotal,
      chat_limit_used: 0,
    });

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    return NextResponse.json({
      publicId,
      shareUrl: origin ? `${origin}/s/${publicId}` : `/s/${publicId}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "공유 세션 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
