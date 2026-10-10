"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { FileText, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { blogHref } from "@/lib/host";
import type { ComposeTriggerProps } from "@/components/common/app-header";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { useToast } from "@/components/ui/toast";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { emitNotePosted } from "@/modules/blog/lib/consequence-events";
import { NoteQuoteDialog } from "@/modules/notes/components/note-quote-dialog";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";
import { openNote } from "@/modules/notes/lib/note-href";

const RECENT_DRAFTS = 3;

export function recentDrafts(posts: PostView[], limit = RECENT_DRAFTS): { items: PostView[]; more: boolean } {
  const drafts = posts
    .filter((post) => post.status === "DRAFT")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return { items: drafts.slice(0, limit), more: drafts.length > limit };
}

function useRecentDrafts(open: boolean) {
  const [drafts, setDrafts] = useState<{ items: PostView[]; more: boolean } | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    listMyPosts()
      .then((posts) => live && setDrafts(recentDrafts(posts)))
      .catch(() => live && setDrafts({ items: [], more: false }));
    return () => {
      live = false;
    };
  }, [open]);
  return drafts;
}

type Choice = { key: string; label: string; hint?: string; href?: string; onSelect?: () => void; icon?: ReactNode };

export function ComposeEntry({ variant, className, label, children }: ComposeTriggerProps) {
  const t = useTranslations("compose");
  const locale = useLocale();
  const router = useRouter();
  const ago = useCompactTime();
  const { toast } = useToast();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const drafts = useRecentDrafts(open);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const kinds: Choice[] = [
    {
      key: "note",
      label: t("note"),
      hint: t("noteHint"),
      icon: <MessageSquareText className="h-4 w-4" aria-hidden />,
      onSelect: () => {
        close(true);
        setNoteOpen(true);
      },
    },
    {
      key: "longform",
      label: t("longform"),
      hint: t("longformHint"),
      icon: <FileText className="h-4 w-4" aria-hidden />,
      href: blogHref("/write/new"),
    },
  ];
  const resume: Choice[] = (drafts?.items ?? []).map((draft) => ({
    key: `draft-${draft.id}`,
    label: draft.title.trim() || t("untitled"),
    hint: ago(draft.updatedAt),
    href: blogHref(`/write/${draft.id}`),
  }));
  if (drafts?.more) resume.push({ key: "all-drafts", label: t("seeAll"), href: blogHref("/write") });

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup={variant === "desktop" ? "menu" : "dialog"}
        aria-expanded={open}
        aria-label={variant === "mobile" ? label : undefined}
        data-compose-trigger={variant}
        onClick={() => setOpen((value) => !value)}
        className={className}
      >
        {children}
      </button>
      {variant === "desktop" ? (
        open && (
          <ComposeMenu
            anchor={trigger}
            label={t("title")}
            kinds={kinds}
            resume={resume}
            resumeLabel={t("resume")}
            onClose={close}
          />
        )
      ) : (
        <BottomSheet open={open} onClose={() => close(false)} label={t("title")}>
          <ComposeSheetBody kinds={kinds} resume={resume} resumeLabel={t("resume")} />
        </BottomSheet>
      )}
      <NoteQuoteDialog
        quoted={noteOpen ? { fresh: true, title: t("noteTitle") } : null}
        onClose={() => setNoteOpen(false)}
        onPosted={(note) => {
          setNoteOpen(false);
          toast(t("notePosted"), "default", {
            action: { label: t("viewNote"), onClick: () => openNote(note, locale, router.push) },
          });
          emitNotePosted(note);
        }}
      />
    </>
  );
}

function ChoiceText({ choice }: { choice: Choice }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">{choice.label}</span>
      {choice.hint && <span className="truncate text-[12px] text-slate-500 dark:text-slate-400">{choice.hint}</span>}
    </span>
  );
}

const rowClass =
  "focus-ring flex w-full items-center gap-3 rounded-surface px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800";

function ChoiceRow({ choice, menu }: { choice: Choice; menu: boolean }) {
  const role = menu ? "menuitem" : undefined;
  const content = (
    <>
      {choice.icon && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {choice.icon}
        </span>
      )}
      <ChoiceText choice={choice} />
    </>
  );
  return choice.href ? (
    <a href={choice.href} role={role} data-compose-choice={choice.key} className={rowClass}>
      {content}
    </a>
  ) : (
    <button type="button" role={role} data-compose-choice={choice.key} onClick={choice.onSelect} className={rowClass}>
      {content}
    </button>
  );
}

function ComposeMenu({
  anchor,
  label,
  kinds,
  resume,
  resumeLabel,
  onClose,
}: {
  anchor: RefObject<HTMLButtonElement | null>;
  label: string;
  kinds: Choice[];
  resume: Choice[];
  resumeLabel: string;
  onClose: (refocus: boolean) => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const resumeId = useId();
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    const rect = anchor.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, [anchor]);

  useEffect(() => {
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [position]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menu.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [anchor, onClose]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus();
    if (event.key === "ArrowDown") focusAt(index + 1);
    else if (event.key === "ArrowUp") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(items.length - 1);
    else if (event.key === "Escape") onClose(true);
    else if (event.key === "Tab") return onClose(false);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={menu}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={position ?? { visibility: "hidden" }}
      className="fixed z-40 w-72 rounded-surface border border-slate-200 bg-white p-1.5 shadow-float motion-safe:animate-dropdown-in dark:border-slate-800 dark:bg-slate-900"
    >
      {kinds.map((choice) => (
        <ChoiceRow key={choice.key} choice={choice} menu />
      ))}
      {resume.length > 0 && (
        <>
          <div role="separator" className="my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
          <div role="group" aria-labelledby={resumeId}>
            <p id={resumeId} className="px-3 pb-1 pt-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              {resumeLabel}
            </p>
            {resume.map((choice) => (
              <ChoiceRow key={choice.key} choice={choice} menu />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ComposeSheetBody({ kinds, resume, resumeLabel }: { kinds: Choice[]; resume: Choice[]; resumeLabel: string }) {
  return (
    <div className="pb-2">
      {kinds.map((choice) => (
        <ChoiceRow key={choice.key} choice={choice} menu={false} />
      ))}
      {resume.length > 0 && (
        <section aria-label={resumeLabel} className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <h2 className="px-3 pb-1 pt-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">{resumeLabel}</h2>
          {resume.map((choice) => (
            <ChoiceRow key={choice.key} choice={choice} menu={false} />
          ))}
        </section>
      )}
    </div>
  );
}
