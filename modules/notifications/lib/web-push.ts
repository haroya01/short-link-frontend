import { subscribeWebPush, unsubscribeWebPush } from "@/modules/notifications/api/notifications";

// VAPID public key (same value as the backend's). Env-gated: unset → web push is simply unavailable
// (the toggle hides itself), mirroring the backend's no-op-when-unconfigured contract.
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SW_URL = "/sw.js";

/** True only when the browser can do web push AND a VAPID key is configured. */
export function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // Build on an explicit ArrayBuffer so the type is Uint8Array<ArrayBuffer> (TS 5.7+ distinguishes it
  // from SharedArrayBuffer-backed) — required for PushManager.subscribe's applicationServerKey.
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Whether this browser currently holds a push subscription (toggle reflects this). */
export async function isWebPushEnabled(): Promise<boolean> {
  if (!webPushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  if (!reg) return false;
  return !!(await reg.pushManager.getSubscription());
}

/** Opt in: ask permission → register SW → subscribe → hand the subscription to the backend. Returns
 *  false if permission was denied or support is missing (caller leaves the toggle off). */
export async function enableWebPush(): Promise<boolean> {
  if (!webPushSupported() || !VAPID_PUBLIC) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const reg = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  });
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
  await subscribeWebPush(json.endpoint, json.keys.p256dh, json.keys.auth);
  return true;
}

/** Opt out: drop the browser subscription + tell the backend to forget it. */
export async function disableWebPush(): Promise<void> {
  if (!webPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  try {
    await unsubscribeWebPush(endpoint);
  } catch {
    /* the local unsubscribe is what matters; backend prune also happens on 404/410 send */
  }
}
