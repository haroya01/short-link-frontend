import type { PublicEvent } from "./events";

const DAY_MS = 86_400_000;

function at(offsetDays: number, hourUtc: number): string {
  const day = new Date(Date.now() + offsetDays * DAY_MS);
  day.setUTCHours(hourUtc, 0, 0, 0);
  return day.toISOString();
}

function base(): PublicEvent {
  return {
    slug: "mock-open",
    title: "성수 모각코 11월",
    descriptionMd:
      "각자 할 거 들고 와서 2시간 조용히 해요\n\n- 콘센트 자리 많음\n- 끝나고 밥 먹을 사람은 근처에서 같이 가요",
    coverImageUrl: null,
    startsAt: at(7, 10),
    endsAt: at(7, 12),
    timezone: "Asia/Seoul",
    locationText: "성수 카페 2층",
    locationUrl: "https://www.google.com/maps/search/?api=1&query=%EC%84%B1%EC%88%98",
    onlineUrl: null,
    capacity: 20,
    spotsLeft: 13,
    closeAt: null,
    contactField: "KAKAO",
    status: "OPEN",
    acceptingRegistrations: true,
    attending: 7,
    organizerName: "honggildong",
    organizerAvatarUrl: null,
    questions: [
      { id: 1, type: "SHORT_TEXT", label: "뭐 할 거예요?", options: [], required: true },
      { id: 2, type: "SINGLE_CHOICE", label: "끝나고 밥", options: ["갈래요", "바로 갈게요"], required: false },
    ],
  };
}

export function mockPublicEvent(slug: string): PublicEvent | null {
  const event = { ...base(), slug };
  switch (slug) {
    case "mock-open":
      return event;
    case "mock-full":
      return { ...event, attending: 20, spotsLeft: 0, acceptingRegistrations: false };
    case "mock-closed":
      return { ...event, status: "CLOSED", acceptingRegistrations: false };
    case "mock-ended":
      return { ...event, startsAt: at(-80, 10), endsAt: at(-80, 12), acceptingRegistrations: true };
    case "mock-canceled":
      return { ...event, status: "CANCELED", acceptingRegistrations: false };
    default:
      return null;
  }
}
