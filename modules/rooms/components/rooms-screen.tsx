"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { askToSignIn } from "@/components/auth/login-prompt";
import { ErrorState } from "@/components/common/error-state";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { blogCta } from "@/modules/blog/components/blog-cta";
import type { Note } from "@/modules/notes/api/notes";
import { NoteListSkeleton } from "@/modules/notes/components/note-list";
import {
  acceptRoomInvitation,
  declineRoomInvitation,
  dismissRoomSuggestions,
  isPinsFull,
  listMyRooms,
  listRoomInvitations,
  listAllRoomItems,
  listRoomSuggestions,
  personName,
  ROOM_MAX_PINNED,
  setRoomPinned,
  type RoomDetail,
  type RoomInvitation,
  type RoomItem,
  type RoomListItem,
  type RoomPerson,
} from "@/modules/rooms/api/rooms";
import { arrangeRooms, itemsOfRoom, pinnedCount } from "@/modules/rooms/lib/room-bands";
import { roomPath } from "@/modules/rooms/lib/room-href";
import { cn } from "@/lib/utils";
import { QuietRoomLine, RoomBlock, RoomsSection } from "./room-block";
import { CreateRoomDialog, JoinByLinkDialog } from "./room-dialogs";
import { RoomFaces } from "./room-faces";
import { RoomInviteSheet } from "./room-invite-sheet";
import { RoomsHead } from "./rooms-head";
import { RoomsAll, type RoomsAllHandle } from "./rooms-all";
import { readRoomsView, writeRoomsView, type RoomsView } from "@/modules/rooms/lib/rooms-view";

type Phase = { kind: "loading" } | { kind: "failed" } | { kind: "loaded"; rooms: RoomListItem[] };

function useReorderMotion(order: string) {
  const positions = useRef(new Map<string, number>());
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    el.querySelectorAll<HTMLElement>("[data-room-block]").forEach((node) => {
      const key = node.dataset.roomBlock!;
      const top = node.getBoundingClientRect().top;
      next.set(key, top);
      const before = positions.current.get(key);
      if (reduce || before === undefined || before === top || typeof node.animate !== "function") return;
      node.animate([{ transform: `translateY(${before - top}px)` }, { transform: "translateY(0)" }], {
        duration: 320,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    });
    positions.current = next;
  }, [order]);
  return root;
}

