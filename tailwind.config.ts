import type { Config } from "tailwindcss";

const config: Config = {
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
         * One sans family across the entire app — Pretendard for both Korean and Latin. The
         * earlier setup paired Pretendard with an Instrument Serif display slot for hero
         * headlines, but the western serif italic read as out-of-place on a Korean-first
         * surface. Pretendard's 700/800 weights at tight tracking carry the editorial moment
         * on their own; no display swap needed.
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
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "dropdown-in": {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "dropdown-in": "dropdown-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "toast-in": "toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
