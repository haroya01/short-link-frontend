"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, QrCode, Search, Share, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { searchablePeopleQuery } from "@/modules/blog/api/people";
import { Avatar } from "@/modules/blog/components/avatar";
import {
  createRoomInvite,
  invitePeople,
  listInviteCandidates,
  listRoomInvitees,
  listRoomInvites,
  personName,
  ROOM_MAX_PICKED,
  roomShareUrl,
  searchInviteCandidates,
  type InviteSource,
  type RoomInvite,
  type RoomPerson,
} from "@/modules/rooms/api/rooms";
import { inviteUsable } from "@/modules/rooms/lib/room-bands";
import { PANEL_TEXT_BUTTON, RoomPanel } from "./room-panel";
import { RoomLinkDialog } from "./room-link-dialog";

const CHIP =
  "focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800";

export function RoomInviteSheet({
  open,
  roomId,
  roomName,
  memberIds,
  preselected = [],
  onClose,
}: {
  open: boolean;
  roomId: number;
  roomName: string;
  memberIds: number[];
  preselected?: RoomPerson[];
  onClose: () => void;
}) {
  const t = useTranslations("rooms");
  const { toast } = useToast();
  const { me } = useAuth();
  const [source, setSource] = useState<InviteSource>("following");
  const [query, setQuery] = useState("");
  const [lists, setLists] = useState<Partial<Record<InviteSource, RoomPerson[]>>>({});
  const [matches, setMatches] = useState<RoomPerson[] | null>(null);
  const [picked, setPicked] = useState<RoomPerson[]>([]);
  const [invited, setInvited] = useState<Set<number>>(new Set());
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const searching = searchablePeopleQuery(query);
  const members = new Set(memberIds);
  const seed = useRef({ preselected, memberIds });
  seed.current = { preselected, memberIds };

  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSource("following");
    setLists({});
    const start = seed.current;
    setPicked(start.preselected.filter((p) => !start.memberIds.includes(p.id)));
    let live = true;
    listRoomInvitees(roomId)
      .then((waiting) => {
        if (!live) return;
        const ids = new Set(waiting.map((w) => w.person.id));
        setInvited(ids);
        setPicked((current) => current.filter((p) => !ids.has(p.id)));
      })
      .catch(() => undefined);
    listRoomInvites(roomId)
      .catch(() => [] as RoomInvite[])
      .then((all) => all.find((i) => inviteUsable(i)) ?? createRoomInvite(roomId))
      .then((found) => live && setInvite(found))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open, roomId]);

  useEffect(() => {
    const username = me?.username;
    if (!open || !username || lists[source]) return;
    let live = true;
    listInviteCandidates(source, username)
      .then((people) => live && setLists((current) => ({ ...current, [source]: people })))
      .catch(() => live && setLists((current) => ({ ...current, [source]: [] })));
    return () => {
      live = false;
    };
  }, [open, me, source, lists]);

  useEffect(() => {
    if (!searching) {
      setMatches(null);
      return;
    }
    let live = true;
    setMatches(null);
    const timer = setTimeout(() => {
      searchInviteCandidates(query)
        .then((found) => live && setMatches(found))
        .catch(() => live && setMatches([]));
    }, 280);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, searching]);

  function toggle(person: RoomPerson) {
    setPicked((current) => {
      if (current.some((p) => p.id === person.id)) return current.filter((p) => p.id !== person.id);
      if (current.length >= ROOM_MAX_PICKED) {
        toast(t("pickLimit", { max: ROOM_MAX_PICKED }));
        return current;
      }
      return [...current, person];
    });
  }

  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(roomShareUrl(invite));
      toast(t("linkCopied"));
    } catch {
      toast(t("linkCopyFailed"), "error");
    }
  }

  async function share() {
    if (!invite) return;
    try {
      await navigator.share({ title: roomName, url: roomShareUrl(invite) });
    } catch {
      return;
    }
  }

  async function send() {
    if (picked.length === 0 || sending) return;
    setSending(true);
    const ids = picked.map((p) => p.id);
    try {
      const waiting = await invitePeople(roomId, ids);
      const reached = ids.filter((id) => waiting.some((w) => w.person.id === id)).length;
      toast(reached === 0 ? t("unreachable") : t("sent", { count: reached }));
      onClose();
    } catch {
      toast(t("sendFailed"), "error");
    } finally {
      setSending(false);
    }
  }

  const people = searching ? matches : (lists[source] ?? null);
  const emptyLine = searching ? t("noMatch") : source === "following" ? t("noFollowing") : t("noFollowers");

  return (
    <>
      <RoomPanel
        open={open}
        onClose={onClose}
        title={t("inviteTitle")}
        subtitle={roomName}
        testId="room-invite-sheet"
        leading={
          <button type="button" onClick={onClose} className={PANEL_TEXT_BUTTON}>
            {t("close")}
          </button>
        }
        trailing={
          <button
            type="button"
            onClick={() => void send()}
            disabled={picked.length === 0 || sending}
            data-room-invite-send
            className="focus-ring rounded-full bg-accent-700 px-4 py-1.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-800 disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
          >
            {picked.length === 0 ? t("send") : t("sendCount", { count: picked.length })}
          </button>
        }
      >
        <div className="flex gap-2 pt-3">
          <button type="button" onClick={() => void copy()} disabled={!invite} className={CHIP}>
            <Link2 aria-hidden className="h-4 w-4" />
            {t("copyLink")}
          </button>
          {canShare && (
            <button type="button" onClick={() => void share()} disabled={!invite} className={CHIP}>
              <Share aria-hidden className="h-4 w-4" />
              {t("share")}
            </button>
          )}
          <button type="button" onClick={() => setLinkOpen(true)} disabled={!invite} className={CHIP}>
            <QrCode aria-hidden className="h-4 w-4" />
            {t("qr")}
          </button>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 dark:bg-slate-800">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </label>

        {picked.length > 0 && (
          <ul aria-label={t("picked")} data-room-picked className="-mx-4 mt-3 flex gap-3.5 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none]">
            {picked.map((person) => (
              <li key={person.id} className="animate-fade-in motion-reduce:animate-none">
                <button
                  type="button"
                  onClick={() => toggle(person)}
                  aria-label={t("removePicked", { name: personName(person) })}
                  className="focus-ring flex w-14 flex-col items-center gap-1 rounded"
                >
                  <span className="relative">
                    <Avatar src={person.avatarUrl} name={personName(person)} handle={person.username} size="lg" />
                    <span className="absolute -right-1 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-slate-500 text-white ring-2 ring-white dark:bg-slate-400 dark:text-slate-900 dark:ring-slate-900">
                      <X aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[12px] text-slate-800 dark:text-slate-200">
                    {personName(person)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!searching && (
          <div role="tablist" className="mt-3 flex gap-1 border-b border-slate-100 dark:border-slate-800">
            {(["following", "followers"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={source === key}
                onClick={() => setSource(key)}
                className={cn(
                  "focus-ring relative rounded-t px-3 py-2 text-[14px] font-bold transition-colors",
                  source === key ? "text-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
                )}
              >
                {t(key)}
                {source === key && (
                  <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 bg-slate-900 dark:bg-slate-100" />
                )}
              </button>
            ))}
          </div>
        )}

        {people === null ? (
          <div aria-busy className="space-y-3 pt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : people.length === 0 ? (
          <p className="py-8 text-[14px] text-slate-500 dark:text-slate-400">{emptyLine}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-room-candidates>
            {people.map((person, index) => {
              const member = members.has(person.id);
              const waiting = invited.has(person.id);
              const chosen = picked.some((p) => p.id === person.id);
              return (
                <li key={person.id} style={{ ["--idx" as string]: Math.min(index, 8) }} className="profile-fade">
                  <button
                    type="button"
                    onClick={() => toggle(person)}
                    disabled={member || waiting}
                    aria-pressed={member || waiting ? undefined : chosen}
                    data-room-candidate={person.username}
                    className="focus-ring flex w-full items-center gap-3 rounded py-2.5 text-left disabled:cursor-default"
                  >
                    <Avatar src={person.avatarUrl} name={personName(person)} handle={person.username} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                        {personName(person)}
                      </span>
                      {personName(person) !== person.username && (
                        <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">@{person.username}</span>
                      )}
                    </span>
                    {member || waiting ? (
                      <span className="shrink-0 text-[13px] text-slate-500 dark:text-slate-400">
                        {member ? t("member") : t("invited")}
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150",
                          chosen
                            ? "border-accent-700 bg-accent-700 text-white"
                            : "border-slate-300 dark:border-slate-600",
                        )}
                      >
                        {chosen && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </RoomPanel>
      {invite && (
        <RoomLinkDialog
          open={linkOpen}
          roomId={roomId}
          roomName={roomName}
          invite={invite}
          onChange={setInvite}
          onClose={() => setLinkOpen(false)}
        />
      )}
    </>
  );
}