export function RoomsScreen() {
  const t = useTranslations("rooms");
  const router = useRouter();
  const { toast } = useToast();
  const { ready, authenticated } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [recent, setRecent] = useState<RoomItem[]>([]);
  const [invitations, setInvitations] = useState<RoomInvitation[]>([]);
  const [suggested, setSuggested] = useState<RoomPerson[]>([]);
  const [creating, setCreating] = useState<RoomPerson[] | null>(null);
  const [joining, setJoining] = useState(false);
  const [inviting, setInviting] = useState<{ room: RoomDetail; friends: RoomPerson[] } | null>(null);
  const [view, setView] = useState<RoomsView>("rooms");
  const all = useRef<RoomsAllHandle>(null);

  const load = useCallback(async () => {
    setPhase((current) => (current.kind === "loaded" ? current : { kind: "loading" }));
    try {
      const [rooms, feed, received, friends] = await Promise.all([
        listMyRooms(),
        listAllRoomItems(null, 50).catch(() => null),
        listRoomInvitations().catch(() => []),
        listRoomSuggestions().catch(() => []),
      ]);
      setRecent(feed?.items ?? []);
      setInvitations(received);
      setSuggested(friends);
      setPhase({ kind: "loaded", rooms });
    } catch {
      setPhase((current) => (current.kind === "loaded" ? current : { kind: "failed" }));
    }
  }, []);

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated, load]);

  useEffect(() => setView(readRoomsView()), []);

  async function switchView(next: RoomsView) {
    if (next === view) return;
    if (view === "all") await all.current?.flush();
    setView(next);
    writeRoomsView(next);
    if (next === "rooms") void load();
  }

  const rooms = phase.kind === "loaded" ? phase.rooms : [];
  const { blocks, quiet } = arrangeRooms(rooms);
  const motionRoot = useReorderMotion(blocks.map((room) => room.id).join(","));

  async function pin(room: RoomListItem, pinned: boolean) {
    if (phase.kind !== "loaded") return;
    if (pinned && pinnedCount(phase.rooms) >= ROOM_MAX_PINNED) {
      toast(t("pinsFull", { max: ROOM_MAX_PINNED }));
      return;
    }
    setPhase({ kind: "loaded", rooms: phase.rooms.map((r) => (r.id === room.id ? { ...r, pinned } : r)) });
    try {
      await setRoomPinned(room.id, pinned);
    } catch (error) {
      toast(isPinsFull(error) ? t("pinsFull", { max: ROOM_MAX_PINNED }) : t("pinFailed"), "error");
      void load();
    }
  }

  async function answer(invitation: RoomInvitation, accept: boolean) {
    setInvitations((current) => current.filter((i) => i.roomId !== invitation.roomId));
    try {
      if (!accept) {
        await declineRoomInvitation(invitation.roomId);
        return;
      }
      const result = await acceptRoomInvitation(invitation.roomId);
      if (result.status === "requested") toast(t("waitApproval"));
      else router.push(roomPath(invitation.roomId));
    } catch {
      toast(t("answerFailed"), "error");
      void load();
    }
  }

  function dismissSuggestion() {
    const ids = suggested.map((p) => p.id);
    setSuggested([]);
    void dismissRoomSuggestions(ids).catch(() => undefined);
  }

  function created(room: RoomDetail, friends: RoomPerson[]) {
    setCreating(null);
    setInviting({ room, friends });
  }

  const replace = (note: Note) =>
    setRecent((current) => current.map((c) => (c.kind === "note" && c.note.id === note.id ? { ...c, note } : c)));
  const remove = (id: number) => setRecent((current) => current.filter((c) => !(c.kind === "note" && c.note.id === id)));

  if (ready && !authenticated) {
    return (
      <BlogEmpty
        title={t("signedOut")}
        action={
          <button type="button" onClick={() => askToSignIn("room")} className={blogCta()}>
            {t("signIn")}
          </button>
        }
      />
    );
  }

  return (
    <div data-testid="rooms-screen">
      <RoomsHead
        view={view}
        onView={(next) => void switchView(next)}
        onCreate={() => setCreating(suggested)}
        onJoin={() => setJoining(true)}
      />
      {phase.kind === "loading" ? (
        <NoteListSkeleton />
      ) : phase.kind === "failed" ? (
        <div className="mt-6">
          <ErrorState title={t("loadFailed")} onRetry={() => void load()} />
        </div>
      ) : (
        <div ref={motionRoot}>
          {invitations.length > 0 && (
            <RoomsSection title={t("invitationsHeading")} testId="room-invitations">
              <ul>
                {invitations.map((invitation) => (
                  <InvitationLine key={invitation.roomId} invitation={invitation} onAnswer={answer} />
                ))}
              </ul>
            </RoomsSection>
          )}
          {view === "all" && <RoomsAll ref={all} empty={rooms.length === 0} />}
          {rooms.length === 0 && (
            <BlogEmpty
              title={t("empty")}
              action={
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setCreating(suggested)} className={blogCta()}>
                    {t("createRoom")}
                  </button>
                  <button type="button" onClick={() => setJoining(true)} className={blogCta({ variant: "secondary" })}>
                    {t("joinByLink")}
                  </button>
                </div>
              }
            />
          )}
          {view === "rooms" && blocks.map((room, index) => (
            <RoomBlock
              key={room.id}
              room={room}
              index={index}
              items={itemsOfRoom(recent, room.id)}
              onPin={pin}
              onReplace={replace}
              onRemove={remove}
            />
          ))}
          {view === "rooms" && quiet.length > 0 && (
            <RoomsSection title={t("quietHeading")} testId="rooms-quiet">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {quiet.map((room) => (
                  <QuietRoomLine key={room.id} room={room} onPin={pin} />
                ))}
              </ul>
            </RoomsSection>
          )}
          {view === "rooms" && suggested.length > 0 && (
            <div data-testid="room-suggestion" className="mt-7 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCreating(suggested)}
                className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded text-left"
              >
                <RoomFaces people={suggested} limit={3} size="sm" />
                <span className="min-w-0 truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("suggestion", { names: suggested.slice(0, 2).map(personName).join(", ") })}
                </span>
              </button>
              <button
                type="button"
                onClick={dismissSuggestion}
                aria-label={t("dismissSuggestion")}
                className="touch-target focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X aria-hidden className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          )}
          {view === "rooms" && rooms.length > 0 && (
            <button
              type="button"
              onClick={() => setJoining(true)}
              data-rooms-join
              className={cn(
                "focus-ring rounded text-[13px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                suggested.length > 0 ? "mt-5" : "mt-7",
              )}
            >
              {t("joinByLink")}
            </button>
          )}
        </div>
      )}
      <CreateRoomDialog
        open={creating !== null}
        friends={creating ?? []}
        onClose={() => setCreating(null)}
        onCreated={created}
      />
      <JoinByLinkDialog open={joining} onClose={() => setJoining(false)} />
      {inviting && (
        <RoomInviteSheet
          open
          roomId={inviting.room.id}
          roomName={inviting.room.name}
          memberIds={inviting.room.members.map((m) => m.id)}
          preselected={inviting.friends}
          onClose={() => {
            const id = inviting.room.id;
            setInviting(null);
            router.push(roomPath(id));
          }}
        />
      )}
    </div>
  );
}

function InvitationLine({
  invitation,
  onAnswer,
}: {
  invitation: RoomInvitation;
  onAnswer: (invitation: RoomInvitation, accept: boolean) => void;
}) {
  const t = useTranslations("rooms");
  return (
    <li data-room-invitation={invitation.roomId} className="flex items-start gap-3 py-3 animate-fade-in motion-reduce:animate-none">
      <Avatar
        src={invitation.inviter.avatarUrl}
        name={personName(invitation.inviter)}
        seed={invitation.inviter.id}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-[1.45] text-slate-900 dark:text-slate-100">
          {t.rich("invitedYou", {
            name: personName(invitation.inviter),
            room: invitation.roomName,
            b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
          })}
        </p>
        <div className="mt-1.5 flex items-center gap-4 text-[13px]">
          <button
            type="button"
            onClick={() => onAnswer(invitation, true)}
            className="focus-ring rounded font-semibold text-accent-700 hover:text-accent-800 dark:text-accent-400"
          >
            {invitation.approvalRequired ? t("requestJoin") : t("accept")}
          </button>
          <button
            type="button"
            onClick={() => onAnswer(invitation, false)}
            className="focus-ring rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t("decline")}
          </button>
          <span className="text-slate-400 dark:text-slate-500">{t("memberCount", { count: invitation.memberCount })}</span>
        </div>
      </div>
    </li>
  );
}
