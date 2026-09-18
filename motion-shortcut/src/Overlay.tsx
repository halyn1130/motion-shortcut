import { useEffect, useRef, useState } from "react";
import { drawHands } from "./features/camera/useHandTracking";

// Display-only window: tracking and commands stay in the main renderer.
export default function Overlay() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const unsubscribeFrame = window.motionAPI?.onHandOverlayFrame?.((frame) => {
      if (canvas.current)
        drawHands(
          canvas.current,
          frame.hands,
          canvas.current.clientWidth / canvas.current.clientHeight,
          "#9fe9ff",
        );
    });
    const unsubscribeEditing = window.motionAPI?.onOverlayEditing?.(setEditing);
    void window.motionAPI
      ?.getOverlayLayout?.()
      .then((layout) => setEditing(layout.editing));
    return () => {
      unsubscribeFrame?.();
      if (typeof unsubscribeEditing === "function") unsubscribeEditing();
    };
  }, []);
  return (
    <main className={`hand-overlay ${editing ? "editing" : ""}`}>
      <canvas ref={canvas} aria-hidden="true" />
      {editing && <span>드래그해서 이동</span>}
    </main>
  );
}
