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
