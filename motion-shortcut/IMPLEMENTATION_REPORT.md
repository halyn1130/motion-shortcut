# 네 페이지 재구성 구현 보고

## 추가 수정: 홈 레이아웃 정리 (2026-09-18)

### 진단과 반영

- 왼쪽 프로필 때문에 제어 센터가 오른쪽으로 밀림 → 제어 센터를 상단 중앙으로 이동.
- 프로필과 자료 관리가 분리됨 → 하단의 ‘발표 준비’ 영역으로 통합.
- 모든 자료의 입력 폼이 한꺼번에 표시되어 높이가 증가함 → 목록 + 선택한 자료 하나의 편집기로 변경.
- 홈 제목·설명과 카메라 안내가 높이를 차지함 → 중복 표시를 줄이고 발표 시작·카메라·슬라이드 제어를 센터에 모음.

### 주요 변경 파일

`src/pages/HomePage.tsx`, `src/components/PresentationPreparation.tsx`(추가), `src/App.tsx`, `src/App.css`, `src/features/presentation/usePresentationController.ts`(추가 자료 ID 반환), `src/App.test.tsx`(새 편집 방식에 맞춘 기존 검사), `README.md`.

### 실제 화면 검사

사용자가 실행한 로컬 개발 서버에서 브라우저 검증을 진행했습니다.

- 1440×900: 주요 제어·입력칸이 화면 안에 위치. 최하단 자료 제어 위치 약 846px.
- 1280×820: 주요 제어·입력칸이 화면 안에 위치. 최하단 자료 제어 위치 약 788px. 하단 안내 문구는 소량의 페이지 스크롤이 생길 수 있습니다.
- 자료 8개: 목록 높이 184px, 내부 내용 468px로 목록만 스크롤. 편집기는 하나이며 주요 제어 위치 유지.
- 모바일 390px·320px: 가로 넘침 없음. 자료 목록과 편집기를 세로로 표시.
- 자료 추가 후 이름 입력으로 포커스 이동, 이름·주소 수정 후 다른 자료로 전환해도 값 유지 확인.
- Tab으로 자료 유형 선택에 이동하고 2px 포커스 테두리가 표시됨을 확인.
- 테스트를 위해 생성한 자료는 검사 후 삭제했으며 기존 자료 두 개는 보존.
- 기존 대비 토큰을 유지했고 모바일·데스크톱 화면의 가독성을 확인.
- 정식 빌드·ESLint·Vitest 8개 통과.

카메라 표시 방식, 영상 요소 유지, 프로필·링크·자료 저장, 파일/앱 선택, 자료 열기·삭제·자동 복귀, 슬라이드 이동과 발표 세션은 유지했습니다. 이번 검증에서는 실제 카메라 권한을 켜거나 시스템 입력을 실행하지 않았습니다. 사업 정보 등 별도 입력이 필요한 새 항목은 없습니다.

## 추가 수정: 홈 카메라 표시 방식 복원

홈의 카메라 영역 위에 **전체 화면 / 손만 보기** 선택을 복원했습니다. 손만 보기는 카메라 영상의 표시만 숨기며, 기존 비디오 요소·스트림·손 추적을 유지합니다. 선택은 저장되고 개발 페이지의 외부 오버레이 상태와 별도로 동작합니다.

이번 추가 수정에서 설치된 의존성으로 **정식 빌드, ESLint, Vitest 8개, Electron 회귀 검사 8개가 모두 통과**했습니다. 테스트 코드의 잘못된 `exact` 옵션과 Vitest가 Node 전용 테스트를 함께 수집하던 설정을 수정했습니다. 아래의 패키지 설치·빌드 제한은 최초 작업 당시의 기록이며 이번 검증으로 해소되었습니다. 실제 카메라·브라우저 화면 실측 검증은 여전히 별도 확인이 필요합니다.

수정 파일: `src/pages/HomePage.tsx`, `src/features/presentation/usePresentationController.ts`, `src/App.css`, `src/App.test.tsx`, `vite.config.ts`, `README.md`.

## 결과와 위치

