"use client";

import { useEffect, useRef, useState } from "react";
import { readToken, request, withBase } from "@/lib/api";

export type AccountLiveClick = {
  /** 어느 행을 깨울지 특정하는 키. */
  shortCode: string;
  occurredAt: string;
  countryCode: string;
  deviceClass: string;
  channel: string;
  bot: boolean;
};

type Options = {
  /** 인증 준비 전(auth ready 이전)에는 열지 않는다 — 401 폭풍 방지. */
  enabled?: boolean;
  /** 클릭 이벤트마다 호출. ref 로 읽으므로 새 클로저를 넘겨도 스트림이 재수립되지 않는다. */
  onClick?: (click: AccountLiveClick) => void;
};

type StreamTokenResponse = {
  streamToken: string;
};

/**
 * 계정 단위 클릭 스트림({@code /api/v1/users/me/clicks/stream}) 구독 — 대시보드의
 * "클릭이 도착하는 순간"용. 링크별 {@link useClickStream} 과 같은 문법: EventSource 는
 * Authorization 헤더를 못 실으므로 액세스 JWT 를 단명 스트림 토큰으로 바꿔 쿼리로 접속한다.
 * 서버 타임아웃(5분)·네트워크 단절은 지수 백오프로 재접속하며 언마운트 시 닫는다.
 */
export function useAccountClickStream(opts: Options = {}): { connected: boolean } {
  const { enabled = true, onClick } = opts;

  const [connected, setConnected] = useState(false);
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    // 목 모드(무백엔드 데모/e2e-mock 레인)는 스트림이 없다 — 실패 재시도 루프를 만들지 않게 잠든다.
    if (process.env.NEXT_PUBLIC_USE_MOCKS === "1") return;
    if (!enabled || !readToken()) return;

    let es: EventSource | null = null;
    let cancelled = false;
    let backoff = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function scheduleReconnect() {
      if (cancelled) return;
      timer = setTimeout(() => {
        backoff = Math.min(backoff * 2, 30_000);
        void open();
      }, backoff);
    }

    async function open() {
      if (cancelled) return;
      let token: string;
      try {
        const data = await request<StreamTokenResponse>("/api/v1/users/me/clicks/stream-token", {
          method: "POST",
        });
        token = data.streamToken;
      } catch {
        setConnected(false);
        scheduleReconnect();
        return;
      }
      if (cancelled) return;
      const url = `${withBase("/api/v1/users/me/clicks/stream")}?streamToken=${encodeURIComponent(token)}`;
      es = new EventSource(url);
      es.addEventListener("ready", () => {
        backoff = 1000;
        setConnected(true);
      });
      es.addEventListener("click", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as AccountLiveClick;
          if (!payload.shortCode) return;
          onClickRef.current?.(payload);
        } catch {
          // ignore malformed payloads
        }
      });
      es.onerror = () => {
        setConnected(false);
        es?.close();
        scheduleReconnect();
      };
    }

    void open();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      es?.close();
    };
  }, [enabled]);

  return { connected };
}
