"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ProtectionSection } from "@/components/links/edit-link-dialog/sections/protection-section";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { getLinkDetail, setLinkProtection } from "@/lib/api/links";

/**
 * 통계 설정 탭의 자립형 보호(비밀번호·최대 조회수) 섹션. 폼 UI 는 편집 다이얼로그의
 * {@link ProtectionSection} 을 그대로 재사용하고, 로드(getLinkDetail)·저장(setLinkProtection)
 * 배관만 이 래퍼가 진다 — 보호가 편집 다이얼로그에만 있어 "설정 탭에서 사라졌다"고
 * 읽히던 문제의 처방(설정 탭 = 이 링크의 모든 설정이라는 기대).
 */
export function LinkProtectionSection({ shortCode }: { shortCode: string }) {
  const t = useTranslations("edit");
  const tSection = useTranslations("stats.protection");
  const { toast } = useToast();
  const toMessage = useApiErrorMessage();
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [maxViewsInput, setMaxViewsInput] = useState("");
  const [maxViews, setMaxViews] = useState<number | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getLinkDetail(shortCode)
      .then((detail) => {
        if (!active) return;
        setPasswordProtected(Boolean(detail.passwordProtected));
        setMaxViews(detail.maxViews ?? null);
        setMaxViewsInput(detail.maxViews != null ? String(detail.maxViews) : "");
        setViewCount(detail.viewCount ?? 0);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [shortCode]);

  async function save() {
    const trimmedMax = maxViewsInput.trim();
    let nextMaxViews: number | null;
    if (!trimmedMax) {
      nextMaxViews = null;
    } else {
      const parsed = Number(trimmedMax);
      if (!Number.isFinite(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
        toast(t("protection.maxViewsInvalid"), "error");
        return;
      }
      nextMaxViews = parsed;
    }
    const passwordChanged = password.length > 0 || removePassword;
    if (!passwordChanged && nextMaxViews === maxViews) return;
    setBusy(true);
    try {
      // 계약(편집 다이얼로그와 동일): password "" = 해제, null = 유지.
      await setLinkProtection(shortCode, {
        password: removePassword ? "" : password.length > 0 ? password : null,
        maxViews: nextMaxViews,
      });
      setPasswordProtected(removePassword ? false : password.length > 0 || passwordProtected);
      setMaxViews(nextMaxViews);
      setPassword("");
      setRemovePassword(false);
      toast(tSection("saved"), "success");
    } catch (e) {
      toast(toMessage(e, tSection("failed")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">
          {tSection("title")}
        </h2>
      </div>
      <ProtectionSection
        password={password}
        removePassword={removePassword}
        passwordProtected={passwordProtected}
        maxViewsInput={maxViewsInput}
        viewCount={viewCount}
        maxViews={maxViews}
        busy={busy}
        loadingDetail={loading}
        onPasswordChange={setPassword}
        onRemovePasswordChange={setRemovePassword}
        onMaxViewsChange={setMaxViewsInput}
        t={t}
      />
      <div className="mt-4 flex justify-end">
        <Button variant="accent" size="sm" onClick={() => void save()} disabled={busy || loading}>
          {t("save")}
        </Button>
      </div>
    </section>
  );
}
