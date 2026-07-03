# 글쓰기 + 하이라이트 QA 매트릭스

글쓰기 경험(에디터 · 발행 · 리더 렌더 · 하이라이트) 전체 기능을 **재실행 가능한** e2e/유닛 커버리지에 매핑한 기준표.
새 기능/스펙을 추가할 때 이 표를 갱신하고, 갭이 생기면 스펙을 채우거나 "수동" 항목으로 정직하게 분류한다.

## 레인 (재실행 방법)

세 레인은 서로 다른 빌드가 필요하다. `NEXT_PUBLIC_API_BASE=http://localhost:0` 는 공통.

| 레인 | 빌드 | 실행 | 대상 |
|---|---|---|---|
| **mock-OFF** (작성) | `npm run build` (USE_MOCKS 미설정) | `PORT=3001 npm start` → `npx playwright test e2e/blog-write-flow.spec.ts` | 에디터 authoring 경로. Playwright route 로 백엔드 전 API 를 가로챔 (Spring/DB/S3 불필요). `.github/workflows/e2e-mock.yml` |
| **mock-ON** (리더·하이라이트) | `NEXT_PUBLIC_USE_MOCKS=1 npm run build` | `PORT=3001 npm start` → `npx playwright test e2e/post-highlights.spec.ts e2e/blog-post-render.spec.ts …` | 공개 글 Server Component(서버 fetch → route 가로채기 불가)라 in-memory mock 이 결정적 글 + 로그인 뷰어를 seed. `.github/workflows/e2e-mock-on.yml` |
| **unit** | — | `npm run test:run` (+ `npm run typecheck`, `npm run lint`) | 순수 로직 (markdown↔block, 태그 정규화, 하이라이트 군집화, 링크 추출 등). `.github/workflows/unit-tests.yml` |

> mock-OFF 와 mock-ON 은 빌드 플래그가 달라 **같은 서버로 동시에 못 돌린다.** 한 레인 빌드→기동→실행 후 다른 레인으로.

헤드리스 안정화 관례 (blog-write-flow.spec.ts 에 정착): 키보드 선택은 `Home`→`Shift+End`, 버블/드래그 지연은
`expect(...).toPass()` 재시도, 초안은 수동 저장 버튼이 없으니 idle 오토세이브(`captured.blocks` 폴링)를 기다린다.

## 커버리지 매트릭스

판정: **covered** = 기존 스펙 · **new** = 이번에 추가 · **unit** = 유닛으로 커버 · **manual** = 헤드리스 비결정 → 수동.
스펙 이름은 파일 내 `test(...)` 타이틀 앞부분.

### A. 캔버스 · 본문 기초 (mock-OFF)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 새 글 부트스트랩(초안 생성→에디터) | `the new-post bootstrap creates a draft and lands in its editor` | covered |
| 제목 입력 + 본문 PARAGRAPH 저장 | `types a title + body and saves a PARAGRAPH block` | covered |
| 캔버스 주제 라인 ↔ 발행 다이얼로그 공유 태그 | `canvas topics: the '+ Add topics' ghost expands …` | covered |
| 타자기 스크롤(활성 줄 상단 2/3 유지) | `typewriter scrolling keeps the active line …` | covered |
| 소프트 줄바꿈(Enter 1회 <br> / 2회 문단) | `Enter is a tight soft line break; a second Enter …` | covered |

