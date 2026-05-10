"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { shortenUrl, toggleLinkOnProfile } from "@/lib/api";

type Platform = {
  id: string;
  label: string;
  /** Replace {h} with the user-entered handle to build the destination URL. */
  urlTemplate: string;
  /** Hint shown next to the input — what shape we expect ("haroya", "@haroya", "channel ID"). */
  placeholder: string;
  /** Strip @, leading slash, etc. before substitution. */
  normalize?: (raw: string) => string;
  /** Detects whether a featured URL belongs to this platform — used to render ✓ on chips. */
  matches: (url: string) => boolean;
};

const stripAt = (h: string) => h.trim().replace(/^@/, "").replace(/^\/+/, "");

const matchHost = (host: string) => (url: string) => {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return h === host || h.endsWith("." + host);
  } catch {
    return false;
  }
};

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    label: "Instagram",
    urlTemplate: "https://instagram.com/{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: matchHost("instagram.com"),
  },
  {
    id: "x",
    label: "X (Twitter)",
    urlTemplate: "https://x.com/{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: (u) => matchHost("x.com")(u) || matchHost("twitter.com")(u),
  },
  {
    id: "youtube",
    label: "YouTube",
    urlTemplate: "https://youtube.com/@{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: (u) => matchHost("youtube.com")(u) || matchHost("youtu.be")(u),
  },
  {
    id: "tiktok",
    label: "TikTok",
    urlTemplate: "https://tiktok.com/@{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: matchHost("tiktok.com"),
  },
  {
    id: "threads",
    label: "Threads",
    urlTemplate: "https://threads.net/@{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: matchHost("threads.net"),
  },
  {
    id: "github",
    label: "GitHub",
    urlTemplate: "https://github.com/{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: matchHost("github.com"),
  },
  {
    id: "kakao-channel",
    label: "카카오톡 채널",
    urlTemplate: "https://pf.kakao.com/_{h}",
    placeholder: "abcDEF (채널 ID)",
    normalize: (h) => h.trim().replace(/^_/, "").replace(/^@/, ""),
    matches: matchHost("pf.kakao.com"),
  },
  {
    id: "kakao-openchat",
    label: "오픈채팅",
    urlTemplate: "https://open.kakao.com/o/{h}",
    placeholder: "g1ABC2dE",
    normalize: (h) => h.trim().replace(/^\/+/, ""),
    matches: matchHost("open.kakao.com"),
  },
  {
    id: "naver-blog",
    label: "네이버 블로그",
    urlTemplate: "https://blog.naver.com/{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: matchHost("blog.naver.com"),
  },
  {
    id: "velog",
    label: "Velog",
    urlTemplate: "https://velog.io/@{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: matchHost("velog.io"),
  },
  {
    id: "tistory",
    label: "Tistory",
    urlTemplate: "https://{h}.tistory.com",
    placeholder: "haroya",
    normalize: stripAt,
    matches: matchHost("tistory.com"),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    urlTemplate: "https://linkedin.com/in/{h}",
    placeholder: "haroya",
    normalize: stripAt,
    matches: matchHost("linkedin.com"),
  },
  {
    id: "email",
    label: "Email",
    urlTemplate: "mailto:{h}",
    placeholder: "you@example.com",
    normalize: (h) => h.trim(),
    matches: (u) => u.toLowerCase().startsWith("mailto:"),
  },
];

type Props = {
  /** Called after a new link is shortened + toggled on. Lets the parent refresh its lists. */
  onAdded: () => void;
  /** Featured links' destination URLs — used to mark chips as already-added. */
  addedUrls?: string[];
};

export function ProfileQuickAdd({ onAdded, addedUrls = [] }: Props) {
  const t = useTranslations("settings.profile.quickAdd");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [openId, setOpenId] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
    setHandle("");
  }

  const platform = PLATFORMS.find((p) => p.id === openId) ?? null;

  async function submit() {
    if (!platform) return;
    const normalized = (platform.normalize ? platform.normalize(handle) : handle.trim());
    if (!normalized) return;
    const url = platform.urlTemplate.replace("{h}", encodeURIComponent(normalized).replace(/%40/g, "@"));
    setBusy(true);
    try {
      const created = await shortenUrl({ url });
      await toggleLinkOnProfile(created.shortCode, true);
      toast(t("added", { label: platform.label }), "success");
      setOpenId(null);
      setHandle("");
      onAdded();
    } catch (err) {
      toast(errorMessage(err, t("addFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-slate-700">{t("title")}</p>
        <p className="text-[11px] text-slate-500">{t("hint")}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PLATFORMS.map((p) => {
          const active = openId === p.id;
          const alreadyAdded = addedUrls.some((u) => p.matches(u));
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              title={alreadyAdded ? t("alreadyAdded", { label: p.label }) : undefined}
              className={
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
                (active
                  ? "border-accent-300 bg-accent-50 text-accent-800"
                  : alreadyAdded
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900")
              }
            >
              {alreadyAdded ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
              {p.label}
            </button>
          );
        })}
      </div>

      {platform && (
        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-500">
              {t("inputLabel", { label: platform.label })}
            </span>
            <div className="flex gap-2">
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder={platform.placeholder}
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submit();
                  }
                }}
                autoFocus
              />
              <Button type="button" size="sm" onClick={submit} disabled={busy || !handle.trim()}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("add")}
              </Button>
            </div>
            <p className="font-mono text-[10px] text-slate-400">
              → {platform.urlTemplate.replace("{h}", handle.trim() || platform.placeholder)}
            </p>
          </label>
        </div>
      )}
    </div>
  );
}
