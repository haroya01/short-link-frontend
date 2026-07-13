"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readStorageJson, writeStorageJson } from "./storage-json";

const STORAGE_KEY = "kurl:link-favorites";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function read(): string[] {
  return readStorageJson<string[]>(STORAGE_KEY, isStringArray, []);
}

function write(codes: string[]) {
  writeStorageJson(STORAGE_KEY, codes);
}

/**
 * 별표된 항목을 맨 위로 고정 — 그 외 순서(서버 정렬)는 보존하는 안정 정렬. 서버 페이지네이션이라
 * 고정 범위는 "현재 로드된 페이지 안"으로 한정된다(아직 안 불러온 페이지의 즐겨찾기는 못 끌어올림).
 */
export function pinFavoritesFirst<T>(
  items: T[],
  favorites: Set<string>,
  keyOf: (item: T) => string,
): T[] {
  if (favorites.size === 0) return items;
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    (favorites.has(keyOf(item)) ? pinned : rest).push(item);
  }
  return pinned.length ? [...pinned, ...rest] : items;
}

export type LinkFavorites = {
  /** shortCode 별표 여부. */
  isFavorite: (shortCode: string) => boolean;
  /** 별표/해제 토글 — 즉시 저장되고 목록이 다시 정렬된다. */
  toggle: (shortCode: string) => void;
  /** 별표된 shortCode 하나라도 있는지. */
  hasAny: boolean;
  /** 별표된 shortCode 집합(정렬 판정용). */
  codes: Set<string>;
};

/**
 * 링크 즐겨찾기 — 자주 보는 링크를 별표해 목록 맨 위로 고정한다. iOS links 앱의 LinkFavoriteStore 와
 * 같은 결: 백엔드 목록에 즐겨찾기 필드가 없어 기기 로컬(localStorage)에 shortCode 배열로 둔다.
 * SSR 안전(마운트 후 로드) + 멀티탭 동기화(storage 이벤트, recent-links 관례 미러).
 */
export function useLinkFavorites(): LinkFavorites {
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    setCodes(read());
    const onChange = () => setCodes(read());
    window.addEventListener("kurl:link-favorites-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("kurl:link-favorites-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const codeSet = useMemo(() => new Set(codes), [codes]);

  const toggle = useCallback((shortCode: string) => {
    if (typeof window === "undefined") return;
    const current = read();
    const next = current.includes(shortCode)
      ? current.filter((c) => c !== shortCode)
      : [...current, shortCode];
    write(next);
    setCodes(next);
    // 같은 탭 안 다른 구독자(필터 칩 등) 동기화. storage 이벤트는 다른 탭에만 뜨므로 자체 이벤트도 쏜다.
    window.dispatchEvent(new CustomEvent("kurl:link-favorites-changed"));
  }, []);

  const isFavorite = useCallback((shortCode: string) => codeSet.has(shortCode), [codeSet]);

  return { isFavorite, toggle, hasAny: codes.length > 0, codes: codeSet };
}
