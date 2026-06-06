import type { NotificationsPage } from "./notifications";

/** Demo/mock mode — lets the bell + page render and interact without a backend. */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export function mockNotificationsPage(): NotificationsPage {
  return {
    items: [
      {
        id: 3,
        type: "LIKE",
        actorId: 11,
        actorUsername: "minji",
        actorAvatarUrl: "https://i.pravatar.cc/120?img=5",
        postId: 5,
        postSlug: "typescript-generics",
        postTitle: "타입스크립트 제네릭이 어려운 이유",
        read: false,
        createdAt: "2026-06-07T10:30:00Z",
      },
      {
        id: 2,
        type: "COMMENT",
        actorId: 12,
        actorUsername: "kazuki",
        actorAvatarUrl: null,
        postId: 5,
        postSlug: "typescript-generics",
        postTitle: "타입스크립트 제네릭이 어려운 이유",
        read: false,
        createdAt: "2026-06-07T09:15:00Z",
      },
      {
        id: 1,
        type: "FOLLOW",
        actorId: 13,
        actorUsername: "haruki",
        actorAvatarUrl: "https://i.pravatar.cc/120?img=8",
        postId: null,
        postSlug: null,
        postTitle: null,
        read: true,
        createdAt: "2026-06-06T14:20:00Z",
      },
    ],
    nextCursor: null,
    hasMore: false,
  };
}

export function mockUnreadCount(): { count: number } {
  return { count: 2 };
}
