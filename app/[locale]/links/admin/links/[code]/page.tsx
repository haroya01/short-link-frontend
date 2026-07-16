import { guardAdminServer } from "@/lib/admin-guard";
import { AdminLinkDetailView } from "./detail-view";

// force-dynamic + 서버 가드: 익명 방문자에게 하드 404(존재 은닉). notFound() 는 반드시 페이지 세그먼트
// (레이아웃/제너레이트메타데이터 X)에서 던져야 404 상태코드가 나간다 — 자세한 근거는 lib/admin-guard.ts.
export const dynamic = "force-dynamic";

export default function AdminLinkDetailPage() {
  guardAdminServer();
  return <AdminLinkDetailView />;
}