원본 `/Users/gabin/motion-shortcut/motion-shortcut/`은 수정하지 않았습니다. 원본 폴더가 이번 세션의 쓰기 허용 범위 밖이어서 별도 수정본을 만들었습니다.

수정본: `/Users/gabin/Documents/Codex/2026-09-17/new-chat/outputs/motion-shortcut/`

## 수정 전 진단

| 발견한 항목 | 이유 | 반영한 변경 |
| --- | --- | --- |
| 한 화면에 발표·설정·설명·로그 혼재 | 발표 중 사용하는 제어와 준비용 설정이 경쟁 | 홈·설정·가이드·개발로 분리 |
| 포인터와 레이저 모드 분리 | 이동·클릭·강조를 한 동작으로 쓰기 어려움 | 실제 포인터와 레이저 표시 통합 |
| 4번: 중첩 그림자 | 여러 패널을 비슷한 강도로 강조 | 평면 배경·구분선 중심으로 정리 |
| 10번 관련: 작은 영문 라벨·넓은 자간 반복 | 기능명·상태보다 장식 라벨이 많음 | 한글 제목과 시스템 한글 폰트 중심으로 정리 |

다른 디자인 패턴에 대한 전면 재설계나 임의의 후기·사업 정보·법률 문서 추가는 하지 않았습니다.

## 주요 변경 파일

- `src/App.tsx`: 네 페이지의 해시 경로, 공통 헤더, 현재 모드와 모션 상태, 페이지 이동 시 제목 포커스.
- `src/pages/HomePage.tsx`: 프로필·발표 링크·카메라·자료·슬라이드 이동.
- `src/pages/SettingsPage.tsx`, `src/components/ShortcutSettings.tsx`: 권한·감도·키 조합 지정과 기본키 복원.
- `src/pages/GuidePage.tsx`: 사용법과 실제 구현에 맞춘 유지시간·모드 안내.
- `src/pages/DeveloperPage.tsx`: 오버레이 표시·위치·크기, 모니터 선택, 로그.
- `src/features/presentation/usePresentationController.ts`: 페이지와 분리한 공통 상태와 명령. 홈의 영상 요소는 다른 페이지에서도 마운트·크기를 유지하여 인식을 계속 수행.
- `src/features/presentation/profile.ts`, `types.ts`, `shortcuts.ts`: 기존 프로필 보존, 커스텀키 저장·표시.
- `src/features/camera/useHandTracking.ts`: 카메라 추적 결과를 표시용 오버레이에 전달. MediaPipe는 카메라 시작 시 로드.
- `src/Overlay.tsx`: 별도의 카메라·인식·명령 실행을 제거하고 좌표 표시만 수행.
- `electron/main.cjs`: 오버레이 좌표 전달, 통합 포인터, 실제 클릭 좌표와 레이저 좌표 일치, 커스텀키 검증.
- `electron/preload.cjs`, `src/types/electron.d.ts`: IPC 연결·타입, 구독 정리 함수.
- `electron/cursor-helper.c`: macOS 수정키 조합 입력.
- `src/App.css`, `src/index.css`: 페이지 배치, 작은 화면용 배치, 대비·포커스·모션 감소 처리.

## 유지한 기능

프로필과 기존 자료, 웹 발표 링크 지정, 자료 추가·삭제·실행, 파일·앱 선택, 발표 화면 복귀, 특정 슬라이드 이동, 발표 세션·시간, 카메라 해제, 긴급 정지, 명령 중복 방지, 권한 점검, 제어 모니터 선택을 유지했습니다. 이전 레이저 전환 손동작도 통합 포인터로 연결합니다.

개발 페이지의 OFF는 **손 추적 오버레이 표시만** 끕니다. 카메라·손 인식·모션 제어는 유지됩니다.

## 확인한 결과

