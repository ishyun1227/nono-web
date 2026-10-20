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

현재 `index.html` 한 파일에 UI, CSS, JS, 픽셀 이미지가 포함되어 있어 별도의 빌드 명령이 필요 없습니다.

## 현재 사용 가능 범위

- 싱글플레이: 실행 가능
- 키보드: 방향키, Space, X, Backspace, Ctrl+Z/Y
- 실시간 대결 및 협동: Firebase 연결 전에는 사용 불가
- 온라인 기록 경쟁: Firebase 연결 전에는 사용 불가

본 저장소는 기본적으로 Firebase 연결 값이 비어 있는 **프런트엔드 체험 버전**입니다. Firebase를 설정할 때에는 인증과 데이터베이스 보안 규칙을 먼저 검토해야 합니다.

## 주의

정적 웹사이트 배포 비용과 Firebase 등 실시간 백엔드 이용 요금은 별개입니다. 현재 저장소는 공개(Public) 상태이므로 실제 비밀키나 개인 정보를 커밋하지 마세요.
