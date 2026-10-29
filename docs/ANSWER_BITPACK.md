# 정답 1비트 바이너리 저장 — 무손실 호환 전환

## 실제 구현 상태

- 원본 문자열 형식(`privateAnswers/{id}`)은 **삭제하거나 수정하지 않는다**.
- 새 비공개 경로 `privateAnswersPacked/{id}`는 정답 비트들을 8칸=1바이트로 묶은 **Base64 문자열**을 담는다.
- 브라우저에는 **코덱 코드만 제공**한다. 서버 정답 데이터나 서버에서 만든 Base64 답안은 배포 파일에 넣지 않는다.
- 서버 보안 규칙은 기존 문자열 완료 검증과 새 Base64 완료 검증을 **둘 다 허용**한다. 새 형식도 유효한 정답과 정확히 일치해야 한다.
- 클라이언트는 `window.NONO_PACKED_ANSWERS_READY`에 등록된 **퍼즐 ID만** 새 압축 형식으로 완료 데이터를 제출한다. 미설정/미등록 퍼즐은 기존 문자열을 유지한다. 기존 `true` 형식은 테스트 호환성용이므로 운영 배포에는 사용하지 않는다.
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
6. 서버에 등록된 퍼즐만 점검한 뒤 `firebase-config.js`에서 **초기화 이전**에 `window.NONO_PACKED_ANSWERS_READY=['heart5','cat10','rocket10']`처럼 ID 허용목록으로 설정해 Cloudflare에 배포한다. 30×30 및 대형 퍼즐은 정답 시드와 서버 완료 검사 전까지 기존 형식이어야 한다.
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


### 데이터만으로 체험 퍼즐 추가

```bash
node tools/prepare-puzzle.cjs \
  --input /secure/new-puzzle.json \
  --public-out ./puzzles/trial/new-puzzle-id.json \
  --private-out /secure/answers/new-puzzle-id.json
npm run build
node tests/generated-trial.cjs
```

`puzzles/trial/*.json`은 **힌트만 있는 공개 등록 파일**이다.
빌드하면 `dist/trials/ID.html`과 `dist/trial-index.json`을 자동 생성하고, 추가 체험 퍼즐 링크를 홈에 연결한다.
`winter-snowman-trial-v1`은 기존 눈사람 테스트 링크에서 자동 생성한 페이지로 연결한다.
템플릿은 공통으로 `winter-snowman-test.html`을 사용하므로 퍼즐마다 조작·저장 코드를 새로 작성하지 않는다.

`/secure/answers/...`는 절대 공개 저장소에 커밋하거나 `dist/`로 복사하지 않는다.
이 자동화는 **체험/검수용 목록**이다. 정식 혼자하기의 점수·포인트·실시간 완료 기록 및
직사각형 대응까지 자동 연결된 것으로 오해하면 안 된다.

 
## 추가 퍼즐 5개: 서버 등록 준비 (2026-10-29)

다음 정답은 현재 사이트에 존재하는 **원본 비트열 그대로** 읽어 압축·복원과 행·열 힌트를 검증한다. 기존 사용자 퍼즐이나 퍼즐 이미지의 크기/위치를 변경하지 않는다.

| ID | 크기 | 서버 압축 정답 | 클라이언트 현황 |
| --- | --- | --- | --- |
| vox_crabino_front | 30×30 | 다음 수동 배포에서 추가 | 혼자하기만 유지 |
| vox_crabino_side | 30×30 | 다음 수동 배포에서 추가 | 혼자하기만 유지 |
| vox_crabino_top | 30×30 | 다음 수동 배포에서 추가 | 혼자하기만 유지 |
| trial_rabbit_53x73 | 53×73 | 다음 수동 배포에서 추가 | 독립 체험, 공식 점수 제외 |
| trial_samurai_72x72 | 72×72 | 다음 수동 배포에서 추가 | 독립 체험, 공식 점수 제외 |

이미 Firebase 서버에 등록된 `heart5`, `cat10`, `rocket10` 세 정답을 합치면 **총 8개**의 배포 대상이 된다.
`node tools/seed-packed-answers.cjs`로 건별 원본 마스크·힌트·무손실 복원 결과를 먼저 검증한다.
배포 실행 시 `privateAnswersPacked`의 모든 자료를 덮어쓰지 않고, **없는 자식 키만 등록**한다.
기존 자식 키의 저장값이 예상값과 다르면 즉시 중단한다.

배포 전에 `npm run test:migrate`는 Firebase 에뮬레이터에 기존 문자열 정답과 별도 비공개 답안을 넣은 뒤,
신규 등록·재실행·잘못된 답안 충돌을 모두 검사한다.

운영 등록은 관리자만 `Manual Firebase packed-answer migration` 워크플로의 `rules_and_seed` 단계로 실행한다.
그 전까지 `NONO_PACKED_ANSWERS_READY` 허용목록에는 기존 3개 ID만 남긴다.

**정식 출시와 구분:** 30×30 브레인롯은 아직 공식 기록 모드로 확장하지 않았고,
토끼·사무라이는 독립 체험 페이지여서 공식 게임 점수/포인트 동기화 대상이 아니다.
서버에 정답을 백업/검증한다고 자동으로 정식 게임이 되는 것은 아니다.
눈사람 63×59의 정답은 공개 저장소에 없는 별도 비공개 원본으로 관리해야 하며,
50×50·75×75·100×100 크기 테스트는 현재 실행마다 문제가 바뀌어
공통 서버 정답 하나로 등록하면 안 된다.
