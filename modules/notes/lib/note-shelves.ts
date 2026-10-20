export const NOTE_SHELVES = ["bookmarks", "direct", "lists"] as const;
export type NoteShelf = (typeof NOTE_SHELVES)[number];
