import { Input } from "url-shortener";

export const States = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
    <Input placeholder="단축할 URL을 붙여넣으세요" />
    <Input defaultValue="https://example.com/very/long/marketing/path" />
    <Input type="email" placeholder="you@example.com" />
    <Input placeholder="비활성 입력" disabled />
  </div>
);

export const WithLabel = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>맞춤 별칭</label>
    <Input placeholder="my-link" defaultValue="spring-sale" />
    <span style={{ fontSize: 12, color: "#64748b" }}>kurl.me/spring-sale</span>
  </div>
);
