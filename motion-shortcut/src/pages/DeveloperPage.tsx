import { useEffect, useState } from "react";
import type { PresentationController } from "../features/presentation/usePresentationController";
import { SectionTitle } from "../components/SectionTitle";
export function DeveloperPage({
  controller: c,
}: {
  controller: PresentationController;
}) {
  const [editing, setEditing] = useState(false);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    void window.motionAPI?.getOverlayLayout?.().then((layout) => {
      setEditing(layout.editing);
      setScale(layout.scale);
    });
    return () => {
      void window.motionAPI?.setOverlayEditing(false);
    };
  }, []);
  const {
    displayMode,
    changeDisplayMode,
    displays,
    selectedDisplayId,
    setSelectedDisplayId,
    cameraState,
    logs,
    setLogs,
  } = c;
  return (
    <div className="developer-grid">
      <section className="control-panel">
        <SectionTitle title="발표 화면의 손 추적" />
        <p>
          연결된 발표 화면에 손 추적 오버레이를 표시합니다. 표시를 꺼도 카메라와
          손동작 인식은 유지됩니다.
        </p>
        <button
          role="switch"
          aria-checked={displayMode !== "camera"}
          onClick={() =>
            void changeDisplayMode(
              displayMode === "camera" ? "hand-pet" : "camera",
            )
          }
        >
          손 추적 오버레이 {displayMode === "camera" ? "OFF" : "ON"}
        </button>
        <p className="muted">
          {cameraState === "active"
            ? "카메라가 연결되어 있습니다."
            : "홈에서 카메라를 켜면 추적을 시작합니다."}
        </p>
        <button
          disabled={displayMode === "camera"}
          aria-pressed={editing}
          onClick={() => {
            const next = !editing;
            setEditing(next);
            void window.motionAPI?.setOverlayEditing(next);
          }}
        >
          {editing ? "오버레이 위치 고정" : "오버레이 위치 조정"}
        </button>
        <label className="field">
          오버레이 크기
          <input
            aria-label="오버레이 크기"
            type="range"
            min="0.6"
            max="1.6"
            step="0.1"
            value={scale}
            onChange={(e) => {
              const value = Number(e.target.value);
              setScale(value);
              void window.motionAPI?.setOverlayScale(value);
            }}
          />
        </label>
        <SectionTitle index="03C" title="제어 모니터" />
        <select
          aria-label="제어 모니터"
          value={selectedDisplayId}
          onChange={(event) => {
            const id = event.target.value;
            setSelectedDisplayId(id);
            void window.motionAPI?.setDisplay(id);
          }}
        >
          {displays.map((display) => (
            <option key={display.id} value={display.id}>
              {display.label} {display.primary ? "(주 모니터)" : ""}
            </option>
          ))}
        </select>

        <p className="muted">
          시스템 포인터와 레이저 표시가 이동할 모니터입니다.
        </p>
      </section>
      <section className="control-panel">
        <div className="resource-heading">
          <SectionTitle title="실행 로그" />
          <button onClick={() => setLogs([])}>실행 이력 지우기</button>
        </div>
        {logs.length ? (
          <ol className="activity-list" aria-live="polite">
            {logs.map((log, index) => (
              <li key={`${log}-${index}`}>{log}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">아직 실행 이력이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
