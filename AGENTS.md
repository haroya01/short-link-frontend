# AGENTS.md — short-link 프론트엔드 에이전트 가이드

이 파일은 AI 코드 에이전트 (Claude / Cursor / Copilot 등) 와 사람 디자이너가 함께 읽는 디자인 + 코드 가이드. 신규 공개 프로필 피드 카드를 추가하거나 기존 카드를 수정할 때는 먼저 이 파일을 읽고 archetype 을 정한 뒤 starter 템플릿에서 시작.

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

### 타이포

| 역할 | Tailwind | 사용처 |
|---|---|---|
| 카드 제목 (primary) | `text-[15px] font-semibold leading-tight ${colors.primary}` | 모든 카드의 주 라벨 |
| 메타 / 보조 텍스트 | `text-[12px] leading-snug ${colors.muted}` | 주소 / 호스트 / 시간 / 설명 |
| 강조 / 가격 / accent | `text-sm font-medium text-accent-700` | 가격, 강조 라벨 |
| 카테고리 칩 / 뱃지 | `text-[11px] font-medium` | 카드 위 floating 칩 |
| floating pill 텍스트 | `text-[10px] uppercase tracking-wider` | 영업상태 / Featured 등 |

### 마이크로 인터랙션 (모든 카드 공통)

| 동작 | 구현 | 적용처 |
|---|---|---|
| Fade-in 스태거 | `.profile-fade` + `--idx` 인라인 스타일 | 모든 카드 wrapper `<li>` |
| Hover lift | `.profile-card` 클래스 안에 내장 | interactive wrapper |
| Press tactile | `.profile-card` `:active` 또는 inner button 의 `active:scale-[0.97]` | clickable 요소 |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-accent-500` | 키보드 사용자 |
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
3. 우측: ArrowRight (forward) 또는 ExternalLink (open in new tab) 마커 / 인라인 폼

**액션 패턴**
| 패턴 | 카드 | 형태 |
|---|---|---|
| 전체 카드 = `<a>` | LinkEntry | 우측 ExternalLink 아이콘 |
| 카드 본체 + 하단 명시 CTA 바 | BookingEntry | `border-t flex items-center justify-between px-4 py-2.5` + ArrowRight |
| 인라인 폼 | EmailFormEntry | input + submit (`bg-slate-900` button) |

**멤버**: LinkEntry, BookingEntry, EmailFormEntry

### C. Information — "알려준다"

시간성 또는 정보 밀도 우선. 좌측에 시각적 anchor (date pill / 마크다운 본문 자체).

**구조**
1. 좌측 anchor (옵션): `h-16 w-16 rounded-xl bg-accent-50/70` date pill, 또는 마크다운 본문이 anchor 자리 채움
2. 정보 영역: 제목 + 부제 + 메타 행들 (`space-y-1.5`)
3. (옵션) 보조 액션 — ghost 버튼 (primary 안 씀, 정보 카드는 "읽고 끝")

**액션 패턴**
- 메인 액션 없음 — 정보 카드의 본질이 "정보 제공"
- 보조 액션: dropdown / 작은 button (EventEntry 의 "캘린더 추가")

**멤버**: EventEntry, TextEntry (DividerEntry 는 sub-archetype "Spacer")

### D. Identity — "표현한다"

브랜드 / 개인 정체성. 강렬한 시각 표현 (foil texture / flip / palette). 다중 액션 dock.

**구조**
1. 전체 카드 = 시그니처 자산. 보통 다른 archetype 보다 큼 (`min-h-[340px]`)
2. 다중 액션 dock (3+) 하단 그리드 — `grid-cols-3 divide-x divide-white/10 border-t border-white/10`

**액션 패턴**
- 3-grid divider 분할
- 각 버튼: `flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium` (아이콘 + 라벨 가로)

**멤버**: ContactCardEntry

---

## 3. Per-card 명세

| 카드 | Archetype | 시각 비율 | CTA 패턴 | 차별 요소 (signature) |
|---|---|---|---|---|
| LinkEntry | B | — | 전체 카드 = link, 우측 ExternalLink | favicon + host |
| HighlightLink | A | 1.91/1 | 전체 카드 = link | ★ Featured 뱃지 (좌상단 floating) |
| EmbedEntry | A | 16/9 | iframe (autoplay) | Play overlay (▶) 클릭 시 iframe 마운트 |
| ImageEntry | A | 4/3 (letterbox) | 탭 → lightbox | 자연 비율 보존 (object-contain + blur backdrop) |
| GalleryEntry | A | 4/3 | 탭 → lightbox | dots + 자동 슬라이드 5s |
| ProductCardEntry | A | 4/3 | 하단 CTA 바 (border-t) | hero + 가격 + paginated swipe (1 아이템 = 풀폭 단일, 2+ = 풀폭 페이지) |
| ContactCardEntry | D | 정사각 | 3-grid dock (call / share / save) | foil texture + flip + 8 palette |
| EmailFormEntry | B | — | 인라인 폼 | input + submit |
| BookingEntry | B | — | 하단 CTA 바 | provider 뱃지 (Calendly 등) |
| EventEntry | C | — | dropdown 보조 | **date pill** (좌측 h-16 w-16 accent-50) |
| PlaceEntry | A | 5/3 | 1 primary + 3 ghost | static map 폴백 + 카테고리 칩 (우상단) |
| TextEntry | C | — | inline link 만 | 마크다운 노션 타이포 (`.prose-text-block`) |
| DividerEntry | C (Spacer) | — | — | 얇은 가로 선 |

---

## 4. Archetype 내부 일관성 규칙

archetype 안의 카드끼리는 다음 규칙을 공유. 새로 만들 때 이걸 어기지 말 것.

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
- 우측 마커 사용 규칙:
  - **ArrowRight** — "forward" 의미 (BookingEntry — 새 페이지로 이동해 예약)
  - **ExternalLink** — "open in new tab" 의미 (LinkEntry — 외부 사이트 새 탭)
- 전체 카드 클릭 가능 시 `<a>` wrapper + `.profile-card` 클래스
- 인라인 폼은 `.profile-card-static` (wrapper 가 클릭 안 잡고 내부 input/button 이 처리)

### C. Information 공통 규칙

- 좌측 anchor (옵션):
  - **Date pill** — `h-16 w-16 rounded-xl border border-accent-200/60 bg-accent-50/70 text-center leading-tight`, 안에 월 (`text-[10px] font-bold uppercase tracking-wider text-accent-700`) + 일 (`text-xl font-bold leading-none text-accent-900`)
  - **Markdown body** — anchor 없이 본문 자체가 채움 (TextEntry)
- 정보 행 spacing: `space-y-1.5`
- 메타에 lucide 아이콘 inline: `<MapPin /> 주소` / `<Clock /> 시간` — `flex items-start gap-1.5 text-[12px] leading-snug ${colors.muted}`
- 보조 액션: ghost 버튼만 (slate-900 primary 안 씀, 정보 카드는 "수동적")

### D. Identity 공통 규칙

- 카드 자체 `min-h-[340px]` (앞뒤 양면 layout 보장)
- 다중 액션 dock: `grid grid-cols-N divide-x divide-white/10 border-t border-white/10`
- 각 버튼: `flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium`
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
        {/* (옵션) 좌측 date pill */}
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-accent-200/60 bg-accent-50/70 text-center leading-tight">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
              {month}
            </p>
            <p className="text-xl font-bold leading-none text-accent-900">{day}</p>
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
- `components/profile-section/types.ts` FeedItem 의 BLOCK type union 확장
- `lib/api.ts` `createProfileBlock` payload type union 확장
- `components/profile-section.tsx` 의 내부 entries 합성 union 확장 + `handleAdd*` + `persist*` 또는 `persistJsonBlock` 분기 + dialog state + dialog mount
- `components/profile-section/{Name}BlockDialog.tsx` (에디터)
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

---

## 9. 입력 다이얼로그 (BlockDialog) 공통 패턴

모든 카드 추가/수정 다이얼로그가 따르는 패턴. 신규 BlockDialog 만들 때 이 절을 참조.

### 9.1 공통 프리미티브

| 용도 | 컴포넌트 | 위치 |
|---|---|---|
| 다이얼로그 wrapper | `ConfirmDialog` | `components/ui/dialog.tsx` |
| 필드 라벨 + required 마커 | `FormField` | `components/profile-section/FormField.tsx` |
| 한 줄 입력 | `Input` | `components/ui/input.tsx` |
| 다중 라인 입력 | `Textarea` | `components/ui/textarea.tsx` |
| 단일 이미지 업로드 | `ImageUploader` | `components/profile-section/ImageUploader.tsx` |

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

## 10. 변경 이력

이 가이드는 카드 구조가 바뀌면 함께 업데이트해야 함. 최근 토큰 변경:
- 2026-05: `rounded-2xl` 통일, `.profile-card` / `.profile-card-static` CSS 클래스 도입 (#94, #95)
- 2026-05: 상품 카드 paginated swipe — 1 아이템 = 풀폭, 2+ = 풀폭 페이지 (#104, #105)
- 2026-05: PLACE archetype 신규 추가 (#102, #103)
- 2026-05: ImageEntry 자연 비율 → `aspect-[4/3]` letterbox 통일 (#108)
- 2026-05: `FormField` / `Textarea` 공유 프리미티브 추출, 6 개 다이얼로그의 로컬 `Field` 중복 제거 (#110)
