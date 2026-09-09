import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  useHandTracking,
  type GestureId,
  type MotionGestureId,
} from "./features/camera/useHandTracking";

type DisplayMode = "camera" | "person-pet" | "hand-pet";
type AppMapping = {
  id: string;
  name: string;
  path: string;
  gesture: GestureId;
};
const MAPPINGS_KEY = "motion-app-mappings-v1";
const gestureOptions: Array<{ id: GestureId; label: string; icon: string }> = [
  { id: "index", label: "검지 하나", icon: "☝️" },
  { id: "victory", label: "V 사인", icon: "✌️" },
  { id: "three", label: "오른손 세 손가락", icon: "🖖" },
  { id: "open-palm", label: "손바닥 펼치기", icon: "🖐️" },
  { id: "fist", label: "주먹 쥐기", icon: "✊" },
  { id: "horns", label: "검지·새끼손가락", icon: "🤘" },
  { id: "thumb-up", label: "엄지 위로", icon: "👍" },
  { id: "l-shape", label: "L 모양", icon: "👆" },
  { id: "pinch", label: "핀치", icon: "🤏" },
  { id: "ok-sign", label: "OK 사인", icon: "👌" },
  { id: "tilt-left", label: "손바닥 왼쪽 기울이기", icon: "↙" },
  { id: "tilt-right", label: "손바닥 오른쪽 기울이기", icon: "↘" },
];

