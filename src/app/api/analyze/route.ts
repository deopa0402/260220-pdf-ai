import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true }); // fallback

function getGeminiApiKey() {
  const rawKey = process.env.GEMINI_API_KEY || "";
  return rawKey.replace(/^"|"$/g, "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getGeminiApiKey();
    // 2. Parse the FormData to get the PDF file
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Convert PDF to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    // 4. Construct the prompt for Gemini
    const systemInstruction = `You are an expert document analyzer. 
    Analyze the provided document and return a JSON object with EXACTLY the following structure:
    {
      "summaries": [
        {
          "title": "1. 초보자를 위한 쉬운 설명 (개념 위주)",
          "content": "..."
        },
        {
          "title": "2. 실무자를 위한 핵심 요약 (빠른 파악)",
          "content": "..."
        },
        {
          "title": "3. 개발자 관점 심층 분석 (기술 & 보안 중심)",
          "content": "..."
        }
      ],
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "insights": "List 1-3 highly actionable insights or suggestions based on the document."
    }
    Ensure the response is valid JSON and written in Korean.`;

    // 5. Call the Gemini API natively using fetch
    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: "Here is the document to analyze. Please provide the JSON summary." },
            { 
              inlineData: { 
                data: base64Data, 
                mimeType: file.type || "application/pdf" 
              } 
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API Error:", res.status, errText);
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("No response from Gemini API");
    }

    // 6. Parse and return the JSON response
    const analysisResult = JSON.parse(responseText);
    analysisResult.rawText = base64Data; // Attach base64 PDF data for chat context

    return NextResponse.json(analysisResult);

  } catch (error: unknown) {
    console.error("Error analyzing PDF:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze document" },
      { status: 500 }
    );
  }
}
