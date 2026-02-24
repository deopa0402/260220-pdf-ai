# PDF UI 기능 개선 작업 계획

## TL;DR

> **Quick Summary**: PDF 뷰어의 네비게이션 기능 강화, AI 응답에 마크다운 및 출처 표시 추가, 양 패널에 PDF 제목 표시
>
> **Deliverables**:
> - react-markdown 라이브러리 설치 및 마크다운 렌더링
> - 응답 메시지에 출처(페이지 번호) 클릭 가능한 블리지로 표시
> - 출처 클릭 시 PDF 뷰어가 해당 페이지로 이동
> - 좌측/우측 패널 모두에 PDF 문서 제목 표시
> - PDF 중앙 정렬 개선 (패널 크기 조정 시 유연한 중앙 정렬)
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 7 waves
> **Critical Path**: Wave 1 → Wave 2 → Wave 4 → Wave 7

---

## Context

### Original Request
```
4.출처를 남겨서 이동 가능하도록 페이지 번호 및 이동 기능 추가 구성
5.pdf 영역을 줄였을때 pdf 가 중앙에 오도록 수정
6.응답의 ** 별표시는 볼드 처리 구성
7.우측 패널 pdf 문서의 제목 추가
```

### Interview Summary
**Key Discussions**:
- 출처 표시: 응답 메시지에 `[N페이지]` 형식으로 출처를 표시하고, 클릭 시 PDF 뷰어가 해당 페이지로 이동하도록 구성
- 마크다운 지원: 전체 마크다운 문법 지원 (볼드 `**text**`, 이탤릭 `*text*`, 리스트, 링크, 표)
- PDF 제목: 좌측 패널과 우측 패널 모두에 제목을 표시 (우측은 분석결과 상단 고정 영역)
- 사이드바: 사이드바에도 제목이 있으면 해당 제목을 먼저 사용하도록 우선순위 구성
- PDF 중앙 정렬: 패널 크기 조정 시 PDF가 중앙에 오도록 CSS 수정

**Technical Decisions**:
- 콜백 패턴 사용: MainApp에서 공유 상태(`pageNumber`) 관리, 자식 컴포넌트에 콜백 전달
- react-markdown + remark-gfm + rehype-sanitize 사용 (보안 및 표 지원)
- 출처 파싱: Regex로 `[N페이지]` 패턴 매칭 후 클릭 가능한 버튼으로 변환

### Research Findings
- **PdfViewer.tsx** (lines 186-276): 이미 페이지 네비게이션 UI 존재, `pageNumber`, `numPages`, `pageInput` 상태 추적, `moveToPage` 함수 존재
- **ChatTimeline.tsx** (line 41): 단순 텍스트 렌더링, 마크다운 라이브러리 없음
- **ThreeLineSummary.tsx**, **DetailedSummary.tsx**: 단순 텍스트 렌더링
- **MainApp.tsx** (lines 324-342): PanelGroup으로 좌우 패널 배치, `currentSessionId`, `fileUrl` 상태 관리
- **store.ts** (line 25): `PdfSession.fileName` 필드 존재
- **PDF 중앙 정렬 문제**: `PdfViewer.tsx` line 279에 `px-[400px]` 패딩 때문에 패널이 줄어들 때 PDF가 잘림

### Metis Review
**Identified Gaps** (addressed):
- **Architecture Pattern**: 콜백 패턴 사용 (MainApp 상태 관리 → 자식 컴포넌트에 콜백 전달)로 결정
- **Security**: rehype-sanitize 사용으로 XSS 방지
- **Citation Format**: `[N페이지]` 형식으로 인라인 블리지 표시
- **Title Placement**: 우측 패널은 고정 헤더로, 좌측 패널은 툴바 상단으로 표시

---

## Work Objectives

### Core Objective
PDF 뷰어의 네비게이션 기능 강화, AI 응답에 마크다운 및 출처 표시, 양 패널에 PDF 제목 표시

### Concrete Deliverables
- react-markdown 라이브러리 설치
- 마크다운 렌더링 컴포넌트 (ChatTimeline, ThreeLineSummary, DetailedSummary)
- 출처 파싱 유틸리티 및 블리지 컴포넌트
- MainApp에서 공유 `pageNumber` 상태 및 `handleCitationClick` 콜백
- LeftPanel과 RightPanel에 제목 표시 UI
- PDF 중앙 정렬 CSS 수정

### Definition of Done
- [ ] `npm install` 완료 후 react-markdown 설치 확인
- [ ] 응답 메시지에 마크다운 렌더링 적용 (볼드, 이탤릭, 리스트, 링크, 표)
- [ ] `[N페이지]` 형식의 출처가 블리지로 표시되고 클릭 가능
- [ ] 출처 클릭 시 PDF 뷰어가 해당 페이지로 이동
- [ ] 좌측/우측 패널 모두에 PDF 문서 제목 표시
- [ ] 패널 크기 조정 시 PDF가 중앙에 정렬됨

### Must Have
- 전체 마크다운 문법 지원 (볼드, 이탤릭, 리스트, 링크, 표)
- `[N페이지]` 출처 형식 파싱 및 클릭 가능한 블리지로 변환
- 출처 클릭 시 PDF 해당 페이지로 이동 (콜백 패턴)
- 좌측/우측 패널 모두에 PDF 제목 표시
- PDF 중앙 정렬 (패널 크기 조정 시 유연한 중앙 정렬)

