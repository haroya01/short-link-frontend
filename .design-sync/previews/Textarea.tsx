import { Textarea } from "url-shortener";

export const States = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
    <Textarea placeholder="이 링크에 대한 메모를 남겨보세요" />
    <Textarea
      rows={3}
      defaultValue={"봄 시즌 프로모션 캠페인용 링크.\n인스타그램 스토리에 사용 예정."}
    />
    <Textarea rows={2} placeholder="비활성 상태" disabled />
  </div>
);
