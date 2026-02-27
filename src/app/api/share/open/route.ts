import { NextResponse } from "next/server";
import { z } from "zod";
import { findSharedSessionByPublicIdAndPassword } from "@/lib/db/share-repository";
import { getPdfBase64FromS3 } from "@/lib/s3";

const requestSchema = z.object({
  publicId: z.string().uuid(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    const { publicId, password } = parsed.data;
    const row = await findSharedSessionByPublicIdAndPassword(publicId, password);

    if (!row) {
      return NextResponse.json({ error: "링크 또는 비밀번호가 올바르지 않습니다." }, { status: 404 });
    }

    const pdfBase64 = await getPdfBase64FromS3(row.pdf_s3_key);
    const payload = (row.payload ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      publicId: row.public_id,
      payload,
      pdfBase64,
      chatLimitTotal: row.chat_limit_total,
      chatLimitUsed: row.chat_limit_used,
      chatLimitRemaining: Math.max(0, row.chat_limit_total - row.chat_limit_used),
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "공유 세션 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