### Must NOT Have (Guardrails)
- 코드 구문 하이라이팅 (code syntax highlighting) - 마크다운 기본 코드 블록만 사용
- 출처 관리 UI (사이드바, 분석, 검색 등) - 단순 클릭으로 이동만
- PDF 텍스트 하이라이팅 - 페이지 이동만, 특정 텍스트 하이라이팅 금지
- 제목 편집 기능 - 표시만, 이름 변경 금지
- 영구적 출처 상태 - 마지막 클릭된 출처 저장/추적 금지
- 모바일 반응형 디자인 - 데스크탑/태블릿 중심
- 자동 AI 재분석 - 새 응답만 출처 포함
- 복잡한 마크다운 확장 (수학 KaTeX, 다이어그램 mermaid 등 금지)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: YES (Tests-after) - 각 태스크 완료 후 QA 시나리오 실행
- **Framework**: bun test (next: test 기본)
- **If TDD**: 해당 없음 (기존 코드에 기능 추가)

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **CLI/API**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun/node REPL) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 의존성 설치 + 타입 정의):
├── Task 1: 의존성 설치 (react-markdown, remark-gfm, rehype-sanitize) [quick]
└── Task 2: Message 타입에 출처 필드 추가 (store.ts) [quick]

Wave 2 (After Wave 1 — 콜백 패턴 구현):
├── Task 3: MainApp에 공유 상태 추가 (pageNumber, handleCitationClick) [quick]
└── Task 4: LeftPanel에 prop 추가 (fileName, onCitationClick) [quick]

Wave 3 (After Wave 2 — 마크다운 렌더링 컴포넌트):
├── Task 5: 마크다운 렌더링 컴포넌트 생성 (MarkdownRenderer.tsx) [unspecified-high]
└── Task 6: ChatTimeline.tsx 마크다운 적용 [quick]

Wave 4 (After Wave 3 — 출처 파싱 및 UI):
├── Task 7: 출처 파싱 유틸리티 (parseCitations.ts) [quick]
└── Task 8: CitationBadge 컴포넌트 생성 [quick]

Wave 5 (After Wave 4 — 제목 표시):
├── Task 9: LeftPanel에 제목 표시 UI 추가 [visual-engineering]
├── Task 10: RightPanel에 prop 추가 (fileName, onCitationClick) [quick]
└── Task 11: RightPanel에 제목 표시 UI 추가 (고정 헤더) [visual-engineering]

Wave 6 (After Wave 5 — PDF 중앙 정렬):
└── Task 12: PdfViewer.tsx PDF 중앙 정렬 CSS 수정 [quick]

Wave 7 (After Wave 6 — AI 프롬프트 수정):
├── Task 13: RightPanel AI 프롬프트에 출처 요구 추가 [quick]
└── Task 14: PdfViewer AnnotationTooltip AI 프롬프트에 출처 요구 추가 [quick]

Wave FINAL (After ALL tasks — 검증):
├── Task F1: 마크다운 렌더링 검증 (unspecified-high)
├── Task F2: 출처 클릭 동작 검증 (unspecified-high)
├── Task F3: 제목 표시 검증 (unspecified-high)
└── Task F4: PDF 중앙 정렬 검증 (unspecified-high)

