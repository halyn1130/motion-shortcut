import { useEffect, useRef, useState } from "react";
import {
  useHandTracking,
  type MotionGestureId,
} from "./features/camera/useHandTracking";

type OverlayMode = "person-pet" | "hand-pet";
const MAPPINGS_KEY = "motion-app-mappings-v1";

function appPathForGesture(gesture: MotionGestureId) {
  try {
    const mappings = JSON.parse(
      localStorage.getItem(MAPPINGS_KEY) ?? "[]",
    ) as Array<{
      gesture: string;
      path: string;
    }>;
    return mappings.find((mapping) => mapping.gesture === gesture)?.path;
  } catch {
    return undefined;
  }
}

export default function Overlay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const handCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<OverlayMode>("person-pet");
  const [motionOn, setMotionOn] = useState(true);
  const [cursorOn, setCursorOn] = useState(false);
  const [cursorSensitivity, setCursorSensitivity] = useState(1);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [handColor, setHandColor] = useState("#65f6dc");
  const [editing, setEditing] = useState(false);
  const tracking = useHandTracking(
    videoRef,
    guideCanvasRef,
    handCanvasRef,
    true,
    handColor,
    (gesture: MotionGestureId) => {
      if (gesture === "toggle-motion") void window.motionAPI?.toggleMotion();
      else if (motionOn) {
        const appPath = appPathForGesture(gesture);
        if (appPath) void window.motionAPI?.launchCustomApp(appPath);
      }
    },
    () => {
      void window.motionAPI?.toggleCursor();
    },
    (point) => window.motionAPI?.moveCursor(point),
    () => window.motionAPI?.clickCursor(),
    cursorSensitivity,
    () => void window.motionAPI?.toggleKeyboard(),
    (sample) => {
      if (keyboardVisible) window.motionAPI?.sendKeyboardPointer(sample);
    },
    (hands) => {
      if (keyboardVisible) window.motionAPI?.sendKeyboardHands(hands);
    },
  );

  useEffect(() => {
    window.motionAPI?.onOverlayMode(setMode);
    window.motionAPI?.onOverlayColor(setHandColor);
    void window.motionAPI
      ?.getOverlayLayout?.()
      .then((layout) => setEditing(layout.editing));
    window.motionAPI?.onOverlayEditing?.(setEditing);
    void window.motionAPI?.getMotionEnabled().then(setMotionOn);
    window.motionAPI?.onMotionChanged(setMotionOn);
    void window.motionAPI?.getCursorEnabled?.().then(setCursorOn);
    window.motionAPI?.onCursorChanged?.(setCursorOn);
    void window.motionAPI?.getCursorSensitivity?.().then(setCursorSensitivity);
    window.motionAPI?.onCursorSensitivityChanged?.(setCursorSensitivity);
    void window.motionAPI?.getKeyboardVisible?.().then(setKeyboardVisible);
    window.motionAPI?.onKeyboardChanged?.(setKeyboardVisible);
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
      className={`desktop-pet ${mode} ${tracking.state === "tracking" ? "has-hand" : ""} ${editing ? "editing" : ""}`}
    >
      <video ref={videoRef} muted playsInline />
      <canvas ref={guideCanvasRef} className="guide-canvas" />
      <canvas ref={handCanvasRef} className="pet-hand-canvas" />
      <span>
        {motionOn ? "MOTION ON" : "MOTION OFF"} · CURSOR{" "}
        {cursorOn ? "ON" : "OFF"}
      </span>
      {editing && <b className="pet-edit-hint">드래그해서 이동</b>}
    </main>
  );
}
