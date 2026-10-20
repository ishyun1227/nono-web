# NONO — 노노그램 웹사이트

간소화한 NONO 웹 버전의 첫 공개 배포용 저장소입니다.

## Cloudflare Pages 배포 설정

1. Cloudflare 대시보드에서 **Workers & Pages → Create → Pages → Connect to Git**으로 이동합니다.
2. GitHub 저장소 `ishyun1227/nono-web`을 선택합니다.
3. 아래 값을 지정하고 배포합니다.

| 설정 | 값 |
| --- | --- |
| Framework preset | None |
| Production branch | main |
| Build command | 비움 (필요하면 `exit 0`) |
| Build output directory | / (저장소 최상위 경로) |
| Root directory | 기본값/비움 |

UI는 `index.html`, 사용자 설정은 `settings.js`, 공개 Firebase 웹 설정은 `firebase-config.js`에 있습니다. 별도의 빌드 명령은 필요 없습니다. `node_modules`와 테스트 도구는 배포할 필요가 없습니다.

## 현재 사용 가능 범위

- 싱글플레이: 실행 가능
- 키보드: 방향키, Space, X, Backspace, Ctrl+Z/Y
- 실시간 대결 및 협동: Firebase 연결 전에는 사용 불가
- 온라인 기록 경쟁: Firebase 연결 전에는 사용 불가

Firebase 연결값이 비어 있으면 오프라인 체험으로 실행됩니다. 익명 인증, 서버 보안 규칙, 에뮬레이터 테스트가 포함되어 있으며 운영 연결과 테스트 방법은 [FIREBASE.md](FIREBASE.md)에 있습니다. Firebase 프로젝트 생성·규칙 배포·웹 설정 반영이 완료되어야 온라인 기능을 사용할 수 있습니다.

## 주의

정적 웹사이트 배포 비용과 Firebase 등 실시간 백엔드 이용 요금은 별개입니다. 현재 저장소는 공개(Public) 상태이므로 실제 비밀키나 개인 정보를 커밋하지 마세요.
