import { PostEditorScreen } from "@/modules/blog/components/editor/post-editor-screen";
import { kurlNoteId } from "@/modules/blog/lib/kurl-link";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ quote?: string; room?: string }> }) {
  const { quote, room } = await searchParams;
  const roomId = Number(room);
  const quoted = quote && kurlNoteId(quote) ? quote.trim() : null;
  return (
    <PostEditorScreen
      postId={null}
      initialMarkdown={quoted ? `${quoted}\n\n` : undefined}
      initialRoomId={Number.isInteger(roomId) && roomId > 0 ? roomId : null}
    />
  );
}
