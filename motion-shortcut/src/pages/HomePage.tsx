import type { PresentationController } from "../features/presentation/usePresentationController";
import { MODE_LABELS } from "../features/presentation/usePresentationController";
import { PresentationPreparation } from "../components/PresentationPreparation";

export function HomePage({
  controller: c,
}: {
  controller: PresentationController;
}) {
  const {
    videoRef,
    canvasRef,
    cameraState,
    cameraView,
    changeCameraView,
    cameraError,
    startCamera,
    activeTracking,
    mode,
    selectedResource,
    stopCamera,
    motionOn,
    toggleMotion,
    sessionStartedAt,
    sessionElapsed,
    startPresentationSession,
    endPresentationSession,
  } = c;
  const cameraStatus =
    cameraState === "active"
      ? "카메라 켜짐"
      : cameraState === "requesting"
        ? "카메라 연결 중"
        : cameraState === "error"
          ? "카메라 연결 오류"
          : "카메라 꺼짐";
  const elapsed = `${Math.floor(sessionElapsed / 60)
    .toString()
    .padStart(2, "0")}:${(sessionElapsed % 60).toString().padStart(2, "0")}`;
  return (
    <div className="home-workspace">
      <section
        className="camera-console home-console"
        aria-labelledby="control-center-title"
      >
        <div className="console-heading">
          <div className="console-title">
            <h2 id="control-center-title">발표 제어 센터</h2>
          </div>
          <span
            className={`camera-indicator ${cameraState}`}
            role="status"
            title={cameraStatus}
          >
            <span className="visually-hidden">{cameraStatus}</span>
          </span>
        </div>
        <div className="camera-preview-mat">
          <div
            className={`camera-stage ${cameraView === "hands" ? "hands-only" : ""}`}
          >
            <video ref={videoRef} muted playsInline />
            <canvas ref={canvasRef} aria-hidden="true" />
            {cameraState !== "active" && (
              <div className="camera-empty">
                <strong>발표자를 인식할 준비가 되었습니다</strong>
                <p>{cameraError || "카메라를 켜고 화면 중앙에 서 주세요."}</p>
              </div>
            )}
            {cameraState === "active" && (
              <div className="tracking-hud">
                <span>
                  {motionOn
                    ? MODE_LABELS[mode]
                    : sessionStartedAt
                      ? "모션 제어 정지"
                      : "모션 제어 대기"}
                </span>
                <b>
                  {activeTracking.modeGestureLabel
                    ? `${activeTracking.modeGestureLabel} 전환 준비`
                    : activeTracking.gestureLabel
                      ? `${activeTracking.gestureLabel} 감지`
                      : activeTracking.state === "tracking"
                        ? "손 추적 중"
                        : "손을 보여주세요"}
                </b>
                <em>{activeTracking.confidence}%</em>
              </div>
            )}
            {selectedResource && (
              <div className="resource-hud">
                <strong>{selectedResource.name}</strong>
                <span>검지를 잠깐 유지해 실행</span>
              </div>
            )}
          </div>
        </div>
        {activeTracking.errorMessage && (
          <p role="alert" className="camera-error">
            손 인식을 시작하지 못했습니다: {activeTracking.errorMessage}
          </p>
        )}
        <div className="home-console-toolbar">
          <div
            className="camera-view-options"
            role="group"
            aria-label="카메라 표시 방식"
          >
            <button
              type="button"
              disabled={cameraState !== "active"}
              aria-pressed={cameraView === "camera"}
              onClick={() => changeCameraView("camera")}
            >
              전체 화면
            </button>
            <button
              type="button"
              disabled={cameraState !== "active"}
              aria-pressed={cameraView === "hands"}
              onClick={() => changeCameraView("hands")}
            >
              손만 보기
            </button>
          </div>
          <button
            disabled={cameraState === "requesting"}
            onClick={() =>
              void (cameraState === "active" ? stopCamera() : startCamera())
            }
          >
            {cameraState === "active"
              ? "카메라 끄기"
              : cameraState === "requesting"
                ? "연결 중…"
                : "카메라 켜기"}
          </button>
          <button
            className="motion-toggle"
            aria-pressed={motionOn}
            disabled={cameraState !== "active"}
            title="카메라는 유지하고 손동작 명령 실행만 켜거나 끕니다."
            onClick={() => void toggleMotion()}
          >
            모션 {motionOn ? "ON" : "OFF"}
          </button>
          <div className="session-controls">
            <button
              className="session-button"
              disabled={cameraState === "requesting"}
              onClick={() =>
                void (sessionStartedAt && motionOn
                  ? endPresentationSession()
                  : startPresentationSession())
              }
            >
              {sessionStartedAt
                ? motionOn
                  ? `발표 종료 ${elapsed}`
                  : "발표 재개"
                : "발표 시작"}
            </button>
          </div>
        </div>
      </section>
      <PresentationPreparation controller={c} />
    </div>
  );
}