Critical Path: Task 1 → Task 2 → Task 3 → Task 5 → Task 7 → Task 9 → Task 12 → Task 13 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Waves 1 & 3 & 5)
```

### Dependency Matrix (abbreviated — show ALL tasks in your generated plan)

- **1-2**: — — 3-4, 5-6
- **3**: 2 — 7-8, 9
- **4**: 5, 7 — 11
- **5**: 3 — 10, 12
- **6**: 9, 11 — 13
- **7-8**: 5, 7 — 10, 11
- **9**: 3 — 12
- **10**: 6 — 11
- **11**: 6, 8, 10 — 13
- **12**: 9 — 13, F4
- **13**: 12 — F2
- **14**: 8 — F1

### Agent Dispatch Summary

- **Wave 1**: **2** — T1 → `quick`, T2 → `quick`
- **Wave 2**: **2** — T3 → `quick`, T4 → `quick`
- **Wave 3**: **2** — T5 → `unspecified-high`, T6 → `quick`
- **Wave 4**: **2** — T7 → `quick`, T8 → `quick`
- **Wave 5**: **3** — T9 → `visual-engineering`, T10 → `quick`, T11 → `visual-engineering`
- **Wave 6**: **1** — T12 → `quick`
- **Wave 7**: **2** — T13 → `quick`, T14 → `quick`
- **Wave FINAL**: **4** — F1 → `unspecified-high`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `unspecified-high`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [ ] 1. 의존성 설치

  **What to do**:
  - pnpm으로 react-markdown, remark-gfm, rehype-sanitize 설치
  - 설치 확인: package.json에 의존성 추가 확인

  **Must NOT do**:
  - 다른 마크다운 관련 라이브러리 설치 (react-markdown만 사용)
  - 마크다운 확장 플러그인 설치 (remark-gfm, rehype-sanitize만)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: 단순 패키지 설치 명령어 실행, 빠른 작업
  - **Skills**: 없음
    - 이유: npm/pnpm 명령어로 설치만 하므로 특정 스킬 불필요
  - **Skills Evaluated but Omitted**:
    - `librarian`: 이미 라이브러리 선택 완료

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3-14, F1-F4
  - **Blocked By**: None

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `package.json` - 기존 의존성 목록 확인

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - Official docs: `https://github.com/remarkjs/react-markdown` - react-markdown 사용법
  - Official docs: `https://github.com/remarkjs/remark-gfm` - GitHub Flavored Markdown 지원
  - Official docs: `https://github.com/rehypejs/rehype-sanitize` - XSS 방지

  **WHY Each Reference Matters** (explain the relevance):
  - `package.json`: 기존 의존성 확인 후 새 의존성 추가 방식 이해
  - react-markdown docs: 설치 방법 및 기본 사용법 확인
  - remark-gfm docs: 표 지원을 위한 플러그인 설정 방법
  - rehype-sanitize docs: 보안 설정 방법 확인

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] package.json에 react-markdown, remark-gfm, rehype-sanitize 추가됨
  - [ ] node_modules 디렉토리에 해당 패키지 설치됨
  - [ ] `pnpm list react-markdown` 명령어로 설치 확인

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 의존성 설치 확인
    Tool: Bash (pnpm)
    Preconditions: 프로젝트 루트 디렉토리
    Steps:
      1. pnpm add react-markdown remark-gfm rehype-sanitize
      2. pnpm list react-markdown
    Expected Result: react-markdown 버전이 출력되고 설치 성공 메시지
    Failure Indicators: "command not found", "E404", 설치 실패 에러
    Evidence: .sisyphus/evidence/task-1-install.log

  Scenario: 의존성 설치 후 package.json 확인
    Tool: Bash (cat)
    Preconditions: 의존성 설치 완료
    Steps:
      1. cat package.json | grep -A 5 "dependencies"
    Expected Result: react-markdown, remark-gfm, rehype-sanitize가 dependencies에 포함
    Failure Indicators: 해당 패키지 이름이 dependencies에 없음
    Evidence: .sisyphus/evidence/task-1-package-json.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-1-install.log (설치 로그)
  - [ ] task-1-package-json.txt (package.json 일부)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add markdown dependencies`
  - Files: `package.json`, `pnpm-lock.yaml`

---

- [ ] 2. Message 타입에 출처 필드 추가

  **What to do**:
  - store.ts의 Message 인터페이스에 citations 필드 추가 (선택적)
  - AnnotationMessage 인터페이스에도 citations 필드 추가

  **Must NOT do**:
  - 기존 필드 삭제 (role, content는 유지)
  - 기존 코드 동작 변경

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: TypeScript 인터페이스에 필드 추가, 단순 타입 정의 작업
  - **Skills**: 없음
    - 이유: 타입 정의만 하므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3-14, F1-F4
  - **Blocked By**: None

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/lib/store.ts:5-8` - Message 인터페이스 정의 패턴

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - 없음

  **WHY Each Reference Matters** (explain the relevance):
  - `src/lib/store.ts:5-8`: Message 인터페이스 구조를 이해하고 동일한 패턴으로 citations 필드 추가

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] Message 인터페이스에 citations?: number[] 필드 추가됨
  - [ ] AnnotationMessage 인터페이스에 citations?: number[] 필드 추가됨
  - [ ] TypeScript 컴파일 에러 없음

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 타입 컴파일 확인
    Tool: Bash (tsc)
    Preconditions: store.ts 수정 완료
    Steps:
      1. npx tsc --noEmit
    Expected Result: "No type errors found" 또는 에러 메시지 없음
    Failure Indicators: TS2322, TS2339 등 타입 에러
    Evidence: .sisyphus/evidence/task-2-tsc.log

  Scenario: 타입 정의 확인
    Tool: Read
    Preconditions: store.ts 수정 완료
    Steps:
      1. Read src/lib/store.ts
      2. Message 인터페이스 확인
    Expected Result: citations 필드가 number[] 타입으로 정의됨
    Failure Indicators: citations 필드 없음, 잘못된 타입
    Evidence: .sisyphus/evidence/task-2-store-interface.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-2-tsc.log (TypeScript 컴파일 로그)
  - [ ] task-2-store-interface.txt (store.ts 인터페이스 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add citations field to Message type`
  - Files: `src/lib/store.ts`

---

- [ ] 3. MainApp에 공유 상태 추가

  **What to do**:
  - MainApp.tsx에 pageNumber 상태 추가 (기본값 1)
  - handleCitationClick 콜백 함수 추가 (페이지 번호 받아서 pageNumber 상태 업데이트)
  - handleCitationClick를 LeftPanel과 RightPanel에 prop으로 전달

  **Must NOT do**:
  - PdfViewer의 내부 pageNumber 상태 수정 (기존 동작 유지)
  - 복잡한 상태 관리 로직 추가 (단순 상태 + 콜백만)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: React 상태 및 콜백 함수 추가, 단순 상태 관리 작업
  - **Skills**: 없음
    - 이유: React useState, useCallback 기본 패턴으로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4-14, F1-F4
  - **Blocked By**: Task 2

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/MainApp.tsx:31-32` - useState 패턴 (currentSessionId, fileUrl)
  - `src/components/PdfViewer.tsx:46-51` - moveToPage 함수 패턴

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - React docs: `https://react.dev/reference/react/useState` - useState 사용법
  - React docs: `https://react.dev/reference/react/useCallback` - useCallback 사용법

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/MainApp.tsx:31-32`: 기존 useState 패턴을 따라 동일한 방식으로 pageNumber 상태 추가
  - `src/components/PdfViewer.tsx:46-51`: moveToPage 함수를 참고하여 handleCitationClick 콜백 구현

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] MainApp.tsx에 pageNumber 상태 추가됨 (기본값 1)
  - [ ] handleCitationClick 함수 정의됨 (page: number 파라미터)
  - [ ] LeftPanel에 onCitationClick prop 전달됨
  - [ ] RightPanel에 onCitationClick prop 전달됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 상태 추가 확인
    Tool: Read
    Preconditions: MainApp.tsx 수정 완료
    Steps:
      1. Read src/components/MainApp.tsx
      2. const [pageNumber, setPageNumber] = useState(1); 확인
    Expected Result: pageNumber 상태가 정의됨
    Failure Indicators: pageNumber 상태 없음
    Evidence: .sisyphus/evidence/task-3-state.txt

  Scenario: 콜백 함수 확인
    Tool: Read
    Preconditions: MainApp.tsx 수정 완료
    Steps:
      1. Read src/components/MainApp.tsx
      2. const handleCitationClick 확인
    Expected Result: handleCitationClick가 setPageNumber을 호출
    Failure Indicators: 콜백 함수 없음 또는 setPageNumber 호출 안 함
    Evidence: .sisyphus/evidence/task-3-callback.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-3-state.txt (상태 정의 부분)
  - [ ] task-3-callback.txt (콜백 함수 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add shared page navigation state`
  - Files: `src/components/MainApp.tsx`

---

- [ ] 4. LeftPanel에 prop 추가

  **What to do**:
  - LeftPanel.tsx 인터페이스에 fileName, onCitationClick props 추가
  - PdfViewer에 fileName, onCitationClick props 전달

  **Must NOT do**:
  - 기존 props 변경 (fileUrl, sessionId, onOpenSidebar는 유지)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: TypeScript 인터페이스에 props 추가, prop drilling
  - **Skills**: 없음
    - 이유: 단순 props 추가 및 전달이므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5-14, F1-F4
  - **Blocked By**: Task 3

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/pdf/left-panel/index.tsx:17-21` - LeftPanelProps 인터페이스 정의
  - `src/components/pdf/left-panel/index.tsx:28` - PdfViewer에 props 전달 방식

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - 없음

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/pdf/left-panel/index.tsx:17-21`: 기존 LeftPanelProps 인터페이스 구조를 이해하고 동일한 패턴으로 새 props 추가

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] LeftPanelProps 인터페이스에 fileName?: string prop 추가됨
  - [ ] LeftPanelProps 인터페이스에 onCitationClick?: (page: number) => void prop 추가됨
  - [ ] PdfViewer에 fileName prop 전달됨
  - [ ] PdfViewer에 onCitationClick prop 전달됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: props 전달 확인
    Tool: Read
    Preconditions: LeftPanel.tsx 수정 완료
    Steps:
      1. Read src/components/pdf/left-panel/index.tsx
      2. PdfViewer props 확인
    Expected Result: fileName과 onCitationClick가 props에 포함됨
    Failure Indicators: props 누락
    Evidence: .sisyphus/evidence/task-4-props.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-4-props.txt (props 전달 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add props to LeftPanel`
  - Files: `src/components/pdf/left-panel/index.tsx`

---

- [ ] 5. 마크다운 렌더링 컴포넌트 생성

  **What to do**:
  - MarkdownRenderer.tsx 컴포넌트 생성 (components/pdf/shared/ 디렉토리)
  - react-markdown 사용하여 렌더링
  - remark-gfm 플러그인 추가 (표, 취소선, 작업 리스트 지원)
  - rehype-sanitize 플러그인 추가 (XSS 방지)
  - CitationBadge 컴포넌트 커스텀 컴포넌트로 등록
  - 링크 커스텀: target="_blank", rel="noopener noreferrer"

  **Must NOT do**:
  - 코드 구문 하이라이팅 추가 (기본 코드 블록만 사용)
  - 복잡한 마크다운 확장 (수학, 다이어그램 등)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `unspecified-high`
    - Reason: 새로운 재사용 가능한 컴포넌트 생성, react-markdown 설정, 커스텀 컴포넌트 구현
  - **Skills**: 없음
    - 이유: react-markdown 문서를 참고하면 충분하므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: Task 7-14, F1-F4
  - **Blocked By**: Task 1

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/pdf/right-panel/ChatTimeline.tsx:36-42` - 메시지 렌더링 패턴

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - react-markdown docs: `https://github.com/remarkjs/react-markdown` - 컴포넌트 사용법
  - remark-gfm docs: `https://github.com/remarkjs/remark-gfm` - 플러그인 설정
  - rehype-sanitize docs: `https://github.com/rehypejs/rehype-sanitize` - 보안 설정

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/pdf/right-panel/ChatTimeline.tsx:36-42`: 기존 메시지 렌더링 방식을 이해하고 마크다운으로 대체

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] MarkdownRenderer.tsx 컴포넌트 생성됨
  - [ ] react-markdown 사용으로 렌더링됨
  - [ ] remark-gfm 플러그인 적용됨
  - [ ] rehype-sanitize 플러그인 적용됨
  - [ ] CitationBadge 커스텀 컴포넌트 정의됨
  - [ ] 링크 커스텀: target="_blank", rel="noopener noreferrer" 적용됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 마크다운 볼드 렌더링
    Tool: Bash (bun test 또는 브라우저)
    Preconditions: MarkdownRenderer 생성 완료
    Steps:
      1. MarkdownRenderer에 "**bold text**" 전달
      2. 렌더링된 DOM 확인
    Expected Result: <strong>bold text</strong> 또는 볼드 스타일 적용
    Failure Indicators: **bold text**가 그대로 텍스트로 표시됨
    Evidence: .sisyphus/evidence/task-5-bold.png

  Scenario: 마크다운 리스트 렌더링
    Tool: Bash (bun test 또는 브라우저)
    Preconditions: MarkdownRenderer 생성 완료
    Steps:
      1. MarkdownRenderer에 "- Item 1\n- Item 2" 전달
      2. 렌더링된 DOM 확인
    Expected Result: <ul><li>Item 1</li><li>Item 2</li></ul> 구조
    Failure Indicators: 단순 텍스트로 표시됨
    Evidence: .sisyphus/evidence/task-5-list.png
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-5-bold.png (볼드 렌더링 스크린샷)
  - [ ] task-5-list.png (리스트 렌더링 스크린샷)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: create MarkdownRenderer component`
  - Files: `src/components/pdf/shared/MarkdownRenderer.tsx`

---

- [ ] 6. ChatTimeline.tsx 마크다운 적용

  **What to do**:
  - ChatTimeline.tsx에서 msg.content 대신 MarkdownRenderer 사용
  - onCitationClick prop 추가 및 MarkdownRenderer에 전달
  - ThreeLineSummary.tsx에서 MarkdownRenderer 사용
  - DetailedSummary.tsx에서 MarkdownRenderer 사용
  - PdfViewer의 AnnotationTooltip에서도 MarkdownRenderer 사용

  **Must NOT do**:
  - 기존 렌더링 동작 완전히 변경 (마크다운만 대체)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: 기존 컴포넌트에 마크다운 렌더링 적용, 단순한 교체 작업
  - **Skills**: 없음
    - 이유: MarkdownRenderer를 사용하면 충분하므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: Task 7-14, F1-F4
  - **Blocked By**: Task 5

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/pdf/right-panel/ChatTimeline.tsx:41` - msg.content 렌더링 방식
  - `src/components/pdf/right-panel/ThreeLineSummary.tsx:17` - summary.content 렌더링 방식
  - `src/components/pdf/right-panel/DetailedSummary.tsx:16` - summary.content 렌더링 방식
  - `src/components/PdfViewer.tsx:484-485` - annotation messages 렌더링 방식

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - 없음

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/pdf/right-panel/ChatTimeline.tsx:41`: msg.content를 마크다운으로 대체할 위치 확인
  - `src/components/pdf/right-panel/ThreeLineSummary.tsx:17`: summary.content를 마크다운으로 대체할 위치 확인
  - `src/components/pdf/right-panel/DetailedSummary.tsx:16`: summary.content를 마크다운으로 대체할 위치 확인
  - `src/components/PdfViewer.tsx:484-485`: annotation messages를 마크다운으로 대체할 위치 확인

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] ChatTimeline.tsx에서 MarkdownRenderer 사용됨
  - [ ] ThreeLineSummary.tsx에서 MarkdownRenderer 사용됨
  - [ ] DetailedSummary.tsx에서 MarkdownRenderer 사용됨
  - [ ] PdfViewer.tsx의 AnnotationTooltip에서 MarkdownRenderer 사용됨
  - [ ] onCitationClick prop 추가됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: ChatTimeline 마크다운 렌더링 확인
    Tool: Read
    Preconditions: ChatTimeline.tsx 수정 완료
    Steps:
      1. Read src/components/pdf/right-panel/ChatTimeline.tsx
      2. MarkdownRenderer 사용 확인
    Expected Result: <MarkdownRenderer> 컴포넌트가 사용됨
    Failure Indicators: msg.content가 그대로 렌더링됨
    Evidence: .sisyphus/evidence/task-6-chat-timeline.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-6-chat-timeline.txt (ChatTimeline.tsx 수정 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: apply markdown to response components`
  - Files: `src/components/pdf/right-panel/ChatTimeline.tsx`, `src/components/pdf/right-panel/ThreeLineSummary.tsx`, `src/components/pdf/right-panel/DetailedSummary.tsx`, `src/components/PdfViewer.tsx`

---

- [ ] 7. 출처 파싱 유틸리티

  **What to do**:
  - parseCitations.ts 유틸리티 함수 생성 (utils 디렉토리)
  - `[N페이지]` 패턴 매칭 (N은 숫자)
  - 매칭된 부분을 CitationBadge 컴포넌트로 변환
  - 매칭되지 않은 부분은 그대로 반환

  **Must NOT do**:
  - 복잡한 파싱 로직 (단순 Regex만 사용)
  - 여러 출처 형식 지원 ([N페이지]만 지원)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: 단순 Regex 패턴 매칭 유틸리티 함수, 콜백 기반
  - **Skills**: 없음
    - 이유: Regex 기본 패턴이므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 8)
  - **Blocks**: Task 9-14, F1-F4
  - **Blocked By**: Task 5

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - 없음 (새로운 유틸리티 함수)

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - MDN docs: `https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/match` - Regex 사용법
  - MDN docs: `https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/split` - split 사용법

  **WHY Each Reference Matters** (explain the relevance):
  - MDN Regex docs: `[N페이지]` 패턴 매칭을 위한 Regex 작성법 참고

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] parseCitations.ts 유틸리티 함수 생성됨
  - [ ] `[N페이지]` 패턴 매칭됨
  - [ ] 매칭된 부분이 CitationBadge로 변환됨
  - [ ] 매칭되지 않은 부분은 그대로 반환됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 출처 파싱 테스트
    Tool: Bash (bun test)
    Preconditions: parseCitations.ts 생성 완료
    Steps:
      1. "이 내용은 [5페이지]에 있습니다" 전달
      2. 파싱 결과 확인
    Expected Result: ["이 내용은 ", CitationBadge(page=5), "에 있습니다"]
    Failure Indicators: 원본 텍스트 그대로 반환
    Evidence: .sisyphus/evidence/task-7-parse.log

  Scenario: 여러 출처 파싱 테스트
    Tool: Bash (bun test)
    Preconditions: parseCitations.ts 생성 완료
    Steps:
      1. "[3페이지], [5페이지], [7페이지]" 전달
      2. 파싱 결과 확인
    Expected Result: 3개의 CitationBadge와 그 사이의 텍스트
    Failure Indicators: 출처 파싱 안 됨
    Evidence: .sisyphus/evidence/task-7-parse-multiple.log
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-7-parse.log (단일 출처 파싱 테스트 로그)
  - [ ] task-7-parse-multiple.log (여러 출처 파싱 테스트 로그)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add citation parsing utility`
  - Files: `src/lib/utils.ts` (또는 src/utils/parseCitations.ts)

---

- [ ] 8. CitationBadge 컴포넌트 생성

  **What to do**:
  - CitationBadge 컴포넌트 생성 (components/pdf/shared/ 디렉토리)
  - 클릭 가능한 버튼 UI (빨간색 배경, hover 시 어두운색)
  - onClick prop 받아서 호출
  - [N페이지] 형식 표시

  **Must NOT do**:
  - 복잡한 출처 UI (툴팁, 분석 등 추가 금지)
  - 출처 상태 저장/추적 금지

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: 단순한 버튼 컴포넌트 생성, Tailwind CSS 스타일링
  - **Skills**: 없음
    - 이유: 기본 React 버튼 패턴이므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 7)
  - **Blocks**: Task 9-14, F1-F4
  - **Blocked By**: Task 7

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/pdf/right-panel/ChatTimeline.tsx:36-42` - 버튼 스타일링 패턴

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - Tailwind docs: `https://tailwindcss.com/docs` - 클래스 이름 확인

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/pdf/right-panel/ChatTimeline.tsx:36-42`: 기존 버튼 스타일링을 참고하여 CitationBadge 스타일링

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] CitationBadge.tsx 컴포넌트 생성됨
  - [ ] 클릭 가능한 버튼 UI
  - [ ] [N페이지] 형식 표시
  - [ ] 빨간색 배경, hover 시 어두운색

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: CitationBadge 렌더링 확인
    Tool: Read
    Preconditions: CitationBadge.tsx 생성 완료
    Steps:
      1. Read src/components/pdf/shared/CitationBadge.tsx
      2. 렌더링된 JSX 확인
    Expected Result: <button> 요소에 [N페이지] 텍스트 포함
    Failure Indicators: 단순 텍스트로 렌더링됨
    Evidence: .sisyphus/evidence/task-8-badge.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-8-badge.txt (CitationBadge 컴포넌트 코드)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: create CitationBadge component`
  - Files: `src/components/pdf/shared/CitationBadge.tsx`

