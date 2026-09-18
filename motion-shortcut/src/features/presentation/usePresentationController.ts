import { useEffect, useRef, useState } from "react";
import {
  useHandTracking,
  type MotionGestureId,
} from "../camera/useHandTracking";
import {
  ACTION_LABELS,
  type PresentationAction,
  type PresentationMode,
  type PresentationProfile,
} from "./types";
import { loadProfile, saveProfile } from "./profile";

type DisplayMode = "camera" | "person-pet" | "hand-pet";
type CameraState = "idle" | "requesting" | "active" | "error";

export const MODE_LABELS: Record<PresentationMode, string> = {
  slide: "슬라이드",
  cursor: "포인터",
  laser: "포인터",
};

export const APP_LABELS = {
  "google-slides": "Google Slides",
  powerpoint: "PowerPoint",
  keynote: "Keynote",
  "web-slides": "웹 슬라이드 (Chrome)",
};

function detectWebPresentation(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return null;
    const host = parsed.hostname.toLowerCase();
    if (host.includes("docs.google.com"))
      return { app: "google-slides" as const, label: "Google Slides" };
    if (host.includes("canva.com"))
      return { app: "web-slides" as const, label: "Canva" };
    if (host.includes("pitch.com"))
      return { app: "web-slides" as const, label: "Pitch" };
    if (host.includes("gamma.app"))
      return { app: "web-slides" as const, label: "Gamma" };
    return { app: "web-slides" as const, label: host };
  } catch {
    return null;
  }
}

export const FIXED_ACTIONS: PresentationAction[] = [
  "next-slide",
  "previous-slide",
  "black-screen",
  "exit-presentation",
];

