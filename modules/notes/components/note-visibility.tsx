import { AtSign, Globe, Lock, Moon } from "lucide-react";
import type { NoteVisibility } from "@/modules/notes/api/notes";

const ICONS = { public: Globe, unlisted: Moon, private: Lock, direct: AtSign } as const;

export function VisibilityIcon({
  visibility,
  label,
  className,
}: {
  visibility: NoteVisibility;
  label?: string;
  className?: string;
}) {
  const Icon = ICONS[visibility];
  return label ? (
    <Icon className={className} aria-label={label} role="img" />
  ) : (
    <Icon className={className} aria-hidden />
  );
}
