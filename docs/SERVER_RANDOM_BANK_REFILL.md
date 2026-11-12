# 서버 랜덤 퍼즐 사전 생성·자동 보충 (2026-11-10)

## 현재 구현

- **공용 재고**: `randomPuzzleBank/{size}_{difficulty}/{puzzleId}`. 9개 크기(5, 10, 15, 20, 25, 30, 50, 75, 100) × 4개 난이도(쉬움, 보통, 어려움, 전문가) = **36개 독립 버킷**.
- **목표 초기 수량**: 버킷마다 100개. 합계 3,600개 **목표**이지 실제 생성·적재 완료 수량이 아니다.
- **생성 주체**: GitHub Actions의 Node.js 서버 실행기. 생성 시 플레이어의 브라우저, 유료 이미지 생성 AI, ChatGPT 사용은 필요 없다.
- **정기 실행**: 일반 보충은 `.github/workflows/server-random-bank-refill.yml`의 매시 17분(UTC). 초기 집중 생성은 `.github/workflows/server-random-bank-initial-fill.yml`의 매시 47분(UTC) 추가 예약으로 실행된다. GitHub 예약 실행은 정시 실행이 보장되지 않는다.
- **시드 기반 정답 재현**: 현재 v6 랜덤 퍼즐 스펙을 그대로 사용한다. 정답 비트 전체를 공개 DB에 저장하지 않는다. 단, v6 시드를 브라우저로 전달하기 때문에 정답을 복원할 수 있으며 부정행위 방지까지 보장하지는 못한다.
- **중복 등록 방지**: 서버 REST의 `If-Match: null_etag` 조건부 생성. 기존 퍼즐 ID를 덮어쓰지 않는다.
- **후보 시도 횟수**: 5×5는 한 분류당 최대 400회, 10×10은 200회, 큰 퍼즐일수록 더 적게 시도한다. 단, 전체 시도·시간·공개 수량 상한이 우선 적용되어 목표 달성이 보장되지는 않는다.
- **균형 생성 순서(2026-11-11 개선)**: 한 크기·난이도에서 수백 번 연속 시도하지 않고, 9개 크기와 4개 난이도를 교차 배치한다. 각 분류의 누적 생성 **시도 횟수**가 가장 적은 곳을 우선 선택하며, 동률이면 목표 재고 대비 부족한 곳부터 시도한다. 생성 실패도 시도 횟수에 반영해 성공률이 낮은 분류가 시간을 독점하지 못하도록 한다. 기존 크기별 시도 횟수 상한, 전체 생성·시간·공개 상한은 유지한다.
- **재시작 가능**: 목표 재고 `randomBankState/{bucket}/target`, 누적 시도 횟수 `randomBankControl/servedAttempts`, 다음 선택 위치 `randomBankControl/cursor`를 보존한다. 실행이 짧게 끝나더라도 다음 실행에서 기회를 덜 받은 분류를 우선한다. 실행 종료 전에 갑자기 중단되면 해당 실행에서 아직 저장하지 않은 시도 횟수는 복구되지 않을 수 있다.

## 최초 3,600개 확보용 집중 생성 모드 (2026-11-12 변경)

