import { useEffect, useRef, useState } from "react";
import "./PreparationDemo.css";

export function PreparationDemo({ variant = "preparation" }: { variant?: "preparation" | "settings" | "status" }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && !document.hidden), { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    const visibility = () => {
      if (document.hidden) setVisible(false);
      else if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setVisible(rect.bottom > 0 && rect.top < window.innerHeight);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return (
    <figure ref={ref} className={`prep-demo ${!visible ? "is-paused" : ""} ${reduced ? "is-static" : ""}`}>
      {variant === "preparation" ? <div className="prep-demo-scene" role="img" aria-label="사용 흐름 시연: 데모 덱을 선택하고 발표 시작으로 별도 발표 창을 엽니다.">
        <div className="prep-demo-top" aria-hidden="true"><span>자료 선택</span><span>DEMO</span></div>
        <div className="prep-demo-drop" aria-hidden="true">
          <span className="prep-demo-hint">데모 덱으로 연습</span>
          <span className="prep-demo-ready"><span>✓</span> 데모 슬라이드 5장</span>
        </div>
        <div className="prep-demo-file" aria-hidden="true"><svg viewBox="0 0 32 40" fill="none"><path d="M5 1h15l7 7v31H5z" fill="#30233f" stroke="#c49bf2"/><path d="M20 1v8h7" stroke="#c49bf2"/></svg><span>DEMO</span></div>
        <span className="prep-demo-start" aria-hidden="true">발표 시작 <span>↗</span></span>
        <svg className="prep-demo-cursor" aria-hidden="true" viewBox="0 0 24 28"><path d="M3 2v21l6-6 4 9 4-2-4-8h8Z" fill="#eee3ff" stroke="#17111f" strokeWidth="1.5"/></svg>
      </div> : variant === "settings" ? (
        <div className="prep-demo-scene settings-demo" role="img" aria-label="포인터 감도를 조절하고 다음 슬라이드의 키보드 단축키를 선택하는 예시">
          <div className="prep-demo-top" aria-hidden="true"><span>입력 설정</span><span>커스텀</span></div>
          <div className="demo-sensitivity" aria-hidden="true"><span>포인터 감도</span><div className="demo-track"><i /></div></div>
          <div className="demo-key-row" aria-hidden="true"><span>다음 슬라이드</span><span className="demo-key">→</span></div>
        </div>
      ) : (
        <div className="prep-demo-scene status-demo" role="img" aria-label="카메라 연결, 손 추적, 모션 제어 상태를 순서대로 확인하는 예시">
          <div className="prep-demo-top" aria-hidden="true"><span>실행 상태</span><span>LIVE</span></div>
          <div className="demo-status-list" aria-hidden="true">
            <div><span>카메라 연결</span><i /></div>
            <div><span>손 추적</span><i /></div>
            <div><span>모션 제어</span><i /></div>
          </div>
        </div>
      )}
    </figure>
  );
}
