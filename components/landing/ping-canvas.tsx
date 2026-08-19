"use client";

import { useEffect, useRef } from "react";

type Comet = {
  /** 시작·도착점 — 컨테이너 폭/높이에 대한 비율 [x, y] */
  from: [number, number];
  to: [number, number];
  /** 현(직선 거리) 대비 수직 볼록량. 양수 = 진행 방향 기준 왼쪽으로 휜다. */
  bow?: number;
  /** 주기 안에서의 출발 지연(ms) */
  delay?: number;
};

type Props = {
  comets: Comet[];
  /** 브랜드 그린 계열 hex. 라이트 히어로 = accent-400, 딥그린 필드 = accent-300. */
  color?: string;
  className?: string;
  /** 혜성 하나의 전체 주기(ms). 여행+파문 뒤 나머지는 휴지 — 밀도는 §10 절제. */
  period?: number;
};

const TRAVEL_MS = 3000;
const RIPPLE_MS = 850;
const TRAIL_STEPS = 26;
/** u-공간 꼬리 길이 — easeOut 여행이라 도착 근처에서 자연히 응축된다. */
const TRAIL_SPAN = 0.16;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 혜성 핑 캔버스 — "클릭이 kurl 로 모인다" 수렴층의 렌더러.
 *
 * CSS 구현(점+2px 그라디언트 실선)은 직선 경로에 꼬리가 앙상해서 얼룩처럼 읽혔다.
 * 캔버스는 같은 서사를 곡선 활공 + 폭·알파가 함께 잦아드는 리본 꼬리 + 글로우 헤드 +
 * 도착 파문으로 그린다. 전부 장식(aria-hidden 래퍼 안)이라 끄면 정보 손실 0.
 *
 * 절전 계약: 화면 밖(IntersectionObserver)·탭 은닉·reduced-motion 이면 rAF 를 세운다.
 * display:none(모바일 래퍼) 은 IO 가 비교차로 보고하므로 같은 경로로 쉰다.
 */
export function PingCanvas({ comets, color = "#34d399", className, period = 9000 }: Props) {
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
    const t0 = performance.now();

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

    // 2차 베지어 — 제어점은 현의 중점에서 수직으로 bow×현길이 만큼.
    const pointAt = (c: Comet, u: number): [number, number] => {
      const x0 = c.from[0] * width;
      const y0 = c.from[1] * height;
      const x1 = c.to[0] * width;
      const y1 = c.to[1] * height;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const bow = (c.bow ?? 0) * len;
      const cx = (x0 + x1) / 2 + (-dy / len) * bow;
      const cy = (y0 + y1) / 2 + (dx / len) * bow;
      const v = 1 - u;
      return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1];
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const c of comets) {
        const local = (now - t0 - (c.delay ?? 0) + period) % period;

        if (local < TRAVEL_MS) {
          // ── 활공: easeOutQuad — 빠르게 나타나 캡슐로 감속 접근
          const raw = local / TRAVEL_MS;
          const u = 1 - (1 - raw) * (1 - raw);
          const fade = Math.min(1, raw / 0.1) * Math.min(1, (1 - raw) / 0.08 + 0.35);

          // 리본 꼬리 — 머리에서 멀어질수록 가늘고 옅게
          let prev = pointAt(c, u);
          for (let k = 1; k <= TRAIL_STEPS; k++) {
            const uk = u - (TRAIL_SPAN * k) / TRAIL_STEPS;
            if (uk <= 0) break;
            const pt = pointAt(c, uk);
            const f = 1 - k / TRAIL_STEPS;
            ctx.strokeStyle = rgba(0.42 * f * f * fade);
            ctx.lineWidth = 0.4 + 2.1 * f;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(prev[0], prev[1]);
            ctx.lineTo(pt[0], pt[1]);
            ctx.stroke();
            prev = pt;
          }

          // 글로우 헤드 — 부드러운 후광 + 밝은 심
          const [hx, hy] = pointAt(c, u);
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
        } else if (local < TRAVEL_MS + RIPPLE_MS) {
          // ── 도착 파문: 링 하나가 번지고, 심은 여운으로 잦아든다
          const tau = (local - TRAVEL_MS) / RIPPLE_MS;
          const ease = 1 - (1 - tau) * (1 - tau);
          const [ax, ay] = pointAt(c, 1);
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
        raf = requestAnimationFrame(draw);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
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
  }, [comets, color, period]);

  return (
    <div aria-hidden className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
