export function GuidePage() {
  return (
    <div className="guide-page">
      <section className="control-panel">
        <h2>발표 준비</h2>
        <ol className="steps">
          <li>
            <strong>발표 프로필을 지정하세요.</strong>
            <p>
              홈에서 발표 프로그램을 고르고 웹 슬라이드는 링크를 입력합니다.
              발표 중 사용할 링크·파일·앱도 자료로 추가하세요.
            </p>
          </li>
          <li>
            <strong>권한과 카메라를 확인하세요.</strong>
            <p>
              설정에서 카메라와 손쉬운 사용 권한을 확인한 뒤 홈에서 카메라를
              켭니다.
            </p>
          </li>
          <li>
            <strong>발표를 시작하세요.</strong>
            <p>
              카메라 켜기는 영상과 손 추적을 시작하고, 발표 시작은 실제 손동작
              제어까지 켭니다. 발표 종료·카메라 끄기로 종료하거나, 모션 OFF
              버튼·양손 주먹으로 제어만 멈출 수 있습니다. 멈춘 발표는 발표 재개
              버튼으로 이어갑니다.
            </p>
          </li>
        </ol>
      </section>
      <section className="control-panel">
        <h2>손동작으로 모드 전환</h2>
        <dl className="gesture-guide">
          <div>
            <dt>슬라이드</dt>
            <dd>한 손의 검지·중지·약지를 펴거나 양손을 펼칩니다.</dd>
          </div>
          <div>
            <dt>포인터</dt>
            <dd>
              한 손으로 L 모양을 만듭니다. 기존 검지 X·뿔 모양·양손 V 동작도
              통합 포인터로 전환합니다.
            </dd>
          </div>
        </dl>
        <p>
          전환 동작을 약 0.7초 유지하세요. 현재 모드와 제어 상태는 카메라 화면
          안에 표시됩니다.
        </p>
        <h3>레이저 모양으로 이동하고 클릭</h3>
        <p>
          오른손 검지 또는 붙인 검지·중지로 이동하고, 왼손을 펼쳤다가 주먹을
          쥐어 클릭합니다. 레이저 표시와 실제 클릭 위치가 함께 움직입니다.
        </p>
      </section>
      <section className="control-panel">
        <h2>기본 모션과 자료 실행</h2>
        <dl className="gesture-guide">
          <div>
            <dt>다음 / 이전 슬라이드</dt>
            <dd>손바닥을 펴고 오른쪽 / 왼쪽으로 스와이프</dd>
          </div>
          <div>
            <dt>화면 가리기</dt>
            <dd>한 손바닥을 약 0.8초 펼치기</dd>
          </div>
          <div>
            <dt>발표 종료</dt>
            <dd>한 손 주먹을 약 1초 유지</dd>
          </div>
          <div>
            <dt>자료 선택 / 실행</dt>
            <dd>V 사인으로 선택하고 검지 하나로 실행, 각각 약 0.7초 유지</dd>
          </div>
          <div>
            <dt>모션 ON / OFF</dt>
            <dd>전화 모양을 약 1.2초 유지</dd>
          </div>
          <div>
            <dt>긴급 정지</dt>
            <dd>양손 주먹을 약 0.9초 유지</dd>
          </div>
        </dl>
        <p>
          설정의 커스텀키는 기본 모션이 전달할 키보드 입력을 바꿉니다. 자료
          선택과 긴급 정지 동작은 유지됩니다.
        </p>
      </section>
      <section className="control-panel">
        <h2>화면 공유와 실행 환경</h2>
        <p>
          실제 발표 앱 제어는 macOS용 Electron 앱에서 동작합니다. 웹
          미리보기에서는 화면 구성을 확인할 수 있습니다.
        </p>
        <p>
          별도 레이저·손 추적 오버레이를 청중에게 보여주려면 전체 화면을
          공유하세요. 창 하나만 공유할 때는 공유 서비스의 마우스 포인터 표시
          설정에 따라 보이는 결과가 달라집니다.
        </p>
        <p>
          카메라 영상은 로컬 모델로 처리합니다. 카메라를 끄면 영상 트랙과 모션
          제어도 종료됩니다.
        </p>
      </section>
    </div>
  );
}
