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

UI는 `index.html`, 사용자 설정은 `settings.js`, 공개 Firebase 웹 설정은 `firebase-config.js`에 있습니다. 저가형 색상 테마는 `themes.css`·`theme-extras.css`에서, 월드 테마는 `premium-themes.css`·`theme-extras.css` 및 직접 제작한 `assets/*-scene.svg`에서 관리합니다. 상점·미리보기는 `themes.js`, 월드별 실제 퍼즐 선택 화면은 `theme-world-ui.js`에서 관리합니다. 빌드는 이 파일들과 기존 웹 UI·Firebase 웹 설정만 `dist/`로 복사합니다. `node_modules`와 테스트·서버 규칙 파일은 웹에 배포하지 않습니다.

## 사이트 테마

홈 오른쪽 위 **🎨 테마**를 누르면 색상 테마 5종과 월드 테마 4종을 미리 볼 수 있습니다.

| 구분 | 테마 | 제안 가격 | 변화 수준 |
| --- | --- | ---: | --- |
| 기본 | 네온 다크 | 무료 | 원래 NONO UI |
| 색상 | 오로라 네온 | 300 P | 기존 레이아웃에 청록·남보라 색상 |
| 색상 | 크림 라벤더 | 450 P | 기존 레이아웃에 아이보리·보라 색상 |
| 색상 | 레트로 그린 | 400 P | 기존 UI에 초록 감성 |
| 색상 | 포레스트 그린 | 500 P | 기존 UI에 숲 색상 |
| 월드 | 픽셀 시티 아케이드 | 2,500 P | 네온 도시·아케이드 캐비닛, 픽셀 버튼, 별도 게임판 프레임·퍼즐 도감 |
| 월드 | 신비로운 도서관 | 3,500 P | 천문 도서관 SVG·금박 테두리·양피지 분위기·세계별 도감 |
| 월드 | 정령의 숲 | 4,500 P | 달빛 숲, 목재 액자, 판타지 장식·모험 도감 |
| 월드 | 우주 관제실 | 5,500 P | 탐사선 SVG·홀로그램 HUD·관제 콘솔형 퍼즐 선택 |

프리미엄 월드 테마는 **공통 퍼즐 엔진·Firebase 데이터를 유지한 채 홈페이지·메뉴·모드 카드·퍼즐판·설정창의 외형, 장식, 글꼴 및 일부 레이아웃**을 대폭 변경합니다. 월드 전용 CTA·실제 퍼즐 선택 도감·테마 상점 안내도 포함됩니다. 이미지 콘셉트를 참고했으나 AI 시안과 픽셀 단위로 동일한 사진형 일러스트는 아닙니다. 특정 동물 캐릭터를 모든 월드에 강제로 사용하지 않습니다.

**포인트 적립, 서버 측 구매·소유 검증, 영구 잠금 해제는 아직 구현되지 않았습니다.** 테마 가격은 **확정 전 예시**입니다. 구매 전 테마는 브라우저 탭 단위 임시 무료 체험이며 탭을 닫으면 기본 테마로 돌아갑니다. 상품을 구매했다거나 포인트가 차감되었다고 표시하지 않습니다.

## 현재 사용 가능 범위

- 싱글플레이: 실행 가능
- 키보드: 방향키, Space, X, Backspace, Ctrl+Z/Y
- 실시간 대결 및 협동: Firebase 익명 인증과 Realtime Database 사용
- 온라인 기록 경쟁: 서버 검증과 퍼즐별 최고 기록 순위표

Firebase 연결값이 비어 있으면 오프라인 체험으로 실행됩니다. 익명 인증, 서버 보안 규칙, 에뮬레이터 테스트가 포함되어 있으며 운영 연결과 테스트 방법은 [FIREBASE.md](FIREBASE.md)에 있습니다. Firebase 프로젝트 생성·규칙 배포·웹 설정 반영이 완료되어야 온라인 기능을 사용할 수 있습니다.

## 주의

정적 웹사이트 배포 비용과 Firebase 등 실시간 백엔드 이용 요금은 별개입니다. 현재 저장소는 공개(Public) 상태이므로 실제 비밀키나 개인 정보를 커밋하지 마세요.