- **Electron 회귀 검사 8개 통과**: 오버레이와 카메라·모션 상태의 독립성, 좌표 전달 범위, 이전 레이저 모드 호환, 포인터·레이저 좌표 일치, 카메라 OFF 시 입력 차단, 조합키·쿨다운, 잘못된 키 차단, 기본키 호환. OS/Electron은 모의 객체를 사용하며 실제 시스템 입력은 발생시키지 않았습니다.
- **네이티브 C 입력 모듈 컴파일 통과**: macOS 프레임워크와 연결하여 빌드. 생성한 검사 바이너리는 실행하지 않았습니다.
- **네 페이지 React 서버 렌더링 통과**: 페이지 내용, 활성 내비게이션, 비활성 홈의 inert 처리 확인. 실제 브라우저 레이아웃 검증을 대신하지 않습니다.
- **기존 프로필 마이그레이션·조합키 저장 검사 통과**.
- **주요 대비 토큰 검사 통과**: 본문 15.86:1, 보조 글자 8.87:1, 입력 안내 8.91:1, 주요 버튼 12.80:1. 카메라 영상 위의 모든 상태·화면 전체를 측정한 결과는 아닙니다.
- **수정한 페이지·컴포넌트·컨트롤러의 로컬 ESLint 검사 통과**: 로컬에 설치된 호환 도구 사용.
- **별도 UI 번들 컴파일 통과**: 로컬 esbuild·React 사용, MediaPipe를 외부 의존성으로 남긴 검사 번들. 정식 프로덕션 빌드 성공을 의미하지 않습니다.

## 최신 홈 화면 변경과 검증 (2026-09-18)

- 상단 브랜드와 홈·설정·가이드·개발 내비게이션을 한 줄로 정리했습니다.
- 카메라 상태등을 발표 제어 센터 제목과 같은 줄의 오른쪽 끝으로 옮겼습니다. 상태별 색상, 툴팁, 스크린리더 설명을 제공합니다.
- 하단 왼쪽에 화면 표시·카메라·모션 ON/OFF, 오른쪽에 발표 시작·재개·종료 버튼을 배치했습니다.
- 카메라가 꺼져 있어도 표시 방식을 선택할 수 있습니다. 전체 화면이 기본이며 마지막 표시 방식을 재실행 후에도 기억합니다.
- 슬라이드 이동과 발표 화면 복귀는 기능 설명이 있는 접이식 발표 보조 제어로 이동했습니다. 기존 기능은 유지했습니다.
- 정식 npm run build, npm run lint, npm test(9개) 통과. 앞서 기록된 의존성 설치·정식 빌드 제한은 해소되었습니다.
- 실행 중인 localhost 앱의 1440×900 및 390×844 화면에서 가로 넘침 없음, 제목과 상태등 중심선 일치, 키보드로 보조 제어 열기·닫기 및 2px 포커스 표시를 확인했습니다.
- 실제 카메라와 발표 앱에 대한 OS 입력은 이번 UI 검증에서 실행하지 않았습니다. 실제 손동작·다중 모니터·발표 앱 제어는 기기에서 확인이 필요합니다.

## 사용자가 확인할 해석

커스텀키는 **기존 손동작이 실행할 키보드 단축키 변경**으로 구현했습니다. 손동작 종류를 새로 학습하거나 동작 자체를 바꾸는 설정은 포함하지 않았습니다.

## 후속 실행 체크

1. 수정본 폴더에서 `npm ci` 후 `npm run test:electron`, `npm test`, `npm run lint`, `npm run build` 실행.
2. `npm run dev:electron`으로 카메라를 켜고 홈→설정→가이드→개발 이동 중 카메라가 유지되는지 확인.
3. 개발에서 오버레이 ON/OFF 중 손동작 제어가 계속 작동하는지 확인.
4. L 모양으로 포인터 전환 후 레이저 중심과 실제 클릭 위치 일치 확인. 양손 주먹 긴급 정지 확인.
5. 커스텀키 지정·재실행·복원을 실제 발표 앱에서 확인.
6. 작은 화면과 200% 확대에서 가로 넘침·포커스·터치 영역 확인.

## 메뉴 정렬·카메라 비율 후속 조정

