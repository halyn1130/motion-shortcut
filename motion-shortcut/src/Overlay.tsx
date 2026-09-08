import { useEffect, useRef, useState } from "react";
import {
  useHandTracking,
  type MotionGestureId,
} from "./features/camera/useHandTracking";

type OverlayMode = "person-pet" | "hand-pet";

export default function Overlay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const handCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<OverlayMode>("person-pet");
  const [motionOn, setMotionOn] = useState(true);
  const [cursorOn, setCursorOn] = useState(false);
  const [handColor, setHandColor] = useState("#65f6dc");
  const tracking = useHandTracking(
    videoRef,
    guideCanvasRef,
    handCanvasRef,
    true,
    handColor,
    (gesture: MotionGestureId) => {
      if (gesture === "toggle-motion") void window.motionAPI?.toggleMotion();
      else if (motionOn) void window.motionAPI?.launchApp(gesture);
    },
    () => {
      void window.motionAPI?.toggleCursor();
    },
    (point) => window.motionAPI?.moveCursor(point),
  );

  useEffect(() => {
    window.motionAPI?.onOverlayMode(setMode);
    window.motionAPI?.onOverlayColor(setHandColor);
    void window.motionAPI?.getMotionEnabled().then(setMotionOn);
    window.motionAPI?.onMotionChanged(setMotionOn);
    void window.motionAPI?.getCursorEnabled?.().then(setCursorOn);
    window.motionAPI?.onCursorChanged?.(setCursorOn);
    let stream: MediaStream | null = null;
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(async (next) => {
        stream = next;
        if (videoRef.current) {
          videoRef.current.srcObject = next;
          await videoRef.current.play();
        }
      });
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, []);

  return (
    <main
      className={`desktop-pet ${mode} ${tracking.state === "tracking" ? "has-hand" : ""}`}
    >
      <video ref={videoRef} muted playsInline />
      <canvas ref={guideCanvasRef} className="guide-canvas" />
      <canvas ref={handCanvasRef} className="pet-hand-canvas" />
      <span>
        {motionOn ? "MOTION ON" : "MOTION OFF"} · CURSOR{" "}
        {cursorOn ? "ON" : "OFF"}
      </span>
    </main>
  );
}
