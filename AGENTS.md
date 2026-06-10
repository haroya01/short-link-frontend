# AGENTS.md — short-link 프론트엔드 에이전트 가이드

이 파일은 AI 코드 에이전트 (Claude / Cursor / Copilot 등) 와 사람 디자이너가 함께 읽는 디자인 + 코드 가이드. 신규 공개 프로필 피드 카드를 추가하거나 기존 카드를 수정할 때는 먼저 이 파일을 읽고 archetype 을 정한 뒤 starter 템플릿에서 시작.

> **표면 구분**: §1–7 은 공개 프로필(링크-in-bio) 카드 archetype 시스템이다. **blog.kurl 표면(피드 홈 · 포스트 · 작가 페이지 · 태그)은 별개 디자인 언어** — 블로그 화면을 추가·수정하면 먼저 **§10 블로그(웹로그) 표면**을 읽을 것.

---

## 0. 🔒 잠긴 영역 (수정 금지)

아래 영역은 디자인이 확정됐고 소유자가 동결한 코드다. **AI 에이전트는 이 영역을 리팩터링·재배치·스타일 변경·타이밍 조정 대상으로 삼지 말 것** (다른 세션에서 무심코 "정리"하는 것 포함). 인접 코드를 만질 때도 이 블록은 그대로 둔다. 변경이 꼭 필요하면 코드를 고치지 말고 소유자에게 먼저 확인.

| 영역 | 위치 | 비고 |
|---|---|---|
| 제품 전환 warp 연출 | `components/common/apps-grid.tsx` 의 warp 오버레이 + `switchTo` 타이밍(850ms), `app/globals.css` 의 `warp-stroke` / `warp-word` 키프레임 | 흰 화면에 마크가 줄별로 그려지고 그 아래 목적지 워드마크가 lockup 으로 페이드인. 코드에 `🔒 LOCKED` 마커로 표시됨 |

> 같은 파일의 헤더 pill 트리거(`AppsGrid` 의 `<a>`)는 잠금 대상이 아님 — warp 오버레이/키프레임/타이밍만 동결.

---

## 1. 카드 공통 디자인 토큰

모든 공개 프로필 피드 카드는 다음 토큰을 공유. wrapper 레벨에서 절대 분기 ❌ — 차별화는 카드 내부 레이아웃에서만.

### Wrapper

| 속성 | 값 | 비고 |
|---|---|---|
| corner | `rounded-2xl` (16px) | Stan Store / Beacons 기본값. 12px 는 단단, 24px 는 캐주얼 과함 |
| border | `border` + `${colors.cardBorder}` (theme token) | 1px solid, 테마별 색 |
| bg | `${colors.card}` (theme token) | 다크 / aurora / wave / ember 자동 |
| baseline shadow | `0 1px 2px rgba(15, 23, 42, 0.04)` | 거의 flat — 종이 카드 느낌 회피 |
| hover shadow | `0 4px 16px rgba(15, 23, 42, 0.08)` | 인터랙션 시에만 떠오름 |
| hover transform | `translateY(-2px)` | Bento 식 미세 lift |
| active transform | `scale(0.98) translateY(0)` | Stan Store 식 press tactile |
| transition | `transform, box-shadow, border-color 200ms ease-out` | `transition-all` ❌ |

→ 이 토큰은 `.profile-card` (wrapper 자체가 clickable) / `.profile-card-static` (wrapper 안 잡고 내부 버튼이 잡음) CSS 클래스로 추상화돼 있음 (`app/globals.css`). **직접 corner / shadow / border 값 쓰지 말고 클래스 사용.**

### Padding 리듬

| 본질 | 값 | 사용처 |
|---|---|---|
| Visual hero | `p-0` (wrapper) + inner section padding | 카드 상단이 이미지 / iframe 풀블리드 |
| Action card | `px-4 py-3.5` | LinkEntry 가로 바 |
| Information | `px-4 py-4` | EventEntry / EmailFormEntry — 정보 행이 많음 |
| Meta strip | `px-4 py-3` | hero + meta 구조의 meta 영역 |

### 타이포 스케일 (6 단계)

| 레벨 | Tailwind | 픽셀 | 용도 |
|---|---|---|---|
| 1 | `text-[10px] uppercase tracking-wider` | 10 px | floating pill / date pill 월 라벨 — 매우 작은 라벨 / 뱃지 |
| 2 | `text-[11px] font-medium` | 11 px | 카드 위 floating 칩, 인라인 단일 라인 메타 (호스트 등) |
| 3 | `text-[12px] leading-snug` | 12 px | 다중 라인 메타 / 설명 / 주소 / 시간 / 영업시간 |
| 4 | `text-[13px] font-medium` | 13 px | CTA 라벨 (bottom bar / primary 버튼) — 일관 적용 |
| 5 | `text-sm` (14 px) | 14 px | Action 카드 제목 (LinkEntry) |
| 6 | `text-[15px] font-semibold leading-tight` | 15 px | Visual-first 카드 제목 (Place / Product / Gallery) |
| 7 | `text-base / text-xl` | 16 / 20 px | hero 강조 (HighlightLink), EventEntry 제목, ContactCard 이름 (특수) |

10px 미만 금지 — 9px 는 ko/ja 라벨이 라틴보다 훨씬 빨리 뭉개진다. 배지/칩의 최저선도 스케일 1단계(10px).

색상은 `${colors.primary}` / `${colors.muted}` / `text-accent-700` (가격/강조) 만 사용. 슬레이트 / 슬레이트-500 직접 사용 ❌.

### 버튼 스케일 (4 단계)

| 종류 | Tailwind | 사용처 |
|---|---|---|
| **Primary CTA** | `h-10 rounded-xl text-[13px] font-medium ${colors.ctaPrimary}` (배경+텍스트+hover 조합 토큰) | PlaceEntry 길찾기, EmailForm submit. **신규 primary 버튼은 반드시 `colors.ctaPrimary` 사용** |
| **CTA Bar** (border-t) | `flex items-center justify-between border-t px-4 py-2.5 text-[13px] font-medium ${colors.cardBorder} ${colors.primary}` | ProductCardEntry / BookingEntry 의 하단 액션 바 — 본질이 "한 줄 링크" 라 별도 색 없음 |
| **Ghost** | `h-9 rounded-lg px-3 text-[12px] font-medium ${colors.muted} hover:bg-slate-100 hover:${colors.primary}` | PlaceEntry 의 전화/복사/공유, 보조 액션 |

### 아이콘 스케일 (5 단계)

