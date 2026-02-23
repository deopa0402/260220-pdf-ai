## 프롬프트 구성 (Prompt Architecture)

현재 프로젝트는 Google Gemini 2.5 Flash 모델을 사용하여 문서의 분석 및 질의응답을 처리합니다.
API 키는 `localStorage`의 `gemini_api_key` 키로 저장되며, 총 **4곳**에서 호출됩니다.

| # | 파일 | 호출 방식 | 용도 | 상태 |
|---|------|-----------|------|------|
| ① | `MainApp.tsx` | Raw `fetch` (REST, 비스트리밍) | 문서 최초 자동 분석 | ✅ 활성 |
| ② | ~~`ChatPanel.tsx`~~ | ~~Raw `fetch` (REST, 비스트리밍)~~ | ~~레거시 문서 Q&A 대화~~ | ⚠️ 비활성 (코드만 잔존) |
| ③ | `right-panel/index.tsx` | SDK `generateContentStream` | 우측 패널 문서 Q&A 대화 | ✅ 활성 |
| ④ | `PdfViewer.tsx` | SDK `generateContentStream` | 좌측 캡처 영역 분석 챗봇 | ✅ 활성 |

---

### ① 문서 최초 자동 분석 (`MainApp.tsx`)

PDF 업로드 시 **한 번 자동 실행**되어 요약, 키워드, 인사이트, 이슈를 추출합니다.

**API:** `gemini-2.5-flash:generateContent` (비스트리밍, `responseMimeType: "application/json"`)

**System Instruction:**
```text
당신은 전문 문서 분석가입니다. 제공된 문서를 분석하여 아래 JSON 구조로 완벽히 답변해 주세요.

{
  "summaries": [
    { "title": "3줄 요약", "content": "문서 핵심 내용을 3개 문장으로 정리" },
    { "title": "요약", "content": "문서 전체의 주요 흐름 요약" }
  ],
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "insights": "문서 내 수치나 사실에서 바로 답을 찾을 수 있는 짧은 질문 3가지 (형식: 1. 질문? \n 2. 질문? \n 3. 질문?)",
  "issues": "논리적으로 오류가 있는 사항이나 확인이 필요한 휴먼에러 요소"
}

작성 가이드:
1. insights: 배경지식이 필요한 깊은 분석 대신, 본문 내 데이터로 즉각 답변 가능한 '팩트 체크형' 질문을 작성하세요.
2. 간결성: 질문은 최대한 짧고 명확하게 한 줄로 구성하세요.
3. 언어 및 형식: 반드시 한국어로 작성하고, 유효한 JSON 형식만을 반환해야 합니다.
```

**User Prompt:**
```text
Here is the document to analyze. Please provide the JSON summary.
(함께 첨부: Base64로 인코딩된 PDF 파일 원본 - inlineData)
```

---

### ~~② 레거시 문서 Q&A 대화 (`ChatPanel.tsx`)~~ ⚠️ 비활성

이전 버전의 대화형 챗봇. 현재 UI에서는 ③이 대체하여 **코드만 잔존**합니다.

**API:** `gemini-2.5-flash:generateContent` (비스트리밍)

**System Instruction:**
```text
You are an intelligent document assistant.
You must answer the user's questions based primarily on the context of the provided document.
If the answer is not in the document, acknowledge that it's not present and do your best to answer based on external knowledge, clearly stating the distinction.
Answer in a friendly, conversational Korean tone.
```

**Context Injection:** 첫 번째 User 메시지 앞에 분석 데이터(요약, 키워드, 인사이트) + PDF inlineData 자동 삽입

---

### ③ 우측 패널 문서 Q&A 대화 (`right-panel/index.tsx`) ✅ 현행

현재 활성화된 문서 기반 대화 챗봇. Google SDK 스트리밍 응답으로 실시간 타이핑 효과를 제공합니다.

**API:** `GoogleGenerativeAI` SDK → `generateContentStream` (스트리밍)

**System Instruction:**
```text
당신은 문서 분석 AI 챗봇입니다. 제공된 문서와 사용자의 이전 대화 내역에 기반하여 사용자의 질문에 정확한 답변을 제공하세요.
```

**User Prompt:**
```text
이전 대화 내역:
[사용자]: (이전 메시지)
[AI]: (이전 응답)

위 문서를 기반으로 답변해주세요.
(함께 첨부: Base64로 인코딩된 PDF 파일 원본 - inlineData)
```

---

### ④ 좌측 캡처 영역 분석 챗봇 (`PdfViewer.tsx - AnnotationTooltip`)

PDF 뷰어에서 마우스 드래그로 영역을 캡처하면 자동 생성되는 미니 챗봇입니다.
PDF 원본이 아닌 **캡처된 이미지 영역(PNG)**만 첨부됩니다.

**API:** `GoogleGenerativeAI` SDK → `generateContentStream` (스트리밍)

**System Instruction:** 없음 (모델 기본값). Prompt 자체에서 "3문장 이내", "부연 설명 생략" 등 제약을 부여합니다.

**초기 자동 발송 Prompt** *(챗봇 생성 직후 백그라운드 자동 전송)*:
```text
선택된 이미지 영역의 핵심 내용을 3문장 이내로 짧고 명확하게 한국어로 요약 및 설명해줘. 불필요한 인사말이나 부연 설명은 생략해.
```

**후속 질문 Prompt:**
```text
이전 대화:
[사용자]: (초기 프롬프트)
[AI]: (이전 요약 응답)

사용자: (현재 입력한 질문)

위 이미지와 이전 대화를 기반으로 한국어로 간결하고 명확하게 답변해줘.
(함께 첨부: 캡처된 영역의 Base64 인코딩 이미지 - inlineData)
```

---

### 호출 흐름 다이어그램

```
localStorage("gemini_api_key")
    │
    ├── ① MainApp.tsx          → [자동 분석] Raw fetch, JSON 응답, 요약/키워드/인사이트 추출
    │
    ├── ② ChatPanel.tsx         → [레거시 Q&A] Raw fetch, 비스트리밍 (현재 비활성)
    │
    ├── ③ right-panel/index.tsx → [우측 Q&A]  SDK 스트리밍, PDF 원본 + 대화 히스토리 기반
    │
    └── ④ PdfViewer.tsx         → [캡처 챗봇]  SDK 스트리밍, 크롭 이미지 + 자동 3문장 요약
```
