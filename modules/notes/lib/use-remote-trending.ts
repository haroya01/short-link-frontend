"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { askToSignIn, type SignInReason } from "@/components/auth/login-prompt";
import { useToast } from "@/components/ui/toast";
import { useLikeFailed } from "@/hooks/use-like-failed";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { resolveRemote } from "@/modules/notes/api/federation-search";
import { setNoteLike, setRemoteFollow, type Note } from "@/modules/notes/api/notes";
import { listRemoteTrending, type TrendingNote } from "@/modules/notes/api/remote-trending";
import { followFailure } from "@/modules/notes/components/remote-account";
import { openNote } from "./note-href";

export const REMOTE_TRENDING_STALE_MS = 5 * 60_000;

export type RemoteTrending =
  | { state: "loading" }
  | { state: "failed"; retry: () => void }
  | { state: "ready"; items: TrendingNote[] };

export function useRemoteTrending(): RemoteTrending {
  const { ready, authenticated } = useAuth();
  const { data, isError, refetch } = useQuery({
    queryKey: ["notes", "remote-trending", authenticated ? "member" : "anonymous"],
    queryFn: () => listRemoteTrending(),
    enabled: ready,
    staleTime: REMOTE_TRENDING_STALE_MS,
  });
  if (data) return { state: "ready", items: data };
  if (isError) return { state: "failed", retry: () => void refetch() };
  return { state: "loading" };
}

export function useTrendingNote(item: TrendingNote) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const router = useRouter();
  const { authenticated } = useAuth();
  const { toast } = useToast();
  const likeFailed = useLikeFailed();
  const local = useRef<Note | null>(null);
  const pending = useRef<Promise<Note | null> | null>(null);
  const liking = useRef(false);
  const likedNow = useRef(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.max(item.likeCount ?? 0, 0));
  const [busy, setBusy] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Note | null>(null);

  function markLiked(on: boolean) {
    likedNow.current = on;
    setLiked(on);
  }

  async function settle(reason: SignInReason): Promise<Note | null> {
    setBusy(true);
    try {
      const result = await resolveRemote(item.uri);
      switch (result.state) {
        case "note":
          local.current = result.note;
          if (!liking.current) markLiked(result.note.likedByMe === true);
          return result.note;
        case "signin":
          askToSignIn(reason);
          return null;
        case "missing":
          toast(t("remoteSearchNotFound", { domain: result.domain }), "error");
          return null;
        case "unreachable":
          toast(t("remoteSearchUnreachable", { domain: result.domain }), "error");
          return null;
        default:
          toast(t("remoteFetchFailed"), "error");
          return null;
      }
    } finally {
      pending.current = null;
      setBusy(false);
    }
  }

  function localNote(reason: SignInReason): Promise<Note | null> {
    if (local.current) return Promise.resolve(local.current);
    if (!authenticated) {
      askToSignIn(reason);
      return Promise.resolve(null);
    }
    pending.current ??= settle(reason);
    return pending.current;
  }

  async function open() {
    const note = await localNote("federatedNotes");
    if (note) openNote(note, locale, router.push);
  }

  async function openAuthor() {
    const note = await localNote("remoteAccount");
    if (note?.author.remoteId) router.push(blogPath(`/remote/${note.author.remoteId}`));
  }

  async function reply() {
    const note = await localNote("reply");
    if (note) setReplyTarget(note);
  }

  async function like() {
    if (liking.current) return;
    if (!authenticated) {
      askToSignIn("like");
      return;
    }
    liking.current = true;
    const next = !likedNow.current;
    const step = next ? 1 : -1;
    const undo = () => {
      markLiked(!next);
      setLikeCount((count) => Math.max(count - step, 0));
    };
    markLiked(next);
    setLikeCount((count) => Math.max(count + step, 0));
    try {
      const first = local.current === null;
      const note = await localNote("like");
      if (!note) {
        undo();
        return;
      }
      if (first && next && note.likedByMe === true) {
        setLikeCount((count) => Math.max(count - step, 0));
        return;
      }
      try {
        await setNoteLike(note.id, next);
      } catch (error) {
        undo();
        likeFailed(error);
      }
    } finally {
      liking.current = false;
    }
  }

  async function follow() {
    const note = await localNote("follow");
    if (!note) return;
    if (!note.author.remoteId) {
      toast(t("remoteFetchFailed"), "error");
      return;
    }
    try {
      const account = await setRemoteFollow(note.author.remoteId, true);
      toast(account.following ? t("remoteFollowed") : t("remoteFollowRequested"));
    } catch (error) {
      toast(t(`remoteError.${followFailure(error)}`), "error");
    }
  }

  const [quoteTarget, setQuoteTarget] = useState<Note | null>(null);

  async function quote() {
    const note = await localNote("quote");
    if (note) setQuoteTarget(note);
  }

  return {
    liked,
    likeCount,
    busy,
    replyTarget,
    closeReply: () => setReplyTarget(null),
    quoteTarget,
    closeQuote: () => setQuoteTarget(null),
    resolve: () => localNote("repost"),
    open,
    openAuthor,
    reply,
    like,
    quote,
    follow,
  };
}
