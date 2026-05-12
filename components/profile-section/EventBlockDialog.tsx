"use client";

import { useEffect, useState } from "react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { FormField } from "./FormField";

type Config = {
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  url: string;
};

const EMPTY: Config = {
  title: "",
  startsAt: "",
  endsAt: "",
  location: "",
  description: "",
  url: "",
};

type Props = {
  open: boolean;
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Editor for an EVENT block. {@code title} + {@code startsAt} are required; the rest are optional.
 * The {@code datetime-local} input gives us {@code 2026-06-15T14:00} (no seconds, no offset), so
 * we add the browser's current offset to make it ISO-8601-with-offset for the backend.
 *
 * <p>Why we tack on the offset client-side rather than asking the user: the host's local time is
 * what they care about; converting to UTC at save time would erase the timezone intent (a 9 AM
 * KST workshop should still read "9 AM KST" even when a visitor in PST loads the page later).
 */
export function EventBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [config, setConfig] = useState<Config>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        setConfig({
          title: parsed.title ?? "",
          startsAt: isoToLocalInput(parsed.startsAt) ?? "",
          endsAt: isoToLocalInput(parsed.endsAt) ?? "",
          location: parsed.location ?? "",
          description: parsed.description ?? "",
          url: parsed.url ?? "",
        });
        return;
      } catch {
        /* fall through to defaults */
      }
    }
    setConfig(EMPTY);
  }, [open, initialJson]);

  const title = config.title.trim();
  const startsAt = config.startsAt.trim();
  const canSave = title.length > 0 && startsAt.length > 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editEventTitle") : t("addEventTitle")}
      description={t("addEventDescription")}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        const startIso = localInputToIso(startsAt);
        const endIso = config.endsAt.trim() ? localInputToIso(config.endsAt.trim()) : null;
        await onSubmit(
          JSON.stringify({
            title,
            startsAt: startIso,
            endsAt: endIso,
            location: config.location.trim() || null,
            description: config.description.trim() || null,
            url: config.url.trim() || null,
          }),
        );
      }}
    >
      <div className="space-y-3">
        <FormField label={t("eventFieldTitle")} required>
          <Input
            value={config.title}
            maxLength={80}
            onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
            placeholder={t("eventFieldTitlePlaceholder")}
          />
        </FormField>
        {/* datetime-local needs ~240 px of comfortable width for the native picker UI not to clip
         * the placeholder ("yyyy-mm-dd hh:mm") or overlap the dropdown caret. The earlier
         * 2-col grid inside a max-w-md dialog gave each field ~200 px which broke the rendering
         * on Safari iOS + Chrome Android. Stacking vertically gives each input full width and is
         * less visually noisy for a 2-field pair. */}
        <FormField label={t("eventFieldStartsAt")} required>
          <Input
            type="datetime-local"
            value={config.startsAt}
            onChange={(e) => setConfig((c) => ({ ...c, startsAt: e.target.value }))}
          />
        </FormField>
        <FormField label={t("eventFieldEndsAt")}>
          <Input
            type="datetime-local"
            value={config.endsAt}
            min={config.startsAt || undefined}
            onChange={(e) => setConfig((c) => ({ ...c, endsAt: e.target.value }))}
          />
        </FormField>
        <FormField label={t("eventFieldLocation")}>
          <Input
            value={config.location}
            maxLength={120}
            onChange={(e) => setConfig((c) => ({ ...c, location: e.target.value }))}
            placeholder={t("eventFieldLocationPlaceholder")}
          />
        </FormField>
        <FormField label={t("eventFieldDescription")}>
          <Input
            value={config.description}
            maxLength={500}
            onChange={(e) => setConfig((c) => ({ ...c, description: e.target.value }))}
            placeholder={t("eventFieldDescriptionPlaceholder")}
          />
        </FormField>
        <FormField label={t("eventFieldUrl")}>
          <Input
            type="url"
            value={config.url}
            maxLength={512}
            onChange={(e) => setConfig((c) => ({ ...c, url: e.target.value }))}
            placeholder="https://"
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}


/**
 * datetime-local input → ISO 8601 with browser-local offset. {@code 2026-06-15T14:00} → e.g.
 * {@code 2026-06-15T14:00:00+09:00}. We compute offset from the actual Date so DST transitions
 * give the right answer.
 */
function localInputToIso(localValue: string): string {
  if (!localValue) return localValue;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return localValue;
  // Offset minutes are signed (positive when behind UTC), so we flip the sign for the ISO format.
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const oh = String(Math.floor(absMin / 60)).padStart(2, "0");
  const om = String(absMin % 60).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00${sign}${oh}:${om}`;
}

/** ISO 8601 → {@code 2026-06-15T14:00} form the datetime-local input wants. */
function isoToLocalInput(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