- 기존 일반 보충(시간당 1회)은 **그대로 유지**한다. 별도 GitHub Actions 워크플로 `One-time initial random puzzle stock fill`이 매시 47분(UTC)에 추가로 실행된다. 집중 생성 기능은 **운영 Firebase 규칙이 검증되고 기존 서비스 계정 비밀정보가 있어야만** 실행된다.
- 36개 크기·난이도 분류의 실제 재고를 Firebase RTDB의 **shallow 키 조회**로 조사한다. 이때 퍼즐 본문을 모두 내려받지 않는다. **재고 100개 미만인 분류만** 집중 생성 대상으로 전달한다.
- 집중 생성 1회 상한: **7분·4,000회 후보 시도·유일해 확인 후 최대 60개 저장**, 전체 작업은 12분 제한이다. 퍼즐 발행 기준, 난이도 판정, CaDiCaL 유일해 검증과 중복 방지 규칙은 변경하지 않는다.
- **2026-11-12 변경:** 초기 집중 생성은 더 이상 7일·168회로 무조건 종료하지 않고, **36개 분류 모두 100개를 채울 때까지** 매시간 부족한 분류를 다시 시도한다. 단, 24회 연속 실행에서 퍼즐 재고가 하나도 늘지 않으면 무의미한 반복을 막기 위해 자동 **일시중지**한다. 기존 일반 시간당 보충이 새 퍼즐을 저장해 재고가 늘면 일시중지가 자동 해제된다. 성공률 0%에 가까운 분류는 모두 100개를 확보하지 못할 수 있다.
- 진행 상태는 `randomBankControl/initialFill`에 시작 시각, 누적 실행 횟수, 분류별 재고 합계, 연속 무진행 횟수, 상태를 기록해 다음 실행에 이어간다. 목표 달성 시 `target_reached`로 종료한다. 24회 연속 무진행 시 `no_progress_24_runs`로 **일시중지**하며, 그 후 재고가 증가하면 재개한다. 종료·중지 상태에서는 퍼즐 생성에 필요한 패키지 설치·풀이기 실행을 건너뛴다.
- **비용 보호**: GitHub 공개 저장소의 표준 Ubuntu 러너를 사용하며, 유료 러너·Firebase Blaze 전환·Cloud Functions 추가를 하지 않는다. Firebase Spark는 저장량 1GB, 다운로드 월 10GB 및 동시 연결 100개 제한이 있다. **실제 잔여 무료 사용량은 이 코드가 알 수 없으므로** 운영자가 Firebase Console의 Usage를 확인해야 한다. 한도 초과 시 무료 서비스가 차단될 수 있다.
- 서버 연결·운영 규칙 확인·키 누락·재고 조회 오류가 발생하면 퍼즐을 생성하지 않고 실패 또는 생략시킨다. **사용자가 확인한 2026-11-12 Firebase Console 사용량(저장 약 9.4 KB, 이번 달 다운로드 약 1.2 MB)은 과거 스냅샷**이며 지속적인 무료 잔여 사용량을 보장하지 않는다. 현재 Spark에서 Cloud Monitoring API 호출이 403으로 실패하므로, 생성 워크플로에서 이 API **자동 차단 단계는 제외**했다. Firebase 콘솔에서 사용량을 정기 확인하지 않으면 무료 한도 초과로 서비스가 제한될 위험이 있다.

## Spark 무료 요금제: 수동 확인 후 1회 시험 생성 (2026-11-12)

사용자가 2026-11-12 Firebase Console에서 확인한 값은 RTDB 저장량 9.4 KB(별도 화면 약 30.64 KB), 이번 달 다운로드 약 1.2 MB, 동시 연결 5/100이었다. **이 수치들은 조회 시점의 화면 증빙이며 자동 조회 수치가 아니다.**

- 별도 워크플로 `server-random-bank-spark-pilot.yml`은 **첫 배포 시 한 번의 `main` 푸시 또는 명시적 수동 실행**으로만 동작한다. 반복적인 예약 실행은 없다.
- `5_쉬움`, `10_쉬움`, `10_보통`, `15_쉬움`, `15_보통`, `20_어려움` 중 **100개 미만 재고인 분류만** 시험한다.
- 서버가 확인한 운영 Firebase 규칙이 저장소에서 검증한 보안 규칙과 같아야 동작한다. 기존 서비스 계정으로만 실행하며 Cloud Monitoring·결제 계정·Blaze·추가 유료 서비스는 사용하지 않는다.
- 실제 제한은 **최대 10개 유일해 검증 퍼즐 등록, 후보 시도 240회, 2분, 분류별 최대 40회**다. 이는 *상한*이며 보장 생산량이 아니다. 실패해도 정답 유일성 기준을 느슨하게 만들지 않는다.
- Firebase `randomBankControl/sparkPilot20261112`에 조건부 **1회 실행 클레임**을 기록한다. 이미 실행되었거나 실패 기록이 있으면 이후 같은 시험은 **다시 실행하지 않는다**. 실패하면 원인을 확인한 다음 별도 개선판을 설계해야 한다.
- GitHub Actions의 해당 실행 `Summary`에 생성 시도·신규 저장·분류별 앞뒤 재고가 표시된다. 다음 단계는 **Firebase 콘솔에서 다운로드·저장량을 다시 확인**한 뒤 수동 확인을 전제로 여러 차례 실행 가능한 별도 단계적 보충 작업을 검토하는 것이다.
- **2026-11-12 변경:** 기존 매시간 초기 집중 생성 워크플로의 Cloud Monitoring 의존 차단을 제거했다. 초기 집중 생성은 실제 재고를 보고 자동으로 이어서 시도하며, 정해진 크기·난이도의 목표 100개 달성 또는 연속 무진행 24회 일시중지 규칙을 따른다.

