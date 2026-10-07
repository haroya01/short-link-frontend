import { PostEditorScreen } from "@/modules/blog/components/editor/post-editor-screen";
import { kurlNoteId } from "@/modules/blog/lib/kurl-link";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ quote?: string }> }) {
  const { quote } = await searchParams;
  const quoted = quote && kurlNoteId(quote) ? quote.trim() : null;
  return <PostEditorScreen postId={null} initialMarkdown={quoted ? `${quoted}\n\n` : undefined} />;
}
