import { useState } from "react";
import type { PresentationController } from "../features/presentation/usePresentationController";
import { FIXED_ACTIONS } from "../features/presentation/usePresentationController";
import {
  ACTION_LABELS,
  GESTURE_OPTIONS,
  type KeyShortcut,
  type PresentationAction,
} from "../features/presentation/types";
import {
  DEFAULT_KEYS,
  formatShortcut,
  supportedKey,
} from "../features/presentation/shortcuts";
export function ShortcutSettings({
  controller: c,
}: {
  controller: PresentationController;
}) {
  const [recording, setRecording] = useState<PresentationAction | null>(null);
  const [message, setMessage] = useState("");
  return (
    <section className="control-panel">
      <h2>기본 모션 · 커스텀키</h2>
      <p>
        키 지정 버튼을 누르고 원하는 키 조합을 입력하세요. ⌘·⌃·⌥·⇧ 조합도 사용할
        수 있습니다. Tab은 다음 항목으로 이동합니다.
      </p>
      <div className="shortcut-list">
        {FIXED_ACTIONS.map((action) => {
          const shortcut = c.profile.shortcuts[action] ?? {
            key: DEFAULT_KEYS[action]!,
            modifiers: [],
          };
          return (
            <div className="shortcut-row" key={action}>
              <div>
                <strong>{ACTION_LABELS[action]}</strong>
                <span>
                  {
                    GESTURE_OPTIONS.find(
                      (item) => item.id === c.profile.mappings[action],
                    )?.label
                  }
                </span>
              </div>
              <button
                className={recording === action ? "recording" : ""}
                aria-label={`${ACTION_LABELS[action]} 키 지정`}
                aria-pressed={recording === action}
                onClick={() => {
                  setRecording(action);
                  setMessage("변경할 키 조합을 누르세요.");
                }}
                onBlur={() => setRecording(null)}
                onKeyDown={(event) => {
                  if (recording !== action || event.key === "Tab") return;
                  event.preventDefault();
                  event.stopPropagation();
                  const key =
                    event.key === " "
                      ? "Space"
                      : event.key.length === 1
                        ? event.key.toLowerCase()
                        : event.key;
                  if (["Meta", "Control", "Alt", "Shift"].includes(key)) return;
                  if (!supportedKey(key)) {
                    setMessage(
                      "영문·숫자·방향키·Space·Enter·Escape·Backspace를 사용하세요.",
                    );
                    return;
                  }
                  const modifiers: KeyShortcut["modifiers"] = [];
                  if (event.metaKey) modifiers.push("Meta");
                  if (event.ctrlKey) modifiers.push("Control");
                  if (event.altKey) modifiers.push("Alt");
                  if (event.shiftKey) modifiers.push("Shift");
                  c.updateProfile({
                    ...c.profile,
                    shortcuts: {
                      ...c.profile.shortcuts,
                      [action]: { key, modifiers },
                    },
                  });
                  setRecording(null);
                  setMessage(
                    `${ACTION_LABELS[action]}: ${formatShortcut({ key, modifiers })} 저장됨`,
                  );
                }}
              >
                {recording === action
                  ? "키 입력 대기…"
                  : formatShortcut(shortcut)}
              </button>
              <button
                aria-label={`${ACTION_LABELS[action]} 기본키 복원`}
                disabled={!c.profile.shortcuts[action]}
                onClick={() => {
                  const shortcuts = { ...c.profile.shortcuts };
                  delete shortcuts[action];
                  c.updateProfile({ ...c.profile, shortcuts });
                  setMessage("기본키로 복원했습니다.");
                }}
              >
                복원
              </button>
              <button
                aria-label={`${ACTION_LABELS[action]} 테스트`}
                onClick={() => void c.executeAction(action)}
              >
                테스트
              </button>
            </div>
          );
        })}
      </div>
      <p role="status" className="settings-message">
        {message ||
          "설정은 현재 발표 프로필에 자동 저장됩니다. 테스트는 실제 발표 앱에 입력을 전달합니다."}
      </p>
    </section>
  );
}