- App.css: 상단 메뉴 오른쪽 끝을 제어 센터 오른쪽 경계와 일치시켰습니다.
- 카메라 높이를 데스크톱 900px 높이 기준 279px에서 342px로 늘렸습니다. 작은 화면의 기존 반응형 배치와 기능은 유지합니다.
- 1440px 및 390px 화면에서 메뉴·제어 센터 오른쪽 좌표 일치와 가로 넘침 없음을 확인했습니다. 정식 빌드 통과. 색상·키보드 동작은 변경하지 않았습니다.

## Adam 브랜드·보라색 테마 (2026-09-18)

- 진단: 필기체 Flickey 로고와 청록색 중심 색상이 요청한 Adam 브랜드와 맞지 않아 변경. 기존 정보 배치와 기능은 유지.
- public/assets/adam-logo.svg: 열린 A와 손가락 선을 결합한 벡터 로고. adam-symbol.svg와 adam-logo-mono.svg도 제공. 파비콘 교체.
- App.tsx, index.html: Adam 이름, 한국어 문서 언어, 새 로고 적용.
- App.css, index.css: 네이비 #0e1020, 보라 #b794ff, 라벤더 흰색 #f2eefa 적용. 입력 경계 대비 보강. 보조 키보드 색상도 통일.
- Overlay, Laser, Keyboard, presentation controller: 손 추적·포인터 표시색 변경. electron/main.cjs는 이전 기본 청록 포인터만 새 기본 보라로 마이그레이션하고 사용자 지정색은 보존.
- scripts/package-mac.mjs: 다음 패키징의 앱 표시 이름을 Adam으로 변경. 번들 ID와 기존 프로필 저장 키 유지. 이번에는 앱 패키징을 실행하지 않음.
- 검증: 빌드·린트 통과, UI/로직 테스트 9개 및 Electron 모의 회귀 테스트 8개 통과. 1440px 데스크톱 메뉴 정렬, 모바일 390/320px 가로 넘침 없음, 네 페이지 이동, 2px 보라색 키보드 포커스 확인. 본문 대비 15.88:1, 보조문자 9.06:1, 주요 버튼 7.64:1.
- 실제 카메라 추적선·발표 앱 제어·패키지 아이콘은 직접 확인이 필요. SVG 로고는 웹 UI와 파비콘에 적용했으며 macOS Dock 아이콘 생성은 포함하지 않음.
- Git 저장소로 복사·커밋·push하지 않았음. 이번 작업은 outputs/motion-shortcut 수정본에만 적용.

## 반투명 패널과 보라색 조명 보완

- 진단: 불투명 패널, 버튼에 국한된 보라색, 패널과 입력칸의 질감 차이 부족.
- src/App.css: 배경의 고정 보라색 조명, 반투명 네이비 패널, 22px 배경 흐림, 얇은 반사 테두리 적용. 입력칸과 카메라 영상 배경은 어둡고 선명하게 유지.
- 기능·데이터·라우팅 변경 없음. 투명도 감소 설정과 backdrop-filter 미지원 환경의 불투명 대체 스타일 제공.
- 프로덕션 빌드 통과. 브라우저 데스크톱 1280px 및 모바일 390px에서 가로 넘침 없음, 설정/홈 이동과 키보드 포커스 2px 유지 확인. 실제 화면에서 글자 가독성 확인(반투명 배경의 모든 위치에 대한 대비 수치 측정은 아님).

## 설정 중앙 정렬
- App.tsx에 페이지별 CSS 클래스를 지정하고 App.css에서 설정 제목·패널 폭을 최대 1040px로 통일, 중앙 정렬. 기존 1000px 제한을 명시적으로 대체.
- 데스크톱 제목·패널 좌우 좌표 일치 및 중앙 정렬, 390px 모바일 가로 넘침 없음 확인. 기능과 색상·포커스 스타일은 유지. 빌드 통과.

