import { NextResponse } from "next/server";
import { z } from "zod";
import { createPdfUploadPresignedUrl } from "@/lib/s3";

const requestSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    const { objectKey, uploadUrl } = await createPdfUploadPresignedUrl({
      sessionId: parsed.data.sessionId,
    });

    return NextResponse.json({ objectKey, uploadUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "업로드 URL 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
