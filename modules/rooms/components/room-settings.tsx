"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { askToSignIn } from "@/components/auth/login-prompt";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { NoteListSkeleton } from "@/modules/notes/components/note-list";
import {
  answerJoinRequest,
  cancelRoomInvitation,
  disableRoomInvite,
  getRoom,
  leaveRoom,
  listJoinRequests,
  listRoomInvitees,
  listRoomInvites,
  personName,
  removeRoomMember,
  renameRoom,
  ROOM_MAX_NAME,
  setRoomHiddenFromFeed,
  type RoomDetail,
  type RoomInvite,
  type RoomInvitee,
  type RoomJoinRequest,
  type RoomPerson,
} from "@/modules/rooms/api/rooms";
import { roomPath, roomsPath } from "@/modules/rooms/lib/room-href";

const SMALL =
  "focus-ring shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800";

function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className="pt-7">
      <RailHeading>{title}</RailHeading>
      <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>
    </section>
  );
}

function PersonRow({ person, children, testId }: { person: RoomPerson; children?: ReactNode; testId?: string }) {
  return (
    <li data-room-person={testId} className="flex items-center gap-3 py-2.5">
      <Avatar src={person.avatarUrl} name={personName(person)} seed={person.id} size="md" />
      <span className="min-w-0 flex-1 truncate text-[15px] text-slate-900 dark:text-slate-100">{personName(person)}</span>
      {children}
    </li>
  );
}

