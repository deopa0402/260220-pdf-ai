import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const systemInstruction = `당신은 문서 분석 AI 챗봇입니다. 제공된 문서와 사용자의 이전 대화 내역에 기반하여 사용자의 질문에 정확한 답변을 제공하세요.`;
const historyParts = "사용자: 테스트";
const payload = {
  systemInstruction: { parts: [{ text: systemInstruction }] },
  contents: [
    {
      role: "user",
      parts: [
        { inlineData: { data: 'aGVsbG8=', mimeType: "application/pdf" } },
        { text: `이전 대화:\n${historyParts}\n\n위 문서를 기반으로 답변해주세요.` }
      ]
    }
  ]
};

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});

console.log(res.status);
if (!res.ok) {
  const t = await res.text();
  console.log(t);
}
