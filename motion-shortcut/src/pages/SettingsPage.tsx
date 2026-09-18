import type { PresentationController } from "../features/presentation/usePresentationController";
import { SectionTitle } from "../components/SectionTitle";
import { ShortcutSettings } from "../components/ShortcutSettings";
const permissionLabels: Record<string, string> = {
  granted: "허용됨",
  "not-determined": "요청 전",
  denied: "거부됨 · 설정 확인",
  restricted: "시스템 제한",
  unsupported: "데스크톱 앱 전용",
  unknown: "상태 확인 불가",
};
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
        <p className="muted">
          {c.isDesktop
            ? "개발 실행 중이면 시스템 설정에 Electron으로 표시될 수 있습니다. 권한 변경 후 앱으로 돌아오면 자동 갱신됩니다."
            : "웹에서는 카메라 권한만 확인합니다. OS 손쉬운 사용·화면 기록 권한은 데스크톱 앱에서 관리합니다."}
        </p>
        {c.systemStatusError && <p role="status">{c.systemStatusError}</p>}
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
              disabled={!c.isDesktop && id !== "camera"}
              onClick={() => void c.requestPermission(id)}
            >
              <span>{label}</span>
              <b className={permissions[id] === "granted" ? "ok" : "warn"}>
                {permissionLabels[permissions[id]] ?? "상태 확인 불가"}
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
