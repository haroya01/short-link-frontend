"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useMenuKeys } from "@/hooks/use-menu-keys";
import { blogHref } from "@/lib/host";
import type { ComposeTriggerProps } from "@/components/common/app-header";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { emitNotePosted, holdArrivingNote } from "@/modules/blog/lib/consequence-events";
import { BLOG_MEMORY, readFeedMemory } from "@/modules/blog/lib/feed-memory";
import { LazyNoteDraftsSheet, LazyNoteQuoteDialog } from "@/modules/notes/components/lazy-note-dialogs";
import { noteDraftLabel, useNoteDrafts, type NoteDraft } from "@/modules/notes/lib/note-drafts";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";
import type { NoteRoom } from "@/modules/notes/api/notes";
import { listMyRooms } from "@/modules/rooms/api/rooms";
import { roomPath } from "@/modules/rooms/lib/room-href";
import { cn } from "@/lib/utils";

const RECENT_DRAFTS = 3;

export function recentDrafts(posts: PostView[], limit = RECENT_DRAFTS): { items: PostView[]; more: boolean } {
  const drafts = posts
    .filter((post) => post.status === "DRAFT")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return { items: drafts.slice(0, limit), more: drafts.length > limit };
}

function useRecentDrafts(open: boolean) {
  const [drafts, setDrafts] = useState<PostView[] | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    listMyPosts()
      .then((posts) => live && setDrafts(recentDrafts(posts, Number.POSITIVE_INFINITY).items))
      .catch(() => live && setDrafts([]));
    return () => {
      live = false;
    };
  }, [open]);
  return drafts;
}

type Choice = { key: string; label: string; hint?: string; href?: string; onSelect?: () => void };

let knownRooms: NoteRoom[] = [];

