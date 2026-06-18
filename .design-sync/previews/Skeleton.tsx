import { Skeleton } from "url-shortener";

export const LoadingCard = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 12,
      maxWidth: 360,
      padding: 16,
      border: "1px solid #e2e8f0",
      borderRadius: 12,
    }}
  >
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Skeleton style={{ height: 40, width: 40, borderRadius: 9999 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <Skeleton style={{ height: 12, width: "55%" }} />
        <Skeleton style={{ height: 10, width: "35%" }} />
      </div>
    </div>
    <Skeleton style={{ height: 140, width: "100%" }} />
    <Skeleton style={{ height: 12, width: "90%" }} />
    <Skeleton style={{ height: 12, width: "72%" }} />
  </div>
);

export const Lines = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
    <Skeleton style={{ height: 14, width: "100%" }} />
    <Skeleton style={{ height: 14, width: "85%" }} />
    <Skeleton style={{ height: 14, width: "68%" }} />
  </div>
);
