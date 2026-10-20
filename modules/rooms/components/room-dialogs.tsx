"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/modules/blog/components/avatar";
import {
  createRoom,
  personName,
  ROOM_MAX_NAME,
  type RoomDetail,
  type RoomPerson,
} from "@/modules/rooms/api/rooms";
import { roomJoinPath } from "@/modules/rooms/lib/room-href";
import { inviteTarget } from "@/modules/rooms/lib/invite-target";

export function CreateRoomDialog({
  open,
  friends,
  onClose,
  onCreated,
}: {
  open: boolean;
  friends: RoomPerson[];
  onClose: () => void;
  onCreated: (room: RoomDetail, friends: RoomPerson[]) => void;
}) {
  const t = useTranslations("rooms");
  const [name, setName] = useState("");
  const [failed, setFailed] = useState(false);
  const inputId = useId();
  const trimmed = name.trim();

  useEffect(() => {
    if (!open) return;
    setName("");
    setFailed(false);
  }, [open]);

  async function submit() {
    if (!trimmed) throw new Error("empty");
    setFailed(false);
    try {
      const room = await createRoom(trimmed);
      onCreated(room, friends);
    } catch (error) {
      setFailed(true);
      throw error;
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t("createTitle")}
      confirmLabel={t("submitCreate")}
      cancelLabel={t("cancel")}
      confirmVariant="accent"
      confirmDisabled={!trimmed}
      compact
      onConfirm={submit}
    >
      <label htmlFor={inputId} className="sr-only">
        {t("nameLabel")}
      </label>
      <Input
        id={inputId}
        value={name}
        autoFocus
        maxLength={ROOM_MAX_NAME}
        placeholder={t("nameLabel")}
        data-room-name-input
        onChange={(e) => setName(e.target.value)}
      />
      <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{t("createHint")}</p>
      {friends.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{t("friendsToInvite")}</p>
          <ul className="mt-2 space-y-2">
            {friends.map((friend) => (
              <li key={friend.id} className="flex items-center gap-2.5 text-[14px] text-slate-800 dark:text-slate-200">
                <Avatar src={friend.avatarUrl} name={personName(friend)} seed={friend.id} size="sm" />
                {personName(friend)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {failed && (
        <p role="alert" className="mt-3 text-[13px] text-red-600 dark:text-red-400">
          {t("createFailed")}
        </p>
      )}
    </ConfirmDialog>
  );
}

export function JoinByLinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("rooms");
  const router = useRouter();
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    setText("");
    setInvalid(false);
  }, [open]);

  function go() {
    const target = inviteTarget(text, window.location.host);
    if (!target) {
      setInvalid(true);
      throw new Error("invalid");
    }
    if (target.kind === "code") router.push(roomJoinPath(target.code));
    else window.location.assign(target.url);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t("joinTitle")}
      confirmLabel={t("open")}
      cancelLabel={t("cancel")}
      confirmVariant="accent"
      confirmDisabled={!text.trim()}
      compact
      onConfirm={go}
    >
      <label htmlFor={inputId} className="sr-only">
        {t("joinPlaceholder")}
      </label>
      <Input
        id={inputId}
        value={text}
        autoFocus
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t("joinPlaceholder")}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
      />
      <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">{t("joinHint")}</p>
      {invalid && (
        <p role="alert" className="mt-2 text-[13px] text-red-600 dark:text-red-400">
          {t("joinInvalid")}
        </p>
      )}
    </ConfirmDialog>
  );
}
