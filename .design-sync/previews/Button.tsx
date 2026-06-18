import { Button } from "url-shortener";

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button variant="default">기본</Button>
    <Button variant="accent">링크 만들기</Button>
    <Button variant="outline">취소</Button>
    <Button variant="subtle">더보기</Button>
    <Button variant="ghost">건너뛰기</Button>
    <Button variant="destructive">삭제</Button>
    <Button variant="link">자세히 보기</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button variant="accent" size="sm">Small</Button>
    <Button variant="accent" size="md">Medium</Button>
    <Button variant="accent" size="lg">Large</Button>
    <Button variant="accent" size="xl">지금 시작하기</Button>
  </div>
);

export const States = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button variant="accent">활성</Button>
    <Button variant="accent" disabled>비활성</Button>
    <Button variant="outline" disabled>비활성</Button>
  </div>
);

// size="icon" → 36px square for icon-only actions. Icon is any child (here inline SVGs).
const CopyIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconButtons = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button variant="outline" size="icon" aria-label="링크 복사">{CopyIcon}</Button>
    <Button variant="subtle" size="icon" aria-label="링크 복사">{CopyIcon}</Button>
    <Button variant="accent" size="icon" aria-label="링크 복사">{CopyIcon}</Button>
    <Button variant="ghost" size="icon" aria-label="링크 복사">{CopyIcon}</Button>
  </div>
);
