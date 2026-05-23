import { request } from "./client";

export async function startBillingCheckout(): Promise<{ url: string }> {
  return request<{ url: string }>("/api/v1/billing/checkout", { method: "POST" });
}

export async function openBillingPortal(): Promise<{ url: string }> {
  return request<{ url: string }>("/api/v1/billing/portal", { method: "POST" });
}