## 보라색 선 아이콘 내비게이션
- App.tsx: 홈(집), 설정(톱니), 가이드(책), 개발(코드) SVG 아이콘 적용. 기존 href, aria-current 유지; aria-label로 메뉴 이름 보존.
- App.css: 보라색 선, 선택 밑줄, 마우스·키보드 포커스 시 이름 툴팁 제공. 최소 44px 클릭 폭.
- 빌드 및 테스트 9개 통과. 데스크톱 아이콘 확인, 키보드 Tab 포커스·툴팁 및 Enter 페이지 이동 확인. 모바일 320px에서 가로 넘침 없음과 각 링크 44px 폭 확인.

## 가이드 읽기 흐름과 상단 간소화
- GuidePage.tsx: 긴 설명 병렬 배치에서 시작 순서→선택형 동작 안내→정지 안내→접이식 상세 설명으로 개편. 기존 손동작/시간/공유 안내 보존. 홈·설정 바로가기 제공.
- App.tsx: 상단 슬로건 삭제. App.css: 로고 데스크톱 120px, 모바일 80px로 축소. 가이드 최대 1040px 중앙 정렬과 모바일 단일 열 배치.
- 검증: 빌드 및 테스트 9개 통과. 브라우저에서 포인터·자료 안내 전환, 키보드 Enter로 상세 설명 펼치기와 2px 포커스, 모바일 390px 가로 넘침 없음, 로고 크기 및 슬로건 제거 확인. 제어 로직 변경 없음.

## 개발 페이지 정렬 통일
- 진단: 넓은 2열 배치와 설정/로그 높이 불균형, 오버레이 조절 요소 분산.
- DeveloperPage.tsx, App.css: 1040px 중앙 정렬, 위쪽에 오버레이·모니터 설정, 아래쪽에 전체 폭 실행 로그. 로그는 최대 320px 내부 스크롤, 비어 있으면 지우기 비활성화. 오버레이 기능은 그대로 유지.
- 빌드·테스트 9개 통과. 데스크톱 제목/패널 기준선 일치, 모바일 390px 단일 열과 가로 넘침 없음, 슬라이더 키보드 포커스 2px 확인. 실제 모니터 선택·오버레이는 Electron에서 확인 필요.

## 서리 유리 질감 보완
- App.css: 넓은 보라색 번짐을 국소 조명으로 변경. 패널 배경 불투명도 약 52%, 배경 흐림 34px, 미세한 사선 반사와 밝고 어두운 가장자리로 두께 표현. 주요 버튼은 새틴 질감, 입력칸은 어두운 면으로 구분.
- 기능·배치 유지. 투명도 감소와 미지원 브라우저 대체 스타일 유지. 빌드 통과. 실제 데스크톱에서 표면과 글자 확인, 모바일 390px 가로 넘침 없음, 키보드 포커스 2px 및 카메라 불투명 배경 유지 확인. 전체 반투명 영역의 수치 대비 검사는 하지 않음.

## 마지막 스타일 변경 취소
- 사용자 요청으로 애플 데스크톱 스타일 CSS만 제거하고 직전의 서리 유리·보라색 조명 테마로 복원. 가이드·설정·개발 레이아웃과 로고·아이콘·기능은 유지.

## 강조 위계 정리
- 진단: 보라색 강조 중복, 모든 패널에 같은 유리 효과, 작은 로고의 복잡한 내부 선, 카메라 대기 안내의 과장된 문장.
- App.css: 제어 센터만 유리 질감 유지, 준비·설정·가이드·개발 패널은 차분한 불투명 면으로 구분. 배경 조명·선택 테두리 강조 축소. HomePage.tsx: 카메라 꺼짐·연결 중·오류 상태와 다음 행동을 간결하게 표시.
- adam-logo.svg, adam-symbol.svg, adam-logo-mono.svg, favicon.svg: 내부 선을 한 획으로 단순화.
- 기능·라우팅·자료 보존. 빌드 및 테스트 9개 통과. 실제 데스크톱에서 제어 센터 blur 34px, 준비·설정 패널 blur 없음 확인. 모바일 390px 가로 넘침 없음과 2px 키보드 포커스 확인. 실제 카메라 동작은 재실행하지 않음.

## 기능 피드백 대응 및 웹 리허설

