import type { PresentationController } from "../features/presentation/usePresentationController";
const slides = [
  [
    "손으로 넘기는 발표",
    "손바닥을 펴고 오른쪽으로 움직여 다음 장으로 넘겨보세요.",
  ],
  ["흐름을 이어가세요", "왼쪽으로 움직이면 이전 장으로 돌아갑니다."],
  ["리허설 완료", "포인터 모드로 바꿔 중앙 표적을 클릭해보세요."],
];
export function WebRehearsal({
  controller: c,
}: {
  controller: PresentationController;
}) {
  return (
    <section
      className="control-panel web-rehearsal"
      aria-labelledby="rehearsal-title"
    >
      <h2 id="rehearsal-title">웹 리허설</h2>
      <p>
        외부 발표 자료 대신 사용하는 샘플입니다. 버튼은 바로 시험할 수 있고,
        손동작은 카메라와 모션을 켜면 적용됩니다.
      </p>
      <div className={`rehearsal-stage ${c.rehearsalBlack ? "is-black" : ""}`}>
        {c.rehearsalBlack ? (
          <p>화면 가림 · 아래 버튼으로 해제할 수 있습니다.</p>
        ) : c.mode === "slide" ? (
          <div>
            <small>샘플 {c.rehearsalSlide} / 3</small>
            <h3>{slides[c.rehearsalSlide - 1][0]}</h3>
            <p>{slides[c.rehearsalSlide - 1][1]}</p>
          </div>
        ) : (
          <>
            <div className="rehearsal-target">
              클릭 표적
              <br />
              성공 {c.rehearsalClicks}회
            </div>
            {c.motionOn && (
              <span
                className="rehearsal-pointer"
                style={{
                  left: `${c.rehearsalPointer.x * 100}%`,
                  top: `${c.rehearsalPointer.y * 100}%`,
                }}
                aria-hidden="true"
              />
            )}
          </>
        )}
      </div>
      <div className="rehearsal-buttons">
        <button
          onClick={() => void c.executeAction("previous-slide")}
          disabled={c.rehearsalSlide === 1}
        >
          샘플 이전 장
        </button>
        <button
          onClick={() => void c.executeAction("next-slide")}
          disabled={c.rehearsalSlide === 3}
        >
          샘플 다음 장
        </button>
        <button onClick={() => void c.executeAction("black-screen")}>
          {c.rehearsalBlack ? "샘플 화면 복원" : "샘플 화면 가리기"}
        </button>
      </div>
      <p role="status">{c.rehearsalMessage}</p>
    </section>
  );
}
