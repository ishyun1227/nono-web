# 정답 1비트 바이너리 저장 — 무손실 호환 전환

## 실제 구현 상태

- 원본 문자열 형식(`privateAnswers/{id}`)은 **삭제하거나 수정하지 않는다**.
- 새 비공개 경로 `privateAnswersPacked/{id}`는 정답 비트들을 8칸=1바이트로 묶은 **Base64 문자열**을 담는다.
- 브라우저에는 **코덱 코드만 제공**한다. 서버 정답 데이터나 서버에서 만든 Base64 답안은 배포 파일에 넣지 않는다.
- 서버 보안 규칙은 기존 문자열 완료 검증과 새 Base64 완료 검증을 **둘 다 허용**한다. 새 형식도 유효한 정답과 정확히 일치해야 한다.
- 클라이언트는 `window.NONO_PACKED_ANSWERS_READY === true`인 경우에만 새 완료 데이터를 제출한다. 미설정 상태는 기존 문자열을 유지한다.
- 기존 진행 기록, 이전 대결방, Undo/Redo 변경 로그는 마이그레이션하지 않는다.
- 현재는 **점진적 전환용 이중 저장**이므로 Firebase 전체 저장량이 즉시 감소하지 않는다. 구버전 종료 전 `privateAnswers` 삭제 금지.

## 바이너리 규격 (고정)

- 버전 이름: `nono-1bit-msb-v1`
- 위치: 왼쪽 위 → 오른쪽 → 다음 행 (row-major)
- 인코딩: **한 바이트의 최상위 비트(MSB)부터** `0/1`을 순차적으로 담는다.
- **행마다 바이트 패딩을 넣지 않는다**. 모든 행을 하나의 비트열로 이어 붙인다.
- 전체 길이 = `ceil(width * height / 8)` 바이트.
- 남는 마지막 바이트의 **하위 비트들은 모두 0**이어야 한다.
- 서버 JSON 전송 시 바이트를 Base64로 표현한다. 바이너리 내부 바이트 수와 Base64 문자열 길이를 혼동하지 않는다.
- 가로/세로 크기는 퍼즐 메타데이터에서 제공하고, 반드시 디코딩할 때 동일한 순서로 전달한다.
- 63×59 = 3,717칸 ⇒ 465바이트 ⇒ Base64로는 620문자 (메타데이터 제외).

## 검증

`answer-bitpack.js`의 `validateAnswer(mask,width,height,rows,cols)`는
(1) 정확한 크기, (2) 순수 0/1 입력, (3) 답안과 행·열 힌트의 완전 일치,
(4) Base64 인코딩/디코딩 시 비트 단위 동일성을 검증한다.

`unpack`은 Base64 문법/정규화, 바이트 길이, 마지막 미사용 패딩 비트까지 검사한다.
형식 자체는 데이터 손실이 없다. 다만 정상 모양의 Base64 안에서 임의 비트를 변경한 경우 **원래 답을 모르면 코덱만으로 그 훼손을 검출할 수 없다**. 관리 작업의 SHA-256 지문과 원본·힌트 검증을 함께 사용한다. 암호학적인 조작 탐지 또는 서버 저장소 자체의 무결성 보증은 별도 책임이다.

실행:

```bash
npm ci
npm run test:answers
npm run test:multiplayer
npm run test:browser
```

## 운영 전환 순서 (반드시 이 순서)

1. `npm run test:answers`로 로컬 인코더 검사를 통과한다.
2. Firebase `database.rules.json`을 **먼저** 배포한다.
3. `node tools/seed-packed-answers.cjs`로 기존 퍼즐을 시뮬레이션 검사한다.
4. `node tools/seed-packed-answers.cjs --apply --project nono-web-ishyun-20261020`로 **비공개** 경로만 채운다. 기존 데이터는 그대로 유지한다.
5. Firebase 에뮬레이터에서 기존/신규 둘 다 완료 검증이 성공하며 허위 완료는 거부되는지 확인한다.
6. 그 후에만 `firebase-config.js`에서 **초기화 이전**에 `window.NONO_PACKED_ANSWERS_READY=true`를 설정하고 Cloudflare에 배포한다.
7. 운영 사이트에서 혼자하기/대결/기록 저장, 구버전 기록과 이어하기, 외부에서 정답 읽기 거부 여부를 실측한다.

**주의:** GitHub에 규칙과 코드를 커밋한 것만으로 운영 Firebase 규칙이나 정답 DB가 배포되지 않는다.
완료 시 이전 사용자가 열어 둔 구버전 사이트가 계속 문자열을 보낼 수 있으므로 이중 지원을 유지한다.

## 추가 퍼즐 등록

비공개 파일 예시 (실제 정답을 GitHub에 커밋하지 말 것):

```json
{
  "id": "unique-puzzle-id",
  "width": 59,
  "height": 63,
  "mask": "정확히 3717글자의 0과 1",
  "rows": [[1], [2]],
  "cols": [[1], [2]]
}
```

`--input /보안경로/answer.json`으로 전달한다. 예시의 힌트는 실제 값이 아니므로 검증 실패한다.
추가 퍼즐을 실제 게임에 공개할 때는 공개 힌트 목록 추가, 크기별 렌더링, 서버의 허용 ID/완료 처리, 시작·저장·이어서하기 테스트를 별도로 수행해야 한다.
**본 작업은 기존 정사각형 게임 엔진을 직사각형 엔진으로 전면 전환하는 작업이 아니다.** 겨울 눈사람 63×59 시험 페이지는 기존대로 독립 동작한다.


## 새 퍼즐 입력 사전 검증 (2026-10-29)

`node tools/prepare-puzzle.cjs --input /보안경로/puzzle.json`은 **dry-run**으로 검증만 진행한다.

입력에 `id,name,width,height,difficulty,mask,rows,cols`가 필요하다.
정답은 위에서 아래로 이어 붙인 row-major 0/1 문자열이다. 검사 과정에서
- 입력 크기와 순수 0/1 비트 확인
- 정답으로부터 계산된 모든 행·열 힌트 정확성 확인
- 외곽 전체가 0인 행 또는 열 제거 여부 확인
- 1비트 MSB 바이너리 변환·복원의 무손실 일치 확인
- 공개 힌트 데이터와 비공개 압축 정답 분리

다음 명령은 검증한 두 산출물을 실제로 작성한다.

```bash
node tools/prepare-puzzle.cjs --input /secure/source.json \
  --public-out ./puzzles-public/example.json \
  --private-out /secure/answers/example.json
```

`--private-out`은 **GitHub 저장소 바깥의 경로만 허용**하며 공개 산출물에 정답을 넣지 않는다.
기존 파일은 임의로 덮어쓰지 않는다. 강제 변경 시에만 `--overwrite` 사용.

**주의:** 이 도구는 힌트와 정답의 일치만 검증하고 유일해/재미도/인간 논리 풀이를 독립적으로 증명하지 않는다.
유일해 여부는 별도의 솔버 결과를 확인해야 한다. `reviewStatus:'approved'`를 사용하는 경우
입력 데이터에 `uniqueProofStatus:'unique'`가 필요하지만, 단순 문자열 값은 독립 검증의 대체물이 아니다.
현재 도구는 파일을 준비하는 단계이며 공식 목록 등록과 운영 서버 배포까지 자동화하지 않았다.
