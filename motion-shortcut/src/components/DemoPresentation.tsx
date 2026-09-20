import { useEffect, useRef, useState } from "react";
import { usePresentationController } from "../features/presentation/usePresentationController";
import "./DemoPresentation.css";

const slides = [
  ["손끝으로 여는 발표", "오른쪽 스와이프로 다음 장, 왼쪽 스와이프로 이전 장으로 이동하세요."],
  ["발표의 흐름을 이어가세요", "손을 내리거나 자세를 바꾼 뒤 손바닥을 유지하면 검은 화면을 켜고 끕니다."],
  ["잠시 시선을 모으세요", "검은 화면에서도 다음·이전 명령을 실행하면 슬라이드가 다시 나타납니다."],
  ["포인터로 전달하세요", "포인터 테스트를 선택하고 검지로 이동하세요. 왼손을 펼친 뒤 주먹을 쥐면 클릭합니다."],
  ["이제 준비되었습니다", "양손 주먹을 유지하면 모션이 긴급 정지됩니다. 발표 종료로 창을 닫으세요."],
];

export function DemoPresentation() {
  const c = usePresentationController("demo");
  const stage = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const { executeAction, stopCamera, videoRef, canvasRef } = c;
  const actionRef = useRef(executeAction);
  const stopRef = useRef(stopCamera);
  useEffect(() => { actionRef.current = executeAction; stopRef.current = stopCamera; });
  const end = async () => {
    await stopRef.current();
    setEnded(true);
    window.close();
  };
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    const key = (e: KeyboardEvent) => {
      if ((e.target instanceof HTMLElement && e.target.closest("input, select, textarea, [contenteditable=true]")) || e.altKey || e.ctrlKey || e.metaKey) return;
      const action = e.key === "ArrowRight" || e.key === "ArrowDown" ? "next-slide" : e.key === "ArrowLeft" || e.key === "ArrowUp" ? "previous-slide" : null;
      if (action) { e.preventDefault(); void actionRef.current(action); }
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        for (let i = 0; i < 5; i++) void actionRef.current(e.key === "Home" ? "previous-slide" : "next-slide");
      }
    };
    const unload = () => { void stopRef.current(); };
    document.addEventListener("fullscreenchange", change);
    window.addEventListener("keydown", key);
    window.addEventListener("pagehide", unload);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      window.removeEventListener("keydown", key);
      window.removeEventListener("pagehide", unload);
    };
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
      setError("");
    } catch { setError("전체 화면을 시작하지 못했습니다. 브라우저의 전체 화면 권한을 확인하고 다시 시도하세요."); }
  };
  if (ended) return <main className="demo-ended">발표가 종료되었습니다. 이 창을 닫으세요.</main>;
  return <div ref={stage} className="demo-presentation">
    <div className="demo-media" aria-hidden="true"><video ref={videoRef} muted playsInline /><canvas ref={canvasRef} /></div>
    <main className={`demo-slide ${c.rehearsalBlack ? "is-black" : ""}`} aria-label="데모 슬라이드">
      {!c.rehearsalBlack && <>
        <small>ADAM · DEMO {c.rehearsalSlide}</small>
        <h1>{slides[c.rehearsalSlide - 1][0]}</h1>
        <p>{slides[c.rehearsalSlide - 1][1]}</p>
        {c.mode !== "slide" && <>
          <div className="demo-target">클릭 표적 · 성공 {c.rehearsalClicks}회</div>
          <span className="demo-pointer" style={{ left: `${c.rehearsalPointer.x * 100}%`, top: `${c.rehearsalPointer.y * 100}%` }} />
        </>}
      </>}
    </main>
    {(error || c.cameraError || c.activeTracking.errorMessage) && <p className="demo-error" role="alert">{error || c.cameraError || c.activeTracking.errorMessage}</p>}
    <footer className="demo-controls">
      <button onClick={() => void c.executeAction("previous-slide")}>이전</button>
      <span aria-live="polite">{c.rehearsalSlide} / 5</span>
      <button onClick={() => void c.executeAction("next-slide")}>다음</button>
      <button onClick={() => void toggleFullscreen()}>{fullscreen ? "전체 화면 종료" : "전체 화면"}</button>
      <button disabled={c.cameraState === "requesting"} onClick={() => void c.toggleMotion()}>{c.motionOn ? "모션 정지" : "모션 시작"}</button>
      <button disabled={c.cameraState === "idle"} onClick={() => void c.stopCamera()}>카메라 끄기</button>
      <button onClick={() => void c.setPresentationMode(c.mode === "slide" ? "cursor" : "slide")}>{c.mode === "slide" ? "포인터 테스트" : "슬라이드 모드"}</button>
      <button onClick={() => void c.executeAction("black-screen")}>{c.rehearsalBlack ? "화면 복원" : "검은 화면"}</button>
      <button onClick={() => void end()}>발표 종료</button>
      <p role="status">{c.cameraState === "requesting" ? "카메라 연결 중…" : c.motionOn ? "모션 인식 중 · 양손 주먹으로 긴급 정지" : "모션 정지됨"} · 방향키 / Home / End</p>
    </footer>
  </div>;
}
