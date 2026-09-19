import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/** One scroll controller; native touch and reduced-motion behavior are preserved. */
export function useSmoothWheel(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !window.matchMedia) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    const sync = () => {
      lenis?.destroy();
      lenis = undefined;
      if (reduced.matches) return;
      lenis = new Lenis({
        autoRaf: true,
        smoothWheel: true,
        lerp: 0.28,
        wheelMultiplier: 1,
        syncTouch: false,
        anchors: false, // Hashes belong to the app router.
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        prevent: (node) =>
          node.matches("input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=dialog]"),
        virtualScroll: ({ event }) =>
          !event.ctrlKey && !event.metaKey && !event.shiftKey,
      });
    };
    const interrupt = () => {
      lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
    };
    sync();
    reduced.addEventListener("change", sync);
    window.addEventListener("hashchange", interrupt);
    window.addEventListener("keydown", interrupt);
    window.addEventListener("pointerdown", interrupt, { passive: true });
    return () => {
      lenis?.destroy();
      reduced.removeEventListener("change", sync);
      window.removeEventListener("hashchange", interrupt);
      window.removeEventListener("keydown", interrupt);
      window.removeEventListener("pointerdown", interrupt);
    };
  }, [enabled]);
}
