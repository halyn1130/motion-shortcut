import { useEffect, useRef, type RefObject } from "react";
import type { PresentationController } from "../features/presentation/usePresentationController";

export function PointerTester({ controller: c, returnFocus }: { controller: PresentationController; returnFocus: RefObject<HTMLButtonElement | null> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(c.closePointerTest);
  useEffect(() => { close.current = c.closePointerTest; });
  useEffect(() => {
    const element = dialog.current!;
    const trigger = returnFocus.current;
    element.showModal();
    return () => {
      element.close();
      trigger?.focus();
      queueMicrotask(() => { if (!element.isConnected) close.current(); });
    };
  }, [returnFocus]);
  return <dialog
    ref={dialog}
    className="pointer-tester"
    aria-labelledby="pointer-tester-title"
    aria-describedby="pointer-tester-help"
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); c.closePointerTest(); }}
    onKeyDown={(event) => {
      if (event.key === "Escape" || event.key.toLowerCase() === "q") {
        event.preventDefault(); event.stopPropagation(); c.closePointerTest();
      }
    }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) c.closePointerTest();
    }}
  >
    <header className="pointer-tester-header">
      <h2 id="pointer-tester-title">포인터 감도 테스트</h2>
      <button type="button" className="pointer-tester-close" aria-label="포인터 테스터 닫기" onClick={c.closePointerTest} autoFocus>×</button>
    </header>
    <p id="pointer-tester-help">카메라에 손을 보여주고 검지를 움직여 보세요.</p>
    <div className="pointer-test-space" aria-label="포인터 이동 영역">
      <span className="pointer-test-cross" aria-hidden="true">+</span>
      {c.cameraState === "active" && !c.activeTracking.errorMessage && <span className="pointer-test-dot" style={{ left: `${c.testPointer.x * 100}%`, top: `${c.testPointer.y * 100}%` }} aria-label="테스트 포인터" />}
      {c.cameraState !== "active" && <div className="pointer-test-notice">
        <p role={c.cameraState === "error" ? "alert" : "status"}>{c.cameraState === "requesting" ? "카메라 권한을 허용해 주세요. 연결 중입니다…" : c.cameraError || "감도를 테스트하려면 카메라 접근을 허용해 주세요."}</p>
        {c.cameraState !== "requesting" && <button type="button" onClick={() => void c.startCamera()}>카메라 연결 다시 시도</button>}
        {c.cameraState === "error" && <small>{c.isDesktop ? "시스템 설정에서 앱의 카메라 권한을 허용한 뒤 다시 연결해 주세요." : "권한이 차단된 경우 브라우저의 사이트 설정에서 카메라를 허용해 주세요."}</small>}
      </div>}
      {c.activeTracking.errorMessage && <p role="alert" className="pointer-test-notice">손 인식을 시작하지 못했습니다: {c.activeTracking.errorMessage}</p>}
    </div>
    <div className="sensitivity-controls">
    <label className="range-control pointer-test-range">
      <span>감도</span>
      <input type="range" aria-label="테스터 포인터 감도" min="0.6" max="2" step="0.01" value={c.cursorSensitivity} onChange={(event) => {
        const value = Number(event.target.value);
        c.setCursorSensitivity(value);
        void window.motionAPI?.setCursorSensitivity(value);
      }} />
      <strong>{c.cursorSensitivity.toFixed(2)}×</strong>
    </label>
    <button type="button" onClick={() => {
      c.setCursorSensitivity(1);
      void window.motionAPI?.setCursorSensitivity(1);
    }}>초기화</button>
    </div>
    <p className="pointer-test-hint">× · 바깥 클릭 · Esc · Q로 닫기</p>
  </dialog>;
}
