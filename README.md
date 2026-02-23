## 프롬프트 구성 (Prompt Architecture)

현재 프로젝트는 Google Gemini 2.5 Flash 모델을 사용하여 문서의 분석 및 질의응답을 처리합니다. 각 기능별로 사용되는 시스템 프롬프트 및 사용자 프롬프트는 다음과 같이 구성되어 있습니다.

### 1. 문서 자동 분석 및 요약 프롬프트 (`/api/analyze`)

사용자가 PDF 문서를 처음 업로드했을 때, 시스템이 자동으로 문서를 분석하고 핵심 요약 3선, 키워드, 인사이트를 도출하는 프롬프트입니다.

**System Instruction (시스템 명령어)**
```text
You are an expert document analyzer. 
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
Ensure the response is valid JSON and written in Korean.
```

**User Prompt (사용자 메시지)**
```text
Here is the document to analyze. Please provide the JSON summary.
(함께 첨부: Base64로 인코딩된 PDF 파일 원본 - inlineData)
```

---

### 2. 문서 Q&A 채팅 프롬프트 (`/api/chat`)

사용자가 분석된 문서를 바탕으로 AI와 자유롭게 대화할 때 제공되는 프롬프트입니다. PDF 원본뿐만 아니라 시스템이 사전에 추출했던 요약/키워드 정보도 맥락으로 함께 제공하여, 유저가 "1번 요약이 뭐야?" 라고 물어도 컨텍스트를 유지할 수 있도록 설계되어 있습니다.

**System Instruction (시스템 명령어)**
```text
You are an intelligent document assistant.
You must answer the user's questions based primarily on the context of the provided document.
If the answer is not in the document, acknowledge that it's not present and do your best to answer based on external knowledge, clearly stating the distinction.
Answer in a friendly, conversational Korean tone.
```

**Context Injection (컨텍스트 주입 메시지)**
*(채팅 시 첫 번째 'User' 메시지의 앞부분에 보이지 않게 자동 삽입됩니다)*
```text
[이전 분석 내용 요약입니다. 참조하세요]
[시스템이 자동 분석한 내용 - 맞춤형 핵심 요약 3선]
(분석 API에서 도출된 요약본 JSON 데이터)

[시스템이 자동 추출한 키워드]
(도출된 키워드 배열 데이터)

[자동 생성된 인사이트]
(도출된 인사이트 텍스트)

(함께 첨부: Base64로 인코딩된 PDF 파일 원본 - inlineData)
```

**User Prompt (사용자 메시지)**
```text
(사용자가 실제로 채팅창에 입력한 내용. 예: "이 문서의 주요 개념을 하나만 골라줘")
```

---

### 3. 좌측 패널 드래그 캡처 챗봇 시스템 프롬프트 (`PdfViewer.tsx - AnnotationTooltip`)

사용자가 PDF 뷰어 내에서 특정 영역을 마우스로 드래그하여 캡처했을 때 생성되는 플로팅(미니) 챗봇의 프롬프트입니다. 사용자가 직접 질문하기 전, API 통신을 통해 캡처된 이미지에 대한 빠르고 짧은 초기 요약을 자동으로 제공하도록 설계되었습니다.

**초기 자동 분석 Prompt (주입 메시지)**
*(챗봇 윈도우가 열리자마자 내부적으로 자동 전송되는 내용)*
```text
"선택된 이미지 영역의 핵심 내용을 3문장 이내로 짧고 명확하게 한국어로 요약 및 설명해줘. 불필요한 인사말이나 부연 설명은 생략해."
```

**Context Injection & User Prompt (사용자 후속 질문 시)**
*(초기 요약 이후 사용자가 이어서 질문할 때 제공되는 컨텍스트)*
```text
이전 대화:
[사용자]: 선택된 이미지 영역의 핵심 내용을 3문장 이내로 짧고 명확하게 한국어로 요약 및 설명해줘. 불필요한 인사말이나 부연 설명은 생략해.
[AI]: (이전에 응답했던 요약 내용)

사용자: (현재 입력한 질문 내용)

위 이미지와 이전 대화를 기반으로 한국어로 간결하고 명확하게 답변해줘.
```
*(함께 첨부: 사용자가 캡처한 영역의 Base64 인코딩 이미지 - inlineData)*