### 확인한 원인
- 모션 ON/OFF: Electron API가 없는 웹에서 optional 호출 결과 undefined를 false로 처리하여 켜지지 않았음. 웹은 로컬 모션 상태를 사용하고 Electron은 기존 IPC를 유지.
- 모니터 목록: desktop screen API에만 연결되어 웹에서는 빈 선택창이 노출됨. 웹에서 데스크톱 전용 문구와 비활성 상태 제공. Electron에서 모니터 새로고침 제공.
- 권한: 최초/수동 조회만 있었고 focus 복귀 자동 조회 없음. 브라우저에서는 조회하지 않았으며 초기값을 실제 상태처럼 표시했음. 권한/모니터 조회를 Promise.allSettled로 분리하고 focus/visibility 복귀 갱신 추가.
- 권한 표시: 허용/요청 전/거부/시스템 제한/조회 불가/앱 전용으로 구분. Electron 카메라 미요청 상태는 askForMediaAccess로 요청. 개발 실행은 시스템 설정에서 Electron으로 표시될 수 있음을 안내.
- 수동 모드: 홈에 슬라이드/포인터·클릭 버튼 추가. 기존 레이저 표시와 마우스 클릭 통합 설계는 유지.

### 웹 리허설
- 자료 없이 웹 리허설 시작, 모션·카메라 동작, 3장 샘플 슬라이드, 화면 가리기, 포인터 좌표/중앙 표적 클릭 성공 표시.
- 실제 손동작 콜백과 샘플 제어 연결. 버튼은 카메라 없이 시연 가능. 손동작에는 카메라 권한 및 지원 브라우저 필요.
- 링크 열기는 사용자 클릭에서 새 탭 요청. http/https 검사, noopener/noreferrer 적용, 팝업 차단 안내. 링크가 열렸다는 확정이나 외부 제어 가능성을 주장하지 않음.
- 웹에서는 외부 사이트/다른 탭/OS 마우스를 제어하지 않음. 별도 오버레이, 모니터 선택, 파일/앱 실행, 발표 복귀는 데스크톱 전용. 웹 리허설은 업로드 자료 뷰어가 아닌 샘플 시연임.
- 설정의 테스트 버튼은 웹에서는 샘플에만 반영. 커스텀키를 OS에 보내는 검증은 Electron에서 수행.

### 변경 파일
- usePresentationController.ts: 실행 환경 분리, 권한 갱신, 웹 상태와 리허설 제어.
- SettingsPage/DeveloperPage/HomePage/GuidePage, PresentationPreparation/PresentationTools/ShortcutSettings: 기능 범위/상태/버튼 표시.
- WebRehearsal.tsx: 웹 샘플 리허설 화면. App.css: 리허설과 모드 선택 반응형 배치.
- electron/main.cjs: 미요청 카메라 권한의 명시적 요청.
- runtime.test.tsx 및 electron-regression.test.cjs: 웹 토글/세션/제스처 차단/클릭 표적/링크 검증/권한 갱신/조회 실패 격리/이벤트 정리/카메라 요청/모니터 조회 검사.

### 검증과 남은 확인
- npm run build, npm run lint 통과. Vitest 14개 + Electron 모의 검사 10개 통과.
- 브라우저에서 샘플 다음 장/가림/복원/포인터 선택, 카메라 요청 전 표시, 앱 전용 권한/모니터/오버레이 비활성 상태 확인. 모바일 390px 가로 넘침 없음.
- 실제 카메라를 켜거나 OS 입력/권한 변경을 수행하지 않았음. 물리 손동작, 실제 macOS 권한 갱신, 실제 다중 모니터는 기기에서 검증 필요.
- Electron 변경은 앱 재시작 필요. HTTPS 웹 배포와 제출 URL 연결은 아직 하지 않았음. 모델/WASM 정적 자산이 포함된 dist를 배포해야 함.
- Git 저장소 복사/커밋/push는 하지 않았고 outputs/motion-shortcut에만 반영.

참고: https://www.electronjs.org/docs/latest/api/system-preferences
참고: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy


