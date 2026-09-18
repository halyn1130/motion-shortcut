import type { PresentationController } from "../features/presentation/usePresentationController";
import { SectionTitle } from "../components/SectionTitle";
import { ShortcutSettings } from "../components/ShortcutSettings";
export function SettingsPage({
  controller: c,
}: {
  controller: PresentationController;
}) {
  const {
    cursorSensitivity,
    setCursorSensitivity,
    permissions,
    refreshSystemStatus,
  } = c;
  return (
    <div className="settings-stack">
      <section className="control-panel">
        {" "}
        <SectionTitle index="SYS" title="권한 점검" />
        <div className="permission-list">
          {(
            [
              ["camera", "카메라"],
              ["accessibility", "손쉬운 사용"],
              ["screen", "화면 기록"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => void window.motionAPI?.openPermissionSettings(id)}
            >
              <span>{label}</span>
              <b className={permissions[id] === "granted" ? "ok" : "warn"}>
                {permissions[id] === "granted" ? "허용됨" : "확인 필요"}
              </b>
            </button>
          ))}
          <button onClick={() => void refreshSystemStatus()}>
            권한 상태 새로고침
          </button>
        </div>
      </section>
      <section className="control-panel">
        {" "}
        <SectionTitle index="03" title="포인터 감도" />
        <label className="range-control">
          <input
            type="range"
            aria-label="포인터 감도"
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
      </section>
      <ShortcutSettings controller={c} />
    </div>
  );
}