### B. 인라인 서식 (mock-OFF)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 굵게 (버블) | `selection Bold (bubble menu) wraps the text as **bold**` | covered |
| 굵게 쓰기 모드 (빈 캐럿 Mod+B 무장) | `bold writing mode: Mod+B at an empty caret …` | covered (CI) · 로컬 macOS 실패는 아래 "이슈" 참고 |
| 기울임 · 취소선 · 인라인코드 (버블) | 파라미터화 `selection {Italic,Strikethrough,Inline code} (bubble menu) round-trips` | covered |
| 링크 (버블 + URL 다이얼로그) | `selection Link (bubble menu + URL dialog) saves a real markdown link` | covered |
| 인라인 마크다운 단축(`**` `*` `` ` `` `~~`) | markdown-shortcuts.test.ts (9) | unit |

### C. 블록 서식 (mock-OFF)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| H1 (슬래시) | `slash menu inserts a heading` | covered |
| H2 / H3 (`## ` / `### `) | `markdown shortcut '## ' becomes an H2 block` · `… '### ' … H3` | covered |
| 불릿 / 넘버 (`- ` / `1. `) | `… '- ' … LIST_BULLET` · `… '1. ' … LIST_NUMBERED` | covered |
| 중첩 불릿 (Tab) | `nested bullet list (Tab) keeps the indentation …` | covered |
| 인용 (`> `) | `markdown shortcut '> ' becomes a QUOTE block` | covered |
| 구분선 (`---` / 슬래시) | `typing '---' … DIVIDER` · `slash menu inserts a divider` | covered |
| 불릿·넘버·인용 (슬래시) | 파라미터화 `slash menu inserts a {LIST_BULLET,LIST_NUMBERED,QUOTE} block` | covered |
| 상시 툴바로 블록 삽입 | `the always-on toolbar inserts a block …` | covered |
| H1–H3 한정 가드 (`#### ` 깨짐 방지) | `'#### ' does NOT create a broken h4 … (A7)` | covered |
| ⋮⋮ 블록 거터: Turn into · 복제 · 삭제 · 드래그 재정렬 | — | **manual** (Tiptap drag-handle 플러그인이 포인터를 드래그로 가로채 헤드리스 결정적 구동 불가. 동일 변환은 슬래시/마크다운/툴바로 covered) |

### D. 표 (mock-OFF)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 표 삽입(슬래시, GFM 왕복) | `slash menu inserts a table (GFM round-trips through save)` | covered |
| 엣지 핸들로 열/행 추가 | `table edge handles add a column and a row …` | covered |
| 열 정렬 → GFM 구분자 직렬화 | `table column alignment serializes to the GFM separator (center → :---:)` | covered |
| 열 정렬 마크다운에서 로드 | `table column alignment loads back from markdown (:---: → centered cell)` | covered |

### E. 코드블록 (CodeMirror, mock-OFF)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 코드블록 삽입(슬래시) | `slash menu inserts a code block` | covered |
| 언어 + 본문 왕복 | `code block language + body round-trip into the CODE block` | covered |

### F. 이미지 (mock-OFF + unit)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 파일 업로드 → IMAGE 블록 | `inserting an image saves an IMAGE block carrying the uploaded URL` | covered |
| 와이드 이미지(슬래시, width:wide) | `slash 'Wide image' saves an IMAGE block tagged width:wide` | covered |
| 두 장 나란히(half) | `slash 'Two images' saves a side-by-side pair as two IMAGE blocks` | covered |
| 본문 첫 이미지 → 커버 제안 | `publish dialog: offers the body's first image as a one-tap cover` | covered |
| **노션 붙여넣기: 외부 `<img>` 재호스팅 → IMAGE (#588)** | `paste from Notion: an image-only HTML paste re-hosts the external <img> …` | **new** |
| **단독 이미지 URL 붙여넣기 → 재호스팅 IMAGE** | `paste a bare IMAGE URL on an empty line re-hosts as an IMAGE, not a link card` | **new** |
| 이미지 폭 마커 왕복 | image-width.test.ts (2) | unit |
| 이미지 마크다운 직렬화 | markdown-image.test.ts (10) | unit |
| 붙여넣기 HTML 파싱(외부 img 추출) | paste-images.test.ts (6) | unit |
| 데스크톱에서 파일 드래그앤드롭 | — | **manual** (OS 파일 드래그, 헤드리스 비결정) |

### G. 링크카드 · 임베드 (mock-OFF + unit)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 임베드 다이얼로그 → 라이브 카드 → EMBED | `the embed dialog inserts a live link card that round-trips to an EMBED block` | covered |
| **단독 URL 붙여넣기 → 링크카드 → EMBED** | `paste a bare page URL on an empty line becomes a link card …` | **new** |
| 임베드 타입 판별(비디오/맵/oembed) | post-embed.test.ts (10) · embed-autoplay.test.ts (16) | unit |
| 장소/지도 임베드(슬래시 place → Google Maps) | — | **manual** (Google Places 검색 다이얼로그 · 외부 API) |

### H. 슬래시 메뉴 (mock-OFF + unit)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 트리거 + 항목 선택 | 위 슬래시 스펙들 전반 | covered |
| 키워드 필터(부분일치, EN/KO/JP) | slash-menu-logic.test.ts (8) | unit |
| IME 조합 Enter 미탈취(CJK) | `slash menu does not hijack the IME composition Enter (CJK) (A9)` | covered |

### I. 오토세이브 · 저장 (mock-OFF)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 초안 idle 오토세이브 | `draft autosaves on idle — no Save click needed` | covered |
| 이미지/엣지 구문에서 오토세이브 미동결 (#559) | `autosave does not freeze on image / edge-syntax lines (regression #559)` | covered |
| 발행 글 'Save changes'(상태 불변) | `published post: 'Save changes' persists edits without changing status` | covered |
| 저장 글 재로드(blocks→markdown 왕복) | `a saved post reloads its content into the editor` | covered |
| 저장 실패 에러 노출 | `a failed save surfaces an error message` | covered |
| dirty 초안 Back 시 선저장 | `leaving a dirty draft via Back saves it first` | covered |

### J. 발행 다이얼로그 (mock-OFF + unit)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 발행 → POST /publish → 글 착지 | `publish: dialog Publish fires POST /publish and lands on the published post` | covered |
| 제목 없으면 발행 차단 | `publish is blocked without a title …` | covered |
| 태그 저장 / 추천칩(팔로우+인기 dedup) / 필터 / `#`제거·40자 / 10개캡 / 제거 | `tags entered …` · `followed + popular tags render as one-tap suggestion chips` · `typing filters the tag suggestions` · `tag entry strips a leading # and caps length at 40` · `shows n/10 and stops … at the 10-tag cap` · `removing a tag chip …` | covered |
| 요약 저장 | `excerpt entered in the dialog persists to the metadata PATCH` | covered |
| slug 정규화(PATCH / 라이브) | `slug is normalized … before the PATCH` · `the slug field normalizes input live` | covered |
| 커버 업로드 저장 / 제거 시 ogImageUrl clear | `a cover image uploaded …` · `removing the cover image clears ogImageUrl …` | covered |
| 시리즈 생성 + 배정 | `assigning a freshly created series persists membership (PUT /series/:id/posts)` | covered |
| **본문 링크 kurl 자동단축 ON (#589)** | `publish auto-shortens an in-body link through kurl and swaps the short URL …` | **new** |
| **본문 링크 토글 OFF → 원본 유지** | `publish: an in-post link toggled OFF keeps its original URL (not shortened)` | **new** |
| 태그 정규화 / slug / 본문링크 추출·치환 / kurl 판별 / 공유 | tag-normalize(12) · slug(4) · post-links(8) · kurl-link(2) · publishing-share(6) | unit |
| 미리보기 링크 복사(preview 토큰) | — | **manual** (클립보드 + 토큰 발급) |

### K. 라이프사이클 (mock-OFF)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 내리기 / 재발행 / 재발행 시 본문편집 유지 | `unpublish …` · `republish …` · `republish persists pending body edits` | covered |
| 예약 / 과거시각 거부 / 예약취소 | `schedule …` · `scheduling a past time is rejected … (A22)` · `cancel schedule …` | covered |
| 삭제(확인→DELETE) | `delete: confirming the trash action calls DELETE …` | covered |
| 리비전 복원 | `revisions: restoring a saved version …` · `restoring a revision reseeds the editor (A17)` | covered |

### L. 내보내기 · 미리보기 · 직렬화

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| **.md 내보내기(제목+본문)** | `Export .md downloads the post as markdown carrying the title and body` | **new** |
| 마크/블록 실제 스타일(computed) | `the editor visually styles marks and blocks (computed styles, not just payload)` | covered |
| markdown ↔ block 변환 | markdown-to-blocks.test.ts (31) | unit |

### M. 리더 렌더 (mock-ON) — 작성 결과물의 표시

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 모든 블록 타입 렌더 | blog-post-render `a published post renders every block type for the reader` | covered |
| 리더 타이포(헤딩 대비) | `reader typography is applied …` | covered |
| 소프트 줄바꿈 <br> 렌더 | `a soft line break renders as a tight <br> …` | covered |
| 시리즈 배너 + 다음글 카드 | `a series post shows the series banner … next-up card` | covered |
| 댓글/하이라이트-노트 작성기 WYSIWYG | `the comment composer is WYSIWYG` · `the highlight-note composer is WYSIWYG too` | covered |
| 피드→글 클라이언트 내비 | `feed → post is a client-side navigation …` | covered |

### N. 하이라이트 (mock-ON + unit)

| 기능 | 커버 스펙 | 판정 |
|---|---|---|
| 선택 → Highlight, 정확한 quote 로 class 기반 `<mark>` | post-highlights `selecting text → Highlight paints a class-based <mark> …` | covered |
| 라이트 틴트 + 본문색 상속 | `the highlight <mark> inherits body text color and shows the light-mode green tint` | covered |
| 다크 가독성 (#789) | `the highlight <mark> stays readable in dark mode … #789` | covered |
| **선택 → Note 메모 → 스레드 캐리어(밑줄) 페인트** | `selecting text → Note saves a memo and paints the mark as a thread carrier` | **new** |
| **마크 클릭 → 스레드 시트(정확한 quote)** | `clicking a painted highlight opens its thread sheet showing the exact quote` | **new** |
| **스레드에 답글 게시** | `replying in a highlight's thread posts the reply into the thread` | **new** |
| **?hl 딥링크 → 해당 문장으로 스크롤** | `a ?hl deep link scrolls the quoted passage into view` | **new** |
| 페인트 규칙(내 것 항상 · 스레드 캐리어 · 톱 하이라이트 임계=2 #793) + 군집화 | highlight-clustering.test.ts (19) | unit |
| 오프셋/quote DOM 페인팅 | highlight-anchor.test.ts (8) | unit |
| 톱 하이라이트 임계(#793) e2e — 서로 다른 독자 ≥2 | — | **manual/unit-only** (mock 뷰어 정체성이 단일이라 타 저자 하이라이트 seed 불가; 규칙은 유닛으로 covered) |
| 내 하이라이트 삭제 | — | **N/A** (리더에 삭제 UI 없음; `deleteHighlight` API 는 존재하나 미노출) |

## 수동 QA 체크리스트 (헤드리스 비결정 → 실기기/실사용 확인)

- [ ] ⋮⋮ 블록 거터: 드래그 재정렬 + Turn into/복제/삭제 메뉴
- [ ] 데스크톱 파일 드래그앤드롭 이미지 삽입
- [ ] 장소/지도 임베드(Google Places 검색)
- [ ] 미리보기 링크 복사(클립보드) 후 preview 토큰으로 열람
- [ ] 모바일: 발행 바텀시트 · 노트 시트 키보드 인셋 · 온스크린 키보드
- [ ] 톱 하이라이트: 서로 다른 실제 계정 ≥2 로 같은 구간 하이라이트 시 타인에게 노출
- [ ] beforeunload 미저장 경고 프롬프트
- [ ] 실제 노션 클립보드(혼합 리치 콘텐츠) 붙여넣기 — 합성 paste 로 분기 로직은 커버, 앱간 실클립보드는 수동

## 알려진 이슈 / 관찰

- **bold-mode(447) 로컬 macOS 실패**: 빈 캐럿에서 `Mod+B` 무장 후 타이핑이 `**bold**` 가 아니라 평문으로 저장됨.
  ubuntu CI(e2e-mock 레인, `Mod`→Control) 에서는 **green**(main HEAD 확인). 로컬 macOS(`Mod`→Meta) 전용 재현 →
  Playwright macOS 키 매핑 아티팩트로 보이며 제품 회귀 아님. 이번 작업과 무관(변경 없는 기존 스펙, 배치보다 앞서 실행).
