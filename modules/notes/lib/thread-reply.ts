import { NOTE_MAX_THREAD_NOTES, type Note, type NoteThread } from "@/modules/notes/api/notes";

export type ReplyLanding = "replies" | "continuation" | "elsewhere";

const counted = (note: Note): Note => ({ ...note, replyCount: note.replyCount + 1 });

export function placeReply(thread: NoteThread, reply: Note): { thread: NoteThread; landing: ReplyLanding } {
  const parts = thread.continuation ?? [];
  const byAuthor = reply.author.id === thread.note.author.id;
  if (reply.inReplyToId === thread.note.id) {
    const note = counted(thread.note);
    if (byAuthor && parts.length === 0) return { thread: { ...thread, note, continuation: [reply] }, landing: "continuation" };
    return { thread: { ...thread, note, replies: [reply, ...thread.replies] }, landing: "replies" };
  }
  const last = parts[parts.length - 1];
  if (byAuthor && last && reply.inReplyToId === last.id && parts.length < NOTE_MAX_THREAD_NOTES - 1) {
    return {
      thread: { ...thread, continuation: [...parts.slice(0, -1), counted(last), reply] },
      landing: "continuation",
    };
  }
  const answered = (candidate: Note) => (candidate.id === reply.inReplyToId ? counted(candidate) : candidate);
  return {
    thread: {
      ...thread,
      parent: thread.parent ? answered(thread.parent) : null,
      continuation: thread.continuation?.map(answered),
      replies: thread.replies.map(answered),
    },
    landing: "elsewhere",
  };
}