| 레벨 | Tailwind | 용도 |
|---|---|---|
| `h-2.5 w-2.5` | 10 px | 매우 작은 inline (뱃지 안의 별 / 작은 메타 아이콘) |
| `h-3 w-3` | 12 px | 카테고리 칩 / floating pill / date pill 안 |
| `h-3.5 w-3.5` | 14 px | 카드 메인 anchor + CTA 마커 (ArrowRight / ExternalLink) — **기본값** |
| `h-4 w-4` | 16 px | primary 버튼 내 아이콘 (Navigation 길찾기 등) |
| `h-5 w-5` | 20 px | Favicon / 큰 강조 |

### Spacing 스케일

| 종류 | Tailwind | 용도 |
|---|---|---|
| gap micro | `gap-1` (4 px) | 페이지 dots, 카드 안 매우 좁은 묶음 |
| gap 메타 | `gap-1.5` (6 px) | 인라인 메타 행 (`<Icon /> 라벨`), CTA 내부 (`<Icon /> 텍스트`) — **메타 행 기본값** |
| gap 카드 | `gap-2` (8 px) | 작은 영역 (아이콘 + 라벨 묶음 두 개) |
| gap 섹션 | `gap-3` (12 px) | 카드 안 큰 영역 분리 (header + body) |
| stack 카드 | `space-y-1.5` (6 px) | 카드 내부 정보 행 stack |
| stack 폼 | `space-y-3` (12 px) | 다이얼로그 폼 필드 stack |

### 마이크로 인터랙션 (모든 카드 공통)

| 동작 | 구현 | 적용처 |
|---|---|---|
| Fade-in 스태거 | `.profile-fade` + `--idx` 인라인 스타일 | 모든 카드 wrapper `<li>` |
| Hover lift | `.profile-card` 클래스 안에 내장 | interactive wrapper |
| Press tactile | `.profile-card` `:active` 또는 inner button 의 `active:scale-[0.97]` | clickable 요소 |
| Focus ring (wrapper 자동) | `.profile-card:focus-visible` (globals.css) — outline 2px accent + offset 2px | interactive 카드 wrapper — 자동 적용 |
| Focus ring (inner button) | `.focus-ring` 유틸 (globals.css) — 같은 outline | `.profile-card-static` 안의 inner button (Gallery nav / Contact dock / Place ghost trio 등) |
| Image hover (when applicable) | scale-110 + 600ms ease-out | 갤러리 / 이미지 |

---

## 2. 카드 Archetype (4 종)

각 카드는 4 개 archetype 중 하나에 속함. archetype 은 **본질 (essence)** 로 분류 — "사용자가 이 카드를 보고 무엇을 기대하느냐".

### A. Visual-first — "보여준다"

큰 시각 자산 (사진 / 영상 / 지도 / OG 이미지) 이 1차 자산. 텍스트는 보조.

**구조**
1. 상단: 정해진 aspect ratio 시각 영역 (풀블리드, overflow-hidden)
2. 메타 영역: `px-4 py-3` 짧은 라벨 + 부가 정보
3. (옵션) 하단 액션 바 — 단일 primary CTA

**비율 표준**
| 카드 | 비율 | 이유 |
|---|---|---|
| EmbedEntry (영상) | `aspect-video` (16/9) | 영상 필수 비율 |
| PlaceEntry | `aspect-[5/3]` | hero 사진 또는 static map — 양쪽 다 자연스러운 비율 |
| ImageEntry / GalleryEntry / ProductCardEntry | `aspect-[4/3]` (letterbox: object-contain + blur backdrop) | 모바일 우선 시각 무게. 세로/가로/정사각 모두 같은 카드 높이 |
| HighlightLink | `aspect-[1.91/1]` | 페이스북 OG 표준 |

**액션 패턴**
- 카드 전체가 링크/탭: 별도 CTA 없음 (HighlightLink → 외부 이동, ImageEntry/GalleryEntry → lightbox)
- 단일 명시 CTA: 카드 하단 `border-t` 풀폭 한 줄 (ProductCardEntry 의 "자세히")
- 다중 액션 (≥2): 1 primary + 3 ghost 그리드 (PlaceEntry 의 길찾기 + 전화/복사/공유)

**멤버**: HighlightLink, EmbedEntry, ImageEntry, GalleryEntry, ProductCardEntry, PlaceEntry

### B. Action — "유도한다"

탭 → 외부 액션 (이동 / 전화 / 예약 / 입력). 시각보다 정보 + 액션 효율.

**구조**
1. 좌측 anchor: 작은 시각 요소 (favicon 20px 또는 lucide 아이콘 `h-3.5 w-3.5`)
2. 가운데: 라벨 + 호스트 / 메타 한 줄씩
3. 우측: ExternalLink indicator (새 탭 카드) 또는 ArrowRight 마커 (CardCtaBar CTA 모션) / 인라인 폼

**액션 패턴**
| 패턴 | 카드 | 형태 |
|---|---|---|
| 전체 카드 = `<a>` | LinkEntry | 우측 ExternalLink 아이콘 |
| 카드 본체 + 하단 명시 CTA 바 | BookingEntry | `border-t flex items-center justify-between px-4 py-2.5` + ExternalLink (`target="_blank"` 새 탭 indicator) |
| 인라인 폼 | EmailFormEntry | input + submit (`bg-slate-900` button) |

**멤버**: LinkEntry, BookingEntry, EmailFormEntry

### C. Information — "알려준다"

시간성 또는 정보 밀도 우선. 좌측에 시각적 anchor (캘린더 리프 / 마크다운 본문 자체).

**구조**
1. 좌측 anchor (옵션): **캘린더 리프** — `h-20 w-20 rounded-lg border-accent-200/60 bg-white shadow-sm` + 상단 `h-6 bg-accent-700` 월 밴드(흰 10px 라벨) + 하단 `text-3xl` 일 숫자. 또는 마크다운 본문이 anchor 자리 채움
2. 정보 영역: 제목 + 부제 + 메타 행들 (`space-y-1.5`)
3. (옵션) 액션 — 행위가 명시적이면 primary CTA 허용 (`h-10 w-full rounded-xl ${colors.ctaPrimary}`, EventEntry "캘린더 추가" dropdown 트리거). 단순 보조면 ghost

**액션 패턴**
- 본질은 "정보 제공" — 액션이 없어도 완성된 카드
- 명시적 행위(캘린더 추가 등)는 하단 풀폭 primary + dropdown, 그 외 보조는 ghost

**멤버**: EventEntry, TextEntry (DividerEntry 는 sub-archetype "Spacer")

### D. Identity — "표현한다"

브랜드 / 개인 정체성. 강렬한 시각 표현 (foil texture / flip / palette). 다중 액션 dock.

