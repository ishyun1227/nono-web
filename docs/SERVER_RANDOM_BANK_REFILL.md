# 서버 랜덤 퍼즐 사전 생성·자동 보충 (2026-11-10)

## 현재 구현

- **공용 재고**: `randomPuzzleBank/{size}_{difficulty}/{puzzleId}`. 9개 크기(5, 10, 15, 20, 25, 30, 50, 75, 100) × 4개 난이도(쉬움, 보통, 어려움, 전문가) = **36개 독립 버킷**.
- **목표 초기 수량**: 버킷마다 100개. 합계 3,600개 **목표**이지 실제 생성·적재 완료 수량이 아니다.
- **생성 주체**: GitHub Actions의 Node.js 서버 실행기. 생성 시 플레이어의 브라우저, 유료 이미지 생성 AI, ChatGPT 사용은 필요 없다.
- **정기 실행**: `.github/workflows/server-random-bank-refill.yml`의 매시 17분(UTC) 예약 + 수동 실행 가능. GitHub 예약 실행은 보장된 정시 실행이 아닐 수 있다.
- **시드 기반 정답 재현**: 현재 v6 랜덤 퍼즐 스펙을 그대로 사용한다. 정답 비트 전체를 공개 DB에 저장하지 않는다. 단, v6 시드를 브라우저로 전달하기 때문에 정답을 복원할 수 있으며 부정행위 방지까지 보장하지는 못한다.
- **중복 등록 방지**: 서버 REST의 `If-Match: null_etag` 조건부 생성. 기존 퍼즐 ID를 덮어쓰지 않는다.
- **후보 시도 횟수**: 5×5는 한 분류당 최대 400회, 10×10은 200회, 큰 퍼즐일수록 더 적게 시도한다. 단, 전체 시도·시간·공개 수량 상한이 우선 적용되어 목표 달성이 보장되지는 않는다.
- **재시작 가능**: 처리 중단 시 `randomBankState/{bucket}/target`에 목표 재고를 보존하고, `randomBankControl/cursor`를 회전시켜 다음 실행에 다른 분류부터 시도한다.

## 난이도 판단 — 현재 임시 기준

1. v6에서 **무작위 검정·흰색 격자**를 만든 뒤 행·열 힌트를 생성한다.
2. Adaptive 논리 풀이기를 실행한다.
3. `solved`일 때는 **행·열 두 축을 고려한 정규화 추론량** `iterations / (2 × size)`로 임시 분류한다.
   - **쉬움**: 1.25 이하
   - **보통**: 1.25 초과 ~ 1.80 이하
   - **어려움**: 1.80 초과
4. Adaptive가 끝까지 추론한 결과 `partial`(논리적으로 막힘)이면 **전문가**.
5. `unknown`(시간·단계 예산 초과), `invalid` 등은 폐기한다. 특히 `unknown`을 전문가로 오인하지 않는다.
6. 지정 버킷의 난이도와 실제 판정이 일치하는 후보만 **독립 CaDiCaL 기준해 차단 SAT/UNSAT**로 검증한다.
7. **UNSAT(다른 정답 없음)**일 때만 `verified:true`, `verifiedBy:'cadical_reference_blocking_unsat_v1'`로 발행한다. SAT(복수해), unknown, 오류, 제한시간 초과는 저장하지 않는다.

**한계:** 쉬움·보통·어려움의 수치 기준은 최초 적용용 **임시 공학적 분류**이며, 사람에게 체감되는 난이도가 검증된 값이 아니다. 75×75·100×100 및 특정 난이도는 4초 SAT 인증 예산 안에 유일해 후보를 찾지 못할 수 있다. **100개씩 생산이 보장되지는 않는다.** 성공률·생성 시간 측정 후 기준과 시간 예산을 조정해야 한다.

## 10개 남았을 때 100개 보충

- 플레이어가 **새 랜덤 퍼즐**을 요청할 때 현재 계정의 완료 ID 목록을 서버와 동기화한다. 또한 마지막으로 불러온 공용 퍼즐 보관함에 속한 퍼즐을 완료하면 즉시 재고 부족 여부를 확인하므로, 90번째 완료 시점에도 보충 요청이 가능하다. 보관함을 아직 조회하지 않은 세션은 다음 새 랜덤 요청 시점에 확인한다.
- 같은 크기·난이도 버킷에서 **완료하지 않은 공용 퍼즐이 10개 이하**이면 `randomRestockRequests/{uid}/{bucket}=serverTimestamp()`를 한 번 기록한다.
- 단일 요청은 같은 UID·버킷에서 한 번만 기록되며, 삭제·타 사용자 수정은 클라이언트에서 불가능하다.
- 다음 서버 정기 실행 때 서버가 **실제 `userCompleted/{uid}` 완료 기록**과 공용 재고를 다시 비교한다. 클라이언트가 보낸 요청만 믿고 새 퍼즐을 추가하지 않는다.
- 진짜로 10개 이하가 맞고 **이전 생산 목표가 완료**된 상태라면 해당 버킷의 목표 재고를 현재 수량보다 100개 증가시킨다.
- **이전 목표가 아직 진행 중**이면 요청을 처리하되 100개를 중복으로 계속 더하지 않는다. 목표는 여러 실행에 걸쳐 점진적으로 달성한다.
- 현재 지원되지 않는 비회원의 클라우드 완료 ID 검증은 요구하지 않는다. 비회원은 공용 보관함과 검증된 로컬 퍼즐을 사용하다 부족하면 기존 즉석 생성 기능으로 대체한다.
- 협동·대결에서 여러 명이 **공통으로 미완료**인 퍼즐을 서버가 교집합 검색하는 기능과 실시간 즉시 보충은 별도 과제다. 현재 방 입장 시 각자 완료 여부를 검사하는 동작을 유지한다.

