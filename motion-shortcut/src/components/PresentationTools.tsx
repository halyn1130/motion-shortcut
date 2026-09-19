import { useState } from "react";
import type { PresentationController } from "../features/presentation/usePresentationController";

export function PresentationTools({
  controller: c,
}: {
  controller: PresentationController;
}) {
  const { slideNumber, setSlideNumber, profile, addLog } = c;
  const [status, setStatus] = useState("");
  const report = (message: string) => {
    setStatus(message);
    addLog(message);
  };
  const jump = async () => {
    const result = await window.motionAPI?.goToSlide(
      slideNumber,
      profile.app,
      profile.presentationUrl,
    );
    report(
      result?.ok
        ? `${slideNumber}번 슬라이드로 이동`
        : `슬라이드 이동 실패 · ${result?.error ?? "Electron 앱에서 실행하세요."}`,
    );
  };
  return (
    <details className="presentation-tools">
      <summary>발표 보조 제어</summary>
      <div className="presentation-tools-body">
        <div>
          <p id="slide-jump-help">
            원하는 슬라이드 번호로 바로 이동합니다. 발표 프로그램의 숫자 + Enter
            이동 방식을 사용하므로 해당 기능을 지원하는 발표 화면에서
            사용하세요.
          </p>
          <div className="slide-jump">
            <label>
              슬라이드 번호
              <input
                type="number"
                min="1"
                max="9999"
                aria-describedby="slide-jump-help"
                value={slideNumber}
                onChange={(e) => setSlideNumber(Number(e.target.value))}
              />
            </label>
            <button
              disabled={
                !c.isDesktop ||
                !Number.isInteger(slideNumber) ||
                slideNumber < 1 ||
                slideNumber > 9999
              }
              onClick={() => void jump()}
            >
              이동
            </button>
          </div>
        </div>
      </div>
      {status && (
        <p className="presentation-tools-status" role="status">
          {status}
        </p>
      )}
    </details>
  );
}