**구조**
1. 전체 카드 = 시그니처 자산. 높이는 콘텐츠 추종 (고정 min-height ❌ — 필드가 적을 때 save 가 정보 행에서 분리돼 보이는 문제로 제거됨)
2. 하단 단일 primary "연락처 저장" + 우상단 share 코너 + 본문 행 인라인 `tel:` / `mailto:`

**액션 패턴**
- 1 primary 룰 그대로 — 저장이 primary, 공유는 코너 오버레이, 연락처 행은 인라인 앵커

**멤버**: ContactCardEntry

---

## 3. Per-card 명세

| 카드 | Archetype | 시각 비율 | CTA 패턴 | 차별 요소 (signature) |
|---|---|---|---|---|
| LinkEntry | B | — | 전체 카드 = link, 우측 ExternalLink | favicon + host |
| HighlightLink | A | 1.91/1 | 전체 카드 = link | ★ Featured 뱃지 (좌상단 floating) |
| EmbedEntry | A | 16/9 | iframe (autoplay) | Play overlay (▶) 클릭 시 iframe 마운트 |
| ImageEntry | A | 4/3 | 탭 → lightbox | 자연 비율 보존 (object-contain) — 정적 단일 사진 |
| GalleryEntry | A | 4/3 | 탭 → lightbox | object-cover 크롭 + dots + 자동 슬라이드 5s (다중 사진 캐러셀) |
| ProductCardEntry | A | 4/3 | 하단 CTA 바 (CardCtaBar) | hero + 가격 + paginated swipe + 가격·배지 위계 (originalPrice strikethrough + 할인율 칩 + NEW/BEST/LIMITED/SOLD_OUT 배지) |
| ContactCardEntry | D | 정사각 | 단일 primary "연락처 저장" (하단) + share 코너 + 본문 행 인라인 `tel:` / `mailto:` / `http` | foil texture + flip + 8 palette + 정사각 로고 focal point + QR 뒷면 |
| EmailFormEntry | B | — | 인라인 폼 | input + submit |
| BookingEntry | B | — | 하단 CTA 바 (전체 카드 anchor) | provider 뱃지 (Calendly 등) |
| EventEntry | C | — | dropdown 보조 | **date pill** (좌측 h-16 w-16 accent-50) |
| PlaceEntry | A | 5/3 | 단일 primary "길찾기" (하단 풀폭) + share 코너 + 본문 행 인라인 `tel:` / copy 아이콘 | static map 폴백 + 카테고리 칩 (좌상단) |
| TextEntry | C | — | 레이아웃 옵션 (inline / card / quote) + 5 accent + emoji icon | 마크다운 노션 타이포 (`.prose-text-block`) — JSON 페이로드 |
| DividerEntry | C (Spacer) | — | — | 얇은 가로 선 |

---

## 3.5. 공유 카드 프리미티브

신규 카드 만들 때 다음 컴포넌트 우선 사용 — Tailwind 클래스 직접 복붙 ❌.

| 프리미티브 | 위치 | 용도 |
|---|---|---|
| `<CardFloatingChip position icon>` | `_components/CardFloatingChip.tsx` | Visual-first 카드의 cover 위에 떠 있는 칩 (Featured 뱃지 / 카테고리 칩). `position`: `top-left` (primary) 또는 `top-right` (secondary) |
| `<CardCtaBar href label colors onClick? external?>` | `_components/CardCtaBar.tsx` | 카드 하단 단일 CTA 바 — border-t + ArrowRight 마커 자동. wrapper 가 별도 `<a>` 아닌 경우에만 사용 가능 (anchor 중첩 회피) |
| `colors.ctaPrimary` (token) | `_lib/theme.ts` | Primary CTA 버튼 배경+텍스트+hover. 직접 `bg-slate-900` 하드코딩 ❌. 12 개 테마별로 정의돼 있어 다크 / 브랜드 테마 자동 대응 |
| `.focus-ring` (utility) | `globals.css` | `.profile-card-static` 안의 inner button 의 키보드 focus outline. 한 클래스로 일관 |
| `<FormField label required className>` | `components/content/curation/form-field.tsx` | BlockDialog 의 라벨 + required 마커 (다이얼로그 전용) |
| `<Textarea>` | `components/ui/textarea.tsx` | Input 과 같은 톤의 multi-line input (다이얼로그 전용) |
| `<ImageCropperDialog open file aspect cropShape? outputMaxDim? outputType? outputQuality? onCancel onConfirm>` | `components/ui/image-cropper-dialog.tsx` | 모든 이미지 업로드 진입점의 공유 cropper. `react-easy-crop` 기반 (드래그 + 핀치 + 휠/슬라이더 줌, 회전 없음). 모바일 풀스크린 sheet / 데스크탑 520×620. 다크 캔버스 + 격자 인터랙션-only. 출력은 크롭된 `File` (caller 가 받아서 presigned S3 PUT). 새 이미지 입력 추가 시 직접 file input 대신 이걸 통하기 |
| `<ImageUploader value onChange aspectClass? cropAspect? emptyHint? removable?>` | `components/content/curation/image-uploader.tsx` | 다이얼로그 안 단일 이미지 슬롯 — 파일 선택 → `<ImageCropperDialog>` → 업로드. `cropAspect` 가 비면 `aspectClass` 에서 자동 추론 (`aspect-square` → 1 / `aspect-[5/3]` → 5/3 등). Image / Place / Contact-logo 다이얼로그가 사용 |
| `parseXConfig(raw)` | `lib/block-config-parsers.ts` | 블록 JSON 파서 — 모든 entry 컴포넌트가 사용. 신규 카드 추가 시 여기에 parser 추가 |
| `useCardTilt()` | `lib/use-card-tilt.ts` | Pointer + scroll → 7 개 CSS custom property. holographic surface 용 (현재 ContactCardEntry 만 사용) |
| `useCardCarousel({ itemCount, behavior })` | `lib/use-card-carousel.ts` | Scroll-snap carousel 의 scrollerRef + activeIdx + scrollToIdx. behavior: "start" (paginated) / "center" (peek). GalleryEntryCard + ProductCardEntry 가 사용 |
| `useAutoSlide({ intervalMs, enabled, onTick })` | `lib/use-auto-slide.ts` | 5 s 자동 슬라이드. pause / resume / 자동 visibility 처리. 갤러리 / 상품 카드 |
| `useBlockDialog<T>()` | `components/content/curation/use-block-dialog.ts` | 10 개 BlockDialog state 한 줄로. {open, blockId, initialPayload, show, close} |
| `<Textarea>` | `components/ui/textarea.tsx` | Input 과 같은 톤의 multi-line (다이얼로그 전용) |

---

## 4. Action Position Rules (cross-archetype)

