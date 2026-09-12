import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  useHandTracking,
  type MotionGestureId,
} from "./features/camera/useHandTracking";
import {
  ACTION_LABELS,
  GESTURE_OPTIONS,
  type GesturePattern,
  type PresentationAction,
  type PresentationMode,
  type PresentationProfile,
  type TrackingFrameSample,
} from "./features/presentation/types";
import {
  analyzeRehearsal,
  conflictLevel,
  loadProfile,
  saveProfile,
} from "./features/presentation/profile";

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

const EDITABLE_ACTIONS: PresentationAction[] = [
  "next-slide",
  "previous-slide",
  "black-screen",
  "exit-presentation",
  "resource-1",
  "resource-2",
];

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rehearsalSamplesRef = useRef<TrackingFrameSample[]>([]);
  const rehearsalStartedAtRef = useRef(0);
  const lastSampleAtRef = useRef(0);

  const [profile, setProfile] = useState<PresentationProfile>(loadProfile);
  const [motionOn, setMotionOn] = useState(false);
  const [mode, setMode] = useState<PresentationMode>("slide");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => (localStorage.getItem("displayMode") as DisplayMode) || "camera",
  );
  const [cursorSensitivity, setCursorSensitivity] = useState(1);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [rehearsing, setRehearsing] = useState(false);
  const [rehearsalSeconds, setRehearsalSeconds] = useState(0);
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

  const toggleMotion = async () => {
    if (motionOn) {
      await window.motionAPI?.setMotionEnabled(false);
      setMotionOn(false);
      addLog("모션 OFF");
      return;
    }
    const cameraReady = await startCamera();
    if (!cameraReady) return;
    await window.motionAPI?.setMotionEnabled(true);
    setMotionOn(true);
    addLog("모션 ON");
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

  const cyclePresentationMode = async () => {
    const result = await window.motionAPI?.cyclePresentationMode();
    if (result?.ok) {
      setMode(result.mode);
      addLog(`양손 검지 X · ${MODE_LABELS[result.mode]} MODE`);
    } else if (result?.error) {
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
    const result = await window.motionAPI?.executePresentationCommand(action);
    addLog(
      result?.ok
        ? `${ACTION_LABELS[action]} 실행`
        : `${ACTION_LABELS[action]} 실패 · ${result?.error ?? "Electron에서 실행하세요."}`,
    );
  };

  const handleGesture = (gesture: MotionGestureId) => {
    if (gesture === "toggle-motion") {
      void window.motionAPI?.toggleMotion().then((enabled) => {
        setMotionOn(enabled);
        addLog(`전화 모양 · 모션 ${enabled ? "ON" : "OFF"}`);
      });
      return;
    }
    if (!motionOn || rehearsing || mode !== "slide") return;
    const action = EDITABLE_ACTIONS.find(
      (candidate) => profile.mappings[candidate] === gesture,
    );
    if (action) void executeAction(action);
  };

  const finishRehearsal = () => {
    const duration = performance.now() - rehearsalStartedAtRef.current;
    const baseline = analyzeRehearsal(rehearsalSamplesRef.current, duration);
    setRehearsing(false);
    if (!baseline) {
      addLog("리허설 분석 실패 · 화면에 손이 충분히 잡히지 않았습니다.");
      return;
    }
    updateProfile({ ...profile, rehearsal: baseline });
    addLog(
      `리허설 분석 완료 · ${baseline.frameCount}개 프레임, 주 사용 손 ${baseline.dominantHand}`,
    );
  };

  const startRehearsal = async () => {
    setDisplayMode("camera");
    const cameraReady = await startCamera();
    if (!cameraReady) return;
    rehearsalSamplesRef.current = [];
    rehearsalStartedAtRef.current = performance.now();
    lastSampleAtRef.current = 0;
    setRehearsalSeconds(0);
    setRehearsing(true);
    addLog("리허설 학습 시작 · 평소처럼 발표해 주세요.");
  };

  useEffect(() => {
    void window.motionAPI?.getMotionEnabled().then(setMotionOn);
    window.motionAPI?.onMotionChanged(setMotionOn);
    void window.motionAPI?.getPresentationMode().then(setMode);
    window.motionAPI?.onPresentationModeChanged(setMode);
    void window.motionAPI?.getCursorSensitivity().then(setCursorSensitivity);
    window.motionAPI?.onCursorSensitivityChanged(setCursorSensitivity);
  }, []);

  useEffect(() => {
    localStorage.setItem("displayMode", displayMode);
    void window.motionAPI?.setOverlayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    if (!rehearsing) return;
    const timer = window.setInterval(() => {
      const elapsed = Math.floor(
        (performance.now() - rehearsalStartedAtRef.current) / 1000,
      );
      setRehearsalSeconds(elapsed);
      if (elapsed >= 60) finishRehearsal();
    }, 250);
    return () => window.clearInterval(timer);
  });

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
    () => {
      if (motionOn) void cyclePresentationMode();
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
    undefined,
    undefined,
    undefined,
    (sample) => {
      if (!rehearsing || sample.timestamp - lastSampleAtRef.current < 80)
        return;
      lastSampleAtRef.current = sample.timestamp;
      rehearsalSamplesRef.current.push(sample);
    },
  );

  const riskSummary = useMemo(
    () =>
      EDITABLE_ACTIONS.map((action) => ({
        action,
        level: conflictLevel(profile.rehearsal, profile.mappings[action]),
      })),
    [profile],
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
                <h1>{rehearsing ? "리허설 학습 중" : "발표 제어 센터"}</h1>
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
              {rehearsing && (
                <div className="rehearsal-overlay">
                  <span>REHEARSAL CAPTURE</span>
                  <strong>
                    {String(rehearsalSeconds).padStart(2, "0")} / 60
                  </strong>
                  <p>평소 발표하듯 자연스럽게 손을 움직여 주세요.</p>
                </div>
              )}
            </div>
            <div className="console-actions">
              <button
                className={rehearsing ? "danger" : "primary"}
                onClick={() =>
                  rehearsing ? finishRehearsal() : void startRehearsal()
                }
              >
                {rehearsing ? "분석 완료" : "리허설 학습 시작"}
              </button>
              <button onClick={() => void cyclePresentationMode()}>
                모드 전환 테스트
              </button>
              <span>양손 검지 X를 2초 유지하면 모드가 전환됩니다.</span>
            </div>
          </article>

          <div className="dashboard-columns">
            <article className="control-panel">
              <SectionTitle index="04" title="모션 매핑" />
              <div className="mapping-list">
                {EDITABLE_ACTIONS.map((action) => {
                  const risk = riskSummary.find(
                    (item) => item.action === action,
                  )?.level;
                  return (
                    <div className="mapping-row" key={action}>
                      <span>{ACTION_LABELS[action]}</span>
                      <select
                        value={profile.mappings[action]}
                        onChange={(event) =>
                          updateProfile({
                            ...profile,
                            mappings: {
                              ...profile.mappings,
                              [action]: event.target.value as GesturePattern,
                            },
                          })
                        }
                      >
                        {GESTURE_OPTIONS.map((gesture) => (
                          <option value={gesture.id} key={gesture.id}>
                            {gesture.label}
                          </option>
                        ))}
                      </select>
                      <b className={`risk ${risk}`}>{risk}</b>
                      <button
                        aria-label={`${ACTION_LABELS[action]} 테스트`}
                        onClick={() => void executeAction(action)}
                      >
                        TEST
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="control-panel rehearsal-result">
              <SectionTitle index="05" title="개인 동작 분석" />
              {profile.rehearsal ? (
                <>
                  <div className="metric-grid">
                    <Metric
                      label="주 사용 손"
                      value={profile.rehearsal.dominantHand}
                    />
                    <Metric
                      label="분석 프레임"
                      value={String(profile.rehearsal.frameCount)}
                    />
                    <Metric
                      label="활동 폭"
                      value={`${Math.round((profile.rehearsal.activityBounds.maxX - profile.rehearsal.activityBounds.minX) * 100)}%`}
                    />
                    <Metric
                      label="평균 움직임"
                      value={profile.rehearsal.averageSpeed.toFixed(3)}
                    />
                  </div>
                  <div className="pose-bars">
                    {Object.entries(profile.rehearsal.poseFrequency).map(
                      ([pose, frequency]) => (
                        <div key={pose}>
                          <span>{pose}</span>
                          <i>
                            <b style={{ width: `${frequency * 100}%` }} />
                          </i>
                          <em>{Math.round(frequency * 100)}%</em>
                        </div>
                      ),
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-analysis">
                  <span>◇</span>
                  <strong>아직 개인 동작 데이터가 없습니다</strong>
                  <p>
                    리허설을 진행하면 자주 사용하는 몸짓과 충돌 위험을
                    분석합니다.
                  </p>
                </div>
              )}
            </article>
          </div>

          <article className="control-panel resource-panel">
            <SectionTitle index="06" title="발표 자료 슬롯" />
            <div className="resource-grid">
              {profile.resources.map((resource, index) => (
                <div className="resource-card" key={resource.id}>
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
                                kind: event.target.value as "url" | "file",
                                value: "",
                              }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="url">웹 링크</option>
                    <option value="file">로컬 파일</option>
                  </select>
                  <input
                    className="resource-path"
                    placeholder={
                      resource.kind === "url"
                        ? "https://example.com"
                        : "파일을 선택하세요"
                    }
                    readOnly={resource.kind === "file"}
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
                  {resource.kind === "file" && (
                    <button
                      onClick={() =>
                        void window.motionAPI
                          ?.pickPresentationFile()
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
                      파일 선택
                    </button>
                  )}
                </div>
              ))}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
