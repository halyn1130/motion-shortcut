import { useEffect } from "react";
import "./WelcomeIntro.css";

export function WelcomeIntro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (media?.matches) { onDone(); return; }
    const timer = window.setTimeout(onDone, 2000);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onDone(); };
    const reduce = () => { if (media?.matches) onDone(); };
    window.addEventListener("keydown", escape);
    media?.addEventListener("change", reduce);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", escape);
      media?.removeEventListener("change", reduce);
    };
  }, [onDone]);

  return (
    <section className="welcome-intro" aria-label="Adam 시작 안내">
      <div className="intro-wordmark" aria-hidden="true">A D A M</div>
      <div className="intro-stage" aria-hidden="true">
        <div className="intro-laptop">
          <div className="intro-lid">
            <div className="intro-display">
              <div className="intro-display-bar"><span>ADAM</span><span>PRESENTATION / 01</span></div>
              <div className="intro-slide-track">
                <div className="intro-slide">
                  <span className="intro-eyebrow">YOUR IDEAS. IN FOCUS.</span>
                  <strong>Present with<br /><em>confidence.</em></strong>
                  <div className="intro-orbit"><img src="/assets/adam-symbol.svg" alt="" /></div>
                </div>
                <div className="intro-slide intro-slide-next">
                  <span className="intro-eyebrow">NATURAL GESTURES. PRECISE CONTROL.</span>
                  <strong>Control<br />with <em>ease.</em></strong>
                  <img className="intro-hand" src="/assets/adam-hand-wireframe-3d.png" alt="" />
                </div>
              </div>
              <div className="intro-slide-footer"><span>MOVE FREELY. PRESENT CLEARLY.</span><span>● ──</span></div>
              <span className="intro-pointer" />
            </div>
          </div>
          <div className="intro-deck"><div className="intro-keys" /><div className="intro-trackpad" /></div>
          <div className="intro-laptop-edge" />
        </div>
        <div className="intro-floor" />
      </div>
      <p className="intro-caption">Present with confidence. Control with ease.</p>
      <span className="visually-hidden">자신 있게 발표하고, 편하게 제어하세요. 잠시 후 시작합니다.</span>
    </section>
  );
}
