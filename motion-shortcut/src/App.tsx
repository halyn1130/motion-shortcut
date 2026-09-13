import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  useHandTracking,
  type MotionGestureId,
} from "./features/camera/useHandTracking";
import {
  ACTION_LABELS,
  GESTURE_OPTIONS,
  type PresentationAction,
  type PresentationMode,
  type PresentationProfile,
} from "./features/presentation/types";
import { loadProfile, saveProfile } from "./features/presentation/profile";

type DisplayMode = "camera" | "person-pet" | "hand-pet";
type CameraState = "idle" | "requesting" | "active" | "error";

const MODE_LABELS: Record<PresentationMode, string> = {
  slide: "SLIDE",
  cursor: "CURSOR",
  laser: "LASER",
};

const APP_LABELS = {
  "google-slides": "Google Slides",
  powerpoint: "PowerPoint",
  keynote: "Keynote",
};

const FIXED_ACTIONS: PresentationAction[] = [
  "next-slide",
  "previous-slide",
  "black-screen",
  "exit-presentation",
];

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [profile, setProfile] = useState<PresentationProfile>(loadProfile);
  const [motionOn, setMotionOn] = useState(false);
  const [mode, setMode] = useState<PresentationMode>("slide");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => (localStorage.getItem("displayMode") as DisplayMode) || "camera",
  );
  const [cursorSensitivity, setCursorSensitivity] = useState(1);
  const [slideNumber, setSlideNumber] = useState(1);
  const [selectedResourceIndex, setSelectedResourceIndex] = useState(-1);
  const [laserSettings, setLaserSettings] = useState({
    color: "#9fe9ff",
    size: 24,
    trail: true,
    shareCompatible: false,
  });
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
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
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "시스템 설정에서 Flickey의 카메라 권한을 허용하세요."
          : "카메라를 연결하지 못했습니다.";
      setCameraError(message);
      setCameraState("error");
      addLog(`카메라 오류 · ${message}`);
      return false;
    }
  };

  const stopCamera = async () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    await window.motionAPI?.setCameraEnabled(false);
    setCameraState("idle");
    setMotionOn(false);
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

  const cyclePresentationMode = () => {
    const order: PresentationMode[] = ["slide", "cursor", "laser"];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    void setPresentationMode(next);
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
    void window.motionAPI?.getMotionEnabled().then(setMotionOn);
    window.motionAPI?.onMotionChanged(setMotionOn);
    window.motionAPI?.onCameraChanged((enabled) => {
      if (enabled) return;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraState("idle");
    });
    void window.motionAPI?.getPresentationMode().then(setMode);
    window.motionAPI?.onPresentationModeChanged(setMode);
    void window.motionAPI?.getCursorSensitivity().then(setCursorSensitivity);
    window.motionAPI?.onCursorSensitivityChanged(setCursorSensitivity);
    void window.motionAPI?.getLaserSettings?.().then(setLaserSettings);
    window.motionAPI?.onLaserSettingsChanged?.(setLaserSettings);
  }, []);

  useEffect(() => {
    localStorage.setItem("displayMode", displayMode);
    void window.motionAPI?.setOverlayMode(displayMode);
  }, [displayMode]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const tracking = useHandTracking(
    videoRef,
    canvasRef,
    petCanvasRef,
    cameraState === "active" && displayMode === "camera",
    "#9fe9ff",
    handleGesture,
    (nextMode) => {
      if (motionOn && mode !== nextMode) void setPresentationMode(nextMode);
    },
    (point) => {
      if (motionOn && mode === "cursor") window.motionAPI?.moveCursor(point);
      if (motionOn && mode === "laser") window.motionAPI?.moveLaser(point);
    },
    () => {
      if (motionOn && mode === "cursor") {
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
  );

  return (
    <main className="presenter-app">
      <header className="presenter-topbar">
        <img src="./assets/flickey-logo.png" alt="Flickey" />
        <div className="product-title">
          <span>PRESENTATION INTERFACE</span>
          <strong>{profile.name}</strong>
        </div>
        <div className="mode-tabs" aria-label="발표 모드">
          {(Object.keys(MODE_LABELS) as PresentationMode[]).map((item) => (
            <button
              key={item}
              className={mode === item ? "active" : ""}
              onClick={() => void setPresentationMode(item)}
            >
              {MODE_LABELS[item]}
            </button>
          ))}
        </div>
        <button
          className={`power-button ${motionOn ? "on" : ""}`}
          onClick={() => void toggleMotion()}
        >
          <i /> MOTION {motionOn ? "ON" : "OFF"}
        </button>
      </header>

      <section className="presenter-grid">
        <aside className="presenter-sidebar">
          <SectionTitle index="01" title="발표 프로필" />
          <label>
            프로필 이름
            <input
              value={profile.name}
              onChange={(event) =>
                updateProfile({ ...profile, name: event.target.value })
              }
            />
          </label>
          <label>
            발표 프로그램
            <select
              value={profile.app}
              onChange={(event) =>
                updateProfile({
                  ...profile,
                  app: event.target.value as PresentationProfile["app"],
                })
              }
            >
              {Object.entries(APP_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <SectionTitle index="02" title="표시 방식" />
          <div className="display-options">
            {(["camera", "person-pet", "hand-pet"] as DisplayMode[]).map(
              (item) => (
                <button
                  key={item}
                  className={displayMode === item ? "active" : ""}
                  onClick={() => setDisplayMode(item)}
                >
                  {item === "camera"
                    ? "카메라"
                    : item === "person-pet"
                      ? "전신 팻"
                      : "손 팻"}
                </button>
              ),
            )}
          </div>

          <SectionTitle index="03" title="포인터 감도" />
          <label className="range-control">
            <input
              type="range"
              min="0.6"
              max="2"
              step="0.1"
              value={cursorSensitivity}
              onChange={(event) => {
                const value = Number(event.target.value);
                setCursorSensitivity(value);
                void window.motionAPI?.setCursorSensitivity(value);
              }}
            />
            <strong>{cursorSensitivity.toFixed(1)}×</strong>
          </label>

          <SectionTitle index="03B" title="레이저 설정" />
          <label className="range-control">
            <input
              type="range"
              min="12"
              max="48"
              step="2"
              value={laserSettings.size}
              onChange={(event) =>
                void window.motionAPI?.setLaserSettings({
                  ...laserSettings,
                  size: Number(event.target.value),
                })
              }
            />
            <strong>{laserSettings.size}px</strong>
          </label>
          <div className="laser-options">
            <input
              type="color"
              aria-label="레이저 색상"
              value={laserSettings.color}
              onChange={(event) =>
                void window.motionAPI?.setLaserSettings({
                  ...laserSettings,
                  color: event.target.value,
                })
              }
            />
            <button
              className={laserSettings.trail ? "active" : ""}
              onClick={() =>
                void window.motionAPI?.setLaserSettings({
                  ...laserSettings,
                  trail: !laserSettings.trail,
                })
              }
            >
              잔상 {laserSettings.trail ? "ON" : "OFF"}
            </button>
            <button
              className={laserSettings.shareCompatible ? "active" : ""}
              onClick={() =>
                void window.motionAPI?.setLaserSettings({
                  ...laserSettings,
                  shareCompatible: !laserSettings.shareCompatible,
                })
              }
            >
              창 공유 호환 {laserSettings.shareCompatible ? "ON" : "OFF"}
            </button>
          </div>

          <div className="privacy-note">
            <i>●</i>
            영상은 기기 안에서만 처리되며 기본적으로 저장되지 않습니다.
          </div>
        </aside>

        <section className="presenter-main">
          <article className="camera-console">
            <div className="console-heading">
              <div>
                <span>LIVE TRACKING</span>
                <h1>발표 제어 센터</h1>
              </div>
              <div className={`live-state ${cameraState}`}>
                <i />
                {cameraState === "active" ? "CAMERA LIVE" : "CAMERA STANDBY"}
              </div>
            </div>
            <div className="camera-stage">
              <video ref={videoRef} muted playsInline />
              <canvas ref={canvasRef} aria-hidden="true" />
              {cameraState !== "active" && (
                <div className="camera-empty">
                  <span>◉</span>
                  <strong>발표자를 인식할 준비가 되었습니다</strong>
                  <p>{cameraError || "카메라를 켜고 화면 중앙에 서 주세요."}</p>
                  <button onClick={() => void startCamera()}>
                    카메라 켜기
                  </button>
                </div>
              )}
              {cameraState === "active" && (
                <div className="tracking-hud">
                  <span>{MODE_LABELS[mode]} MODE</span>
                  <b>
                    {tracking.gestureLabel
                      ? `${tracking.gestureLabel} 감지`
                      : tracking.state === "tracking"
                        ? "손 추적 중"
                        : "손을 보여주세요"}
                  </b>
                  <em>{tracking.confidence}%</em>
                </div>
              )}
            </div>
            <div className="console-actions">
              <button onClick={() => void cyclePresentationMode()}>
                모드 전환 테스트
              </button>
              {cameraState === "active" && (
                <button className="danger" onClick={() => void stopCamera()}>
                  카메라 끄기
                </button>
              )}
              <span>
                고정 모션을 바로 사용할 수 있습니다. 양손 펼치기·검지 X·V
                사인으로 원하는 모드를 직접 선택합니다.
              </span>
            </div>
          </article>

          <div className="dashboard-columns">
            <article className="control-panel">
              <SectionTitle index="04" title="기본 모션" />
              <div className="mapping-list">
                {FIXED_ACTIONS.map((action) => {
                  const gesture = GESTURE_OPTIONS.find(
                    (item) => item.id === profile.mappings[action],
                  );
                  return (
                    <div className="mapping-row fixed" key={action}>
                      <span>{ACTION_LABELS[action]}</span>
                      <strong>{gesture?.label}</strong>
                      <button
                        aria-label={`${ACTION_LABELS[action]} 테스트`}
                        onClick={() => void executeAction(action)}
                      >
                        TEST
                      </button>
                    </div>
                  );
                })}
                <div className="mapping-row fixed">
                  <span>다음 자료 선택</span>
                  <strong>V 사인</strong>
                  <i>ALL</i>
                </div>
                <div className="mapping-row fixed">
                  <span>선택 자료 실행</span>
                  <strong>검지 하나</strong>
                  <i>OPEN</i>
                </div>
              </div>
            </article>

            <article className="control-panel mode-guide">
              <SectionTitle index="05" title="모드 사용법" />
              <div className="guide-list">
                <div>
                  <b>SLIDE</b>
                  <span>양손 펼치기 · 슬라이드와 자료를 제어합니다.</span>
                </div>
                <div>
                  <b>CURSOR</b>
                  <span>
                    양손 검지 X · 오른손 이동, 왼손 펼침→주먹으로 클릭합니다.
                  </span>
                </div>
                <div>
                  <b>LASER</b>
                  <span>
                    양손 V · 오른손 검지로 백청색 레이저를 이동합니다.
                  </span>
                </div>
                <p>각 모션을 1.6초 유지하면 해당 모드로 바로 전환합니다.</p>
                <p className="emergency-guide">
                  양손 주먹을 1.2초 유지하면 모션을 즉시 긴급 정지합니다.
                </p>
              </div>
            </article>
          </div>

          <article className="control-panel resource-panel">
            <div className="resource-heading">
              <SectionTitle index="06" title="발표 자료 슬롯" />
              <button onClick={addResource}>+ 자료 추가</button>
            </div>
            <div className="resource-grid">
              {profile.resources.map((resource, index) => (
                <div
                  className={`resource-card ${profile.resources.filter((item) => item.value)[selectedResourceIndex]?.id === resource.id ? "selected" : ""}`}
                  key={resource.id}
                >
                  <div>
                    <span>RESOURCE 0{index + 1}</span>
                    <input
                      value={resource.name}
                      onChange={(event) =>
                        updateProfile({
                          ...profile,
                          resources: profile.resources.map((item) =>
                            item.id === resource.id
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <select
                    value={resource.kind}
                    onChange={(event) =>
                      updateProfile({
                        ...profile,
                        resources: profile.resources.map((item) =>
                          item.id === resource.id
                            ? {
                                ...item,
                                kind: event.target.value as
                                  "url" | "file" | "app",
                                value: "",
                              }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="url">웹 링크</option>
                    <option value="file">로컬 파일</option>
                    <option value="app">애플리케이션</option>
                  </select>
                  <input
                    className="resource-path"
                    placeholder={
                      resource.kind === "url"
                        ? "https://example.com"
                        : resource.kind === "app"
                          ? "애플리케이션을 선택하세요"
                          : "파일을 선택하세요"
                    }
                    readOnly={resource.kind !== "url"}
                    value={resource.value}
                    onChange={(event) =>
                      updateProfile({
                        ...profile,
                        resources: profile.resources.map((item) =>
                          item.id === resource.id
                            ? { ...item, value: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                  {resource.kind !== "url" && (
                    <button
                      onClick={() =>
                        void window.motionAPI
                          ?.pickPresentationFile(resource.kind === "app")
                          .then((value) => {
                            if (!value) return;
                            updateProfile({
                              ...profile,
                              resources: profile.resources.map((item) =>
                                item.id === resource.id
                                  ? { ...item, value }
                                  : item,
                              ),
                            });
                          })
                      }
                    >
                      {resource.kind === "app" ? "앱 선택" : "파일 선택"}
                    </button>
                  )}
                  <div className="resource-actions">
                    <button onClick={() => void openResource(resource)}>
                      TEST
                    </button>
                    {profile.resources.length > 2 && (
                      <button
                        onClick={() =>
                          updateProfile({
                            ...profile,
                            resources: profile.resources.filter(
                              (item) => item.id !== resource.id,
                            ),
                          })
                        }
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <label className="return-option">
                    <input
                      type="checkbox"
                      checked={Boolean(resource.returnAfterMs)}
                      onChange={(event) =>
                        updateProfile({
                          ...profile,
                          resources: profile.resources.map((item) =>
                            item.id === resource.id
                              ? {
                                  ...item,
                                  returnAfterMs: event.target.checked
                                    ? 5000
                                    : 0,
                                }
                              : item,
                          ),
                        })
                      }
                    />
                    5초 후 발표 화면 복귀
                  </label>
                </div>
              ))}
            </div>
            <div className="slide-jump">
              <label>
                슬라이드 번호
                <input
                  type="number"
                  min="1"
                  value={slideNumber}
                  onChange={(event) =>
                    setSlideNumber(Number(event.target.value))
                  }
                />
              </label>
              <button
                onClick={() =>
                  void window.motionAPI
                    ?.goToSlide(slideNumber, profile.app)
                    .then((result) =>
                      addLog(
                        result?.ok
                          ? `${slideNumber}번 슬라이드로 이동`
                          : `슬라이드 이동 실패 · ${result?.error}`,
                      ),
                    )
                }
              >
                이동
              </button>
              <button
                onClick={() =>
                  void window.motionAPI
                    ?.restorePresentation()
                    .then((result) =>
                      addLog(
                        result?.ok
                          ? "발표 화면으로 복귀"
                          : `복귀 실패 · ${result?.error}`,
                      ),
                    )
                }
              >
                발표 화면 복귀
              </button>
            </div>
          </article>
        </section>

        <aside className="activity-rail">
          <SectionTitle index="LIVE" title="실행 이력" />
          <div className="current-mode-card">
            <span>CURRENT MODE</span>
            <strong>{MODE_LABELS[mode]}</strong>
            <p>
              {mode === "slide"
                ? "슬라이드와 자료 모션이 활성화됩니다."
                : mode === "cursor"
                  ? "오른손으로 이동하고 왼손 주먹으로 클릭합니다."
                  : "오른손으로 백청색 레이저를 이동합니다."}
            </p>
          </div>
          <ul className="activity-list" aria-live="polite">
            {logs.map((log, index) => (
              <li key={`${log}-${index}`}>
                <i />
                <span>{log}</span>
              </li>
            ))}
          </ul>
          <button className="clear-log" onClick={() => setLogs([])}>
            실행 이력 지우기
          </button>
        </aside>
      </section>
    </main>
  );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <div className="section-heading">
      <span>{index}</span>
      <h2>{title}</h2>
    </div>
  );
}

export default App;