[1회 Spark 시험 실행 기록](https://github.com/ishyun1227/nono-web/actions/workflows/server-random-bank-spark-pilot.yml)

## Firebase Spark 남은 사용량 자동 점검 (2026-11-11)

- **GitHub Actions → Firebase Realtime Database free quota check**를 수동 실행하면 Firebase 실시간 데이터베이스의 저장량과 **이번 달 누적 다운로드 추정량**, 측정 시각, 한도 대비 비율을 **Summary**에서 볼 수 있다. 일일 예약 검사는 한국시간 오전 9시 27분에 실행되도록 설정했다(UTC 00:27).
- **현행 변경 사항:** Cloud Monitoring API가 Spark에서 HTTP 403으로 실패하는 것이 확인되어, **초기 집중 생성에서는 Cloud Monitoring 자동 게이트를 사용하지 않는다.** 아래 사용량 확인 워크플로는 독립적으로 남아 있지만 Spark에서 실패하는 상태이다. 따라서 **80% 자동 차단은 현재 동작하지 않는다.** 2026-11-12 사용자가 확인한 Firebase 콘솔의 낮은 사용량을 기준으로, 매시간 작업량을 제한하며 생성한다. 실제 전체 사용량은 콘솔에서 직접 확인해야 한다.
- 조회에는 Google Cloud Monitoring API **`projects.timeSeries.list`**와 공식 Realtime Database 메트릭 `storage/total_bytes`, `storage/limit`, `network/monthly_sent`, `network/monthly_sent_limit`를 사용한다. 프로젝트 `nono-web-ishyun-20261020`, 데이터베이스 namespace `nono-web-ishyun-20261020-default-rtdb`만 대상으로 고정한다.
- 한도 대비 사용량은 **Monitoring에 마지막으로 수집된 값**이다. 저장량은 하루에 한 번 수집되고 최대 하루 지연될 수 있으며, 월간 다운로드량은 30분마다 수집되어 최대 90분 늦게 보일 수 있다. 이에 더해 안전한 유효 기간(저장 60시간 / 다운로드 4시간)을 벗어난 샘플은 차단한다. 현재 시점의 실시간·최종 청구 수치나 남은 요금을 정확히 보장하지 않는다.
- 기존 GitHub Actions 비밀정보 **`FIREBASE_SERVICE_ACCOUNT_JSON`**만 사용한다. 조회 역할 `roles/monitoring.viewer`(읽기 전용)과 **Cloud Monitoring API가 이미 사용 가능한 상태**여야 한다. 자격증명은 작업 로그나 GitHub 커밋에 기록하지 않는다. **권한이나 API가 미설정된 상태에서 자동 활성화, 요금제 변경, 새 키 발급은 하지 않는다.** 기존 Spark 요금제를 그대로 사용한다.
- **확인 방법:** [사용량 조회 Actions](https://github.com/ishyun1227/nono-web/actions/workflows/server-random-bank-usage.yml)는 Spark에서 403으로 실패할 수 있다. 대신 [Firebase Console 사용량 탭](https://console.firebase.google.com/project/nono-web-ishyun-20261020/usage)에서 실제 저장량·월간 다운로드량을 확인한다. [초기 집중 생성 Actions](https://github.com/ishyun1227/nono-web/actions/workflows/server-random-bank-initial-fill.yml)는 재고·시도·성공률과 중지 사유만 보고하며 전체 Firebase 사용량을 보고하지 않는다.
- 실제 프로젝트의 사용량 조회를 아직 실행·검증하지 않았을 때는 **실제 남은 용량 '정보 없음'**이다. 단순히 코드가 GitHub에 저장되었다는 사실만으로 안전한 사용량을 확인했다고 할 수 없다.

근거: [Firebase 공식 Realtime Database 사용량 모니터링](https://firebase.google.com/docs/database/usage/monitor-usage), [Google Cloud Monitoring Metric Types](https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h), [Cloud Monitoring IAM 읽기 권한](https://docs.cloud.google.com/monitoring/access-control), [Firebase 가격표](https://firebase.google.com/pricing/).

### HTTP 403 원인 진단 (2026-11-11)

- [무료 사용량 확인 Actions](https://github.com/ishyun1227/nono-web/actions/workflows/server-random-bank-usage.yml)이 403을 반환하면 Google API의 **구조화된 오류 코드(ErrorInfo.reason)만** 분석해서 **결제 계정 필요 가능성, Cloud Monitoring API 비활성화, IAM 거부, OAuth 토큰 범위 부족, 프로젝트 소비자 제한**을 구분한다. 반환된 오류 원문, URL, 토큰, 서비스 계정 비공개 키는 출력하지 않는다.
- 프로젝트의 IAM 화면에서 확인한 계정은 `firebase-adminsdk-fbsvc@nono-web-ishyun-20261020.iam.gserviceaccount.com`이며, 기존 GitHub Secret의 `client_email`이 이 계정과 다른 경우 **조회 실패로 중단**한다. IAM에서 역할을 추가했다고 해서 GitHub가 반드시 해당 키를 사용한다는 보장은 없기 때문이다.
- **Spark 요금제의 Cloud Monitoring API가 결제 연결을 요구하는 경우** 별도의 요금제 변경 없이 API로 정확한 실사용량을 읽는 데 제한이 생길 수 있다. 이 경우에는 Cloud Monitoring 기준 사용량은 `정보 없음`으로 표시하되, 초기 집중 생성에서는 더 이상 이 API를 호출하지 않으며, [Firebase Console 사용량 탭](https://console.firebase.google.com/project/nono-web-ishyun-20261020/database)에서 직접 확인한다.
- 오류 코드만으로 원인을 확정할 수 없으면 `access_denied_unknown_cause`로 표기하며, 권한 재추가나 유료 전환을 임의로 진행하지 않는다.

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

## 크기·난이도별 실제 생성 성공률 누적 기록 (2026-11-11)

- 서버 실행기가 `randomBankStats/{size}_{difficulty}`에 **관리자 전용** 누적 통계를 기록한다. 웹 브라우저의 일반 계정에는 이 노드를 읽거나 쓸 수 있는 권한을 추가하지 않는다.
- `attempts`: 해당 분류를 목표로 생성 후보를 시도한 총 횟수. **`published`**: 실제 유일해 검증·서버 저장까지 성공한 수. **`failed`**: 나머지 후보 수. `successRatePct = published / attempts × 100`이다. 재고에 기존 퍼즐이 몇 개 있는지와는 별개다.
- `failures`: 난이도 불일치 `wrong_difficulty`, 논리 풀이 불확정 `logic_unknown`, 논리 오류 `logic_invalid`, 복수해 `uniqueness_multiple`, CaDiCaL 검증 시간 한도 `uniqueness_timeout`, 검증 오류 `uniqueness_error`, 인코딩 문제 `uniqueness_encoding_issue`, 중복 ID `duplicate_id`, 후보 생성 오류 `candidate_error`, DB 저장 오류 `publish_error` 등 **실패 원인별 누적 횟수**. 판정 상세가 없는 기존 유형은 `logic_unknown_or_invalid`, `uniqueness_unknown` 등으로 남긴다.
- `gradedByDifficulty`: 시도했던 후보 가운데 난이도 판정이 완료된 경우, 실제 판정된 쉬움·보통·어려움·전문가의 분포. 생성 실패·판정 불가 후보는 포함되지 않는다.
- `totalAttemptMs`: 후보 생성·난이도 분석·유일해 확인 및 발행 시도에 소요된 시간의 합계(밀리초). `avgAttemptMs`: 시도 1회당 평균. `avgMsPerPublished = totalAttemptMs / published`: 실패에 쓴 시간까지 포함한 **저장 성공 1개당 평균 소요 시간**. 성공 개수가 0이면 이 지표는 `null`이다. 통계 저장 작업 자체의 통신 시간과 실행기 준비 시간은 포함하지 않는다.
- 실행 중 측정치를 후보 10회마다(또는 실행 종료 시) 묶어 기록한다. Firebase에 후보마다 쓰는 방식이 아니다. 갑자기 중단되면 **마지막 기록 이후 최대 9회분** 통계는 누락될 수 있다. 이미 저장된 퍼즐을 지우거나 통계를 초기화하지 않는다.
- GitHub Actions의 `Server random puzzle bank refill` → 해당 실행 → **Summary**에서 이번 실행이 시도한 분류의 **누적 성공률, 저장 수, 평균 소요 시간, 가장 흔한 실패 원인**을 확인할 수 있다. 실제 생성 시도가 없는 분류의 누적 정보는 Firebase의 `randomBankStats`에 남지만 해당 실행 요약에는 표시되지 않는다.
- 이 기능을 적용한 이후부터만 누적한다. **과거 실행 로그나 기존 재고를 실제 성공률·소요 시간으로 소급 추정하지 않는다.** 초기 데이터가 없을 때 성공률은 `null`이며, 실제 예약 실행 성공 여부와 운영 Firebase 재고는 별도 확인해야 한다.

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

1. **기존 Firebase 서비스 계정 키를 그대로 쓰기로 한 결정에 맞춰** 기존 GitHub Actions 비밀정보 `FIREBASE_SERVICE_ACCOUNT_JSON`을 사용한다. 새 JSON을 발급하거나 기존 키를 재등록할 필요는 없다. 단, 이전에 노출된 관리자 키는 **제3자의 무단 접근 위험이 있다**. 이 위험은 키를 재사용하는 한 남는다.
2. GitHub [Actions → Activate production random puzzle bank](https://github.com/ishyun1227/nono-web/actions/workflows/activate-random-bank.yml)에서 **Run workflow**를 누르고 `confirm_project`에 `nono-web-ishyun-20261020`을 입력한다. 이 단계는 사용자의 명시적인 운영 규칙 배포·최초 퍼즐 생성 승인을 필요로 한다. **키나 비밀번호를 채팅·커밋·노션에 올리지 않는다.**
3. 실행기가 **현재 운영 Firebase 규칙**을 먼저 읽고 루트 읽기·쓰기 차단을 확인한다. 이후 `userCompleted`, `randomPuzzleBank`, `randomRestockRequests` 세 항목만 신규 규칙으로 갱신하고, **`rooms`를 포함한 다른 모든 기존 규칙은 그대로 보존**한다. Firebase가 규칙 조회에 ETag를 제공하면 조건부 갱신으로 동시 수정을 차단한다. **실제 운영 서버처럼 ETag가 반환되지 않으면**, 이 수동 승인 작업에서만 운영 규칙을 **두 번 읽어 일치하는지 확인**한 뒤 갱신한다. 이 대체 방식은 동시 편집을 완전히 막는 원자적 거래는 아니므로 해당 짧은 구간에서 다른 관리자가 규칙을 편집하지 않아야 한다. 규칙 활성화가 성공하면 **최대 2개**의 퍼즐로 운영 저장을 시험한다.
4. 첫 활성화 작업이 성공하면 **Server random puzzle bank refill**이 매시간 17분(UTC)에 자동으로 보충을 시도한다. 필요하면 별도로 수동 실행할 수 있다.
5. 실행 로그에서 `verified_random_bank_rules_activation`, `production_security_preflight_passed`와 `refill_complete`를 확인하고 `published` 수치 및 서버 `randomPuzzleBank` 실제 재고를 확인한다. **퍼즐 0개인 상태도 실행 성공으로 표시될 수 있어 실제 재고를 반드시 확인해야 한다.**

설정 파일: `.github/workflows/server-random-bank-refill.yml`, `.github/workflows/activate-random-bank.yml`, `tools/refill-random-bank.mjs`, `tools/random-bank-live-rules.mjs`, `tools/activate-random-bank-rules.mjs`. 생성기: `tools/random-bank-generator.mjs`, 보충 관리자: `tools/random-bank-refill-core.mjs`, 서버 인증: `tools/random-bank-admin.mjs`.

**보안:** 운영 Firebase 프로젝트·DB URL 고정 및 **실제 배포된 Firebase 규칙 검사**를 통과해야 쓰기 작업을 시작한다. 클라이언트의 `randomPuzzleBank` 쓰기 권한은 계속 금지한다. 서버 서비스 계정은 GitHub Actions 환경에만 주입하고 빌드 파일에 포함하지 않는다. 사용자 완료 관계 역시 개인 계정 아래에만 저장한다.

## 테스트

- `tests/random-bank-server.mjs`는 초기 집중 생성의 36개 분류별 목표 재고, 매시간 재개, **연속 24회 무진행 시 중지·새 재고 발생 시 재개**, 목표 달성 후 종료, 관리자 전용 shallow 재고 검사를 검증한다.
- `tests/random-bank-server.mjs`: 빈 버킷 100개 목표·부분 생성·다음 실행 재개·**크기·난이도별 균등 시도, 실행 간 시도 횟수 이월, 실패 분류의 독점 방지, 재고 부족 우선**·**누적 성공률·실패 원인·평균 시간·재시작 후 이월·10회 단위 통계 저장**·90개 완료→추가 목표 100개·중복 보충 방지·임의 요청 무시·안전하지 않은 퍼즐 발행 금지·실제 CaDiCaL 단일해 및 복수해·OAuth/REST 검증.
- `tests/random-puzzle-bank-rules.cjs`: Firebase 에뮬레이터에서 읽기 전용 재고와 완료 사용자만 작성하는 보충 요청 규칙 검증.
- `tests/random-puzzle-allocation.cjs`: 10개 남았을 때 계정당 요청 1회, 11개 남았을 때 미요청, 비회원 미요청.
- `.github/workflows/server-random-bank-tests.yml`: 계정 비밀키 없이 반복 가능한 CI 검사.

**실제 서비스 적용 기준:** CI 통과는 코드의 테스트 통과를 뜻한다. 운영 GitHub Secrets 설정, RTDB 규칙 배포, 생산 목표 완수, 최종 모바일 게임 운영 검증을 대신하지 않는다.