archetype 과 무관하게 **모든 카드** 가 따르는 액션 버튼 위치 룰. archetype 별 룰보다 우선.

| 액션 타입 | 위치 | 스타일 | 구현 예시 |
|---|---|---|---|
| **주요 CTA** (길찾기 / 연락처 저장 / 자세히 / 예약하기) | 카드 하단 풀-폭 버튼 | `h-10 w-full rounded-xl ${colors.ctaPrimary}` + 아이콘 `h-4 w-4` + 라벨 `text-[13px] font-medium` | PlaceEntry / ContactCardEntry / ProductCardEntry (`<CardCtaBar>`) |
| **공유** | 카드 우상단 코너 오버레이 | `focus-ring absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full backdrop-blur-sm` + Share2 `h-3.5 w-3.5`. 어두운 cover 위면 `bg-black/40 text-white`, 밝은 배경이면 `bg-white/10 text-white/80`. `.focus-ring` 필수 | PlaceEntry / ContactCardEntry |
| **외부 링크 indicator** | "전체 카드 = 링크" 패턴 카드의 우측 (정보 행 끝 또는 하단 strip 우측) | ExternalLink `h-3.5 w-3.5 ${colors.muted}` — "이 카드 탭하면 새 탭 열림" 표지자. LinkEntry / BookingEntry / EmbedEntry | LinkEntry / BookingEntry / EmbedEntry |
| **주요 CTA 마커 아이콘** | 하단 풀폭 버튼 안 또는 CardCtaBar 우측 | 의미 우선 (purpose icon): Navigation (길찾기), Download (저장), Mail (제출) 등. 의미가 없는 generic CTA 라면 ArrowRight `h-3.5 w-3.5` + `group-hover:translate-x-0.5` slide 모션 (ProductCard 의 CardCtaBar) | PlaceEntry / ContactCard / ProductCard |
| **영상 재생** | 썸네일 정중앙 오버레이 | `absolute inset-0 grid place-items-center` + 외부 원 `h-14 w-14 rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm` + Play `h-6 w-6 fill-current translate-x-[1px]` | EmbedEntry |
| **캐러셀 좌/우 이동** (md+) | 이미지 영역 좌우 중앙 | `absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40` + Chevron `h-4 w-4` | GalleryEntry |
| **페이지 인디케이터 dots** | 이미지 영역 하단 가운데 | `absolute bottom-2 left-1/2 -translate-x-1/2` + **각 dot = 24px 버튼**(`focus-ring grid h-6 w-6 place-items-center`, WCAG 2.5.8) 안에 시각 dot — 활성 `w-4 bg-white`, 비활성 `w-1.5 bg-white/40` | GalleryEntry (이미지 위), ProductCard (카드 아래 — 본문 영역 있는 경우 예외) |
| **카테고리 / 뱃지 칩** (수동) | 이미지 좌상단 (primary) 또는 우상단 (secondary) | `<CardFloatingChip position icon>` 프리미티브 | PlaceEntry 카테고리, ProductCard 배지 |
| **단일 항목 인라인 액션** (전화 / 이메일 / 주소 복사) | 본문 정보 행 안에 인라인 | 텍스트 자체 = `<a href="tel:">` / `<a href="mailto:">` 또는 행 우측 `h-3 w-3` 작은 아이콘 버튼 | PlaceEntry, ContactCardEntry |

**두 가지 카드 패턴 — 선택 가이드:**

- **"전체 카드 = 링크"** (LinkEntry / BookingEntry / HighlightLink): 카드 wrapper 자체가 `<a href>`. 외부 링크 indicator 만 표시. 하단 버튼 X. 본질이 "한 가지 행선지로 이동" 인 카드.
- **"본문 + 하단 풀-폭 버튼"** (PlaceEntry / ContactCardEntry / ProductCardEntry): 본문에 정보 + 하단에 명시적 액션 버튼. 본문에 여러 정보 (주소 / 전화 / 시간 등) + 한 가지 주요 액션이 있는 카드.

