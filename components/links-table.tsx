"use client";

import { useState } from "react";
import { ArrowUpDown, BarChart3, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "./ui/button";
import { Table, TBody, TD, TH, THead, TR } from "./ui/table";
import { CopyButton } from "./copy-button";
import { ConfirmDialog } from "./ui/dialog";
import { EditLinkDialog } from "./edit-link-dialog";
import { useToast } from "./ui/toast";
import { ApiError, deleteLink } from "@/lib/api";
import { cn, formatDate, formatNumber, truncateMiddle } from "@/lib/utils";
import type { MyLink } from "@/types";

type SortKey = "createdAt" | "clickCount";
type SortDir = "asc" | "desc";

type Props = {
  items: MyLink[];
  onChanged: () => void;
};

export function LinksTable({ items, onChanged }: Props) {
  const t = useTranslations("dashboard");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<MyLink | null>(null);
  const { toast } = useToast();

  const sorted = [...items].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "createdAt") {
      return (+new Date(a.createdAt) - +new Date(b.createdAt)) * dir;
    }
    return (a.clickCount - b.clickCount) * dir;
  });

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  async function handleDelete(code: string) {
    try {
      await deleteLink(code);
      toast(t("deleted"), "success");
      onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("deleteFailed");
      toast(msg, "error");
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <Table>
        <THead>
          <TR>
            <TH>{t("table.shortUrl")}</TH>
            <TH>{t("table.originalUrl")}</TH>
            <TH>
              <SortHeader
                active={sortKey === "createdAt"}
                dir={sortDir}
                onClick={() => toggleSort("createdAt")}
              >
                {t("table.createdAt")}
              </SortHeader>
            </TH>
            <TH>{t("table.expiresAt")}</TH>
            <TH className="text-right">
              <SortHeader
                active={sortKey === "clickCount"}
                dir={sortDir}
                onClick={() => toggleSort("clickCount")}
                align="right"
              >
                {t("table.clicks")}
              </SortHeader>
            </TH>
            <TH className="w-[1%] whitespace-nowrap text-right">{t("table.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {sorted.map((item) => (
            <TR key={item.shortCode}>
              <TD>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/stats/${item.shortCode}`}
                    className="font-mono text-sm font-medium text-slate-900 hover:underline"
                  >
                    /{item.shortCode}
                  </Link>
                  <CopyButton
                    size="sm"
                    variant="ghost"
                    label=""
                    value={item.shortUrl}
                    onCopied={() => toast("✓", "success")}
                  />
                </div>
              </TD>
              <TD className="max-w-[360px]">
                <a
                  href={item.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
                  title={item.originalUrl}
                >
                  <span className="truncate text-xs">{truncateMiddle(item.originalUrl, 56)}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </a>
              </TD>
              <TD className="whitespace-nowrap text-xs text-slate-500">
                {formatDate(item.createdAt)}
              </TD>
              <TD className="whitespace-nowrap text-xs text-slate-500">
                {item.expiresAt ? formatDate(item.expiresAt) : "—"}
              </TD>
              <TD className="text-right tabular-nums font-medium text-slate-900">
                {formatNumber(item.clickCount)}
              </TD>
              <TD className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/stats/${item.shortCode}`}>
                    <Button variant="ghost" size="sm" aria-label={t("actions.stats")}>
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">{t("actions.stats")}</span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("actions.edit")}
                    onClick={() => setEditing(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("actions.delete")}
                    onClick={() => setConfirmCode(item.shortCode)}
                    className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <ConfirmDialog
        open={confirmCode !== null}
        onOpenChange={(o) => !o && setConfirmCode(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        destructive
        confirmLabel={t("deleteOk")}
        onConfirm={async () => {
          if (confirmCode) await handleDelete(confirmCode);
        }}
      />

      <EditLinkDialog
        link={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
    </div>
  );
}

function SortHeader({
  active,
  dir,
  onClick,
  align,
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "right";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider hover:text-slate-900",
        active ? "text-slate-900" : "text-slate-500",
        align === "right" && "ml-auto",
      )}
    >
      {children}
      <ArrowUpDown className={cn("h-3 w-3", active && dir === "asc" && "rotate-180")} />
    </button>
  );
}
