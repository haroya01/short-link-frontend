import type { Me } from "@/types";

import { request, setToken } from "./client";

export async function updateMyTimezone(timezone: string): Promise<Me> {
  return request<Me>("/api/v1/users/me/preferences", {
    method: "PUT",
    body: { timezone },
  });
}

export async function logout(): Promise<void> {
  try {
    await request("/api/v1/auth/logout", { method: "POST" });
  } catch {
  }
  setToken(null);
}
