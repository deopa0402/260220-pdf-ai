
## Wave 2 - Task 3: MainApp 공유 상태 추가

### 패턴: 상태 공유를 위한 useState + 콜백 패턴
- MainApp에서 상위 레벨 상태를 정의: `const [pageNumber, setPageNumber] = useState(1);`
- 콜백 함수로 상태 업데이트: `handleCitationClick = (page: number) => { setPageNumber(page); }`
- 자식 컴포넌트로 콜백 전달: LeftPanel, RightPanel에 `onCitationClick={handleCitationClick}` prop 전달

### Props 전달 체인
MainApp → LeftPanel → PdfViewerComponent (PdfViewer)
MainApp → RightPanel

### 타입 정의 일관성
- 모든 컴포넌트의 props 인터페이스에 `onCitationClick?: (page: number) => void;` 추가
- 옵셔널(`?`)로 정의하여 필수가 아님

### 빌드 검증
- LSP diagnostics로 타입 오류 체크
- `npm run build`로 최종 검증
- 사용하지 않는 변수는 제거 (예: LeftPanel의 fileName prop)

### 주의사항
- PdfViewer의 내부 pageNumber 상태는 수정하지 않음 (기존 동작 유지)
- MainApp에서 PdfViewer에 pageNumber prop을 직접 전달하지 않음



## Wave 3 - Task 5: 마크다운 렌더링 컴포넌트 생성

### 컴포넌트 구조
- **CitationBadge.tsx**: 인용 번호를 표시하는 작은 배지 컴포넌트
  - `<sup>` 태그로 래핑하여 텍스트 상단에 표시
  - Tailwind CSS로 스타일링 (파란색 테두리와 배경)
  - hover 효과로 인터랙티브한 느낌 제공

- **MarkdownRenderer.tsx**: react-markdown 기반 마크다운 렌더링 컴포넌트
  - remarkGfm 플러그인: 표, 취소선, 작업 리스트 지원
  - rehypeSanitize 플러그인: XSS 방지
  - 커스텀 컴포넌트 등록:
    - `a`: target="_blank", rel="noopener noreferrer" 자동 추가
    - `sup`: CitationBadge로 변환 (숫자가 포함된 경우)
    - `code`: inline/block 구분 (className 유무로 판단)
    - 그 외: p, ul, ol, li, h1-h3, strong, blockquote, pre

### TypeScript 타이핑 패턴
- react-markdown의 커스텀 컴포넌트 타입:
  ```tsx
  components={{
    tagName: ({ children, ...props }) => { ... }
  }}
  ```
- `children` 타입은 복합적 (string | ReactNode | ReactNode[])
  - `typeof children === 'string'` 체크 필요
  - `Array.isArray(children)` 체크 필요
  - 안전한 문자열 변환: `String(children[0])`

### 주요 구현 결정
1. **인용 번호 감지**: `children`를 문자열로 변환 후 숫자 추출
2. **inline 코드 감지**: `className` prop 유무로 판단 (react-markdown 규약)
3. **스타일링**: 별도 CSS 파일 없이 Tailwind만 사용
4. **보안**: rehype-sanitize 필수 사용

### 패키지 의존성
- react-markdown: ^10.1.0 (이미 설치됨)
- remark-gfm: ^4.0.1 (이미 설치됨)
- rehype-sanitize: ^6.0.0 (이미 설치됨)

### 주의사항
- 코드 하이라이팅 추가하지 않음 (기본 코드 블록만 사용)
- KaTeX, mermaid 등 복잡한 확장 추가하지 않음
- HTML 태그 직접 추가하지 않음 (보안 위험)