import { useEffect, useState, type CSSProperties, type DependencyList, type RefObject } from "react";

export function useEdgeFade(ref: RefObject<HTMLElement | null>, deps: DependencyList = []) {
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        start: el.scrollLeft > 1,
        end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  const fade = `linear-gradient(to right, ${edges.start ? "transparent, black 2.5rem" : "black"}, ${
    edges.end ? "black calc(100% - 2.5rem), transparent" : "black"
  })`;
  const style: CSSProperties | undefined =
    edges.start || edges.end ? { maskImage: fade, WebkitMaskImage: fade } : undefined;
  return {
    style,
    attrs: { "data-edge-start": edges.start || undefined, "data-edge-end": edges.end || undefined },
  };
}