## 서버 작동을 활성화하려면

현재 GitHub 파일만 추가했다고 운영 Firebase에 자동으로 접근할 수 있는 것은 아니다.

1. **기존에 채팅으로 노출된 Firebase 서비스 계정 키는 재사용하면 안 된다.** Google Cloud 프로젝트 `nono-web-ishyun-20261020`에서 권한을 최소화한 **새 전용 서비스 계정 및 JSON 키**를 발급하고 이전 노출 키를 폐기·교체한다. 외부 GitHub Actions에서 실행되므로 새 키는 GitHub Secrets에만 보관한다.
2. GitHub 저장소 **Settings → Secrets and variables → Actions → New repository secret**에서 **단 한 개의 새 비밀정보**를 등록한다.
   - 이름: `FIREBASE_RANDOM_BANK_SERVICE_ACCOUNT_JSON`
   - 값: 새 전용 서비스 계정의 JSON 전체. **이 대화, 저장소 코드, 노션에 키를 올리지 않는다.**
   - 데이터베이스 URL은 웹앱에서 이미 검증한 공개 URL `https://nono-web-ishyun-20261020-default-rtdb.asia-southeast1.firebasedatabase.app`로 고정했으므로 `FIREBASE_DATABASE_URL`을 별도로 만들지 않는다.
3. `database.rules.json`의 **현재 운영 규칙과의 차이를 검토한 뒤** Firebase Realtime Database → Rules에서 배포하거나 검증된 전용 Firebase CLI 배포 절차를 수행한다. Firebase 규칙 배포는 **기존 모든 규칙을 덮어쓸 수 있으므로** 현재 운영 규칙을 먼저 비교해야 한다. 서버 작업은 원격의 `userCompleted`, `randomPuzzleBank`, `randomRestockRequests` 보안 규칙 및 루트 접근 차단 조건이 코드와 다르면 **저장을 시작하지 않는다.**
4. GitHub **Actions → Server random puzzle bank refill → Run workflow**로 처음 실행하거나 다음 매시간 17분(UTC) 예약을 확인한다. `push` 시 소량 테스트는 워크플로 파일 자체가 변경된 경우에만 실행한다.
5. Actions 로그에 `production_security_preflight_passed`와 `refill_complete`가 모두 있어야 실제 서버 생성이 수행된 것이다. `published`를 확인하고 Firebase `randomPuzzleBank`와 `randomBankState`에서 수량을 점검한다. **비밀키가 없으면 테스트 잡은 정상 종료될 수 있어도 운영 생성 단계는 'skipped'로 표시되며 활성화된 것이 아니다.**

설정 파일: `.github/workflows/server-random-bank-refill.yml`, `tools/refill-random-bank.mjs`, `tools/random-bank-live-rules.mjs`. 생성기: `tools/random-bank-generator.mjs`, 보충 관리자: `tools/random-bank-refill-core.mjs`, 서버 인증: `tools/random-bank-admin.mjs`.

**보안:** 운영 Firebase 프로젝트·DB URL 고정 및 **실제 배포된 Firebase 규칙 검사**를 통과해야 쓰기 작업을 시작한다. 클라이언트의 `randomPuzzleBank` 쓰기 권한은 계속 금지한다. 서버 서비스 계정은 GitHub Actions 환경에만 주입하고 빌드 파일에 포함하지 않는다. 사용자 완료 관계 역시 개인 계정 아래에만 저장한다.

## 테스트

- `tests/random-bank-server.mjs`: 빈 버킷 100개 목표·부분 생성·다음 실행 재개·90개 완료→추가 목표 100개·중복 보충 방지·임의 요청 무시·안전하지 않은 퍼즐 발행 금지·실제 CaDiCaL 단일해 및 복수해·OAuth/REST 검증.
- `tests/random-puzzle-bank-rules.cjs`: Firebase 에뮬레이터에서 읽기 전용 재고와 완료 사용자만 작성하는 보충 요청 규칙 검증.
- `tests/random-puzzle-allocation.cjs`: 10개 남았을 때 계정당 요청 1회, 11개 남았을 때 미요청, 비회원 미요청.
- `.github/workflows/server-random-bank-tests.yml`: 계정 비밀키 없이 반복 가능한 CI 검사.

**실제 서비스 적용 기준:** CI 통과는 코드의 테스트 통과를 뜻한다. 운영 GitHub Secrets 설정, RTDB 규칙 배포, 생산 목표 완수, 최종 모바일 게임 운영 검증을 대신하지 않는다.
