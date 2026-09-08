# 모션 단축키

웹캠으로 한 손 동작을 인식해 macOS 기본 프로그램을 실행하는 Electron 기반 MVP입니다.

![MVP 파이프라인](public/assets/motion-shortcut-pipeline.png)

## 실행

```bash
npm install
npm run dev:electron
```

검증 명령은 `npm run lint`, `npm run test`, `npm run build`입니다.

## 현재 구현

- [x] React + TypeScript + Vite 기반
- [x] ESLint, Prettier, Vitest 설정
- [x] Electron 메인·프리로드 프로세스
- [x] macOS 기본 프로그램 허용 목록
- [x] 계산기·메모·Safari·캘린더 실행
- [x] 반응형 앱 실행 대시보드
- [x] 모션 인식 ON/OFF 상태
- [x] 사용 이력 표시와 삭제
- [x] 웹캠 권한 및 실시간 영상
- [x] MediaPipe 손 랜드마크와 점군 오버레이
- [x] 양손 추적과 손 팻 색상 설정
- [ ] 좌표 정규화와 궤적 버퍼
- [x] 기본 정적 제스처 4종 판정
- [x] 1.5초 유지시간·2.5초 쿨다운
- [x] 제스처와 앱 실행 명령 연결
- [ ] 모션 클릭과 Originkit 클릭 효과 연결 (후속)

## 기본 제스처 계획

| 제스처               | 구분       | 명령             |
| -------------------- | ---------- | ---------------- |
| 검지 하나            | 정적       | 계산기 열기      |
| V 사인               | 정적       | 메모 열기        |
| 손바닥 펼치기        | 정적       | Chrome 열기      |
| 주먹 쥐기            | 정적       | Spotlight 열기   |
| 엄지+새끼(전화 모양) | 정적 1.5초 | 모션 인식 ON/OFF |

## 처리 흐름

웹캠 → 손 랜드마크 → 좌표 정규화 → 제스처 후보 → 안전 게이트 → 명령 매핑 → Electron IPC → macOS 앱 실행 → 피드백·로그

카메라 프레임은 서버로 전송하거나 저장하지 않고 브라우저 안에서만 처리할 계획입니다.

Spotlight 실행은 macOS의 `⌘ Space` 입력을 사용하므로 시스템 설정의 개인정보 보호 및 보안 → 손쉬운 사용에서 Electron 권한이 필요합니다.
