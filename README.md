# PDF 분석 및 Q&A 챗봇

Google Gemini 2.5 Flash 모델을 활용한 PDF 문서 분석 및 대화형 질의응답 시스템입니다.

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [PDF 데이터 흐름](#pdf-데이터-흐름)
3. [아키텍처 및 컴포넌트 구조](#아키텍처-및-컴포넌트-구조)
4. [프롬프트 구성](#프롬프트-구성)
   - [4.1 문서 자동 분석](#41-문서-자동-분석-mainapptsx)
   - [4.2 우측 패널 Q&A](#42-우측-패널-qa-right-panelindextsx)
   - [4.3 좌측 캡처 영역 분석](#43-좌측-캡처-영역-분석-left-panelpdfviewertsx--annotationtooltip)
5. [프롬프트 디자인 원칙](#프롬프트-디자인-원칙)
6. [호출 흐름 다이어그램](#호출-흐름-다이어그램)

---

## 프로젝트 개요

**기술 스택**: Next.js 16 + React 18 + TypeScript  
**AI 모델**: Google Gemini 2.5 Flash  
**API 키 저장**: `localStorage` → `gemini_api_key`  
**상태 관리**: Zustand (`app-store.ts`)  
**영구 저장**: IndexedDB (`store.ts`)

---

## PDF 데이터 흐름

### 1. PDF 업로드 및 저장

```
사용자 파일 선택
    ↓
MainApp: PDF 파일 읽기
    ↓
store.saveSession() → IndexedDB에 PDF Base64 저장
    ↓
app-store: fileUrl, currentSessionId 업데이트
    ↓
좌측 패널, 우측 패널에서 동시 활용
```

### 2. 세션별 데이터 구조

```typescript
interface PdfSession {
  id: string;                    // UUID
  fileUrl: string;               // Blob URL 또는 Base64
  fileName?: string;              // 파일명
  analysisData?: AnalysisData;    // AI 분석 결과
  messages?: ChatMessage[];       // 대화 기록 (우측 패널)
  annotations?: Annotation[];      // 캡처 영역 목록 (좌측 패널)
  createdAt: number;
  updatedAt: number;
}

interface AnalysisData {
  title: string;
  summaries: Array<{
    title: string;
    lines: Array<{ text: string; pages: number[] }>;
  }>;
  keywords: string[];
  insights: string;
  issues: string | Array<{ text: string; pages: number[] }>;
}
```

### 3. 상태 관리 (Zustand)

```typescript
// app-store.ts 주요 상태
{
  fileUrl: string | null;                    // 현재 PDF URL
  analysisData: AnalysisData | null;          // 현재 문서 분석 결과
  pageNumber: number;                        // 현재 표시 페이지
  currentSessionId: string | null;          // 현재 활성 세션
  sessionIds: string[];                    // 세션 목록
  annotationsBySession: Record<string, Annotation[]>;  // 세션별 캡처 영역
  chatMessagesBySession: Record<string, ChatMessage[]>; // 세션별 대화 기록
  currentFileName: string | null;            // 현재 파일명
}
```

---

## 아키텍처 및 컴포넌트 구조

```
src/
├── MainApp.tsx                      # 부모 컴포넨트 (PanelGroup 좌/우 렌더링)
├── components/
│   ├── pdf/
│   │   ├── left-panel/                # 좌측 패널 (PDF 뷰어 + 캡처 챗봇)
│   │   │   ├── index.tsx            # 진입점 (PdfViewer 래퍼)
│   │   │   ├── PdfViewer.tsx        # 메인 PDF 뷰어
│   │   │   └── AnnotationTooltip.tsx  # 영역 캡처 미니 챗봇
│   │   │
│   │   ├── right-panel/               # 우측 패널 (분석 결과 + Q&A)
│   │   │   ├── index.tsx            # 메인 Q&A 로직
│   │   │   ├── RightPanelHeader.tsx  # 파일명 헤더
│   │   │   ├── RightPanelAnalysis.tsx# 분석 컨테이너
│   │   │   ├── Keywords.tsx          # 키워드 태그
│   │   │   ├── ThreeLineSummary.tsx   # 3줄 요약
│   │   │   ├── DetailedSummary.tsx    # 상세 요약
│   │   │   ├── CheckPoints.tsx       # 점검 항목
│   │   │   ├── ChatTimeline.tsx      # 채팅 메시지 목록
│   │   │   ├── ChatInput.tsx         # 입력창
│   │   │   └── RecommendedQuestions.tsx  # 추천 질문
│   │   │
│   │   └── shared/                # 공통 컴포넌트
│   │       ├── MarkdownRenderer.tsx  # 마크다운 + [Np] 인용
│   │       └── CitationBadge.tsx     # 클릭 가능한 페이지 배지
│   │
├── lib/
│   ├── app-store.ts                 # Zustand 상태 관리
│   └── store.ts                    # IndexedDB 영구 저장
```

---

## 프롬프트 구성

총 **3곳**에서 Gemini AI를 호출합니다. 각 호출은 용도에 따라 프롬프트가 다릅니다.

### 4.1 문서 자동 분석 (`MainApp.tsx`)

**호출 방식**: Raw REST API (비스트리밍)  
**API**: `gemini-2.5-flash:generateContent`  
**응답 형식**: `application/json`

**실행 시점**: PDF 업로드 시 **한 번 자동 실행**

#### System Instruction

```text
당신은 전문 문서 분석가입니다. 제공된 문서를 분석하여 아래 JSON 구조로 완벽히 답변해 주세요.

{
  "title": "문서의 핵심 주제를 15자 내외로 요약한 제목",
  "summaries": [
    {
      "title": "3줄 요약",
      "lines": [
        { "text": "첫 번째 핵심 문장", "pages": [1] },
        { "text": "두 번째 핵심 문장", "pages": [2, 3] },
        { "text": "세 번째 핵심 문장", "pages": [4] }
      ]
    },
    {
      "title": "요약",
      "lines": [
        { "text": "문서 전체의 주요 흐름 요약 문장", "pages": [1] },
        { "text": "핵심 근거 및 결론 문장", "pages": [2, 5] }
      ]
    }
  ],
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "insights": "문서 내 수치나 사실에서 바로 답을 찾을 수 있는 짧은 질문 3가지 (형식: 1. 질문? \n 2. 질문? \n 3. 질문?)",
  "issues": [
    { "text": "논리적으로 확인이 필요한 사항", "pages": [6] },
    { "text": "휴먼에러 가능성이 있는 표현", "pages": [7, 8] }
  ]
}

작성 가이드:
1. title: 문서 전체를 대표하는 짧고 명확한 제목을 반드시 작성하세요.
2. insights: 배경지식이 필요한 깊은 분석 대신, 본문 내 데이터로 즉각 답변 가능한 '팩트 체크형' 질문을 작성하세요.
3. 간결성: 질문은 최대한 짧고 명확하게 한 줄로 구성하세요.
4. 3줄 요약은 summaries[0].lines에 정확히 3개 항목을 넣으세요. 각 항목은 text/pages를 모두 가져야 합니다.
5. pages는 숫자 배열만 허용합니다. 예: [1] 또는 [1,2]. 문자열/대괄호 텍스트 금지.
6. summaries[1]과 issues도 동일하게 text/pages 구조로 작성하세요.
7. 언어 및 형식: 반드시 한국어로 작성하고, 위 구조와 정확히 일치하는 유효한 JSON만 반환하세요. Markdown 백틱이나 다른 설명을 덧붙이지 마세요.
```

#### User Prompt

```text
Here is document to analyze. Please provide JSON summary.
```

#### PDF 첨부

✅ **항상 첨부**: Base64 인코딩된 PDF 원본 (`inlineData` with `mimeType: "application/pdf"`)

---

### 4.2 우측 패널 Q&A (`right-panel/index.tsx`)

**호출 방식**: Google SDK 스트리밍 (`generateContentStream`)  
**API**: `gemini-2.5-flash`  
**응답 형식**: 스트리밍 (실시간 타이핑 효과)

**실행 시점**: 사용자가 첫 질문을 입력할 때

#### System Instruction

```text
당신은 문서 분석 AI 챗봇입니다. 제공된 문서와 사용자의 이전 대화 내역에 기반하여 사용자의 질문에 정확한 답변을 제공하세요. 답변할 때 출처를 [Np] 형식으로 포함하세요. 여러 페이지는 [1p],[2p]처럼 표기하세요.
```

#### Context Helper (`buildContextText`)

```javascript
const buildContextText = (analysisData: AnalysisData | null) => {
  if (!analysisData) return "";

  const summaryLines = analysisData.summaries
    .flatMap((item) => item.lines?.map((line) => line.text) ?? [])
    .slice(0, 8);

  const keywordText = analysisData.keywords?.length
    ? `\n- 키워드: ${analysisData.keywords.join(", ")}`
    : "";

  const summaryText = summaryLines.length
    ? `\n- 요약: ${summaryLines.slice(0, 8).join(" | ")}`
    : "";

  const issueLines = Array.isArray(analysisData.issues)
    ? analysisData.issues.map((item) => item.text).filter(Boolean)
    : typeof analysisData.issues === "string"
      ? [analysisData.issues]
      : [];

  const issueText = issueLines.length
    ? `\n- 핵심 체크포인트: ${issueLines.slice(0, 5).join(" | ")}`
    : "";

  return [
    `문서 제목: ${analysisData.title}`,
    summaryText,
    keywordText,
    issueText,
  ].join("\n").trim();
};
```

#### 첫 번째 질문 Prompt

```text
[buildContextText() 통해 자동 생성된 문서 분석 컨텍스트]

이전 대화 내역:
(초기에는 비어 있음)

사용자: (첫 번째 질문)

위 문서와 분석 컨텍스트를 기반으로 답변해주세요.
```

✅ **PDF 첨부**: 첫 번째 질문에만 PDF 원본 첨부 (`inlineData`)

#### 후속 질문 Prompt

```text
이전 대화 내역:
[사용자]: (이전 메시지)
[AI]: (이전 응답)
...

사용자: (현재 질문)

위 대화 내역을 기반으로 답변해주세요.
```

❌ **PDF 첨부 안함**: 후속 질문부터는 PDF를 다시 보내지 않음 (토큰 절약)

---

### 4.3 좌측 캡처 영역 분석 (`left-panel/PdfViewer.tsx` → `AnnotationTooltip`)

**호출 방식**: Google SDK 스트리밍 (`generateContentStream`)  
**API**: `gemini-2.5-flash`  
**응답 형식**: 스트리밍 (실시간 타이핑 효과)

**실행 시점**:
- 사용자가 PDF에서 영역 드래그 캡처 시 (자동 발송)
- 사용자가 캡처된 영역에 질문 입력 시

#### System Instruction

없음 (모델 기본값). 프롬프트 자체에서 제약 부여

#### Context Helper (`buildContextText`)
(추후 제거후 그냥 json 통채로 넣어도 될 것 같음)

```javascript
const buildContextText = (analysisData?: AnalysisData | null) => {
  if (!analysisData) return "";

  const summaryLines = analysisData.summaries
    .flatMap((item) => item.lines?.map((line) => line.text) ?? [])
    .filter(Boolean)
    .slice(0, 6);

  const keywordText = analysisData.keywords?.length
    ? `\n- 키워드: ${analysisData.keywords.slice(0, 8).join(", ")}`
    : "";

  const summaryText = summaryLines.length
    ? `\n- 핵심 요약: ${summaryLines.join(" | ")}`
    : "";

  const issueLines = Array.isArray(analysisData.issues)
    ? analysisData.issues.map((item) => item.text).filter(Boolean)
    : typeof analysisData.issues === 'string'
      ? [analysisData.issues]
      : [];

  const issueText = issueLines.length
    ? `\n- 점검 항목: ${issueLines.slice(0, 4).join(" | ")}`
    : "";

  return [
    `문서 제목: ${analysisData.title}`,
    summaryText,
    keywordText,
    issueText,
  ].join('\n').trim();
};
```

#### 초기 자동 발송 Prompt (캡처 영역 생성 직후)

```text
[buildContextText() 통해 자동 생성된 문서 분석 컨텍스트]

선택된 이미지 영역의 핵심 내용을 3문장 이내로 짧고 명확하게 한국어로 요약 및 설명해줘. 불필요한 인사말이나 부연 설명은 생략해. 답변할 때 출처를 [Np] 형식으로 포함하고, 여러 페이지는 [1p],[2p]처럼 표기하세요.
```
(응답형식을 text 형태가 아닌 json 구성으로 수정하면 좋을 것 같긴함.)

✅ **이미지 첨부**: 항상 첨부 (캡처된 영역 PNG, `inlineData`)

#### 후속 질문 Prompt

```text
이전 대화:
[사용자]: (초기 요약 요청)
[AI]: (AI 응답)
...

사용자: (현재 질문)

위 이미지와 이전 대화를 기반으로 한국어로 간결하고 명확하게 답변해줘. 답변할 때 출처를 [Np] 형식으로 포함하고, 여러 페이지는 [1p],[2p]처럼 표기하세요.
```

✅ **이미지 첨부**: 항상 첨부 (캡처된 영역 PNG, `inlineData`)

---

## 프롬프트 디자인 원칙

### 1. 토큰 효율 최적화

**원칙**: 문서 전체 컨텍스트는 첫 번째에만 전달, 후속에는 대화 히스토리만 사용

| 기능 | 첫 번째 | 후속 턴 |
|------|----------|-----------|
| 우측 패널 Q&A | PDF + analysisData context + history | history만 |
| 좌측 캡처 챗봇 | 이미지 + analysisData context + history | 이미지 + history |

### 2. 문맥 컨텍스트 길이 제어

**우측 패널**: 요약 최대 8줄, 이슈 최대 5개  
**좌측 캡처**: 요약 최대 6줄, 이슈 최대 4개

### 3. 인용 표기 규칙 통일

**단일 페이지**: `[Np]` (예: `[3p]`)  
**다중 페이지**: `[1p],[2p]` (예: `[1p],[2p],[3p]`)

### 4. 언어 및 톤

- 모든 프롬프트: **한국어**
- 응답 요구: **한국어**
- 출처 형식: `[Np]`, `[1p],[2p]`

---

## 호출 흐름 다이어그램

```
localStorage("gemini_api_key")
    │
    ├── ① MainApp.tsx
    │   → Raw REST API (비스트리밍)
    │   → 문서 자동 분석
    │   → JSON 응답: title, summaries, keywords, insights, issues
    │   → app-store: analysisData 업데이트
    │   → IndexedDB: session 저장
    │
    ├── ② right-panel/index.tsx
    │   → Google SDK 스트리밍
    │   → 우측 패널 Q&A
    │   └─ 프롬프트 패턴:
    │       ├─ 첫 질문: buildContextText(analysisData) + PDF + history
    │       └─ 후속 질문: history만 (PDF 미첨부)
    │
    └── ③ left-panel/PdfViewer.tsx → AnnotationTooltip
        → Google SDK 스트리밍
        → 좌측 캡처 영역 챗봇
        └─ 프롬프트 패턴:
            ├─ 초기 자동: buildContextText(analysisData) + 캡처 이미지(PNG)
            └─ 후속 질문: 캡처 이미지(PNG) + history
```

---

## 컴포넌트 역할

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| MainApp | `/src/components/MainApp.tsx` | 부모 컨테이너, PanelGroup으로 좌/우 렌더링, 세션 관리 |
| LeftPanel | `/src/components/pdf/left-panel/index.tsx` | 좌측 패널 진입점, PdfViewer로 props 전달 |
| PdfViewer | `/src/components/pdf/left-panel/PdfViewer.tsx` | PDF 렌더링, 페이지 이동, 영역 캡처, AnnotationTooltip 렌더링 |
| AnnotationTooltip | `/src/components/pdf/left-panel/AnnotationTooltip.tsx` | 캡처된 영역 미니 챗봇, Gemini SDK 스트리밍 |
| RightPanel | `/src/components/pdf/right-panel/index.tsx` | 우측 패널 메인, Q&A 로직, AI 스트리밍 |
| RightPanelAnalysis | `/src/components/pdf/right-panel/RightPanelAnalysis.tsx` | 분석 결과 레이아웃 컨테이너 |
| Keywords | `/src/components/pdf/right-panel/Keywords.tsx` | 키워드 태그 렌더링 |
| ThreeLineSummary | `/src/components/pdf/right-panel/ThreeLineSummary.tsx` | 3줄 요약 렌더링 (페이지 인용) |
| DetailedSummary | `/src/components/pdf/right-panel/DetailedSummary.tsx` | 상세 요약 렌더링 (페이지 인용) |
| CheckPoints | `/src/components/pdf/right-panel/CheckPoints.tsx` | 점검 항목 렌더링 (페이지 인용) |
| ChatTimeline | `/src/components/pdf/right-panel/ChatTimeline.tsx` | 채팅 메시지 버블 렌더링 |
| ChatInput | `/src/components/pdf/right-panel/ChatInput.tsx` | 입력창 렌더링 |
| RecommendedQuestions | `/src/components/pdf/right-panel/RecommendedQuestions.tsx` | 추천 질문 칩 렌더링 |
| MarkdownRenderer | `/src/components/pdf/shared/MarkdownRenderer.tsx` | 마크다운 렌더링, [Np] 인용 클릭 처리 |
| CitationBadge | `/src/components/pdf/shared/CitationBadge.tsx` | 클릭 가능한 페이지 배지 렌더링 |