---

- [ ] 9. LeftPanel에 제목 표시 UI 추가

  **What to do**:
  - LeftPanel 상단에 제목 표시 영역 추가 (툴바 위)
  - fileName prop 표시 (파일명)
  - 사이드바 제목 우선순위: MainApp에서 전달받은 sidebarTitle이 있으면 그 우선 사용
  - truncate 처리 (너무 긴 파일명 처리)

  **Must NOT do**:
  - 제목 편집 기능 추가
  - 복잡한 제목 UI (툴팁, 분석 등 추가 금지)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `visual-engineering`
    - Reason: UI 디자인 및 레이아웃, 스타일링, 반응형 처리
  - **Skills**: `frontend-ui-ux`
    - 이유: 최신 UI/UX 패턴으로 제목 표시 UI 디자인

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 10-14, F1-F4
  - **Blocked By**: Task 4

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/MainApp.tsx:267-273` - 헤더 레이아웃 패턴
  - `src/components/PdfViewer.tsx:186-200` - 툴바 레이아웃 패턴

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - Tailwind docs: `https://tailwindcss.com/docs` - truncate, flex, spacing 클래스

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/MainApp.tsx:267-273`: 기존 헤더 스타일링을 참고하여 제목 표시 UI 디자인
  - `src/components/PdfViewer.tsx:186-200`: 기존 툴바 레이아웃을 참고하여 제목 표시 위치 결정

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] LeftPanel 상단에 제목 표시 영역 추가됨
  - [ ] fileName prop 표시됨
  - [ ] 사이드바 제목 우선순위 적용됨
  - [ ] truncate 처리됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 제목 표시 확인
    Tool: Read
    Preconditions: LeftPanel.tsx 수정 완료
    Steps:
      1. Read src/components/pdf/left-panel/index.tsx
      2. 제목 표시 영역 확인
    Expected Result: fileName이 표시되는 div 요소 존재
    Failure Indicators: 제목 표시 영역 없음
    Evidence: .sisyphus/evidence/task-9-title.txt

  Scenario: 사이드바 제목 우선순위 확인
    Tool: Read
    Preconditions: LeftPanel.tsx 수정 완료
    Steps:
      1. Read src/components/pdf/left-panel/index.tsx
      2. sidebarTitle prop 확인
    Expected Result: sidebarTitle이 있으면 그 우선 사용하는 로직 존재
    Failure Indicators: 사이드바 제목 우선순위 로직 없음
    Evidence: .sisyphus/evidence/task-9-priority.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-9-title.txt (제목 표시 부분)
  - [ ] task-9-priority.txt (사이드바 우선순위 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add title display to LeftPanel`
  - Files: `src/components/pdf/left-panel/index.tsx`

