import type { PostDetailRead, PublicPostDetail } from "@/modules/blog/api/public-posts";
import type { LockReason } from "@/modules/blog/lib/post-audience";

export type GateReason = Exclude<LockReason, "REGION_CHECK">;

export type GateView =
  | { kind: "checking" }
  | { kind: "locked"; reason: GateReason }
  | { kind: "open"; detail: PublicPostDetail }
  | { kind: "failed" };

export function initialGateView(reason: LockReason): GateView {
  return reason === "REGION_CHECK" ? { kind: "checking" } : { kind: "locked", reason };
}

export function needsBrowserRead(
  reason: LockReason,
  access: { authenticated: boolean; grant: string | null; key: string | null },
): boolean {
  return reason === "REGION_CHECK" || access.authenticated || access.grant != null || access.key != null;
}

export function gateViewFrom(read: PostDetailRead): GateView {
  if (!read.ok) return { kind: "failed" };
  const reason = read.data.post.locked?.reason;
  if (!reason) return { kind: "open", detail: read.data };
  if (reason === "REGION_CHECK") return { kind: "failed" };
  return { kind: "locked", reason };
}

export function grantRejected(view: GateView, sentGrant: string | null): boolean {
  return sentGrant != null && view.kind === "locked" && view.reason === "PASSWORD";
}
