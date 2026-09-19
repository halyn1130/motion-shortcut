import type { PresentationController } from "../features/presentation/usePresentationController";
import { SectionTitle } from "../components/SectionTitle";

const implementation = [
  ["추가 자료", "URL 새 탭 열기", "파일·앱 유형과 자동 복귀 제거"],
  ["데모 덱 / PDF", "UI 준비", "유형 선택·파일명 표시만 제공"],
  ["모션 커스텀", "UI 미리보기", "선택값은 실제 인식 규칙에 미연결"],
  ["키보드 커스텀", "설정 저장", "키 지정·중복 확인·복원 / 실제 실행 미연결"],
  ["발표 뷰어", "미연결", "PDF 렌더링·새 발표 창 구현 제외"],
];
const cameraLabels = {
  idle: "꺼짐",
  requesting: "권한 요청 중",
  active: "켜짐",
  error: "연결 오류",
};

export function DeveloperPage({
  controller: c,
}: {
  controller: PresentationController;
}) {
  const { cameraState, logs, setLogs } = c;
  return (
    <div className="developer-grid">
      <section className="control-panel developer-controls">
        <SectionTitle title="웹 실행 상태" />
        <p className="muted">
          현재 브라우저의 상태입니다. 앱 전용 오버레이와 모니터 선택은 사용하지
          않습니다.
        </p>
        <dl className="web-runtime-list">
          <div>
            <dt>카메라 연결</dt>
            <dd>{cameraLabels[cameraState]}<span aria-hidden="true" className={`runtime-dot ${cameraState === "active" ? "is-on" : cameraState === "error" ? "is-error" : ""}`} /></dd>
          </div>
          <div>
            <dt>손 추적</dt>
            <dd>{cameraState !== "active" ? "대기" : c.activeTracking.state === "tracking" ? "추적 중" : "손을 보여주세요"}<span aria-hidden="true" className={`runtime-dot ${cameraState === "active" && c.activeTracking.state === "tracking" ? "is-on" : ""}`} /></dd>
          </div>
          <div>
            <dt>모션 제어</dt>
            <dd>{c.motionOn ? "ON" : "OFF"}<span aria-hidden="true" className={`runtime-dot ${c.motionOn ? "is-on" : ""}`} /></dd>
          </div>
          <div>
            <dt>카메라 표시</dt>
            <dd>{c.cameraView === "hands" ? "손만 보기" : "전체 화면"}</dd>
          </div>
        </dl>
        <a href="#/settings">입력 설정 확인 →</a>
        <div className="implementation-status">
          <SectionTitle title="현재 구현 범위" />
          <p className="muted">화면 구현과 실제 기능 연결을 구분합니다.</p>
          <dl>
            {implementation.map(([name, status, detail]) => (
              <div key={name}>
                <dt>
                  {name}
                  <span>{status}</span>
                </dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="control-panel developer-logs">
        <div className="resource-heading">
          <SectionTitle title="실행 로그" />
          <button className="button-quiet" disabled={!logs.length} onClick={() => setLogs([])}>
            실행 이력 지우기
          </button>
        </div>
        <p className="muted">
          이 화면에서 발생한 실행 이력입니다. 외부 사이트의 제어 성공 여부를
          뜻하지 않습니다.
        </p>
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