---

- [ ] 10. RightPanel에 prop 추가

  **What to do**:
  - RightPanelProps 인터페이스에 fileName, onCitationClick props 추가
  - RightPanel 내부에서 해당 props 사용

  **Must NOT do**:
  - 기존 props 변경 (analysisData, isAnalyzing, sessionId는 유지)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: TypeScript 인터페이스에 props 추가, 단순한 prop 추가 작업
  - **Skills**: 없음
    - 이유: 단순 props 추가이므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Task 9, 11)
  - **Blocks**: Task 12-14, F1-F4
  - **Blocked By**: Task 4, 6

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/pdf/right-panel/index.tsx:16-20` - RightPanelProps 인터페이스 정의

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - 없음

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/pdf/right-panel/index.tsx:16-20`: 기존 RightPanelProps 인터페이스 구조를 이해하고 동일한 패턴으로 새 props 추가

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] RightPanelProps 인터페이스에 fileName?: string prop 추가됨
  - [ ] RightPanelProps 인터페이스에 onCitationClick?: (page: number) => void prop 추가됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: props 추가 확인
    Tool: Read
    Preconditions: RightPanel/index.tsx 수정 완료
    Steps:
      1. Read src/components/pdf/right-panel/index.tsx
      2. RightPanelProps 인터페이스 확인
    Expected Result: fileName과 onCitationClick가 props에 포함됨
    Failure Indicators: props 누락
    Evidence: .sisyphus/evidence/task-10-props.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-10-props.txt (props 추가 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add props to RightPanel`
  - Files: `src/components/pdf/right-panel/index.tsx`

---

- [ ] 11. RightPanel에 제목 표시 UI 추가 (고정 헤더)

  **What to do**:
  - RightPanel 상단에 고정 헤더 추가 (분석결과 상단, 휠해도 유지)
  - fileName prop 표시 (파일명)
  - sticky/fixed로 휠해도 유지
  - truncate 처리

  **Must NOT do**:
  - 제목 편집 기능 추가
  - 복잡한 제목 UI (툴팁, 분석 등 추가 금지)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `visual-engineering`
    - Reason: UI 디자인 및 레이아웃, 고정 헤더 구현, 스타일링
  - **Skills**: `frontend-ui-ux`
    - 이유: 최신 UI/UX 패턴으로 고정 헤더 디자인

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 12-14, F1-F4
  - **Blocked By**: Task 10

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/MainApp.tsx:258-260` - 고정 헤더 패턴
  - `src/components/pdf/right-panel/index.tsx:117-114` - 분석결과 렌더링 부분

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - Tailwind docs: `https://tailwindcss.com/docs` - sticky, fixed, truncate, flex 클래스

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/MainApp.tsx:258-260`: 기존 고정 헤더 스타일링을 참고하여 고정 헤더 구현
  - `src/components/pdf/right-panel/index.tsx:117-114`: 분석결과 상단 위치를 참고하여 헤더 위치 결정

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] RightPanel 상단에 고정 헤더 추가됨
  - [ ] fileName prop 표시됨
  - [ ] sticky/fixed로 휠해도 유지됨
  - [ ] truncate 처리됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 고정 헤더 렌더링 확인
    Tool: Read
    Preconditions: RightPanel/index.tsx 수정 완료
    Steps:
      1. Read src/components/pdf/right-panel/index.tsx
      2. 고정 헤더 div 확인
    Expected Result: sticky 또는 fixed 클래스가 적용된 헤더 div 존재
    Failure Indicators: 고정 헤더 없음
    Evidence: .sisyphus/evidence/task-11-header.txt

  Scenario: 휠 시 동작 확인
    Tool: Read
    Preconditions: RightPanel/index.tsx 수정 완료
    Steps:
      1. Read src/components/pdf/right-panel/index.tsx
      2. sticky 또는 fixed 클래스 확인
    Expected Result: 휠 시 제목이 화면 상단에 고정됨
    Failure Indicators: 휠 시 제목이 사라짐
    Evidence: .sisyphus/evidence/task-11-scroll.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-11-header.txt (고정 헤더 부분)
  - [ ] task-11-scroll.txt (휠 동작 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add fixed title header to RightPanel`
  - Files: `src/components/pdf/right-panel/index.tsx`

---

- [ ] 12. PdfViewer.tsx PDF 중앙 정렬 CSS 수정

  **What to do**:
  - PdfViewer.tsx line 279의 PDF 컨테이너 CSS 수정
  - `px-[400px]` 패딩 제거
  - 유연한 중앙 정렬을 위해 `max-w-fit mx-auto` 사용
  - 패널 크기 조정 시 PDF가 중앙에 오도록 수정

  **Must NOT do**:
  - 기존 네비게이션 동작 변경
  - 툴바 레이아웃 변경

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: CSS 클래스 수정, 스타일링 작업
  - **Skills**: 없음
    - 이유: Tailwind CSS 기본 클래스만 사용하므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 13-14, F1-F4
  - **Blocked By**: Task 9, 11

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/PdfViewer.tsx:279` - 현재 PDF 컨테이너 CSS

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - Tailwind docs: `https://tailwindcss.com/docs` - flex, justify-center, mx-auto, max-w-fit 클래스

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/PdfViewer.tsx:279`: 현재 PDF 컨테이너 CSS를 이해하고 중앙 정렬을 위해 수정할 위치 확인

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] PDF 컨테이너 CSS 수정됨
  - [ ] `px-[400px]` 패딩 제거됨
  - [ ] 유연한 중앙 정렬 적용됨 (`max-w-fit mx-auto`)

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 중앙 정렬 확인
    Tool: Read
    Preconditions: PdfViewer.tsx 수정 완료
    Steps:
      1. Read src/components/PdfViewer.tsx
      2. line 279 확인
    Expected Result: `px-[400px]`가 제거되고 중앙 정렬 클래스가 적용됨
    Failure Indicators: `px-[400px]`가 그대로 존재
    Evidence: .sisyphus/evidence/task-12-centering.txt

  Scenario: 패널 크기 조정 시 동작 확인
    Tool: Playwright
    Preconditions: PdfViewer.tsx 수정 완료
    Steps:
      1. 브라우저 열기
      2. 패널 리사이즈 핸들 드래그 (30% → 60%)
      3. PDF 위치 확인
    Expected Result: 패널 크기에 따라 PDF가 중앙에 정렬됨
    Failure Indicators: PDF가 왼쪽 또는 오른쪽으로 치우쳐짐
    Evidence: .sisyphus/evidence/task-12-resize.png
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-12-centering.txt (중앙 정렬 CSS 부분)
  - [ ] task-12-resize.png (리사이즈 스크린샷)

  **Commit**: YES | NO (groups with N)
  - Message: `fix: improve PDF centering in viewer`
  - Files: `src/components/PdfViewer.tsx`

---

- [ ] 13. RightPanel AI 프롬프트에 출처 요구 추가

  **What to do**:
  - RightPanel의 AI 프롬프트 수정 (line 65)
  - "답변할 때 출처를 [N페이지] 형식으로 포함하세요." 추가

  **Must NOT do**:
  - 기존 프롬프트 내용 변경 (기존 내용 유지)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: 문자열 수정, 단순한 프롬프트 추가 작업
  - **Skills**: 없음
    - 이유: 단순 문자열 추가이므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Task 14)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 11

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/pdf/right-panel/index.tsx:63-66` - AI 프롬프트 정의

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - 없음

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/pdf/right-panel/index.tsx:63-66`: 기존 AI 프롬프트 위치를 찾아서 출처 요구 추가

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] AI 프롬프트에 출처 요구 추가됨
  - [ ] "[N페이지] 형식으로 포함하세요." 텍스트 포함됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 프롬프트 수정 확인
    Tool: Read
    Preconditions: RightPanel/index.tsx 수정 완료
    Steps:
      1. Read src/components/pdf/right-panel/index.tsx
      2. line 63-66 확인
    Expected Result: 출처 요구 텍스트가 프롬프트에 포함됨
    Failure Indicators: 출처 요구 텍스트 없음
    Evidence: .sisyphus/evidence/task-13-prompt.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-13-prompt.txt (프롬프트 수정 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add citation requirement to AI prompt`
  - Files: `src/components/pdf/right-panel/index.tsx`

---

- [ ] 14. PdfViewer AnnotationTooltip AI 프롬프트에 출처 요구 추가

  **What to do**:
  - PdfViewer의 AnnotationTooltip AI 프롬프트 수정 (line 384-385)
  - "답변할 때 출처를 [N페이지] 형식으로 포함하세요." 추가

  **Must NOT do**:
  - 기존 프롬프트 내용 변경 (기존 내용 유지)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: 문자열 수정, 단순한 프롬프트 추가 작업
  - **Skills**: 없음
    - 이유: 단순 문자열 추가이므로 특정 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Task 13)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 8

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `src/components/PdfViewer.tsx:384-385` - AnnotationTooltip 프롬프트 정의

  **API/Type References** (contracts to implement against):
  - 없음

  **Test References** (testing patterns to follow):
  - 없음

  **External References** (libraries and frameworks):
  - 없음

  **WHY Each Reference Matters** (explain the relevance):
  - `src/components/PdfViewer.tsx:384-385`: 기존 AnnotationTooltip 프롬프트 위치를 찾아서 출처 요구 추가

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.

  - [ ] AnnotationTooltip AI 프롬프트에 출처 요구 추가됨
  - [ ] "[N페이지] 형식으로 포함하세요." 텍스트 포함됨

  **QA Scenarios (MANDATORY — task is INCOMPLETE without these):**

  \`\`\`
  Scenario: 프롬프트 수정 확인
    Tool: Read
    Preconditions: PdfViewer.tsx 수정 완료
    Steps:
      1. Read src/components/PdfViewer.tsx
      2. line 384-385 확인
    Expected Result: 출처 요구 텍스트가 프롬프트에 포함됨
    Failure Indicators: 출처 요구 텍스트 없음
    Evidence: .sisyphus/evidence/task-14-prompt.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] task-14-prompt.txt (프롬프트 수정 부분)

  **Commit**: YES | NO (groups with N)
  - Message: `feat: add citation requirement to annotation prompt`
  - Files: `src/components/PdfViewer.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **마크다운 렌더링 검증** — `unspecified-high`
  마크다운 렌더링이 올바르게 작동하는지 확인. 볼드, 이탤릭, 리스트, 링크, 표가 올바르게 렌더링되는지 테스트. XSS 방지가 적용되었는지 확인.
  Output: `Markdown [PASS/FAIL] | Features [N/N] | Security [PASS/FAIL] | VERDICT`

