# NONO — 노노그램 웹사이트

간소화한 NONO 웹 버전의 첫 공개 배포용 저장소입니다.

## Cloudflare Workers 배포 설정

1. Cloudflare 대시보드에서 **Workers & Pages → nono-web → Settings → Builds**로 이동합니다.
2. GitHub 저장소 `ishyun1227/nono-web`을 선택합니다.
3. 아래 값을 지정하고 배포합니다.

| 설정 | 값 |
| --- | --- |
| Production branch | main |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview deploy command | `npx wrangler preview` |
| Assets directory | `dist` (`wrangler.jsonc`에 지정) |
| Root directory | 기본값/비움 |

UI는 `index.html`, 사용자 설정은 `settings.js`, 공개 Firebase 웹 설정은 `firebase-config.js`에 있습니다. 테마 디자인은 `themes.css`, 테마 미리보기·선택은 `themes.js`에서 관리합니다. 빌드는 이 5개 파일만 `dist/`로 복사합니다. `node_modules`와 테스트·서버 규칙 파일은 웹에 배포하지 않습니다.

## 사이트 테마

홈 오른쪽 위 **🎨 테마**를 누르면 네온 다크(기본), 파스텔 드림, 레트로 아케이드, 마법의 숲을 미리 볼 수 있습니다. 홈페이지·게임 보드·설정창에도 색상이 적용됩니다. **포인트 적립, 서버 측 구매·소유 검증, 영구 잠금 해제는 아직 구현되지 않았습니다.** 구매 전 테마는 브라우저 탭 단위의 임시 무료 체험으로만 사용되며 탭을 닫으면 기본 테마로 돌아갑니다. 표시되는 포인트 가격은 확정 가격이 아니라 계획 예시입니다.

## 현재 사용 가능 범위

- 싱글플레이: 실행 가능
- 키보드: 방향키, Space, X, Backspace, Ctrl+Z/Y
- 실시간 대결 및 협동: Firebase 익명 인증과 Realtime Database 사용
- 온라인 기록 경쟁: 서버 검증과 퍼즐별 최고 기록 순위표

Firebase 연결값이 비어 있으면 오프라인 체험으로 실행됩니다. 익명 인증, 서버 보안 규칙, 에뮬레이터 테스트가 포함되어 있으며 운영 연결과 테스트 방법은 [FIREBASE.md](FIREBASE.md)에 있습니다. Firebase 프로젝트 생성·규칙 배포·웹 설정 반영이 완료되어야 온라인 기능을 사용할 수 있습니다.

## 주의

정적 웹사이트 배포 비용과 Firebase 등 실시간 백엔드 이용 요금은 별개입니다. 현재 저장소는 공개(Public) 상태이므로 실제 비밀키나 개인 정보를 커밋하지 마세요.
