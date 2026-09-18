import { useState } from "react";

const lessons = {
  slides: {
    label: "슬라이드 넘기기",
    mode: "슬라이드 모드",
    enter: "검지·중지·약지 세 손가락을 약 0.7초 펴세요.",
    actions: [
      ["다음 장", "손바닥을 펴고 오른쪽으로 스와이프", "→"],
      ["이전 장", "손바닥을 펴고 왼쪽으로 스와이프", "←"],
    ],
    note: "양손을 펼쳐도 슬라이드 모드로 전환됩니다.",
  },
  pointer: {
    label: "포인터로 클릭하기",
    mode: "포인터 모드",
    enter: "한 손으로 L 모양을 약 0.7초 유지하세요.",
    actions: [
      ["이동", "오른손 검지 또는 붙인 검지·중지를 움직이세요.", "↗"],
      ["클릭", "왼손을 펼쳤다가 주먹을 쥐세요.", "·"],
    ],
    note: "보라색 레이저 표시와 실제 클릭 위치가 함께 움직입니다.",
  },
  resources: {
    label: "추가 자료 열기",
    mode: "자료 선택과 실행",
    enter: "홈의 발표 준비에서 링크·파일·앱을 먼저 추가하세요.",
    actions: [
      ["자료 선택", "V 사인을 약 0.7초 유지하세요.", "01"],
      ["자료 실행", "검지 하나를 약 0.7초 유지하세요.", "02"],
    ],
    note: "자료를 연 뒤에는 발표 보조 제어의 ‘발표 화면 복귀’를 사용하세요.",
  },
} as const;
type Lesson = keyof typeof lessons;

export function GuidePage() {
  const [selected, setSelected] = useState<Lesson>("slides");
  const lesson = lessons[selected];
  return (
    <div className="guide-page guide-revised">
      <section
        className="control-panel guide-start"
        aria-labelledby="guide-start-title"
      >
        <h2 id="guide-start-title">처음이라면, 이 순서로</h2>
        <ol className="guide-start-steps">
          <li>
            <span aria-hidden="true">01</span>
            <div>
              <h3>발표 준비</h3>
              <p>홈에서 발표 프로그램과 자료를 연결하세요.</p>
              <a href="#/home">홈으로 이동 →</a>
            </div>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <div>
              <h3>권한 확인</h3>
              <p>카메라·손쉬운 사용 권한을 확인하세요.</p>
              <a href="#/settings">설정으로 이동 →</a>
            </div>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <div>
              <h3>카메라 켜고 시작</h3>
              <p>
                홈에서 카메라를 켠 뒤 <strong>발표 시작</strong>을 누르세요.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section
        className="control-panel guide-learn"
        aria-labelledby="guide-learn-title"
      >
        <div className="guide-learn-heading">
          <h2 id="guide-learn-title">어떤 동작이 필요한가요?</h2>
          <p>하나씩 골라 확인하세요.</p>
        </div>
        <div className="guide-choices" role="group" aria-label="배울 기능 선택">
          {Object.entries(lessons).map(([id, item]) => (
            <button
              key={id}
              aria-pressed={selected === id}
              aria-controls="guide-lesson"
              onClick={() => setSelected(id as Lesson)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          id="guide-lesson"
          className="guide-lesson"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="guide-mode">
            <span>먼저</span>
            <h3>{lesson.mode}</h3>
            <p>{lesson.enter}</p>
            <small>
              현재 모드와 제어 상태는 카메라 화면에서 확인할 수 있어요.
            </small>
          </div>
          <div className="guide-actions">
            <dl>
              {lesson.actions.map(([title, description, symbol]) => (
                <div key={title}>
                  <span className="guide-action-symbol" aria-hidden="true">
                    {symbol}
                  </span>
                  <div>
                    <dt>{title}</dt>
                    <dd>{description}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <p className="guide-note">{lesson.note}</p>
          </div>
        </div>
      </section>

      <aside className="guide-stop" aria-label="제어 멈추기">
        <strong>잠깐 멈추고 싶을 때</strong>
        <p>
          <b>모션 OFF</b>를 누르거나 <b>양손 주먹을 약 0.9초</b> 유지하세요.
          카메라는 켜둔 채 제어만 멈춥니다.
        </p>
      </aside>

      <section className="guide-details" aria-labelledby="guide-details-title">
        <h2 id="guide-details-title">필요할 때 찾아보기</h2>
        <details>
          <summary>다른 손동작과 커스텀키</summary>
          <div className="guide-detail-body">
            <dl className="guide-reference">
              <div>
                <dt>화면 가리기</dt>
                <dd>한 손바닥을 약 0.8초 펼치기</dd>
              </div>
              <div>
                <dt>발표 종료</dt>
                <dd>한 손 주먹을 약 1초 유지</dd>
              </div>
              <div>
                <dt>모션 ON / OFF</dt>
                <dd>전화 모양을 약 1.2초 유지</dd>
              </div>
              <div>
                <dt>다른 포인터 전환 동작</dt>
                <dd>검지 X·뿔 모양·양손 V도 통합 포인터로 전환합니다.</dd>
              </div>
            </dl>
            <p>
              설정의 커스텀키는 기본 모션이 전달할 키보드 입력을 바꿉니다. 자료
              선택과 긴급 정지 동작은 유지됩니다.
            </p>
          </div>
        </details>
        <details>
          <summary>카메라·모션·발표 시작은 어떻게 다른가요?</summary>
          <div className="guide-detail-body">
            <p>
              <strong>카메라 켜기</strong>는 영상과 손 추적을 시작합니다.{" "}
              <strong>발표 시작</strong>은 실제 손동작 제어까지 켭니다.
            </p>
            <p>
              <strong>모션 OFF</strong>는 제어만 멈춥니다. 멈춘 발표는{" "}
              <strong>발표 재개</strong>로 이어가세요. 세션을 끝내려면{" "}
              <strong>발표 종료</strong> 또는 <strong>카메라 끄기</strong>를
              사용하세요.
            </p>
            <p>
              카메라는 전체 화면·손만 보기 중 선택할 수 있고, 마지막 표시 방식을
              기억합니다.
            </p>
          </div>
        </details>
        <details>
          <summary>화면 공유와 실행 환경</summary>
          <div className="guide-detail-body">
            <p>
              실제 발표 앱 제어는 macOS용 Electron 앱에서 동작합니다. 웹
              미리보기에서는 화면 구성을 확인할 수 있습니다.
            </p>
            <p>
              레이저·손 추적 오버레이를 청중에게 보여주려면{" "}
              <strong>전체 화면을 공유</strong>하세요. 창 하나만 공유할 때는
              공유 서비스의 마우스 포인터 표시 설정에 따라 결과가 달라집니다.
            </p>
            <p>
              카메라 영상은 기기의 로컬 모델로 처리합니다. 카메라를 끄면 영상
              트랙과 모션 제어도 종료됩니다.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
