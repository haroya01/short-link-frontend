import type { Page } from "@playwright/test";

// A browser may hand an IntersectionObserver several reports for one element in a single callback,
// oldest first. Observers of `target` get every out-of-view report only together with the next in-view one.
export async function batchIntersectionReports(page: Page, target: string) {
  await page.addInitScript((selector) => {
    const state = window as unknown as { __heldReports: number };
    state.__heldReports = 0;
    const Native = window.IntersectionObserver;
    window.IntersectionObserver = class extends Native {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        let held: IntersectionObserverEntry[] = [];
        super((entries, observer) => {
          const watched = entries.some((entry) => entry.target.matches(selector));
          if (watched && !entries.some((entry) => entry.isIntersecting)) {
            held = held.concat(entries);
            state.__heldReports += 1;
            return;
          }
          const batch = held.concat(entries);
          held = [];
          callback(batch, observer);
        }, options);
      }

      observe(element: Element) {
        if (element.matches(selector)) state.__heldReports = 0;
        super.observe(element);
      }
    };
  }, target);
  return () => page.waitForFunction(() => (window as unknown as { __heldReports: number }).__heldReports > 0);
}