## 2026-09-18 Adam dark instrument design study
- Diagnosis: soft glass treatment, repeated rounded corners, and an empty camera standby area weakened the requested technical identity.
- App.css: charcoal surfaces, precise borders, small corner radii, restrained purple controls, and an enlarged blurred A background.
- HomePage.tsx + public/assets/adam-hand-field.svg: decorative line/joint/particle hand artwork appears only while the camera is inactive. No fabricated live telemetry.
- Existing routes, camera/video refs, gesture logic, permissions, profile data, resources and web rehearsal are unchanged. Static artwork adds no continuous animation. Focus-visible includes summary controls; reduced-transparency hides the background symbol.
- Validation: TypeScript/Vite build, ESLint and 14 tests passed. Desktop/mobile visual verification, actual focus/contrast and physical camera verification remain pending: localhost server is off and this environment cannot bind a local port (EPERM).


## Home rehearsal removal and stronger Adam mark
- Removed WebRehearsal rendering from HomePage; browser session button now says 모션 시작/재개/종료. Underlying controller retained; Electron commands unchanged.
- Rebuilt logo, monochrome logo, symbol and favicon as bold solid angular vectors. Background A uses the same symbol.
- Removed obsolete rehearsal instructions from PresentationTools and ShortcutSettings; actual key tests explicitly desktop-only. Updated App test label.
- Verified desktop and 390px mobile home: no horizontal overflow, rehearsal absent, navigation and manual mode buttons work, keyboard focus outline visible. Visually checked logo contrast. Physical camera/OS control not exercised.
- Build, lint and all 14 tests passed.

- Follow-up: removed the manual control-mode button group and description from HomePage at user request; gesture-driven mode switching remains unchanged. Build and 14 tests passed.

- Restored session labels to 발표 시작/재개/종료 in both runtimes; camera-adjacent motion ON/OFF and session handlers unchanged. Build and 14 tests passed.

## Selected concept 02 / glass background
- Replaced header logo, monochrome logo, symbol and favicon with a vector interpretation of the selected hand/A design.
- Added public/assets/adam-glass-symbol.png: generated 3D glass artwork without lettering. App.css uses it without blur, with responsive sizing and edge masking; decorative and pointer-events:none.
- No control logic or routing changed. Build/lint passed. Desktop inspected; mobile DOM verified no horizontal overflow (390px viewport). Camera/OS actions not retested.

- Header correction: replaced simplified SVG with reference-derived concept-02 horizontal artwork (adam-header-02.png), enlarged to 156px desktop / 105px mobile so fingers remain readable. App.tsx and App.css updated; functions unchanged. Build passed and desktop rendering inspected.

- Header layout corrected to selected stacked concept: hand A above ADAM, replacing horizontal lockup. App.tsx/App.css and adam-header-stacked-02.png changed; 3D background untouched. Build passed.

- Added fine static monochrome grain and a light matte film over background glass only (App.css + adam-grain.svg). Content remains above film; pointer-events:none; reduced-transparency disables film. Build passed. Desktop visual, 390px horizontal overflow, navigation, keyboard focus verified. No functional code changes.

- Header nav aligned to right edge by removing console-width padding. Home adds disabled 기능 테스트 placeholder after view controls, with accessible 준비 중 label. Status dots now have bright cores and distinct purple/yellow/red halos; OFF remains neutral. App.css/HomePage only; build and 14 tests passed. Browser confirmed header right gap 0 and disabled placeholder; hardware states not triggered.

- Background clipped below navigation (101px desktop, 77px mobile). Frosting softened per reference, then partially reduced per feedback: 7px desktop / 5px mobile blur with increased brightness and opacity. Grain remains. CSS-only, existing functions unchanged. Build passed; browser verified desktop clipping and mobile header/clip boundary match with no horizontal overflow.

- Compact header: 72px desktop / 64px mobile, stacked logo 68px / 60px. Grain film now extends across header while glass A stays clipped beneath its boundary. App.css only; functions unchanged. Build passed, desktop visual and mobile dimensions/overflow verified.
