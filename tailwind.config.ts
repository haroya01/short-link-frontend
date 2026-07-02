import type { Config } from "tailwindcss";

const config: Config = {
  // Toggle-based dark mode (`.dark` on <html>). Both products (links + blog) are dark-capable;
  // u/ public profiles opt out — they color through their own 12-theme token system instead.
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        accent: {
          DEFAULT: "#059669",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
      },
      fontFamily: {
        /*
         * One sans family across the entire app — Pretendard for both Korean and Latin.
         * 디스플레이 세리프 슬롯은 두 번 도입됐다가 두 번 죽었다: Instrument Serif 는 서양
         * 세리프 이탤릭이 한글 우선 화면에서 겉돌아서, MaruBuri(마루 부리)는 콘텐츠 제목 전반에
         * 깔아 보니 명조 디스플레이가 올드하게 읽혀 당일 철회(2026-06, #701). Pretendard's
         * 700/800 weights at tight tracking carry the editorial moment on their own.
         */
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SF Mono",
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(circle, var(--tw-gradient-stops))",
      },
      /*
       * Headline scale — 5단계. 페이지마다 inline `text-[26px] sm:text-[36px] lg:text-[52px]`
       * 가 분산되어 있어 audit (P1) 에서 비일관성 지적됨. 이 token 으로 점진 통일.
       *
       * 사용 예: `text-headline-md sm:text-headline-lg lg:text-headline-xl`
       *
       * - headline-xs (20px / 22px): 작은 section title (Section 의 h3 = 15px 보다 한 단계 위)
       * - headline-sm (24px / 26px): 모바일 페이지 h1, narrative h2
       * - headline-md (32px): tablet/sm breakpoint 의 h2
       * - headline-lg (40px / 44px): desktop h2, hero sub
       * - headline-xl (56px / 60px): hero h1 (qr-campaigns 같은 마케팅 페이지)
       *
       * line-height 는 큰 size 일수록 tight — display-quality.
       */
      fontSize: {
        "headline-xs": ["1.25rem", { lineHeight: "1.25" }],
        "headline-sm": ["1.5rem", { lineHeight: "1.2" }],
        "headline-md": ["2rem", { lineHeight: "1.15" }],
        "headline-lg": ["2.5rem", { lineHeight: "1.1" }],
        "headline-xl": ["3.5rem", { lineHeight: "1.05" }],
        /*
         * Card-title scale — 목록/그리드 카드 제목이 컴포넌트마다 `text-[NNpx]` 로 흩어져 있던 것을
         * 한 스케일로 모은다(타입 산발 방지). size 만 정의하는 이유: 같은 px 가 카드에 따라 다른
         * line-height 로 쓰인다(18px = feed 1.3 / cover 1.25, 20px = cover 1.25 / series 1.375).
         * line-height·tracking 은 콜사이트의 `leading-*`/`tracking-*` 로 유지 → 토큰 교체는 무변화.
         *
         * - xs (17px): discovery 텍스트 카드
         * - sm (18px): feed 행 · discovery 커버 카드
         * - md (19px): discovery 텍스트 featured · discovery 시리즈 카드
         * - lg (20px): discovery 커버 featured · series feed 카드
         * - xl (22px): 검색 빈 화면 heading
         * - 2xl (23px): feed featured 리드 (모바일)
         * - 3xl (27px): feed featured 리드 (sm+)
         */
        "card-title-xs": "1.0625rem",
        "card-title-sm": "1.125rem",
        "card-title-md": "1.1875rem",
        "card-title-lg": "1.25rem",
        "card-title-xl": "1.375rem",
        "card-title-2xl": "1.4375rem",
        "card-title-3xl": "1.6875rem",
      },
      boxShadow: {
        // Blog surface shadows as named tokens so call sites stop hand-rolling arbitrary values.
        // Browse(발견) 타일의 안정(resting) 상태 그림자 — 닿는 면 가까운 1px + 퍼지는 ambient 로
        // 평면이 아니라 살짝 떠 있게. hover lift(card-hover)와 짝을 이룬다.
        card: "0 1px 2px rgba(15,23,42,0.04), 0 6px 16px -8px rgba(15,23,42,0.12)",
        // Browse(발견) 타일 hover lift — 읽기면 flat 철학의 명시적 예외(AGENTS §10.1)라서,
        // 그 농도를 이 토큰 한 곳이 소유한다. 콜사이트에서 임의값으로 다시 들고 다니지 말 것.
        "card-hover": "0 18px 40px -12px rgba(15,23,42,0.28)",
        cta: "0 8px 24px -8px rgba(5,150,105,0.45)", // brand-green CTA glow
        fab: "0 8px 24px -6px rgba(5,150,105,0.5)", // floating action button (slightly stronger)
      },
      // Enter/exit pairs. Exits mirror their entrance, ride the same --ease curve, run slightly
      // quicker, and hold their end state (`both`) so the overlay never flashes back to full
      // opacity between the animation finishing and use-presence unmounting it.
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(2px)" },
        },
        "dropdown-in": {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "dropdown-out": {
          from: { opacity: "1", transform: "translateY(0) scale(1)" },
          to: { opacity: "0", transform: "translateY(-6px) scale(0.96)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toast-out": {
          from: { opacity: "1", transform: "translateY(0) scale(1)" },
          to: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-out": "fade-out 160ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "dropdown-in": "dropdown-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "dropdown-out": "dropdown-out 160ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-in": "toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        "toast-out": "toast-out 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
