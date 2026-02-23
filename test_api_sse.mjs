import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const payload = {
  systemInstruction: { parts: [{ text: "안녕" }] },
  contents: [
    {
      role: "user",
      parts: [
        { text: `안녕하세요. 길게 답변해주세요.` }
      ]
    }
  ]
};

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});

if (res.body) {
    let buffer = "";
    for await (const chunk of res.body) {
        buffer += chunk.toString('utf8');
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
            if (line.trim().startsWith("data: ")) {
                const dataStr = line.replace("data: ", "").trim();
                if (dataStr && dataStr !== "[DONE]") {
                    try {
                        const obj = JSON.parse(dataStr);
                        console.log("Got text:", obj.candidates?.[0]?.content?.parts?.[0]?.text);
                    } catch(e) {
                        console.log("PARSE ERROR ON:", dataStr, e);
                    }
                }
            }
        }
    }
}

