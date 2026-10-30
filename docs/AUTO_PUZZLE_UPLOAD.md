# 퍼즐 추가 → Firebase 정답 자동 등록

2026-10-30부터 신규 퍼즐 정답을 매번 GitHub Actions에서 수동으로 등록할 필요가 없습니다.

## 어떻게 동작하나

1. 관리자/제작자가 **비공개 원본 JSON** 한 개를 준비합니다. `id, name, width, height, difficulty, mask, rows, cols`가 필요합니다. `mask`는 행 우선 0/1 문자열입니다. **원본은 공개 GitHub 저장소 바깥에 둡니다.**
2. 신규 퍼즐을 추가하는 과정에서 `npm run puzzle:add -- --input /안전한/비공개/puzzle.json`을 한 번 실행합니다. 이 명령이 공개 힌트·검수 대장 항목·**암호화된 정답**을 동시에 준비합니다. Firebase 서비스 계정의 Google 공개 인증서를 이용해 암호화하므로 제작자에게 관리자 개인키를 나눠줄 필요가 없습니다.
3. 이 변경 사항을 평소처럼 `main`에 반영하면 [자동 Firebase 등록 작업](../.github/workflows/auto-puzzle-answers.yml)이 **자동으로 실행**됩니다. Run workflow 버튼은 사용할 필요가 없습니다.
4. 자동 작업은 퍼즐 힌트와 정답의 완전 일치, 압축 무손실, 기존 게임/보안 규칙 테스트를 먼저 검증합니다. **서버에 아직 없는 정답만** `/privateAnswersPacked/{id}`에 등록합니다. 이미 저장된 정답이 다르면 **실패 처리하고 덮어쓰지 않습니다.**
5. 새 퍼즐은 항상 `review.status=pending`으로 들어갑니다. 정답 저장과 **정식 공개/포인트/랭킹**은 다른 작업입니다. 원본 그림 품질·논리 풀이·유일해·재미도 검수를 통과하기 전에는 정식 퍼즐로 올리지 않습니다. 기존처럼 체험 페이지에서만 제공합니다.

새 퍼즐 등록 시 생성/변경되는 파일:

- `puzzles/trial/ID.json`: **공개 가능한** 이름·크기·힌트만
- `puzzles/sealed/ID.json`: **비공개 정답의 암호문**만 (GitHub에 업로드 가능)
- `puzzles/catalog.json`: 통일된 문제 정보와 퀄리티 검수 대기 상태

새 정답의 원본 `mask`는 어느 공개 파일에도 저장하지 않습니다. 이미 올라간 기존 퍼즐을 위한 구형 소스 파일도 유실을 방지하려고 그대로 유지합니다.

## 최초 1회 관리자 설정

GitHub Actions 비밀키 `FIREBASE_SERVICE_ACCOUNT_JSON`에 Firebase 서비스 계정 JSON을 넣어야 합니다.
현재 자동 등록은 사용자가 지정한 **기존 GitHub Secret에 등록된 Firebase 관리자 키**를 사용합니다. 신규 퍼즐마다 별도 등록이 필요하지 않습니다. 다만 이 키는 이전 대화에 원문이 노출되었으므로 **교체를 강력히 권장**합니다. 관리자 키를 GitHub 코드·문서·로그에 직접 넣지 않습니다.

- [Firebase 서비스 계정](https://console.firebase.google.com/project/nono-web-ishyun-20261020/settings/serviceaccounts/adminsdk)
- [GitHub Actions Repository Secrets](https://github.com/ishyun1227/nono-web/settings/secrets/actions)
- [자동 등록 성공/실패 기록](https://github.com/ishyun1227/nono-web/actions/workflows/auto-puzzle-answers.yml)

**절대** 새 개인키 JSON을 채팅·GitHub 코드·Notion에 붙여넣지 마세요. GitHub Secret에만 등록합니다.

## 검증과 오류 처리

- 작업을 실행하는 데 필요한 조건: 공개 카탈로그와 암호화된 정답 파일이 같은 퍼즐 ID·크기를 사용함, 정답과 모든 힌트가 일치함, 서비스 계정이 일치함.
- 파일 구조 오류·비밀번호/개인키 불일치·서버 정답 충돌·퍼즐 테스트 실패 시 **저장하지 않고 오류를 표시**합니다.
- 서버에 이미 저장된 정답은 다시 쓰지 않고, 기존 저장된 진행도·클리어 기록·Undo/Redo·리플레이에 접근하지 않습니다.
- 키가 나중에 다시 바뀌어 과거 암호화 파일을 열 수 없어도 이미 Firebase에 등록된 답안은 그대로 사용하며, **새 키로 암호화한 신규 파일**만 추가합니다.
- 인터넷 연결이 끊겨 Google 공개 인증서를 조회할 수 없으면 신규 등록 명령이 실패하며, 비밀키를 받거나 공개 파일에 원본 정답을 남기지 않습니다.
- 50/75/100 크기 테스트는 방문마다 답이 바뀌므로 이 고정 정답 자동 업로드에 포함되지 않습니다.
- 겨울 눈사람은 현재 공개 힌트만 있어 비공개 원본 정답을 확보한 뒤 암호화 등록이 필요합니다.

## 개발 확인

```bash
npm ci
npm run test:answers
npm run test:catalog
npm run test:migrate
npm run test:multiplayer
```

스마트폰 등에서 퍼즐 생성기를 쓰는 경우에도 생성기가 동일한 등록 명령/규격으로 제출하면 됩니다. 지금 구현은 **GitHub에 추가되는 퍼즐 파일 기반의 서버 자동 등록**이며, 관리자용 웹 업로드 화면까지 만든 것은 아닙니다.