- [ ] F2. **출처 클릭 동작 검증** — `unspecified-high`
  출처 클릭 시 PDF 뷰어가 해당 페이지로 이동하는지 확인. MainApp의 handleCitationClick가 올바르게 호출되는지, PdfViewer의 pageNumber가 올바르게 업데이트되는지 테스트.
  Output: `Citation Click [PASS/FAIL] | Page Navigation [N/N] | VERDICT`

- [ ] F3. **제목 표시 검증** — `unspecified-high`
  좌측/우측 패널 모두에 제목이 올바르게 표시되는지 확인. 사이드바 제목 우선순위가 올바르게 적용되는지 확인. truncate 처리가 올바르게 되는지 확인.
  Output: `Left Panel [PASS/FAIL] | Right Panel [PASS/FAIL] | Priority [PASS/FAIL] | VERDICT`

- [ ] F4. **PDF 중앙 정렬 검증** — `unspecified-high`
  패널 크기 조정 시 PDF가 중앙에 올바르게 정렬되는지 확인. 여러 패널 크기에서 테스트.
  Output: `Centering [N/N panels] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat: add markdown dependencies and type changes` — package.json, pnpm-lock.yaml, src/lib/store.ts
- **Wave 2**: `feat: add shared page navigation state` — src/components/MainApp.tsx, src/components/pdf/left-panel/index.tsx
- **Wave 3**: `feat: apply markdown rendering to responses` — src/components/pdf/shared/MarkdownRenderer.tsx, src/components/pdf/right-panel/ChatTimeline.tsx, src/components/pdf/right-panel/ThreeLineSummary.tsx, src/components/pdf/right-panel/DetailedSummary.tsx, src/components/PdfViewer.tsx
- **Wave 4**: `feat: add citation parsing and badge` — src/lib/utils.ts (또는 src/utils/parseCitations.ts), src/components/pdf/shared/CitationBadge.tsx
- **Wave 5**: `feat: add title display to panels` — src/components/pdf/left-panel/index.tsx, src/components/pdf/right-panel/index.tsx
- **Wave 6**: `fix: improve PDF centering` — src/components/PdfViewer.tsx
- **Wave 7**: `feat: add citation requirement to AI prompts` — src/components/pdf/right-panel/index.tsx, src/components/PdfViewer.tsx
- **Wave FINAL**: `test: verify all features` — .sisyphus/evidence/

---

## Success Criteria

### Verification Commands
```bash
# 마크다운 렌더링 확인
pnpm list react-markdown

# 타입 컴파일 확인
npx tsc --noEmit

# 빌드 확인
pnpm build
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (4개 검증 테스트 모두 통과)
- [ ] No TypeScript errors
- [ ] Build succeeds
