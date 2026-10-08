import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * 디자인 템플릿 가드 — 토큰 밖 패턴이 소스에 다시 스며드는 것을 CI 가 잡는다(i18n 리터럴
 * 가드와 같은 방식). 규칙의 출처는 DESIGN.md §10.7(모션)과 반경 4단 템플릿:
 *
 *  - 반경은 md(마이크로: 배지·인라인) / lg(컨트롤) / 2xl(카드·시트) / full(알약) 네 단.
 *    rounded-xl 과 임의 반경(rounded-[…])은 폐지 — 새 값이 필요하면 템플릿에 티어를 늘리는
 *    결정부터(개별 화면에서 임의 발명 금지).
 *  - 블로그·노트 화면(BLOG_SURFACES)은 iOS 와 같은 두 단계 — 한 줄 컨트롤 full, 여러 줄 면
 *    surface, 행 안 작은 썸네일 inner. 네 단 템플릿의 md·lg·2xl·card 는 이 화면에서 쓰지 않는다.
 *  - transition-all 금지 — 변하는 속성만 명시(폭 변화까지 미끄러져 레이아웃이 출렁인다).
 *  - hover 임의 그림자 금지 — browse 타일 hover 농도는 shadow-card-hover 토큰이 소유.
 *  - 그림자는 토큰만 — 페이지 위 카드(card·card-flat·card-hover·lift), 떠 있는 층(float·modal).
 *    Tailwind 기본 md/lg/xl/2xl 과 임의 shadow-[…] 금지(drop-shadow 는 사진 위 글자용이라 밖).
 *  - 컴포넌트 소스의 cubic-bezier( 하드코딩 금지 — 하우스 곡선(0.16,1,0.3,1) 미러만 허용
 *    (var() 를 못 받는 자리용, globals.css 의 잠긴 키프레임은 이 가드 밖).
 */
const ROOTS = ["app", "components", "modules", "hooks"];
// u/_lib/theme.ts 는 12개 프로필 테마의 토큰 원장(테마별 CTA 글로우·네오브루탈 하드 섀도 등이
// 곧 정체성) — tailwind.config 와 같은 "정의하는 쪽"이라 가드 대상이 아니다.
const EXCLUDED = /(\.test\.|fixtures|mock-data|demo-data|\.design-sync[\\/]|_lib[\\/]theme\.ts)/;

const BLOG_SURFACES =
  /^(?!.*-setting\.tsx$)(?!.*publish-celebration\.tsx$)(modules[\\/]notes[\\/]|modules[\\/]blog[\\/]components[\\/](?!editor[\\/]|workspace[\\/])|modules[\\/]blog[\\/]lib[\\/]follow-toggle\.ts$|app[\\/]\[locale\][\\/]p[\\/]|app[\\/]\[locale\][\\/]blog[\\/](browse|collections|curation|feed|follow-requests|notes|notifications|remote|series|tags)[\\/]|app[\\/]\[locale\][\\/]blog[\\/](page|blog-chrome|layout|template)\.tsx$|components[\\/]common[\\/](app-header|notification-bell|blog-header-search|blog-bottom-nav|account-sheet)\.tsx$)/;

const BANNED: { name: string; pattern: RegExp; allow?: RegExp; allowFile?: RegExp; onlyFile?: RegExp }[] = [
  {
    name: "블로그·노트 화면의 네 단 템플릿 반경(md·lg·2xl·card) — full·surface·inner 로",
    pattern: /(?<![\w-])rounded-(?:(?:t|b|l|r|tl|tr|bl|br|s|e)-)?(?:md|lg|xl|2xl|3xl|card-lg|card)(?![\w-])/,
    onlyFile: BLOG_SURFACES,
  },
  { name: "transition-all", pattern: /transition-all/ },
  { name: "rounded-xl (템플릿 밖 티어)", pattern: /(?<![\w-])rounded-xl(?![\w-])/ },
  { name: "임의 반경 rounded-[…]", pattern: /rounded-\[/ },
  { name: "hover 임의 그림자", pattern: /hover:shadow-\[/ },
  { name: "임의 그림자 shadow-[…]", pattern: /(?<![\w-])shadow-\[/ },
  {
    name: "기본 그림자 shadow-md/lg/xl/2xl",
    pattern: /(?<![\w-])shadow-(?:md|lg|xl|2xl)(?![\w-])/,
    // 명함 카드는 시각 스냅샷(visual.spec)이 잠근 물체 — 바꾸려면 베이스라인 재생성이 같이 가야 한다.
    allowFile: /contact-card-entry\.tsx$/,
  },
  {
    name: "cubic-bezier 하드코딩",
    pattern: /cubic-bezier\(/,
    // 하우스 곡선 미러(0.16, 1, 0.3, 1)만 허용 — 공백 유무 불문.
    allow: /cubic-bezier\(\s*0?\.16\s*,\s*1\s*,\s*0?\.3\s*,\s*1\s*\)/,
  },
];

function filesUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(file);
    return /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

describe("design token guard", () => {
  const files = ROOTS.flatMap(filesUnder).filter((f) => !EXCLUDED.test(f));

  for (const rule of BANNED) {
    it(`소스에 ${rule.name} 이(가) 없어야 한다`, () => {
      const hits: string[] = [];
      for (const file of files) {
        if (rule.allowFile?.test(file)) continue;
        if (rule.onlyFile && !rule.onlyFile.test(file)) continue;
        const lines = fs.readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (!rule.pattern.test(line)) return;
          if (rule.allow?.test(line)) return;
          hits.push(`${file}:${i + 1} ${line.trim().slice(0, 120)}`);
        });
      }
      expect(hits, hits.join("\n")).toEqual([]);
    });
  }
});
