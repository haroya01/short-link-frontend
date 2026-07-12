import type { BlogNotificationPreferences, NotificationsPage } from "./notifications";

/** Demo/mock mode — lets the bell + page render and interact without a backend. */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

const BASE = {
  postId: null,
  postSlug: null,
  postTitle: null,
  postAuthorUsername: null,
  seriesId: null,
  seriesSlug: null,
  seriesTitle: null,
  collectionId: null,
  collectionName: null,
} as const;

export function mockNotificationsPage(): NotificationsPage {
  return {
    items: [
      {
        ...BASE,
        id: 9,
        type: "CONNECTED",
        actorId: 15,
        actorUsername: "yuna",
        actorAvatarUrl: "https://i.pravatar.cc/120?img=20",
        postId: 5,
        postSlug: "typescript-generics",
        postTitle: "타입스크립트 제네릭이 어려운 이유",
        collectionId: 3,
        collectionName: "타입 시스템 깊게 읽기",
        read: false,
        createdAt: "2026-06-07T11:20:00Z",
      },
      {
        ...BASE,
        id: 8,
        type: "PATH_GREW",
        actorId: 16,
        actorUsername: "daniel",
        actorAvatarUrl: null,
        postId: 21,
        postSlug: "structural-typing",
        postTitle: "구조적 타이핑으로 다시 보는 인터페이스",
        collectionId: 3,
        collectionName: "타입 시스템 깊게 읽기",
        read: false,
        createdAt: "2026-06-07T11:12:00Z",
      },
      {
        ...BASE,
        id: 7,
        type: "MENTION",
        actorId: 12,
        actorUsername: "kazuki",
        actorAvatarUrl: null,
        postId: 5,
        postSlug: "typescript-generics",
        postTitle: "타입스크립트 제네릭이 어려운 이유",
        postAuthorUsername: "minji",
        read: false,
        createdAt: "2026-06-07T11:05:00Z",
      },
      {
        ...BASE,
        id: 6,
        type: "NEW_POST",
        actorId: 14,
        actorUsername: "sora",
        actorAvatarUrl: "https://i.pravatar.cc/120?img=12",
        postId: 9,
        postSlug: "rust-ownership",
        postTitle: "러스트 소유권을 다시 정리하며",
        read: false,
        createdAt: "2026-06-07T11:00:00Z",
      },
      {
        ...BASE,
        id: 5,
        type: "REPLY",
        actorId: 12,
        actorUsername: "kazuki",
        actorAvatarUrl: null,
        postId: 5,
        postSlug: "typescript-generics",
        postTitle: "타입스크립트 제네릭이 어려운 이유",
        postAuthorUsername: "minji",
        read: false,
        createdAt: "2026-06-07T10:45:00Z",
      },
      {
        ...BASE,
        id: 4,
        type: "SERIES_SUBSCRIBE",
        actorId: 13,
        actorUsername: "haruki",
        actorAvatarUrl: "https://i.pravatar.cc/120?img=8",
        seriesId: 2,
        seriesSlug: "frontend-deep-dive",
        seriesTitle: "프런트엔드 딥다이브",
        read: false,
        createdAt: "2026-06-07T10:35:00Z",
      },
      {
        ...BASE,
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
        ...BASE,
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
        ...BASE,
        id: 1,
        type: "FOLLOW",
        actorId: 13,
        actorUsername: "haruki",
        actorAvatarUrl: "https://i.pravatar.cc/120?img=8",
        read: true,
        createdAt: "2026-06-06T14:20:00Z",
      },
    ],
    nextCursor: null,
    hasMore: false,
  };
}

export function mockUnreadCount(): { count: number } {
  return { count: 6 };
}

/** Demo preferences with a couple of types muted, so the off-state is visible without a backend. */
export function mockBlogNotificationPreferences(): BlogNotificationPreferences {
  return {
    LIKE: true,
    COMMENT: true,
    FOLLOW: false,
    SERIES_SUBSCRIBE: true,
    REPLY: true,
    NEW_POST: false,
    MENTION: true,
    CONNECTED: true,
    PATH_GREW: true,
  };
}
