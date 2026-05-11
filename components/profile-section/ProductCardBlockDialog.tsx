"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "../ui/dialog";
import { Input } from "../ui/input";

const MAX_ITEMS = 8;

type Item = {
  name: string;
  image: string;
  price: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
};

const EMPTY_ITEM: Item = {
  name: "",
  image: "",
  price: "",
  description: "",
  ctaLabel: "",
  ctaUrl: "",
};

type Props = {
  open: boolean;
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Multi-item editor for a PRODUCT_CARD block. Vertical list of expandable item rows — each row
 * holds 6 optional fields except `name`. Backend caps at 8 items; we mirror the cap here so the
 * user gets immediate feedback instead of a 400 after Save.
 */
export function ProductCardBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);

  useEffect(() => {
    if (!open) return;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        setTitle(parsed.title ?? "");
        const next: Item[] = Array.isArray(parsed.items)
          ? parsed.items.map((v: Record<string, unknown>) => ({
              name: typeof v.name === "string" ? v.name : "",
              image: typeof v.image === "string" ? v.image : "",
              price: typeof v.price === "string" ? v.price : "",
              description: typeof v.description === "string" ? v.description : "",
              ctaLabel: typeof v.ctaLabel === "string" ? v.ctaLabel : "",
              ctaUrl: typeof v.ctaUrl === "string" ? v.ctaUrl : "",
            }))
          : [];
        setItems(next.length > 0 ? next : [{ ...EMPTY_ITEM }]);
        return;
      } catch {
        /* fall through */
      }
    }
    setTitle("");
    setItems([{ ...EMPTY_ITEM }]);
  }, [open, initialJson]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => (prev.length >= MAX_ITEMS ? prev : [...prev, { ...EMPTY_ITEM }]));
  }

  function removeItem(idx: number) {
    setItems((prev) => (prev.length === 1 ? [{ ...EMPTY_ITEM }] : prev.filter((_, i) => i !== idx)));
  }

  // Items missing a name aren't sent — same rule the backend enforces.
  const cleanedItems = items
    .map((it) => ({
      name: it.name.trim(),
      image: it.image.trim() || null,
      price: it.price.trim() || null,
      description: it.description.trim() || null,
      ctaLabel: it.ctaLabel.trim() || null,
      ctaUrl: it.ctaUrl.trim() || null,
    }))
    .filter((it) => it.name.length > 0);

  const canSave = cleanedItems.length > 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editProductCardTitle") : t("addProductCardTitle")}
      description={t("addProductCardDescription", { max: MAX_ITEMS })}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await onSubmit(
          JSON.stringify({
            title: title.trim() || null,
            items: cleanedItems,
          }),
        );
      }}
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {t("productCardFieldBlockTitle")}
          </span>
          <Input
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("productCardFieldBlockTitlePlaceholder")}
          />
        </label>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-md border border-slate-200 bg-slate-50/50 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {t("productCardItemLabel", { idx: idx + 1 })}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  aria-label={t("remove")}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label={t("productCardFieldName")} required>
                  <Input
                    value={item.name}
                    maxLength={60}
                    placeholder={t("productCardFieldNamePlaceholder")}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                  />
                </Field>
                <Field label={t("productCardFieldPrice")}>
                  <Input
                    value={item.price}
                    maxLength={30}
                    placeholder="45,000원"
                    onChange={(e) => updateItem(idx, { price: e.target.value })}
                  />
                </Field>
                <Field label={t("productCardFieldImage")} className="sm:col-span-2">
                  <Input
                    type="url"
                    value={item.image}
                    maxLength={512}
                    placeholder="https://images.example.com/cake.jpg"
                    onChange={(e) => updateItem(idx, { image: e.target.value })}
                  />
                </Field>
                <Field label={t("productCardFieldDescription")} className="sm:col-span-2">
                  <Input
                    value={item.description}
                    maxLength={200}
                    placeholder={t("productCardFieldDescriptionPlaceholder")}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                  />
                </Field>
                <Field label={t("productCardFieldCtaLabel")}>
                  <Input
                    value={item.ctaLabel}
                    maxLength={30}
                    placeholder={t("productCardFieldCtaLabelPlaceholder")}
                    onChange={(e) => updateItem(idx, { ctaLabel: e.target.value })}
                  />
                </Field>
                <Field label={t("productCardFieldCtaUrl")}>
                  <Input
                    type="url"
                    value={item.ctaUrl}
                    maxLength={512}
                    placeholder="https://pf.kakao.com/_..."
                    onChange={(e) => updateItem(idx, { ctaUrl: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={items.length >= MAX_ITEMS}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("productCardAddItem")}
          <span className="text-[10px] text-slate-400">
            ({items.length}/{MAX_ITEMS})
          </span>
        </button>
      </div>
    </ConfirmDialog>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-[11px] font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