**금지:**
- 같은 카드 안에 같은 위계의 액션 버튼 2개 이상 (1 primary 룰 위반). 다른 액션이 필요하면 작은 코너 아이콘 또는 본문 인라인으로.
- 주요 CTA 를 커버 위 탭 핸들러로 만들기 — 발견성 떨어짐 + 다른 카드와 어긋남 (PR #138 에서 PlaceEntry 가 이 경로로 갔다가 룰 위반으로 되돌림).

---

## 4.05 이미지 입력 룰 (cross-archetype)

모든 이미지 업로드 진입점은 동일한 cropper UX 를 통과. 새 진입점 추가 시 직접 `<input type="file">` + `resizeImage` 조합 ❌ — 아래 둘 중 하나 사용.

| 진입점 | aspect | 사용처 | 권장 컴포넌트 |
|---|---|---|---|
| 아바타 | 1/1 (round 마스크) | 프로필 사진 | `<ImageCropperDialog cropShape="round">` 직접 (AvatarPicker) |
| 배너 | 3/1 | 프로필 상단 hero | `<ImageCropperDialog>` 직접 (BannerPicker) |
| Contact 로고 | 1/1 | 명함 카드 우상단 | `<ImageUploader cropAspect={1} aspectClass="aspect-square">` |
| Product 아이템 이미지 | 4/3 | 상품 카드 hero | `<ImageCropperDialog>` 직접 (ProductCardBlockDialog 의 ImageGalleryEditor) |
| Gallery 사진 | 4/3 | 사진 캐러셀 | `<ImageCropperDialog>` 직접 (GalleryBlockDialog), 다중 파일은 sequential queue |
| Image 블록 | 4/3 | 단일 사진 카드 | `<ImageUploader aspectClass="aspect-[4/3]">` |
| Place 커버 | 5/3 | 매장 커버 | `<ImageUploader aspectClass="aspect-[5/3]">` |

**Focal point 사용 금지:** PR #144 이전엔 ContactCard 로고 / ProductCard 아이템 이미지에 `focalX / focalY` 드래그 UI 가 있었지만, cropper 가 이미 원하는 aspect 로 framing 한 결과를 출력하므로 `object-position: 50% 50%` (중앙) 이면 WYSIWYG. 백엔드 record 에 필드는 남아 있지만 항상 `50/50` 으로 저장. 새 카드에 추가 ❌.

**출력 사이즈:** 진입점별 `outputMaxDim` 으로 longer-edge cap (avatar 512, banner 2048, 그 외 1600). JPEG @ 0.88–0.9 로 고정. 백엔드 HEAD-check 가 authoritative size guard.

---

## 4.1 Archetype 내부 일관성 규칙

archetype 안의 카드끼리는 다음 규칙을 공유. 위 cross-archetype 룰을 보충.

### A. Visual-first 공통 규칙

- 모든 cover/hero 는 `overflow-hidden` 으로 wrapper 의 rounded-2xl 클립
- floating 라벨 / 뱃지 위치: **좌상단 = primary** (Featured / 영업상태 / 강조), **우상단 = secondary** (카테고리 / 메타)
- floating 칩: `absolute top-3 left-3` (또는 right-3), `rounded-full bg-black/60 backdrop-blur text-white text-[11px]`
- 정보 영역 padding 통일: `px-4 py-3`
- 단일 CTA 바: `flex items-center justify-between border-t px-4 py-2.5 ${colors.cardBorder}` + ArrowRight 우측
- 다중 CTA: 1 primary 풀폭 (`h-10 bg-slate-900 text-white rounded-xl`) + ghost 그리드 (`grid-cols-3 gap-1.5`, 각 `h-9 rounded-lg text-[12px] hover:bg-slate-100`)

### B. Action 공통 규칙

- 좌측 anchor: `h-3.5 w-3.5` (lucide) 또는 favicon 20px
- 라벨: `text-sm font-medium ${colors.primary}` 절대 두 줄 ❌
- 메타: `text-[11px] ${colors.muted}` truncate
- 우측 마커 사용 규칙 (§4 의 통일 룰을 따름):
  - **ExternalLink** — "전체 카드 = 새 탭으로 열림" indicator. LinkEntry / BookingEntry / EmbedEntry 등 `target="_blank"` 인 카드 wrapper-anchor 의 우측 작은 아이콘
  - **ArrowRight** — primary CTA 버튼 안의 motion 마커. CardCtaBar 가 사용 (group-hover slide 애니메이션과 짝). purpose icon 이 없는 generic "다음 단계로" 의미일 때만
- 전체 카드 클릭 가능 시 `<a>` wrapper + `.profile-card` 클래스
- 인라인 폼은 `.profile-card-static` (wrapper 가 클릭 안 잡고 내부 input/button 이 처리)

### C. Information 공통 규칙

- 좌측 anchor (옵션):
  - **캘린더 리프** — `grid h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-accent-200/60 bg-white text-center leading-none shadow-sm`, 상단 월 밴드 `grid h-6 place-items-center bg-accent-700` + `text-[10px] font-bold uppercase tracking-wider text-white`, 하단 일 `text-3xl font-bold text-slate-900`
  - **Markdown body** — anchor 없이 본문 자체가 채움 (TextEntry)
- 정보 행 spacing: `space-y-1.5`
- 메타에 lucide 아이콘 inline: `<MapPin /> 주소` / `<Clock /> 시간` — `flex items-start gap-1.5 text-[12px] leading-snug ${colors.muted}`
- 명시적 행위는 `colors.ctaPrimary` 풀폭 primary (EventEntry 캘린더 추가), 단순 보조는 ghost

### D. Identity 공통 규칙

- 카드 높이 = 앞면 콘텐츠 추종, 뒷면은 `absolute inset-0` 으로 앞면을 따라감 (고정 min-height ❌)
- 액션: 하단 단일 primary 저장 + 우상단 share 코너 (다중 dock ❌ — 1 primary 룰)
- foil / palette / flip 같은 시그니처 표현 유지 (예: `[backface-visibility:hidden]`)

---

## 5. 신규 카드 추가 — 결정 트리

```
Q1: 카드의 시각적 핵심이 큰 미디어 (사진/영상/지도/OG) 인가?
├── YES → A. Visual-first
└── NO  → Q2

Q2: 카드의 본질이 사용자 행동 유도 (탭/입력/외부 액션) 인가?
├── YES → B. Action
└── NO  → Q3

Q3: 카드가 brand / personal 정체성 표현인가? (premium 텍스처 / 다중 액션 dock)
├── YES → D. Identity (신규 추가 권장 안 함 — 1.7 참조)
└── NO  → C. Information
```

결정 후:
1. 해당 archetype 의 **starter 템플릿** 복붙 (다음 섹션)
2. 본질에 맞는 **차별 요소** 만 채움 (예: date pill / Featured 뱃지 / 카테고리 칩 등)
3. archetype 의 **내부 일관성 규칙** 따름 (위 4 절)
4. wrapper 토큰 / 마이크로 인터랙션 / 타이포는 **절대 분기 ❌**

---

## 6. Starter 템플릿

### A. Visual-first

```tsx
return (
  <li className="profile-fade" style={fadeStyle}>
    <article
      className={`profile-card-static overflow-hidden ${colors.card} ${colors.cardBorder}`}
    >
      {/* 1) Hero 영역 — aspect ratio 본질에 맞게 */}
      <div className="relative aspect-[5/3] w-full bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {/* 좌상단 primary floating (있으면) */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          <Icon className="h-3 w-3" /> primary 라벨
        </span>
        {/* 우상단 secondary 칩 (있으면) */}
      </div>

      {/* 2) Meta */}
      <div className="space-y-1.5 px-4 py-3">
        <h3 className={`text-[15px] font-semibold leading-tight ${colors.primary}`}>
          {title}
        </h3>
        <p className={`text-[12px] leading-snug ${colors.muted}`}>{meta}</p>
      </div>

      {/* 3) (옵션) 단일 CTA 바 */}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center justify-between border-t px-4 py-2.5 ${colors.cardBorder}`}
      >
        <span className={`text-[13px] font-medium ${colors.primary}`}>{ctaLabel}</span>
        <ArrowRight className={`h-3.5 w-3.5 ${colors.primary}`} />
      </a>
    </article>
  </li>
);
```

### B. Action

```tsx
return (
  <li className="profile-fade" style={fadeStyle}>
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`profile-card group flex items-center gap-3 px-4 py-3.5 ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-medium ${colors.primary}`}>
          {label}
        </span>
        <span className={`block truncate text-[11px] ${colors.muted}`}>{meta}</span>
      </span>
      <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} />
    </a>
  </li>
);
```

### C. Information

```tsx
return (
  <li className="profile-fade" style={fadeStyle}>
    <div className={`profile-card-static px-4 py-4 ${colors.card} ${colors.cardBorder}`}>
      <div className="flex items-start gap-3">
        {/* (옵션) 좌측 캘린더 리프 */}
        <div className="grid h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-accent-200/60 bg-white text-center leading-none shadow-sm">
          <div className="grid h-6 place-items-center bg-accent-700 px-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white">{month}</p>
          </div>
          <div className="grid place-items-center px-1">
            <p className="text-3xl font-bold text-slate-900">{day}</p>
          </div>
        </div>
        {/* 정보 영역 */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className={`text-sm font-semibold leading-tight ${colors.primary}`}>
            {title}
          </p>
          <p className={`text-[12px] ${colors.muted}`}>{meta}</p>
        </div>
      </div>
      {/* (옵션) 보조 액션 ghost 버튼 — primary 안 씀 */}
      <button
        type="button"
        className={`mt-3 inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[12px] font-medium ${colors.cardBorder} ${colors.primary}`}
      >
        보조 액션
      </button>
    </div>
  </li>
);
```

### D. Identity — 새 카드 추가 권장 안 함

Identity archetype 은 `ContactCardEntry` 1 개로 충분. 신규 추가 시 foil / palette / flip 시스템과 충돌 우려 — 디자인 별도 검토 후. 기본은 `ContactCardEntry.tsx` 구조 참조.

---

## 7. 변경 시 체크리스트

신규 카드 추가 또는 기존 카드 수정 시 PR 본문에 답하기:

- [ ] 어떤 archetype 인가? (A / B / C / D)
- [ ] archetype 내부 일관성 규칙 (4 절) 따름?
- [ ] wrapper 토큰 (rounded / shadow / hover / transition) 분기 안 함?
- [ ] starter 템플릿에서 출발했는가, 아니면 왜 벗어났는가?
- [ ] 본질 표현 요소 (차별점) 가 카드의 1차 자산?

---

## 8. Backend 와의 연결

각 카드는 백엔드 `ProfileBlockType` 의 enum 항목과 1:1 대응. 신규 archetype 카드 추가 시:

**백엔드 (`short-link`)**
- `ProfileBlockType` enum 항목 추가
- `{Name}.java` record + `normalize()` 메서드 (검증 + 직렬화) + `@JsonIgnoreProperties(ignoreUnknown = true)` (forward compat)
- `ProfileService.validateBlockContent` 의 `switch` case
- `PublicProfile.ProfileEntry.{name}()` factory + `findByUsername` 매핑
- `{Name}Test.java` — 필수/옵션 / URL 화이트리스트 / 화이트리스트 enum 검증

**프론트 (`url-shortener`)**
- `types.ts` 의 union 두 곳 (`PublicProfileEntry.kind` + `ProfileBlock.type`) 확장
- `components/content/curation/types.ts` FeedItem 의 BLOCK type union 확장
- `lib/api.ts` `createProfileBlock` payload type union 확장
- `components/content/profile/section.tsx` 의 내부 entries 합성 union 확장 + `handleAdd*` + `persist*` 또는 `persistJsonBlock` 분기 + dialog state + dialog mount
- `components/content/curation/{name}-block-dialog.tsx` (에디터)
- `app/[locale]/u/[username]/_components/{Name}Entry.tsx` (공개 카드)
- `EntryList.tsx` 의 분기 추가
- `ProfileFeedEditor.tsx` 의 AddMenu MenuItem + FeedItemRow 분기 + summary helper
- i18n: `settings.profile` 의 add/edit title / description / 필드 라벨, `publicProfile.{name}` 의 액션 라벨

**참조 패턴 (가장 표준)**
- `ContactCard.java` / `ContactCardEntry.tsx` — Identity archetype 표준
- `Event.java` / `EventEntryCard.tsx` — Information archetype 표준
- `Place.java` / `PlaceEntry.tsx` — Visual-first archetype 표준 (multi-CTA)
- `BookingEntryCard.tsx` — Action archetype + 하단 CTA 바 표준

---

## 8.5 EMAIL_FORM → leads → campaign 흐름

EMAIL_FORM 블록은 다른 카드와 다르게 **사용자 입력을 수집**한다. 수집된 데이터의 lifecycle:

1. **수집**: 공개 프로필의 `EmailFormEntryCard` 에서 방문자가 이메일 제출 → `POST /api/v1/public/email-leads`
2. **확인**: 소유자 전용 `/profile/leads` 페이지에서 newest-first 로 표시
3. **opt-out**: 거부 의사를 표현한 행을 owner 가 토글 표시 (`PATCH /api/v1/users/me/email-leads/{id}`). 행은 DB 에 그대로 남되 CSV export 기본값에서 제외돼 외부 발송 시 자동 존중됨
4. **발송 준비**: `/profile/leads/campaign` 빌더에서 메시지 본문의 모든 링크를 kurl 단축링크 + `utm_source=email&utm_campaign=<slug>&utm_medium=email` 로 자동 변환
5. **발송**: 외부 도구 (Gmail / Mailchimp / 스티비 등) 에 변환된 본문 붙여넣어 발송. **kurl 자체는 메일을 보내지 않는다** — 외부 도구로 보낸 클릭만 dashboard 의 utm_campaign 필터로 집계

**유지 시 주의**
- opt-out 된 행은 절대 DB 에서 삭제하지 않는다. 같은 사용자가 form 으로 재등록할 때 owner 가 흐름을 추적할 수 있어야 한다
- CSV export 의 기본 동작은 "opt-out 제외" — `?includeOptedOut=true` 만 전체 archive 를 받는다 (GDPR 응답 용도)
- 캠페인 빌더는 발송 기능을 절대 추가하지 않는다. 비즈니스 모델 / 스팸 책임 분리 / 인프라 부담 모두 외부 도구에 위임

---

## 9. 입력 다이얼로그 (BlockDialog) 공통 패턴

모든 카드 추가/수정 다이얼로그가 따르는 패턴. 신규 BlockDialog 만들 때 이 절을 참조.

### 9.1 공통 프리미티브

| 용도 | 컴포넌트 | 위치 |
|---|---|---|
| 다이얼로그 wrapper | `ConfirmDialog` | `components/ui/dialog.tsx` |
| 필드 라벨 + required 마커 | `FormField` | `components/content/curation/form-field.tsx` |
| 한 줄 입력 | `Input` | `components/ui/input.tsx` |
| 다중 라인 입력 | `Textarea` | `components/ui/textarea.tsx` |
| 단일 이미지 업로드 | `ImageUploader` | `components/content/curation/image-uploader.tsx` |

**절대 local 에서 재구현 ❌**. 새 다이얼로그에서 직접 `<label>` / `<textarea>` 를 만들면 디자인 드리프트의 원인. 모두 위 프리미티브 사용.

### 9.2 ConfirmDialog props

| prop | 의미 | 기본값 / 권장 |
|---|---|---|
| `title` | 다이얼로그 헤더 | `t("add{Name}Title")` 또는 `t("edit{Name}Title")` |
| `description` | 헤더 하단 안내 | `t("add{Name}Description")` |
| `confirmLabel` | 저장 버튼 라벨 | `t("save")` (전역 공통) |
| `cancelLabel` | 취소 버튼 라벨 | `t("cancel")` (전역 공통) |
| `confirmDisabled` | 저장 비활성화 조건 | `!canSave` boolean |
| `maxWidthClass` | 패널 폭 override | 기본 `max-w-md` (단일 입력) / `max-w-lg` (멀티 필드) / `max-w-2xl` (preview 동반) |

### 9.3 폭 선택 가이드

| 다이얼로그 형태 | maxWidthClass | 예 |
|---|---|---|
| 단일 입력 (URL / 이미지 / 텍스트) | 기본 `max-w-md` | ImageBlockDialog, EmbedBlockDialog |
| 멀티 필드 (3-7 개 필드) | `max-w-lg` | EmailFormBlockDialog, BookingBlockDialog, EventBlockDialog, ContactCardBlockDialog, PlaceBlockDialog |
| 멀티 필드 + 라이브 preview | `max-w-2xl` | TextBlockDialog, ProductCardBlockDialog |

### 9.4 라이브 preview 영역

미리보기 동반 다이얼로그 (Text / ProductCard) 의 preview 영역:
- 다이얼로그 body 상단 또는 하단에 별도 섹션
- 배경: `rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3` (또는 `.profile-card-static` + override)
- 라벨: `text-[11px] font-medium uppercase tracking-wider text-slate-500` + 아이콘
- 미입력 상태: italic `text-slate-400` 안내 (`textPreviewEmpty` 같은 i18n key)

### 9.5 폼 검증 흐름

- 클라이언트에서 `canSave` boolean 계산 → `confirmDisabled={!canSave}` 로 저장 버튼 비활성화
- 백엔드는 source of truth — `normalize()` 에서 길이 / URL 화이트리스트 / enum 화이트리스트 검증
- 다이얼로그는 UX 힌트 (예: EmbedBlockDialog 의 ✓/✗ 제공자, BookingBlockDialog 의 ✓ Calendly), 백엔드는 hard validation

---

## 10. 블로그(웹로그) 표면 디자인 언어

> **이 절은 blog.kurl 표면(피드 홈 · 포스트 · 작가 페이지 · 태그) 전용.** 위 §1–7 은 공개 프로필 카드 archetype 시스템 — 블로그는 별개 표면이고 아래 규칙을 따른다. 단 §0 잠금, flat shadow / `rounded-2xl` 철학(§1), `.focus-ring`, 브랜드 그린(`accent`)은 공유한다.

컨셉: **콘텐츠 플랫폼 피드가 아니라, 글이 시간순으로 쌓이는 조용한 웹로그.** 화려함이 아니라 기본(누가·언제·무엇을 썼나)으로. Material(elevation / 떠 있는 종이 카드) 금지 — §1 flat 철학 그대로.

### 10.1 읽기 컬럼 불변식 (가장 중요)
- 본문 = **화면 정중앙 `max-w-2xl`(672px ≈ 한 줄 66자, 가독 measure)**. 홈 피드 · 포스트 · 작가 페이지 · 태그 페이지 **전부 동일한 띠**여야 한다.
- 레일은 본문을 밀지 않는다 → **대칭 3-컬럼 그리드**: `mx-auto max-w-2xl xl:grid xl:max-w-7xl xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:gap-10`. 본문 `xl:col-start-2`, 레일 `xl:col-start-3` (`hidden xl:block` + 내부 `sticky top-20`).
- 레일은 **xl+ 에서만**. `<xl` 은 컬럼만 중앙·레일 숨김. (포스트는 왼쪽 작가·팔로우 레일 + 오른쪽 목차, 본문 가운데.)
- 탭/섹션 헤더도 `mx-auto max-w-2xl`, 구분선 `border-b border-slate-100` (slate-200 ❌).

> **예외 — 발견(browse) 면은 카드 그리드.** 위 컬럼 불변식(§10.1)과 "카드 그리드 ❌"(§10.2)는 **읽기(reading) 면**(포스트 · 작가 · 태그 페이지)에만 적용된다. **블로그 홈의 둘러보기 면**(최신/인기/팔로잉/시리즈 탭 + 검색 + 카드 #태그 필터)은 의도적으로 **메이슨리 카드 그리드**(`DiscoveryCard`/`DiscoveryGrid`, `max-w-4xl` 3열)를 쓴다 — browse 는 훑어보는 면이라 그리드가 맞고, read 는 한 줄씩 읽는 면이라 컬럼이 맞다는 판단. 이 면에선 **탭 헤더도 그리드와 같은 `max-w-4xl`** 로 둬, 탭 밑줄/구분선이 카드 그리드 폭과 연결되게 한다(헤더만 `max-w-2xl`이면 그리드보다 좁아 띠가 끊겨 보임). 근거·토큰은 `docs/discovery-feed.md`. 이 예외 밖(작가/태그/포스트)에서는 §10.1·§10.2 가 그대로 불변식이다.

### 10.2 글 카드 = 목록 행 (`FeedCard` / `FeedList`)
- 카드 그리드 ❌ → **단일 컬럼 목록 행**. 모든 목록은 **`<FeedList>`** (`ul.flex.max-w-2xl.flex-col`) 로 감싼다 — raw `<ul>` 금지.
- 구조(타이포 우선): 대표 태그(`tags[0]`, **회색 muted `text-slate-500`** — 카테고리 배지/초록 대문자 ❌. slate-400 은 흰 배경 2.56:1 로 WCAG AA 미달이라 **콘텐츠 텍스트 금지** — 장식 아이콘·placeholder·disabled 전용) → 제목(18px / featured 22–26px) → excerpt(14px `slate-500`, 2줄) → 메타(작가·날짜 `slate-500`; 좋아요는 >0 일 때만 강등 표시; **조회수는 카드에서 제거**).
- 썸네일: **이미지 있을 때만** 오른쪽 작은 4:3. **이미지 없으면 placeholder 금지** — 텍스트가 폭 전부 쓰는 완성된 타이포 행.
- 행 전체 hover 하이라이트(`group-hover:bg-slate-50/70`, `-mx-3 px-3` 로 본문 정렬 유지). featured = 첫 글만 "오늘의 글" 라벨 + 약간 큰 제목.
- 링크 헬퍼 필수: `postHref`/`authorHref`(feed-card.tsx), `blogHref`/`linksHref`(lib/host.ts). bare `/series` ❌ (subdomain↔path 둘 다 깨짐) → `authorHref(u, locale, "series")`. 작가 링크를 글 링크 안에 중첩 ❌ (MetaRow 는 형제로).

### 10.3 섹션 라벨 = `RailHeading`
- 모든 레일/섹션 라벨(작가·주제·시리즈·태그·아카이브·최근 글)은 **`<RailHeading>`** 사용 — 앞에 **브랜드 그린 마커**(`h-3 w-[3px] bg-accent-600`) + `text-[13px] font-bold text-slate-800`.
- `uppercase tracking-wide` ❌ — Latin chrome 느낌 + Hangul/Kana 자간이 어색(ja/ko 우선).
- 이 그린 마커 + active 탭 밑줄 + featured 라벨 + 팔로우 버튼이 **하나의 그린 실** = 웹로그 시그니처(조용히 — elevation 아님).
- **그린 계층 (WCAG 기준으로 고정)**: 마커·밑줄·도트 등 비텍스트 = **600**(#059669, 흰 배경 3.77:1 ≥ 3:1) / 흰 라벨을 싣는 채움(팔로우·발행·제출) = **700**(#047857, 5.48:1 ≥ 4.5:1) / 그린 텍스트 = **700** / 포커스 링 = **600**(`.focus-ring`). 500(#10B981)은 흰 배경 2.54:1 — 라이트 모드 단독 사용 ❌ (다크 배경 위 전용).

### 10.4 이미지 정책
- 이미지는 **선택**(강제 금지). 강제하면 글과 무관한 스톡/AI 이미지로 도배돼 플랫폼 냄새. 글 쓰는 플랫폼(Medium/Substack/velog)은 전부 선택.
- 이미지 없는 글 = 타이포 카드. 공유 미리보기는 **강제 이미지 말고 제목+작가 OG 자동 생성**(`opengraph-image.tsx`)으로 해결.

### 10.5 로케일
- `i18n/routing.ts` `defaultLocale: "ko"`(fallback) + `middleware.ts` `detectLocale()`(NEXT_LOCALE 쿠키 → Accept-Language → ko) 로 blog/author host 의 로케일 없는 진입을 감지. 일본인 ja · 한국인 ko · 그 외 ko, en 은 `/en` 으로 접근 가능(강제 아님).
- ⚠️ Accept-Language 기반 rewrite → CDN 캐시 키에 `Vary: Accept-Language` 필요(인프라, 직영).

### 10.6 blog 표면 추가·수정 체크리스트
1. 목록은 `<FeedList>` + `<FeedCard>` — 새 카드 모양 만들지 말 것.
2. 본문 정중앙 `max-w-2xl`; 레일 있으면 §10.1 대칭 3-컬럼 그리드.
3. 섹션 라벨은 `<RailHeading>`.
4. 헤더 구분선 `border-slate-100`, 탭/헤더 `max-w-2xl`.
5. 모든 링크는 `blogHref`/`authorHref`/`postHref`. 빈·`#`·bare-subpath ❌.
6. 인터랙티브 요소에 `.focus-ring` + aria(`current`/`pressed`/`label`). 32px 미만 컴팩트 컨트롤은 `.touch-target` 도 함께(시각 크기 유지, 히트박스만 44px).
7. 코드 내 한글 리터럴 ❌ — 전부 `t()` (i18n 가드: app/components/hooks/lib).
8. radius/shadow 는 §1 그대로(flat · `rounded-2xl`), Material elevation 금지.

### 10.7 포스트 본문 타이포 = `.prose-post`
- 포스트 본문(문단·헤딩·리스트·인용·코드·테이블·이미지)의 읽기 타이포는 **`app/globals.css` 의 `.prose-post`** 한 곳에 모음 — 본문 스타일은 컴포넌트가 아니라 여기서 수정.
- 본문 18px / `leading-[1.55]` / `slate-700`(가독 우선), 헤딩 h2→h4 contiguous(`post-blocks.tsx`), 헤딩 hover 시 `#` 딥링크, 테이블은 flat(헤더 밑줄 + 행 구분선), 코드는 `slate-900` + hljs 팔레트. 링크/마커는 브랜드 그린.

---

## 11. 변경 이력

이 가이드는 카드 구조가 바뀌면 함께 업데이트해야 함. 최근 토큰 변경:
- 2026-05: `rounded-2xl` 통일, `.profile-card` / `.profile-card-static` CSS 클래스 도입 (#94, #95)
- 2026-05: 상품 카드 paginated swipe — 1 아이템 = 풀폭, 2+ = 풀폭 페이지 (#104, #105)
- 2026-05: PLACE archetype 신규 추가 (#102, #103)
- 2026-05: ImageEntry 자연 비율 → `aspect-[4/3]` letterbox 통일 (#108)
- 2026-05: `FormField` / `Textarea` 공유 프리미티브 추출, 6 개 다이얼로그의 로컬 `Field` 중복 제거 (#110)
- 2026-05: `ThemeColors.ctaPrimary` 토큰 추가 — 12 개 테마별 primary CTA 배경/텍스트/hover. 타이포/버튼/아이콘/spacing 스케일 명시 (#114)
- 2026-05: 디자인 토큰 + Google Maps URL builder 단위 테스트 추가 (44 → 86 tests, #116)
- 2026-05: 키보드 포커스 ring 통일 — `.profile-card:focus-visible` 자동 + `.focus-ring` 유틸 (#118)
- 2026-05: `<CardFloatingChip>` + `<CardCtaBar>` 공유 프리미티브 추출 — Visual-first 카드의 반복 패턴 캡슐화 (#120)
- 2026-05: `lib/block-config-parsers.ts` 추출 — 7 개 entry 의 parseConfig dedup + 25 단위 테스트 (#123)
- 2026-05: `useCardTilt` hook 추출 — ContactCardEntry 95 줄 감소 (#125)
- 2026-05: `useBlockDialog` hook — 10 개 다이얼로그 state 보일러플레이트 → 1 줄 (#127)
- 2026-05: ContactCard 모바일 backface — iOS Safari overflow + preserve-3d 평탄화 워크어라운드 (#128)
- 2026-05: `useCardCarousel` hook 추출 — Gallery + ProductCard scroll-snap 통합, 합계 ~90 줄 감소 (#130)
- 2026-05: 블로그(웹로그) 표면 디자인 언어 §10 신설 — 정중앙 읽기 컬럼·`FeedList`/`FeedCard` 목록 행·`RailHeading` 그린 마커·이미지 선택·로케일 자동감지 (#478, #479)
- 2026-06: WCAG 대비 정렬 — 그린 계층 규칙(§10.3: 비텍스트 600 / 흰 라벨 채움·텍스트 700 / 포커스 링 600), 콘텐츠 텍스트 slate-400 금지(§10.2), 캐러셀 dots 24px 버튼·공유 코너 `.focus-ring`(§4), Information 캘린더 리프·primary 허용 + Identity dock 제거 현행화(§2/§4.1/§6), 타이포 최저선 10px 명문화(§1)
