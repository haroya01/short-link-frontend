"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Clock, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { askToSignIn } from "@/components/auth/login-prompt";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  NOTE_POLL_MAX_OPTIONS,
  NOTE_POLL_OPTION_MAX_LENGTH,
  voteInPoll,
  type NotePoll,
  type NotePollDraft,
} from "@/modules/notes/api/notes";

function closed(poll: NotePoll, now: number | null): boolean {
  return poll.expired || (now !== null && new Date(poll.expiresAt).getTime() <= now);
}

function share(poll: NotePoll, votes: number): number {
  const base = poll.multiple ? poll.votersCount : poll.votesCount;
  return base > 0 ? votes / base : 0;
}

export function NotePollCard({
  noteId,
  poll: given,
  onVoted,
}: {
  noteId: number;
  poll: NotePoll;
  onVoted: (poll: NotePoll) => void;
}) {
  const t = useTranslations("notes");
  const [poll, setPoll] = useState(given);
  useEffect(() => setPoll(given), [given]);
  const { toast } = useToast();
  const { authenticated } = useAuth();
  const [picked, setPicked] = useState<number[]>([]);
  const [peeking, setPeeking] = useState(false);
  const [voting, setVoting] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const ended = closed(poll, now);
  const showsResults = poll.voted === true || ended || peeking;
  const [filled, setFilled] = useState(showsResults);
  const leading = Math.max(0, ...poll.options.map((option) => option.votesCount));

  useEffect(() => {
    if (!showsResults) {
      setFilled(false);
      return;
    }
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, [showsResults]);

  async function vote(choices: number[]) {
    if (choices.length === 0 || voting) return;
    setVoting(true);
    try {
      const updated = await voteInPoll(noteId, choices);
      setPicked([]);
      setPeeking(false);
      setPoll(updated);
      onVoted(updated);
    } catch {
      toast(t("pollVoteFailed"), "error");
    } finally {
      setVoting(false);
    }
  }

  function choose(index: number) {
    if (!authenticated) {
      askToSignIn("vote");
      return;
    }
    if (!poll.multiple) {
      vote([index]);
      return;
    }
    setPicked((current) =>
      current.includes(index) ? current.filter((i) => i !== index) : [...current, index],
    );
  }

  return (
    <div className="mt-2.5 space-y-2" data-note-poll={noteId}>
      {!showsResults && !poll.multiple && (
        <span id={`note-poll-hint-${noteId}`} className="sr-only">
          {t("pollTapVotes")}
        </span>
      )}
      <ul className="space-y-2" aria-label={t("pollLabel")}>
        {poll.options.map((option, index) => {
          if (showsResults) {
            const part = share(poll, option.votesCount);
            const top = leading > 0 && option.votesCount === leading;
            const mine = poll.ownVotes?.includes(index) === true;
            return (
              <li
                key={index}
                className="relative flex min-h-10 items-center gap-1.5 overflow-hidden rounded-surface border border-slate-200/70 px-3 py-2 dark:border-slate-800"
                data-poll-result={index}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-surface transition-[width] duration-500 ease-[var(--ease)] motion-reduce:transition-none",
                    top ? "bg-accent-400/30 dark:bg-accent-500/25" : "bg-slate-100 dark:bg-slate-800",
                  )}
                  style={{ width: `${filled ? part * 100 : 0}%` }}
                />
                <span
                  className={cn(
                    "relative min-w-0 break-words text-[15px] text-slate-900 dark:text-slate-100",
                    top && "font-semibold",
                  )}
                >
                  {option.title}
                </span>
                {mine && (
                  <CircleCheck
                    className="relative h-4 w-4 shrink-0 text-accent-700 dark:text-accent-400"
                    aria-label={t("pollMine")}
                  />
                )}
                <span
                  className={cn(
                    "relative ml-auto pl-3 text-[13px] tabular-nums",
                    top ? "font-bold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {Math.round(part * 100)}%
                </span>
              </li>
            );
          }
          const on = picked.includes(index);
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => choose(index)}
                disabled={voting}
                role={poll.multiple ? "checkbox" : undefined}
                aria-checked={poll.multiple ? on : undefined}
                aria-describedby={poll.multiple ? undefined : `note-poll-hint-${noteId}`}
                className={cn(
                  "focus-ring flex min-h-10 w-full items-center gap-2.5 rounded-surface border px-3 py-2 text-left text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:text-slate-100 dark:hover:bg-slate-900",
                  on ? "border-accent-700 dark:border-accent-400" : "border-slate-200 dark:border-slate-700",
                )}
              >
                {poll.multiple && (
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      on
                        ? "border-accent-700 bg-accent-700 text-white dark:border-accent-400 dark:bg-accent-400"
                        : "border-slate-400",
                    )}
                  >
                    {on && "✓"}
                  </span>
                )}
                <span className="min-w-0 break-words">{option.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {!showsResults && poll.multiple && (
        <button
          type="button"
          onClick={() => vote(picked)}
          disabled={picked.length === 0 || voting}
          className="focus-ring w-full rounded-full border border-accent-700 py-1.5 text-[13px] font-semibold text-accent-800 hover:bg-accent-50 disabled:opacity-40 dark:border-accent-400 dark:text-accent-300 dark:hover:bg-accent-500/10"
        >
          {t("pollVote")}
        </button>
      )}
      <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-500 dark:text-slate-400">
        <span>{t("pollVoters", { count: poll.votersCount })}</span>
        {(now !== null || ended) && (
          <>
            <span aria-hidden>·</span>
            <span>{remaining(poll, ended, now ?? 0, t)}</span>
          </>
        )}
        {poll.voted !== true && !ended && (
          <>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => setPeeking((on) => !on)}
              className="focus-ring rounded underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {peeking ? t("pollBackToVote") : t("pollShowResults")}
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function remaining(
  poll: NotePoll,
  ended: boolean,
  now: number,
  t: ReturnType<typeof useTranslations>,
): string {
  if (ended) return t("pollEnded");
  const seconds = (new Date(poll.expiresAt).getTime() - now) / 1000;
  if (seconds < 3600) return t("pollMinutesLeft", { count: Math.max(1, Math.floor(seconds / 60)) });
  if (seconds < 86_400) return t("pollHoursLeft", { count: Math.floor(seconds / 3600) });
  return t("pollDaysLeft", { count: Math.floor(seconds / 86_400) });
}

export const POLL_DURATIONS = [300, 1800, 3600, 21_600, 43_200, 86_400, 259_200, 604_800] as const;

export function emptyPoll(): NotePollDraft {
  return { options: ["", ""], expiresIn: 86_400, multiple: false };
}

export function pollReady(poll: NotePollDraft): boolean {
  const options = poll.options.map((option) => option.trim());
  return (
    options.length >= 2 &&
    options.every((option) => option.length > 0 && option.length <= NOTE_POLL_OPTION_MAX_LENGTH) &&
    new Set(options).size === options.length
  );
}

export function NotePollEditor({
  poll,
  onChange,
}: {
  poll: NotePollDraft;
  onChange: (poll: NotePollDraft) => void;
}) {
  const t = useTranslations("notes");
  return (
    <div className="mt-2 space-y-2 rounded-surface border border-slate-200 p-3 dark:border-slate-800">
      {poll.options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            value={option}
            autoFocus={index === 0 && option === ""}
            maxLength={NOTE_POLL_OPTION_MAX_LENGTH}
            onChange={(e) =>
              onChange({ ...poll, options: poll.options.map((o, i) => (i === index ? e.target.value : o)) })
            }
            placeholder={t("pollOptionPlaceholder", { n: index + 1 })}
            aria-label={t("pollOptionPlaceholder", { n: index + 1 })}
            className="focus-ring min-w-0 flex-1 rounded-surface border border-slate-200 bg-transparent px-3 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-accent-700 dark:border-slate-700 dark:text-slate-100 dark:focus:border-accent-400"
          />
          {poll.options.length > 2 && (
            <button
              type="button"
              onClick={() => onChange({ ...poll, options: poll.options.filter((_, i) => i !== index) })}
              aria-label={t("pollRemoveOption")}
              className="focus-ring rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[13px] font-medium text-slate-600 dark:text-slate-300">
        {poll.options.length < NOTE_POLL_MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => onChange({ ...poll, options: [...poll.options, ""] })}
            className="focus-ring inline-flex items-center gap-1 rounded hover:text-slate-900 dark:hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("pollAddOption")}
          </button>
        )}
        <label className="ml-auto inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          <select
            value={poll.expiresIn}
            onChange={(e) => onChange({ ...poll, expiresIn: Number(e.target.value) })}
            aria-label={t("pollDuration")}
            className="focus-ring cursor-pointer appearance-none rounded bg-transparent hover:text-slate-900 dark:hover:text-white"
          >
            {POLL_DURATIONS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds < 3600
                  ? t("pollMinutes", { count: seconds / 60 })
                  : seconds < 86_400
                    ? t("pollHours", { count: seconds / 3600 })
                    : t("pollDays", { count: seconds / 86_400 })}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={poll.multiple}
            onChange={(e) => onChange({ ...poll, multiple: e.target.checked })}
            className="h-3.5 w-3.5 accent-accent-700"
          />
          {t("pollMultiple")}
        </label>
      </div>
    </div>
  );
}