export function RoomSettings({ roomId }: { roomId: number }) {
  const t = useTranslations("rooms");
  const router = useRouter();
  const { toast } = useToast();
  const { ready, authenticated, me } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [name, setName] = useState("");
  const [requests, setRequests] = useState<RoomJoinRequest[]>([]);
  const [invitees, setInvitees] = useState<RoomInvitee[]>([]);
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [hidden, setHidden] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleteMine, setDeleteMine] = useState(false);
  const nameId = useId();
  const owner = room?.role === "OWNER";

  const load = useCallback(async () => {
    try {
      const detail = await getRoom(roomId);
      setRoom(detail);
      setName(detail.name);
      setHidden(detail.hiddenFromFeed);
      setState("ready");
      setInvitees(await listRoomInvitees(roomId).catch(() => []));
      if (detail.role === "OWNER") {
        const [loadedRequests, loadedInvites] = await Promise.all([
          listJoinRequests(roomId).catch(() => []),
          listRoomInvites(roomId).catch(() => []),
        ]);
        setRequests(loadedRequests);
        setInvites(loadedInvites);
      }
    } catch (error) {
      setState(error instanceof ApiError && (error.status === 404 || error.status === 403) ? "missing" : "failed");
    }
  }, [roomId]);

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated, load]);

  const refresh = async () => {
    const next = await getRoom(roomId).catch(() => null);
    if (next) setRoom(next);
  };

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
  if (state === "missing") {
    return (
      <BlogEmpty
        title={t("roomMissing")}
        action={
          <BlogLink href={roomsPath()} className={blogCta({ variant: "text" })}>
            {t("backToRooms")}
          </BlogLink>
        }
      />
    );
  }
  if (state === "failed") return <ErrorState title={t("loadFailed")} onRetry={() => void load()} />;
  if (!room) return <NoteListSkeleton />;

  async function rename() {
    const next = name.trim();
    if (!next || next === room!.name) return;
    try {
      const saved = await renameRoom(roomId, next);
      setRoom(saved);
      toast(t("renamed"));
    } catch {
      toast(t("renameFailed"), "error");
    }
  }

  async function decide(request: RoomJoinRequest, approve: boolean) {
    setRequests((current) => current.filter((r) => r.person.id !== request.person.id));
    await answerJoinRequest(roomId, request.person.id, approve).catch(() => undefined);
    await refresh();
  }

  async function remove(member: RoomPerson) {
    const ok = await confirm({
      title: t("removeTitle"),
      description: t("removeBody", { name: personName(member) }),
      confirmLabel: t("remove"),
      destructive: true,
    });
    if (!ok) return;
    await removeRoomMember(roomId, member.id).catch(() => undefined);
    await refresh();
  }

  async function cancel(invitee: RoomInvitee) {
    setInvitees((current) => current.filter((i) => i.person.id !== invitee.person.id));
    await cancelRoomInvitation(roomId, invitee.person.id).catch(() => undefined);
  }

  async function turnOff(invite: RoomInvite) {
    const next = await disableRoomInvite(roomId, invite.id).catch(() => null);
    if (next) setInvites((current) => current.map((i) => (i.id === next.id ? next : i)));
  }

  async function hide(next: boolean) {
    setHidden(next);
    try {
      setHidden(await setRoomHiddenFromFeed(roomId, next));
    } catch {
      setHidden(!next);
    }
  }

  async function leave() {
    try {
      await leaveRoom(roomId, deleteMine);
      router.push(roomsPath());
    } catch {
      toast(t("leaveFailed"), "error");
      throw new Error("leave failed");
    }
  }

  return (
    <div data-testid="room-settings">
      <BlogLink
        href={roomPath(room.id)}
        className="focus-ring -ml-1 inline-flex max-w-full items-center gap-0.5 rounded px-1 py-1 text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronLeft aria-hidden className="h-4 w-4 shrink-0" />
        <span className="truncate">{room.name}</span>
      </BlogLink>
      <h1 className="mt-2 text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100">
        {t("settingsTitle")}
      </h1>

      {owner && (
        <section className="pt-7">
          <label htmlFor={nameId} className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
            {t("nameField")}
          </label>
          <div className="mt-2 flex gap-2">
            <Input
              id={nameId}
              value={name}
              maxLength={ROOM_MAX_NAME}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void rename();
              }}
            />
            <button
              type="button"
              onClick={() => void rename()}
              disabled={!name.trim() || name.trim() === room.name}
              className="focus-ring shrink-0 rounded-lg bg-accent-700 px-4 text-[14px] font-semibold text-white hover:bg-accent-800 disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
            >
              {t("save")}
            </button>
          </div>
        </section>
      )}

      {owner && requests.length > 0 && (
        <Section title={t("requests")} testId="room-requests">
          {requests.map((request) => (
            <PersonRow key={request.person.id} person={request.person} testId={request.person.username}>
              <button
                type="button"
                onClick={() => void decide(request, false)}
                className={cn(SMALL, "text-slate-500 dark:text-slate-400")}
              >
                {t("reject")}
              </button>
              <button
                type="button"
                onClick={() => void decide(request, true)}
                className={cn(SMALL, "text-accent-700 dark:text-accent-400")}
              >
                {t("approve")}
              </button>
            </PersonRow>
          ))}
        </Section>
      )}

      <Section title={t("membersLabel", { count: room.memberCount })} testId="room-members">
        {room.members.map((member) => (
          <PersonRow key={member.id} person={member} testId={member.username}>
            {member.role === "OWNER" ? (
              <span className="shrink-0 text-[13px] text-slate-500 dark:text-slate-400">{t("owner")}</span>
            ) : (
              owner && (
                <button
                  type="button"
                  onClick={() => void remove(member)}
                  className={cn(SMALL, "text-slate-500 dark:text-slate-400")}
                >
                  {t("remove")}
                </button>
              )
            )}
          </PersonRow>
        ))}
      </Section>

      {invitees.length > 0 && (
        <Section title={t("waiting")} testId="room-invitees">
          {invitees.map((invitee) => (
            <PersonRow key={invitee.person.id} person={invitee.person} testId={invitee.person.username}>
              {(owner || invitee.inviterId === me?.id) && (
                <button
                  type="button"
                  onClick={() => void cancel(invitee)}
                  className={cn(SMALL, "text-slate-600 dark:text-slate-300")}
                >
                  {t("cancelInvite")}
                </button>
              )}
            </PersonRow>
          ))}
        </Section>
      )}

      {owner && invites.length > 0 && (
        <Section title={t("links")} testId="room-links">
          {invites.map((invite) => (
            <li key={invite.id} data-room-invite-code={invite.code} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[14px] text-slate-900 dark:text-slate-100">{invite.code}</span>
                <span className="block text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
                  {invite.maxUses === null
                    ? t("used", { uses: invite.uses })
                    : t("usedOf", { uses: invite.uses, max: invite.maxUses })}
                </span>
              </span>
              {invite.disabled ? (
                <span className="shrink-0 text-[13px] text-slate-500 dark:text-slate-400">{t("linkOff")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void turnOff(invite)}
                  className={cn(SMALL, "text-slate-700 dark:text-slate-200")}
                >
                  {t("turnOff")}
                </button>
              )}
            </li>
          ))}
        </Section>
      )}

      <section className="pt-7">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${nameId}-hide`} className="text-[15px] text-slate-900 dark:text-slate-100">
            {t("hideFromFeed")}
          </label>
          <Switch id={`${nameId}-hide`} checked={hidden} onCheckedChange={(next) => void hide(next)} />
        </div>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("hideHint")}</p>
      </section>

      <section className="pt-8">
        <button
          type="button"
          onClick={() => {
            setDeleteMine(false);
            setLeaving(true);
          }}
          className="focus-ring rounded text-[15px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
        >
          {t("leave")}
        </button>
      </section>

      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        title={t("leaveTitle")}
        confirmLabel={t("leave")}
        cancelLabel={t("cancel")}
        destructive
        compact
        onConfirm={leave}
      >
        <fieldset className="space-y-2" aria-label={t("leaveTitle")}>
          {[false, true].map((remove) => (
            <label key={String(remove)} className="flex items-center gap-2.5 text-[14px] text-slate-800 dark:text-slate-200">
              <input
                type="radio"
                name="leave-notes"
                checked={deleteMine === remove}
                onChange={() => setDeleteMine(remove)}
                className="h-4 w-4 accent-slate-900 dark:accent-slate-100"
              />
              {remove ? t("leaveDelete") : t("leaveKeep")}
            </label>
          ))}
        </fieldset>
      </ConfirmDialog>
      {confirmDialog}
    </div>
  );
}
