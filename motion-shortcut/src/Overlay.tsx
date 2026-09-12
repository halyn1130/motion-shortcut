import { useEffect, useRef, useState } from "react";
import {
  useHandTracking,
  type MotionGestureId,
} from "./features/camera/useHandTracking";
import { loadProfile } from "./features/presentation/profile";
import type {
  PresentationAction,
  PresentationMode,
} from "./features/presentation/types";

type OverlayMode = "camera" | "person-pet" | "hand-pet";

export default function Overlay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const handCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<OverlayMode>("camera");
  const [motionOn, setMotionOn] = useState(false);
  const [presentationMode, setPresentationMode] =
    useState<PresentationMode>("slide");
  const [profile, setProfile] = useState(loadProfile);
  const [cursorOn, setCursorOn] = useState(false);
  const [cursorSensitivity, setCursorSensitivity] = useState(1);
  const [handColor, setHandColor] = useState("#72dcff");
  const [editing, setEditing] = useState(false);
  const tracking = useHandTracking(
    videoRef,
    guideCanvasRef,
    handCanvasRef,
    mode !== "camera",
    handColor,
    (gesture: MotionGestureId) => {
      if (gesture === "toggle-motion") void window.motionAPI?.toggleMotion();
      else if (motionOn && presentationMode === "slide") {
        const action = Object.entries(profile.mappings).find(
          ([, pattern]) => pattern === gesture,
        )?.[0] as PresentationAction | undefined;
        if (action === "resource-1" || action === "resource-2") {
          const resource = profile.resources.find((item) => item.id === action);
          if (resource?.value)
            void window.motionAPI?.openPresentationResource(resource);
        } else if (action) {
          void window.motionAPI?.executePresentationCommand(
            action,
            profile.app,
          );
        }
      }
    },
    (nextMode) => {
      if (motionOn && presentationMode !== nextMode)
        void window.motionAPI?.setPresentationMode(nextMode);
    },
    (point) => {
      if (motionOn && presentationMode === "cursor")
        window.motionAPI?.moveCursor(point);
      if (motionOn && presentationMode === "laser")
        window.motionAPI?.moveLaser(point);
    },
    () => {
      if (motionOn && presentationMode === "cursor")
        window.motionAPI?.clickCursor();
    },
    cursorSensitivity,
    () => {
      if (motionOn) void window.motionAPI?.setMotionEnabled(false);
    },
  );

  useEffect(() => {
    void window.motionAPI?.getOverlayMode().then(setMode);
    window.motionAPI?.onOverlayMode(setMode);
    window.motionAPI?.onOverlayColor(setHandColor);
    void window.motionAPI
      ?.getOverlayLayout?.()
      .then((layout) => setEditing(layout.editing));
    window.motionAPI?.onOverlayEditing?.(setEditing);
    void window.motionAPI?.getMotionEnabled().then(setMotionOn);
    window.motionAPI?.onMotionChanged(setMotionOn);
    void window.motionAPI?.getPresentationMode().then(setPresentationMode);
    window.motionAPI?.onPresentationModeChanged(setPresentationMode);
    void window.motionAPI?.getCursorEnabled?.().then(setCursorOn);
    window.motionAPI?.onCursorChanged?.(setCursorOn);
    void window.motionAPI?.getCursorSensitivity?.().then(setCursorSensitivity);
    window.motionAPI?.onCursorSensitivityChanged?.(setCursorSensitivity);
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

  useEffect(() => {
    const updateProfile = () => setProfile(loadProfile());
    window.addEventListener("storage", updateProfile);
    return () => window.removeEventListener("storage", updateProfile);
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
