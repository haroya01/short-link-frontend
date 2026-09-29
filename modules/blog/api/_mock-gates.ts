/**
 * 블로그 목(mock) 구현의 관문. 목 빌드(NEXT_PUBLIC_USE_MOCKS=1 — next.config 가 빌드 상수로 박는다)
 * 에서만 require 되고, 그 밖의 빌드에선 조건식이 상수로 접혀 require 와 픽스처가 번들에서 통째로
 * 빠진다. API 모듈은 목 모듈을 정적으로 import 하지 말고 이 관문이 null 이 아닐 때만 쓴다.
 */
type BlogMocks = typeof import("./_mocks");
type AuthoringMocks = typeof import("./_mocks-authoring");
type CollectionMocks = typeof import("./_mocks-collections");
type SavedMocks = typeof import("./_mocks-saved");

export const blogMocks: BlogMocks | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const authoringMocks: AuthoringMocks | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks-authoring") : null;

export const collectionMocks: CollectionMocks | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks-collections") : null;

export const savedMocks: SavedMocks | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks-saved") : null;
