import { useEffect, useState } from "react";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";

export function useDockOffset(active: boolean): number {
  const keyboard = useKeyboardInset();
  const [bar, setBar] = useState(0);
  useEffect(() => {
    if (!active) return;
    const nav = document.querySelector<HTMLElement>(".vt-bottom-nav");
    if (!nav) return;
    const measure = () =>
      setBar(nav.getClientRects().length === 0 ? 0 : Math.max(0, window.innerHeight - nav.getBoundingClientRect().top));
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    nav.addEventListener("transitionend", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      nav.removeEventListener("transitionend", measure);
    };
  }, [active]);
  return keyboard > 0 ? keyboard : bar;
}
