import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  useHandTracking,
  type MotionGestureId,
} from "./features/camera/useHandTracking";

type AppId = "calculator" | "notes" | "chrome" | "spotlight";
type DisplayMode = "camera" | "person-pet" | "hand-pet";

const shortcuts: Array<{
  id: AppId;
  name: string;
  icon: string;
  gesture: string;
  detail: string;
}> = [
  {
    id: "calculator",
    name: "계산기",
    icon: "＋",
    gesture: "검지 하나",
    detail: "빠른 계산 시작",
  },
  {
    id: "notes",
    name: "메모",
    icon: "✎",
    gesture: "V 사인",
    detail: "새로운 생각 기록",
  },
  {
    id: "chrome",
    name: "Chrome",
    icon: "◎",
    gesture: "손바닥 펼치기",
    detail: "웹 브라우저 열기",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    icon: "⌕",
    gesture: "주먹 쥐기",
    detail: "빠른 검색 열기",
  },
];

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [motionOn, setMotionOn] = useState(false);
  const [cursorOn, setCursorOn] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => (localStorage.getItem("displayMode") as DisplayMode) || "camera",
  );
  const [handColor, setHandColor] = useState(
    () => localStorage.getItem("handColor") || "#65f6dc",
  );
  const [cameraState, setCameraState] = useState<
    "idle" | "requesting" | "active" | "error"
  >("idle");
  const [cameraError, setCameraError] = useState("");
  const [launching, setLaunching] = useState<AppId | null>(null);
  const [selected, setSelected] = useState<AppId>("calculator");
  const [logs, setLogs] = useState<string[]>(["앱 실행기가 준비되었습니다."]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((items) => [`${time} · ${message}`, ...items].slice(0, 8));
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
    setMotionOn(false);
    addLog("카메라 중지");
  };

  const startCamera = async () => {
    if (streamRef.current) {
      setMotionOn(true);
      return;
    }

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
      setMotionOn(true);
      addLog("카메라 연결 성공");
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "카메라 권한이 거부되었습니다. 시스템 설정에서 권한을 허용하세요."
          : "카메라를 찾거나 연결하지 못했습니다.";
      setCameraError(message);
      setCameraState("error");
      setMotionOn(false);
      addLog(`카메라 오류 · ${message}`);
    }
  };

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    void window.motionAPI?.setOverlayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    void window.motionAPI?.setOverlayColor(handColor);
  }, [handColor]);

  useEffect(() => {
    void window.motionAPI?.getMotionEnabled().then(setMotionOn);
    window.motionAPI?.onMotionChanged(setMotionOn);
    void window.motionAPI?.getCursorEnabled?.().then(setCursorOn);
    window.motionAPI?.onCursorChanged?.(setCursorOn);
  }, []);

  const toggleCursor = async () => {
    if (!window.motionAPI) return;
    const result = await window.motionAPI.toggleCursor();
    if (result.ok) {
      addLog(`양손 검지 X · 커서 제어 ${result.enabled ? "ON" : "OFF"}`);
    } else {
      addLog(`커서 제어 실패 · ${result.error}`);
    }
  };

  const launch = async (id: AppId) => {
    const target = shortcuts.find((item) => item.id === id)!;
    setLaunching(id);
    setSelected(id);

    if (!window.motionAPI) {
      addLog(`${target.name} 실행 미리보기 · Electron에서 실행하세요.`);
      setLaunching(null);
      return;
    }

    const result = await window.motionAPI.launchApp(id);
    addLog(
      result.ok ? `${result.appName} 실행 성공` : `실행 실패 · ${result.error}`,
    );
    setLaunching(null);
  };

  const tracking = useHandTracking(
    videoRef,
    canvasRef,
    petCanvasRef,
    cameraState === "active" && displayMode === "camera",
    handColor,
    (gesture: MotionGestureId) => {
      if (gesture === "toggle-motion") {
        void window.motionAPI
          ?.toggleMotion()
          .then((enabled) =>
            addLog(`전화 모양 · 모션 인식 ${enabled ? "ON" : "OFF"}`),
          );
      } else if (motionOn) {
        void launch(gesture);
      }
    },
    () => void toggleCursor(),
    (point) => window.motionAPI?.moveCursor(point),
    () => {
      window.motionAPI?.clickCursor();
      if (cursorOn) addLog("엄지·검지 집기 · 클릭");
    },
  );

  const changeDisplayMode = (mode: DisplayMode) => {
    setDisplayMode(mode);
    localStorage.setItem("displayMode", mode);
    void window.motionAPI?.setOverlayMode(mode);
    addLog(
      `표시 모드 변경 · ${mode === "camera" ? "카메라" : mode === "person-pet" ? "전신 팻" : "손 팻"}`,
    );
  };

  const activeShortcut = shortcuts.find((item) => item.id === selected)!;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">M</div>
        <div>
          <h1>모션 단축키</h1>
          <p>손짓으로 여는 나의 기본 프로그램</p>
        </div>
        <span className="platform">macOS MVP</span>
        <button
          className={`motion-toggle ${motionOn ? "on" : ""}`}
          aria-pressed={motionOn}
          onClick={() => {
            if (!motionOn && cameraState !== "active") {
              void startCamera();
              return;
            }
            void window.motionAPI?.setMotionEnabled(!motionOn);
            addLog(motionOn ? "모션 인식 OFF" : "모션 인식 ON");
          }}
        >
          <i />
          모션 {motionOn ? "ON" : "OFF"}
        </button>
        <button
          className={`motion-toggle cursor-toggle ${cursorOn ? "on" : ""}`}
          aria-pressed={cursorOn}
          onClick={() => void toggleCursor()}
        >
          <i />
          커서 {cursorOn ? "ON" : "OFF"}
        </button>
      </header>

      <nav className="mode-switcher" aria-label="카메라 표시 모드">
        <span>DISPLAY MODE</span>
        <button
          className={displayMode === "camera" ? "active" : ""}
          onClick={() => changeDisplayMode("camera")}
        >
          카메라
        </button>
        <button
          className={displayMode === "person-pet" ? "active" : ""}
          onClick={() => changeDisplayMode("person-pet")}
        >
          전신 팻
        </button>
        <button
          className={displayMode === "hand-pet" ? "active" : ""}
          onClick={() => changeDisplayMode("hand-pet")}
        >
          손 팻
        </button>
        <label className="color-control">
          손 색상
          <input
            type="color"
            value={handColor}
            onChange={(event) => {
              const color = event.target.value;
              setHandColor(color);
              localStorage.setItem("handColor", color);
              void window.motionAPI?.setOverlayColor(color);
            }}
          />
        </label>
      </nav>

      <section className="workspace">
        <article
          className={`panel camera ${displayMode !== "camera" ? "compact-camera" : ""}`}
        >
          <Heading
            eyebrow="CAMERA"
            title="실시간 모션"
            aside={
              cameraState === "active"
                ? "연결됨"
                : cameraState === "requesting"
                  ? "권한 확인 중"
                  : "연결 전"
            }
          />
          <div
            className={`camera-view ${cameraState === "active" ? "active" : ""}`}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="실시간 웹캠 영상"
            />
            <canvas
              ref={canvasRef}
              className="hand-canvas"
              aria-hidden="true"
            />
            {cameraState !== "active" && (
              <div className="camera-message">
                <span>✋</span>
                <strong>
                  {cameraState === "requesting"
                    ? "카메라 권한을 확인하세요"
                    : cameraState === "error"
                      ? "카메라 연결 실패"
                      : "웹캠을 연결해 주세요"}
                </strong>
                <p>
                  {cameraError ||
                    "영상은 기기 안에서만 처리되며 저장하거나 전송하지 않습니다."}
                </p>
                <button
                  disabled={cameraState === "requesting"}
                  onClick={() => void startCamera()}
                >
                  {cameraState === "requesting" ? "연결 중…" : "카메라 켜기"}
                </button>
              </div>
            )}
            {cameraState === "active" && (
              <div className="camera-overlay">
                <span>{motionOn ? "● 모션 인식 중" : "모션 일시정지"}</span>
                <button onClick={stopCamera}>카메라 끄기</button>
              </div>
            )}
            {tracking.state === "error" && (
              <div className="tracking-error">
                손 추적 오류 · {tracking.errorMessage}
              </div>
            )}
          </div>
          <div className="recognition">
            <span>
              {tracking.state === "tracking"
                ? tracking.gesture
                  ? `${tracking.gesture === "toggle-motion" ? "전화 모양" : tracking.gestureLabel} 유지 중`
                  : "손 추적 중"
                : tracking.state === "loading"
                  ? "모델 준비 중"
                  : tracking.state === "error"
                    ? "추적 오류"
                    : motionOn
                      ? "손을 보여주세요"
                      : "비활성"}
            </span>
            <div>
              <i style={{ width: `${tracking.confidence}%` }} />
            </div>
            <strong>{tracking.confidence}%</strong>
          </div>
          <div className="motion-examples" aria-label="모션 예시">
            <button className="cursor-example" aria-label="커서 제어 예시">
              <span>☝️×☝️</span>
              <strong>양손 검지 X 2초</strong>
              <small>커서 ON / OFF</small>
            </button>
            <button className="cursor-example" aria-label="커서 이동 예시">
              <span>✌️</span>
              <strong>두 손가락 붙이기</strong>
              <small>{cursorOn ? "커서 이동 중" : "커서 이동"}</small>
            </button>
            <button className="cursor-example" aria-label="커서 클릭 예시">
              <span>👌</span>
              <strong>중지 펴고 집기</strong>
              <small>한 번 클릭</small>
            </button>
            <button className="toggle-example" aria-label="모션 ON OFF 예시">
              <span>🤙</span>
              <strong>전화 모양 1.5초</strong>
              <small>모션 ON / OFF</small>
            </button>
            {shortcuts.map((item) => (
              <button
                key={item.id}
                className={selected === item.id ? "selected" : ""}
                aria-label={`${item.name} 모션 예시`}
                onClick={() => setSelected(item.id)}
              >
                <span>{item.icon}</span>
                <strong>{item.gesture}</strong>
                <small>{item.name} 열기</small>
              </button>
            ))}
          </div>
        </article>

        <section className="launcher-area">
          <div className="section-title">
            <div>
              <span className="eyebrow">APP SHORTCUTS</span>
              <h2>프로그램 실행</h2>
            </div>
            <p>카드를 눌러 명령 연결을 먼저 테스트하세요.</p>
          </div>
          <div className="shortcut-grid">
            {shortcuts.map((item) => (
              <button
                key={item.id}
                aria-label={`${item.name} 열기`}
                className={`shortcut ${selected === item.id ? "selected" : ""}`}
                onClick={() => void launch(item.id)}
              >
                <span className={`app-icon ${item.id}`}>{item.icon}</span>
                <span className="shortcut-copy">
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className="gesture">{item.gesture}</span>
                <span className="launch-status">
                  {launching === item.id ? "여는 중…" : "열기 ↗"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel mapping">
          <Heading
            eyebrow="SELECTED COMMAND"
            title={activeShortcut.name}
            aside="연결됨"
          />
          <div className="mapping-flow">
            <span>{activeShortcut.gesture}</span>
            <b>→</b>
            <span>{activeShortcut.name} 열기</span>
          </div>
          <p>
            제스처가 확정되면 Electron의 안전한 허용 목록을 통해 실행됩니다.
          </p>
        </aside>

        <aside className="panel log">
          <Heading eyebrow="ACTIVITY" title="실행 이력" aside="" />
          <button className="clear" onClick={() => setLogs([])}>
            지우기
          </button>
          <ul aria-live="polite">
            {logs.length ? (
              logs.map((item, index) => (
                <li key={`${item}-${index}`}>
                  <i />
                  {item}
                </li>
              ))
            ) : (
              <li>아직 기록이 없습니다.</li>
            )}
          </ul>
        </aside>
      </section>
    </main>
  );
}

function Heading({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: string;
  aside: string;
}) {
  return (
    <div className="heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {aside && <span className="badge">{aside}</span>}
    </div>
  );
}

export default App;