export function usePresentationController() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const requestingRef = useRef(false);

  const [profile, setProfile] = useState<PresentationProfile>(loadProfile);
  const [motionOn, setMotionOn] = useState(false);
  const [mode, setMode] = useState<PresentationMode>("slide");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => (localStorage.getItem("displayMode") as DisplayMode) || "camera",
  );
  const [cameraView, setCameraView] = useState<"camera" | "hands">(() =>
    localStorage.getItem("flickey.camera-view.v1") === "hands"
      ? "hands"
      : "camera",
  );
  const changeCameraView = (next: "camera" | "hands") => {
    if (!streamRef.current) return;
    setCameraView(next);
    localStorage.setItem("flickey.camera-view.v1", next);
  };
  const [cursorSensitivity, setCursorSensitivity] = useState(1);
  const [slideNumber, setSlideNumber] = useState(1);
  const [selectedResourceIndex, setSelectedResourceIndex] = useState(-1);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [presentationLinkStatus, setPresentationLinkStatus] = useState("");
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [permissions, setPermissions] = useState({
    camera: "not-determined",
    accessibility: "denied",
    screen: "not-determined",
  });
  const [displays, setDisplays] = useState<
    Array<{ id: string; label: string; primary: boolean }>
  >([]);
  const [selectedDisplayId, setSelectedDisplayId] = useState("");
  const [logs, setLogs] = useState<string[]>([
    "Flickey Present가 준비되었습니다.",
  ]);
  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((items) => [`${time} · ${message}`, ...items].slice(0, 10));
  };

  const updateProfile = (next: PresentationProfile) => {
    setProfile(next);
    saveProfile(next);
  };

  const startCamera = async () => {
    if (streamRef.current) return true;
    if (requestingRef.current) return false;
    requestingRef.current = true;
    const request = ++cameraRequestRef.current;
    setCameraState("requesting");
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (request !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("active");
      await window.motionAPI?.setCameraEnabled(true);
      addLog("카메라 연결 완료");
      return true;
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "시스템 설정에서 Flickey의 카메라 권한을 허용하세요."
          : "카메라를 연결하지 못했습니다.";
      setCameraError(message);
      setCameraState("error");
      addLog(`카메라 오류 · ${message}`);
      return false;
    } finally {
      requestingRef.current = false;
    }
  };

  const changeDisplayMode = async (nextMode: DisplayMode) => {
    setDisplayMode(nextMode);
    addLog(`손 추적 오버레이 ${nextMode === "camera" ? "OFF" : "ON"}`);
  };

  const stopCamera = async () => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    await window.motionAPI?.setCameraEnabled(false);
    setCameraState("idle");
    setMotionOn(false);
    setSessionStartedAt(null);
    addLog("카메라 OFF · 모션 안전 정지");
  };

  const toggleMotion = async () => {
    if (motionOn) {
      await window.motionAPI?.setMotionEnabled(false);
      setMotionOn(false);
      addLog("모션 OFF");
      return;
    }
    const cameraReady = await startCamera();
    if (!cameraReady) return;
    const enabled = await window.motionAPI?.setMotionEnabled(true);
    setMotionOn(Boolean(enabled));
    addLog(enabled ? "모션 ON" : "모션을 켜지 못했습니다.");
  };

  const setPresentationMode = async (next: PresentationMode) => {
    next = next === "laser" ? "cursor" : next;
    const result = await window.motionAPI?.setPresentationMode(next);
    if (!result) {
      setMode(next);
      return;
    }
    if (result.ok) {
      setMode(result.mode);
      addLog(`${MODE_LABELS[result.mode]} MODE 전환`);
    } else {
      addLog(`모드 전환 실패 · ${result.error}`);
    }
  };

  const executeAction = async (action: PresentationAction) => {
    if (action === "resource-1" || action === "resource-2") {
      const resource = profile.resources.find((item) => item.id === action);
      if (!resource?.value) {
        addLog(`${ACTION_LABELS[action]} 실패 · 등록된 자료가 없습니다.`);
        return;
      }
      const result = await window.motionAPI?.openPresentationResource(resource);
      addLog(
        result?.ok
          ? `${resource.name} 열기 성공`
          : `${resource.name} 열기 실패 · ${result?.error ?? "Electron에서 실행하세요."}`,
      );
      return;
    }
    const result = await window.motionAPI?.executePresentationCommand(
      action,
      profile.app,
      profile.presentationUrl,
      profile.shortcuts[action],
    );
    addLog(
      result?.ok
        ? `${ACTION_LABELS[action]} 실행`
        : `${ACTION_LABELS[action]} 실패 · ${result?.error ?? "Electron에서 실행하세요."}`,
    );
  };

  const openResource = async (
    resource: PresentationProfile["resources"][number],
  ) => {
    if (!resource.value) {
      addLog(`${resource.name} 실패 · 등록된 자료가 없습니다.`);
      return;
    }
    const result = await window.motionAPI?.openPresentationResource(resource);
    addLog(
      result?.ok
        ? `${resource.name} 열기 성공`
        : `${resource.name} 열기 실패 · ${result?.error ?? "Electron에서 실행하세요."}`,
    );
  };

  const addResource = () => {
    const id = `resource-${Date.now()}`;
    updateProfile({
      ...profile,
      resources: [
        ...profile.resources,
        {
          id,
          name: `자료 ${profile.resources.length + 1}`,
          kind: "url",
          value: "",
        },
      ],
    });
    return id;
  };

  const setPresentationLink = async () => {
    const detected = detectWebPresentation(profile.presentationUrl);
    if (!detected) {
      setPresentationLinkStatus(
        "https://로 시작하는 올바른 링크를 입력하세요.",
      );
      return;
    }
    updateProfile({ ...profile, app: detected.app });
    const result = await window.motionAPI?.openPresentationUrl(
      profile.presentationUrl,
    );
    const message = result?.ok
      ? `${detected.label} 링크를 제어 대상으로 지정했습니다.`
      : `링크를 열지 못했습니다 · ${result?.error ?? "Electron에서 실행하세요."}`;
    setPresentationLinkStatus(message);
    addLog(message);
  };

  const startPresentationSession = async () => {
    const ready = await startCamera();
    if (!ready) return;
    await setPresentationMode("slide");
    if (profile.presentationUrl) {
      const result = await window.motionAPI?.openPresentationUrl(
        profile.presentationUrl,
      );
      if (!result?.ok) {
        addLog(`발표 링크 열기 실패 · ${result?.error}`);
        return;
      }
    }
    const enabled = await window.motionAPI?.setMotionEnabled(true);
    setMotionOn(Boolean(enabled));
    if (!enabled) {
      addLog("발표 제어는 Electron 앱에서 실행하세요.");
      return;
    }
    setSessionStartedAt((current) => current ?? Date.now());
    if (!sessionStartedAt) setSessionElapsed(0);
    addLog(sessionStartedAt ? "발표 세션 재개" : "발표 세션 시작");
  };

  const endPresentationSession = async () => {
    await stopCamera();
    setSessionStartedAt(null);
    addLog("발표 세션 종료");
  };

  const refreshSystemStatus = async () => {
    const [nextPermissions, displayInfo] = await Promise.all([
      window.motionAPI?.getPermissions(),
      window.motionAPI?.getDisplays(),
    ]);
    if (nextPermissions) setPermissions(nextPermissions);
    if (displayInfo) {
      setDisplays(displayInfo.displays);
      setSelectedDisplayId(
        displayInfo.selectedId ||
          displayInfo.displays.find((item) => item.primary)?.id ||
          displayInfo.displays[0]?.id ||
          "",
      );
    }
  };

  const handleGesture = (gesture: MotionGestureId) => {
    if (gesture === "toggle-motion") {
      void window.motionAPI?.toggleMotion().then((enabled) => {
        setMotionOn(enabled);
        addLog(`전화 모양 · 모션 ${enabled ? "ON" : "OFF"}`);
      });
      return;
    }
    if (!motionOn || mode !== "slide") return;
    if (gesture === "victory") {
      const available = profile.resources.filter((item) => item.value);
      if (!available.length) {
        addLog("자료 선택 실패 · 등록된 자료가 없습니다.");
        return;
      }
      const next = (selectedResourceIndex + 1) % available.length;
      setSelectedResourceIndex(next);
      addLog(`자료 선택 · ${available[next].name}`);
      return;
    }
    if (gesture === "index") {
      const available = profile.resources.filter((item) => item.value);
      const selected = available[selectedResourceIndex];
      if (!selected) {
        addLog("먼저 V 사인으로 실행할 자료를 선택하세요.");
        return;
      }
      void openResource(selected);
      return;
    }
    const action = FIXED_ACTIONS.find(
      (candidate) => profile.mappings[candidate] === gesture,
    );
    if (action) void executeAction(action);
  };

  useEffect(() => {
    const subscriptions: Array<void | (() => void)> = [];
    void window.motionAPI?.getMotionEnabled().then(setMotionOn);
    subscriptions.push(window.motionAPI?.onMotionChanged(setMotionOn));
    subscriptions.push(
      window.motionAPI?.onCameraChanged((enabled) => {
        if (enabled) return;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraState("idle");
      }),
    );
    void window.motionAPI?.getPresentationMode().then(setMode);
    subscriptions.push(window.motionAPI?.onPresentationModeChanged(setMode));
    subscriptions.push(
      window.motionAPI?.onPresentationActivity?.((activity) => {
        const action = activity.command as PresentationAction;
        const label = ACTION_LABELS[action] ?? activity.command;
        addLog(
          activity.ok
            ? `${label} 전달 완료`
            : `${label} 전달 실패 · ${activity.error ?? "알 수 없는 오류"}`,
        );
      }),
    );
    void window.motionAPI?.getCursorSensitivity().then(setCursorSensitivity);
    subscriptions.push(
      window.motionAPI?.onCursorSensitivityChanged(setCursorSensitivity),
    );
    const statusTimer = window.setTimeout(() => void refreshSystemStatus(), 0);
    return () => {
      window.clearTimeout(statusTimer);
      subscriptions.forEach((unsubscribe) => unsubscribe?.());
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("displayMode", displayMode);
    void window.motionAPI?.setOverlayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    if (!sessionStartedAt) return;
    const update = () =>
      setSessionElapsed(Math.floor((Date.now() - sessionStartedAt) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [sessionStartedAt]);

  useEffect(
    () => () => {
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const tracking = useHandTracking(
    videoRef,
    canvasRef,
    petCanvasRef,
    cameraState === "active",
    "#9fe9ff",
    handleGesture,
    (nextMode) => {
      if (motionOn && mode !== nextMode) void setPresentationMode(nextMode);
    },
    (point) => {
      if (motionOn && mode === "cursor") window.motionAPI?.moveCursor(point);
      if (motionOn && mode === "laser") window.motionAPI?.moveCursor(point);
    },
    () => {
      if (motionOn && mode !== "slide") {
        window.motionAPI?.clickCursor();
        addLog("왼손 펼치기 → 주먹 · 클릭");
      }
    },
    cursorSensitivity,
    () => {
      if (!motionOn) return;
      void window.motionAPI?.setMotionEnabled(false);
      setMotionOn(false);
      addLog("양손 주먹 · 긴급 정지");
    },
    (frame) => window.motionAPI?.sendHandOverlayFrame?.(frame),
  );
  const activeTracking = tracking;
  const selectedResource = profile.resources.filter((item) => item.value)[
    selectedResourceIndex
  ];

  return {
    profile,
    updateProfile,
    motionOn,
    mode,
    displayMode,
    changeDisplayMode,
    cameraView,
    changeCameraView,
    cursorSensitivity,
    setCursorSensitivity,
    slideNumber,
    setSlideNumber,
    cameraState,
    cameraError,
    presentationLinkStatus,
    sessionStartedAt,
    sessionElapsed,
    permissions,
    displays,
    selectedDisplayId,
    setSelectedDisplayId,
    logs,
    setLogs,
    addLog,
    startCamera,
    stopCamera,
    toggleMotion,
    executeAction,
    openResource,
    addResource,
    setPresentationLink,
    startPresentationSession,
    endPresentationSession,
    refreshSystemStatus,
    videoRef,
    canvasRef,
    activeTracking,
    selectedResource,
  };
}
export type PresentationController = ReturnType<
  typeof usePresentationController
>;
