"use client";

import { useEffect, useRef } from "react";

/** 비율 사각형 [x, y, w, h] — 컨테이너 폭/높이 기준. */
type Zone = [number, number, number, number];

export type PingRoute = {
  /** 출발 존 — 이 사각형 안 임의 지점에서 태어난다. */
  from: Zone;
  /** 도착 존 — 이 사각형 안 임의 지점으로 수렴한다. */
  to: Zone;
  /** 현 길이 대비 수직 볼록량 범위 [min, max] — 매 비행 랜덤. */
  bow: [number, number];
};

type Props = {
  routes: PingRoute[];
  /** 브랜드 그린 계열 hex. 라이트 히어로 = accent-400, 딥그린 필드 = accent-300. */
  color?: string;
  className?: string;
};

const RIPPLE_MS = 850;
const TRAIL_STEPS = 26;
/** u-공간 꼬리 길이 — easeOut 여행이라 도착 근처에서 자연히 응축된다. */
const TRAIL_SPAN = 0.16;
/** 동시 비행 상한 — §10 절제. */
const MAX_FLIGHTS = 2;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pointIn = (z: Zone): [number, number] => [z[0] + Math.random() * z[2], z[1] + Math.random() * z[3]];

type Flight = {
  from: [number, number];
  to: [number, number];
  bow: number;
  t0: number;
  travel: number;
  routeIdx: number;
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 혜성 핑 캔버스 — "클릭이 kurl 로 모인다" 수렴층의 렌더러.
 *
 * 곡선 활공(2차 베지어) + 폭·알파가 함께 잦아드는 리본 꼬리 + 글로우 헤드 + 도착 파문.
 * 고정 안무가 아니라 스포너다: 매 비행마다 라우트 추첨 → 출발·도착 지점, 휨, 속도,
 * 다음 스폰 간격을 전부 랜덤으로 뽑아 같은 장면이 반복되지 않는다. 라우트 존 자체가
 * 카피 밴드를 피하도록 그려져 있어 랜덤이어도 텍스트는 침범하지 않는다.
 * 전부 장식(aria-hidden 래퍼 안)이라 꺼져도 정보 손실 0.
 *
 * 절전 계약: 화면 밖(IntersectionObserver)·탭 은닉·reduced-motion 이면 rAF 를 세운다.
 * display:none(모바일 래퍼) 은 IO 가 비교차로 보고하므로 같은 경로로 쉰다.
 */
export function PingCanvas({ routes, color = "#34d399", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [r, g, b] = hexToRgb(color);
    const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

    let raf = 0;
    let running = false;
    let visible = false;
    let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;

    let flights: Flight[] = [];
    let lastRoute = -1;
    let nextSpawnAt = performance.now() + rand(300, 1200);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (now: number) => {
      // 직전 라우트 연속 추첨 회피 — 같은 구석에서 연달아 나오면 랜덤이 아니라 고장처럼 보인다.
      let idx = Math.floor(Math.random() * routes.length);
      if (routes.length > 1 && idx === lastRoute) idx = (idx + 1) % routes.length;
      lastRoute = idx;
      const route = routes[idx];
      flights.push({
        from: pointIn(route.from),
        to: pointIn(route.to),
        bow: rand(route.bow[0], route.bow[1]),
        t0: now,
        travel: rand(2500, 3700),
        routeIdx: idx,
      });
      nextSpawnAt = now + rand(1400, 4400);
    };

    // 2차 베지어 — 제어점은 현의 중점에서 수직으로 bow×현길이 만큼.
    const pointAt = (f: Flight, u: number): [number, number] => {
      const x0 = f.from[0] * width;
      const y0 = f.from[1] * height;
      const x1 = f.to[0] * width;
      const y1 = f.to[1] * height;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const bow = f.bow * len;
      const cx = (x0 + x1) / 2 + (-dy / len) * bow;
      const cy = (y0 + y1) / 2 + (dx / len) * bow;
      const v = 1 - u;
      return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1];
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      if (now >= nextSpawnAt && flights.length < MAX_FLIGHTS) spawn(now);

      flights = flights.filter((f) => now - f.t0 < f.travel + RIPPLE_MS);

      for (const f of flights) {
        const local = now - f.t0;

        if (local < f.travel) {
          // ── 활공: easeOutQuad — 빠르게 나타나 감속 접근
          const raw = local / f.travel;
          const u = 1 - (1 - raw) * (1 - raw);
          const fade = Math.min(1, raw / 0.1) * Math.min(1, (1 - raw) / 0.08 + 0.35);

          // 리본 꼬리 — 머리에서 멀어질수록 가늘고 옅게
          let prev = pointAt(f, u);
          for (let k = 1; k <= TRAIL_STEPS; k++) {
            const uk = u - (TRAIL_SPAN * k) / TRAIL_STEPS;
            if (uk <= 0) break;
            const pt = pointAt(f, uk);
            const fr = 1 - k / TRAIL_STEPS;
            ctx.strokeStyle = rgba(0.42 * fr * fr * fade);
            ctx.lineWidth = 0.4 + 2.1 * fr;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(prev[0], prev[1]);
            ctx.lineTo(pt[0], pt[1]);
            ctx.stroke();
            prev = pt;
          }

          // 글로우 헤드 — 부드러운 후광 + 밝은 심
          const [hx, hy] = pointAt(f, u);
          const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 8);
          glow.addColorStop(0, rgba(0.5 * fade));
          glow.addColorStop(1, rgba(0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(hx, hy, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba(0.95 * fade);
          ctx.beginPath();
          ctx.arc(hx, hy, 2.1, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // ── 도착 파문: 링 하나가 번지고, 심은 여운으로 잦아든다
          const tau = (local - f.travel) / RIPPLE_MS;
          const ease = 1 - (1 - tau) * (1 - tau);
          const [ax, ay] = pointAt(f, 1);
          ctx.strokeStyle = rgba(0.4 * (1 - ease));
          ctx.lineWidth = 1.6 - tau;
          ctx.beginPath();
          ctx.arc(ax, ay, 3 + 17 * ease, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = rgba(0.6 * (1 - tau));
          ctx.beginPath();
          ctx.arc(ax, ay, 2.1 * (1 - tau) + 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const sync = () => {
      const should = visible && !document.hidden && !reduced;
      if (should && !running) {
        running = true;
        // 쉬는 동안 시계가 흐르면 복귀 프레임에서 전 비행이 만료돼 화면이 비어 보인다 —
        // 스폰 시계만 지금으로 되감아 자연스럽게 재개.
        nextSpawnAt = performance.now() + rand(300, 1200);
        raf = requestAnimationFrame(draw);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
        flights = [];
        ctx.clearRect(0, 0, width, height);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(canvas);

    const onVis = () => sync();
    document.addEventListener("visibilitychange", onVis);

    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onRm = () => {
      reduced = rm.matches;
      sync();
    };
    rm.addEventListener("change", onRm);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      rm.removeEventListener("change", onRm);
    };
  }, [routes, color]);

  return (
    <div aria-hidden className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