function loadMappings(): AppMapping[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MAPPINGS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [motionOn, setMotionOn] = useState(false);
  const [cursorOn, setCursorOn] = useState(false);
  const [cursorSensitivity, setCursorSensitivity] = useState(1);
  const [typingSensitivity, setTypingSensitivity] = useState(
    () => Number(localStorage.getItem("typingSensitivity")) || 0.35,
  );
  const [petScale, setPetScale] = useState(1);
  const [petEditing, setPetEditing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
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
  const [mappings, setMappings] = useState<AppMapping[]>(loadMappings);
  const [launching, setLaunching] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
    void window.motionAPI?.setTypingSensitivity?.(typingSensitivity);
  }, [typingSensitivity]);

  useEffect(() => {
    void window.motionAPI?.getMotionEnabled().then(setMotionOn);
    window.motionAPI?.onMotionChanged(setMotionOn);
    void window.motionAPI?.getCursorEnabled?.().then(setCursorOn);
    window.motionAPI?.onCursorChanged?.(setCursorOn);
    void window.motionAPI?.getCursorSensitivity?.().then(setCursorSensitivity);
    window.motionAPI?.onCursorSensitivityChanged?.(setCursorSensitivity);
    void window.motionAPI?.getKeyboardVisible?.().then(setKeyboardVisible);
    window.motionAPI?.onKeyboardChanged?.(setKeyboardVisible);
    window.motionAPI?.onTypingSensitivityChanged?.(setTypingSensitivity);
    void window.motionAPI?.getOverlayLayout?.().then(({ scale, editing }) => {
      setPetScale(scale);
      setPetEditing(editing);
    });
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

  const saveMappings = (next: AppMapping[]) => {
    setMappings(next);
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify(next));
  };

  const chooseApp = async () => {
    const chosen = await window.motionAPI?.chooseApp();
    if (!chosen) return;
    const used = new Set(mappings.map((mapping) => mapping.gesture));
    const gesture = gestureOptions.find((option) => !used.has(option.id))?.id;
    if (!gesture) {
      addLog("추가 실패 · 사용할 수 있는 모션이 없습니다.");
      return;
    }
    const mapping = { id: crypto.randomUUID(), ...chosen, gesture };
    saveMappings([...mappings, mapping]);
    setSelected(mapping.id);
  };

  const launch = async (target: AppMapping) => {
    setLaunching(target.id);
    setSelected(target.id);

    if (!window.motionAPI) {
      addLog(`${target.name} 실행 미리보기 · Electron에서 실행하세요.`);
      setLaunching(null);
      return;
    }

    const result = await window.motionAPI.launchCustomApp(target.path);
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
        const mapping = mappings.find((item) => item.gesture === gesture);
        if (mapping) void launch(mapping);
      }
    },
    () => void toggleCursor(),
    (point) => window.motionAPI?.moveCursor(point),
    () => {
      window.motionAPI?.clickCursor();
      if (cursorOn) addLog("왼손 펼치기 → 주먹 · 클릭");
    },
    cursorSensitivity,
    () => {
      void window.motionAPI
        ?.toggleKeyboard()
        .then((visible) =>
          addLog(`왼손 세 손가락 · 가상 키보드 ${visible ? "OPEN" : "CLOSE"}`),
        );
    },
    (sample) => {
      if (keyboardVisible) window.motionAPI?.sendKeyboardPointer(sample);
    },
    (hands) => {
      if (keyboardVisible) window.motionAPI?.sendKeyboardHands(hands);
    },
  );

  const changeDisplayMode = (mode: DisplayMode) => {
    if (mode === "camera" && petEditing) {
      setPetEditing(false);
      void window.motionAPI?.setOverlayEditing(false);
    }
    setDisplayMode(mode);
    localStorage.setItem("displayMode", mode);
    void window.motionAPI?.setOverlayMode(mode);
    addLog(
      `표시 모드 변경 · ${mode === "camera" ? "카메라" : mode === "person-pet" ? "전신 팻" : "손 팻"}`,
    );
  };

  const activeShortcut = mappings.find((item) => item.id === selected) ?? null;

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
        <label className="sensitivity-control">
          커서 감도
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
        <label className="sensitivity-control typing-sensitivity-control">
          타건 민감도
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={typingSensitivity}
            onChange={(event) => {
              const value = Number(event.target.value);
              setTypingSensitivity(value);
              localStorage.setItem("typingSensitivity", String(value));
            }}
          />
          <strong>{Math.round(typingSensitivity * 100)}%</strong>
        </label>
        {displayMode !== "camera" && (
          <>
            <label className="sensitivity-control pet-size-control">
              팻 크기
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.05"
                value={petScale}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setPetScale(value);
                  void window.motionAPI?.setOverlayScale(value);
                }}
              />
              <strong>{Math.round(petScale * 100)}%</strong>
            </label>
            <button
              className={petEditing ? "active" : ""}
              onClick={() => {
                const editing = !petEditing;
                setPetEditing(editing);
                void window.motionAPI?.setOverlayEditing(editing);
              }}
            >
              {petEditing ? "배치 완료" : "팻 위치 이동"}
            </button>
          </>
        )}
        <button
          className={keyboardVisible ? "active" : ""}
          onClick={() =>
            void window.motionAPI?.setKeyboardVisible(!keyboardVisible)
          }
        >
          키보드 {keyboardVisible ? "닫기" : "열기"}
        </button>
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
            <button className="cursor-example" aria-label="가상 키보드 예시">
              <span>🖖</span>
              <strong>왼손 세 손가락 1.5초</strong>
              <small>키보드 열기 / 닫기</small>
            </button>
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
              <span>🖐️→✊</span>
              <strong>왼손 펼쳤다 주먹</strong>
              <small>한 번 클릭</small>
            </button>
            <button className="toggle-example" aria-label="모션 ON OFF 예시">
              <span>🤙</span>
              <strong>전화 모양 1.5초</strong>
              <small>모션 ON / OFF</small>
            </button>
            {activeShortcut && (
              <button aria-label={`${activeShortcut.name} 모션 예시`}>
                <span>
                  {
                    gestureOptions.find(
                      (item) => item.id === activeShortcut.gesture,
                    )?.icon
                  }
                </span>
                <strong>
                  {
                    gestureOptions.find(
                      (item) => item.id === activeShortcut.gesture,
                    )?.label
                  }
                </strong>
                <small>{activeShortcut.name} 열기</small>
              </button>
            )}
          </div>
        </article>

        <section className="launcher-area">
          <div className="section-title">
            <div>
              <span className="eyebrow">APP SHORTCUTS</span>
              <h2>내 앱과 모션 연결</h2>
            </div>
            <button className="add-app-button" onClick={() => void chooseApp()}>
              + 실행할 앱 선택
            </button>
          </div>
          <div className="shortcut-grid">
            {!mappings.length && (
              <div className="empty-mappings">
                기본 연결은 없습니다. 앱을 선택하고 원하는 손모양을 연결하세요.
              </div>
            )}
            {mappings.map((item) => (
              <article
                key={item.id}
                className={`shortcut ${selected === item.id ? "selected" : ""}`}
                onClick={() => setSelected(item.id)}
              >
                <button
                  className="app-icon custom-app-icon"
                  aria-label={`${item.name} 열기`}
                  onClick={() => void launch(item)}
                >
                  ↗
                </button>
                <span className="shortcut-copy">
                  <strong>{item.name}</strong>
                  <small title={item.path}>{item.path}</small>
                </span>
                <select
                  className="gesture-select"
                  aria-label={`${item.name} 모션 선택`}
                  value={item.gesture}
                  onChange={(event) => {
                    const gesture = event.target.value as GestureId;
                    const duplicate = mappings.find(
                      (mapping) =>
                        mapping.id !== item.id && mapping.gesture === gesture,
                    );
                    if (duplicate) {
                      addLog(
                        `${gestureOptions.find((option) => option.id === gesture)?.label} · 이미 ${duplicate.name}에 연결됨`,
                      );
                      return;
                    }
                    saveMappings(
                      mappings.map((mapping) =>
                        mapping.id === item.id
                          ? { ...mapping, gesture }
                          : mapping,
                      ),
                    );
                  }}
                >
                  {gestureOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
                <span className="launch-status">
                  {launching === item.id ? "여는 중…" : "열기 ↗"}
                </span>
                <button
                  className="remove-mapping"
                  aria-label={`${item.name} 연결 삭제`}
                  onClick={() => {
                    saveMappings(
                      mappings.filter((mapping) => mapping.id !== item.id),
                    );
                    if (selected === item.id) setSelected(null);
                  }}
                >
                  삭제
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel mapping">
          <Heading
            eyebrow="SELECTED COMMAND"
            title={activeShortcut?.name ?? "연결을 선택하세요"}
            aside={activeShortcut ? "연결됨" : "비어 있음"}
          />
          {activeShortcut && (
            <div className="mapping-flow">
              <span>
                {
                  gestureOptions.find(
                    (item) => item.id === activeShortcut.gesture,
                  )?.label
                }
              </span>
              <b>→</b>
              <span>{activeShortcut.name} 열기</span>
            </div>
          )}
          <p>
            전화 모양과 양손 검지 X는 각각 모션과 커서 ON/OFF용으로 예약됩니다.
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