function useComposeRooms(open: boolean): NoteRoom[] {
  const [rooms, setRooms] = useState<NoteRoom[]>(knownRooms);
  useEffect(() => {
    if (!open) return;
    let live = true;
    listMyRooms()
      .then((mine) => {
        knownRooms = mine.map((r) => ({ id: r.id, name: r.name }));
        if (live) setRooms(knownRooms);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open]);
  return rooms;
}

export function ComposeEntry({ variant, className, label, children }: ComposeTriggerProps) {
  const t = useTranslations("compose");
  const router = useRouter();
  const ago = useCompactTime();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState<{ draft?: NoteDraft; room?: NoteRoom } | null>(null);
  const [room, setRoom] = useState<NoteRoom | null>(null);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const drafts = useRecentDrafts(open);
  const rooms = useComposeRooms(open);
  const { me } = useAuth();
  const noteDrafts = useNoteDrafts(me?.id);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const kinds: Choice[] = [
    {
      key: "note",
      label: t("note"),
      onSelect: () => {
        close(true);
        setNoteOpen(room ? { room } : {});
      },
    },
    {
      key: "longform",
      label: t("longform"),
      hint: room ? t("roomPostAudience") : undefined,
      href: blogHref(room ? `/write/new?room=${room.id}` : "/write/new"),
    },
  ];
  const where =
    rooms.length > 0 ? (
      <Destinations rooms={rooms} picked={room} onPick={setRoom} menu={variant === "desktop"} label={t("where")} />
    ) : null;
  const everyDraft: { at: number; choice: Choice }[] = [
    ...noteDrafts.map((draft) => ({
      at: draft.updatedAt,
      choice: {
        key: `note-draft-${draft.id}`,
        label: noteDraftLabel(draft),
        hint: draft.parts.length > 0
          ? `${ago(new Date(draft.updatedAt).toISOString())} · ${t("noteParts", { count: draft.parts.length + 1 })}`
          : ago(new Date(draft.updatedAt).toISOString()),
        onSelect: () => {
          close(true);
          setNoteOpen({ draft });
        },
      },
    })),
    ...(drafts ?? []).map((draft) => ({
      at: Date.parse(draft.updatedAt),
      choice: {
        key: `draft-${draft.id}`,
        label: draft.title.trim() || t("untitled"),
        hint: ago(draft.updatedAt),
        href: blogHref(`/write/${draft.id}`),
      },
    })),
  ].sort((a, b) => b.at - a.at);
  const resume: Choice[] = everyDraft.slice(0, RECENT_DRAFTS).map((entry) => entry.choice);
  if (everyDraft.length > RECENT_DRAFTS) {
    resume.push({
      key: "all-drafts",
      label: t("seeAll"),
      onSelect: () => {
        close(false);
        setDraftsOpen(true);
      },
    });
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup={variant === "desktop" ? "menu" : "dialog"}
        aria-expanded={open}
        aria-label={variant === "mobile" ? label : undefined}
        data-compose-trigger={variant}
        onClick={() => {
          if (!open) setRoom(null);
          setOpen((value) => !value);
        }}
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
            where={where}
            whatLabel={rooms.length > 0 ? t("what") : null}
            resume={resume}
            resumeLabel={t("resume")}
            onClose={close}
          />
        )
      ) : (
        <BottomSheet open={open} onClose={() => close(false)} label={t("title")}>
          <ComposeSheetBody
            kinds={kinds}
            where={where}
            whatLabel={rooms.length > 0 ? t("what") : null}
            resume={resume}
            resumeLabel={t("resume")}
          />
        </BottomSheet>
      )}
      <LazyNoteDraftsSheet open={draftsOpen} onClose={() => setDraftsOpen(false)} onPick={(draft) => setNoteOpen({ draft })} />
      <LazyNoteQuoteDialog
        quoted={
          noteOpen
            ? {
                fresh: true,
                title: t("noteTitle"),
                ...(noteOpen.draft ? { draft: noteOpen.draft } : {}),
                ...(noteOpen.room ? { room: noteOpen.room } : {}),
              }
            : null
        }
        onClose={() => setNoteOpen(null)}
        onPosted={(note) => {
          setNoteOpen(null);
          if (note.room) {
            router.push(roomPath(note.room.id));
            return;
          }
          if (emitNotePosted(note)) return;
          holdArrivingNote(note);
          const sort = readFeedMemory(BLOG_MEMORY) === "following" ? "following" : "for-you";
          const url = new URL(blogHref(`/?sort=${sort}`), window.location.href);
          if (url.origin === window.location.origin) router.push(url.pathname + url.search);
          else window.location.assign(url.href);
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
const cardClass =
  "focus-ring flex min-h-[4.5rem] min-w-0 flex-col justify-center rounded-surface border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/60";
const headingClass = "px-3 pb-1 pt-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400";

function KindCards({ kinds, menu }: { kinds: Choice[]; menu: boolean }) {
  const role = menu ? "menuitem" : undefined;
  return (
    <div className="grid grid-cols-2 gap-2 px-1.5 py-1">
      {kinds.map((choice) => {
        const content = (
          <>
            <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{choice.label}</span>
            {choice.hint && (
              <span className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-slate-500 dark:text-slate-400">{choice.hint}</span>
            )}
          </>
        );
        return choice.href ? (
          <a key={choice.key} href={choice.href} role={role} data-compose-choice={choice.key} className={cardClass}>
            {content}
          </a>
        ) : (
          <button
            key={choice.key}
            type="button"
            role={role}
            data-compose-choice={choice.key}
            onClick={choice.onSelect}
            className={cardClass}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

function Destinations({
  rooms,
  picked,
  onPick,
  menu,
  label,
}: {
  rooms: NoteRoom[];
  picked: NoteRoom | null;
  onPick: (room: NoteRoom | null) => void;
  menu: boolean;
  label: string;
}) {
  const t = useTranslations("compose");
  const labelId = useId();
  const options: (NoteRoom | null)[] = [null, ...rooms];
  return (
    <div>
      <p id={labelId} className={headingClass}>
        {label}
      </p>
      <div
        role={menu ? "group" : "radiogroup"}
        aria-labelledby={labelId}
        className="-mx-1.5 flex gap-1.5 overflow-x-auto px-3 pb-1.5 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((option) => {
          const selected = (picked?.id ?? null) === (option?.id ?? null);
          return (
            <button
              key={option?.id ?? "everyone"}
              type="button"
              role={menu ? "menuitemradio" : "radio"}
              aria-checked={selected}
              data-compose-where={option?.id ?? "everyone"}
              onClick={() => onPick(option)}
              className={cn(
                "focus-ring shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-200 ease-[var(--ease)]",
                selected
                  ? "border-slate-900 bg-slate-900 font-semibold text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600",
              )}
            >
              {option ? option.name : t("everyone")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceRow({ choice, menu }: { choice: Choice; menu: boolean }) {
  const role = menu ? "menuitem" : undefined;
  const content = <ChoiceText choice={choice} />;
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
  where,
  whatLabel,
  resume,
  resumeLabel,
  onClose,
}: {
  anchor: RefObject<HTMLButtonElement | null>;
  label: string;
  kinds: Choice[];
  where: React.ReactNode;
  whatLabel: string | null;
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

  const { onKeyDown } = useMenuKeys(menu, {
    onClose,
    items: '[role="menuitem"], [role="menuitemradio"]',
  });

  useEffect(() => {
    if (position) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
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

  return (
    <div
      ref={menu}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={position ?? { visibility: "hidden" }}
      className="fixed z-40 w-80 rounded-surface border border-slate-200 bg-white p-1.5 shadow-float motion-safe:animate-dropdown-in dark:border-slate-800 dark:bg-slate-900"
    >
      {where}
      {whatLabel && <p className={headingClass}>{whatLabel}</p>}
      <KindCards kinds={kinds} menu />
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

function ComposeSheetBody({
  kinds,
  where,
  whatLabel,
  resume,
  resumeLabel,
}: {
  kinds: Choice[];
  where: React.ReactNode;
  whatLabel: string | null;
  resume: Choice[];
  resumeLabel: string;
}) {
  return (
    <div className="pb-2">
      {where}
      {whatLabel && <p className={headingClass}>{whatLabel}</p>}
      <KindCards kinds={kinds} menu={false} />
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
