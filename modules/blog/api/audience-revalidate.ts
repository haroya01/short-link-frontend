import { freshToken } from "@/lib/api/client";
import { blogPath } from "@/lib/host";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export function refreshPublicLists(postId: number): void {
  if (USE_MOCKS || typeof window === "undefined") return;
  void freshToken()
    .then((token) =>
      token
        ? fetch(blogPath("/revalidate"), {
            method: "POST",
            keepalive: true,
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ postId }),
          })
        : null,
    )
    .catch(() => {});
}
