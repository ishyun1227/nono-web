# 랜덤 노노그램 생성 v6 — 전문 CaDiCaL 유일해 인증 (2026-11-04)

## 핵심 원칙
- **무작위 배치 유지**: 그림·기하학적 실루엣을 일부러 생성하지 않는다. 검은 칸 목표 47~53%, 모든 행과 열에 최소 한 개의 검은 칸을 둔다.
- **유일해 필수**: 등록 전에 원래 정답과 다른 정답이 존재할 수 있는지 검사한다. 단 하나의 해라는 사실이 **증명된 경우만** 퍼즐을 저장한다.
- **유일해 외 재미도/난이도 평가는 보류**: 표기상 난이도는 아직 검증 등급이 아니다.
- **전체 생성 시도 제한 5초**: 퍼즐 생성·WASM 초기화·CNF 구성·SAT 검사·무작위 재시도를 포함한 브라우저 클라이언트 측 전체 상한이다. Worker를 강제 종료해 무한 대기를 막는다. 시간 초과는 퍼즐 생성 실패로 표시한다.
- **오류 발생 시 보수적으로 실패**: 전문 솔버 미로드, 타임아웃, SAT 증명 실패, 검사 중 예외 또는 브라우저 Worker 미지원이면 퍼즐을 등록하지 않는다.

## 사용 기술
- 전문 SAT 엔진: `cadical-wasm@0.1.2` (CaDiCaL CDCL SAT solver의 WebAssembly 컴파일 버전). 소스 및 문서: https://github.com/dgreensp/cadical-wasm
- `random-unique-worker.js`: 메인 스레드 블로킹을 피하는 모듈 Worker. `CaDiCaL.solve()`로 유일해 검증한다.
- `sat-nonogram-solver.js`의 `encode()`: 행·열 힌트의 DFA를 CNF 절로 변환하고, **기존 정답과 적어도 한 칸이 달라야 한다**는 차단 절을 추가한다.
- CaDiCaL 결과:
  - `unsatisfiable`(모든 다른 정답 불가능) ⇒ **유일해**.
  - `satisfiable` ⇒ **복수해**. 모델을 원래 힌트로 추가 대조한 후 새로운 후보를 생성한다.
  - `unknown` 또는 오류 ⇒ **판정 불가**. 유일해로 인정하지 않는다.
- 실험용 순수 JS DPLL 코드의 `check()`는 운영 판정으로 사용하지 않는다.
- `tools/build.cjs`가 `node_modules/cadical-wasm/dist/`의 JS/WASM 파일을 정적 `dist/vendor/cadical/`로 복사한다. 외부 CDN 의존성이 없다.

## 퍼즐 재현 및 멀티플레이
- 새 UI에서 `NONO_RANDOM_PUZZLES.generateAsync()`를 호출한다. 인증된 퍼즐만 `designVersion:6`으로 저장한다.
- 재시도 시 **새 시드로 다시 무작위 구성**한 다음 전문 솔버로 인증한다. 성공한 퍼즐의 실제 시드가 최종 저장된다.
- 이미 인증된 v6 퍼즐을 `fromSpec()`/ `answerFor()`로 읽거나, 대결/협동에서 같은 답을 다시 만들 때는 솔버를 재실행하지 않고 저장된 시드로 동일한 칸을 재구성한다.
- 버전 v1~v5는 이전의 정답과 시드 재현 방식 그대로 유지한다. **v1~v5에 새 인증을 소급하지 않는다.**
- 호스트가 공개 시드를 통해 정답을 알 수 있는 기존 구조는 그대로다. 치트 방지·서버 검증과 유일해는 별개 문제다.
- 배포 전 `database.rules.json`의 version 6 수용 규칙을 **운영 Firebase**에 별도로 적용해야 대결/협동 방이 작동할 수 있다.

## 검증 및 적용 상태
- `tests/random-puzzles.cjs`: 기존 v4 랜덤·v1~v5 호환 회귀 테스트.
- `tests/sat-uniqueness.cjs`: CNF/DPLL과 독립 완전탐색 일치·시간 초과 테스트.
- `tests/cadical-integration.mjs`: **실제 cadical-wasm**으로 작은 퍼즐의 SAT/UNSAT 결과를 기존 독립 검사기와 비교하고, 대안 정답도 재검증한다. `npm ci` 후 실행.
- **실제 Chromium 브라우저에서 Web Worker + CaDiCaL WASM 구동 성공**: 10×10 고정 시드 100의 유일해 생성 및 저장을 약 51ms에 수행했고, 별도 노노그램 검사기로 다시 유일성을 확인했다. Safari·Firefox 등 다른 브라우저는 아직 미검증이다.
- 운영 사이트 배포와 실제 Firebase 규칙 적용, 5×5~100×100 크기별 **다회 생성 성공률**은 아직 별도 검증 필요. 5초를 주어도 해당 크기의 모든 후보를 인증할 수 있다는 뜻이 아니다.
- 현재 `generate()`(동기식)는 기존 테스트 및 직접 API 사용자를 위해 v5 호환으로 남겨 둔다. 사이트 사용자 버튼은 `generateAsync()`(v6)를 사용한다.


## 2026-11-05 실측 결과 — 실제 CaDiCaL WASM

검증 PR #25를 사용한 GitHub Actions에서 `npm ci`, 정적 빌드, 독립 유일해 교차검사(8개 무작위 퍼즐 및 2개 결정적 고정 사례), 브라우저 Worker(Chromium, 10×10) 검사에 성공했다. 기존 퍼즐 호환성, 플레이 기록, 모바일 기능, 번역 및 멀티플레이 회귀 검사도 통과하여 검증용 변경을 `main`에 병합했다.

- 검증 실행: https://github.com/ishyun1227/nono-web/actions/runs/41981617081
- 브라우저·종합 검사: https://github.com/ishyun1227/nono-web/actions/runs/41981616938
- 검증 PR: https://github.com/ishyun1227/nono-web/pull/25
- 별도 생성 검사: https://github.com/ishyun1227/nono-web/blob/main/tests/browser-cadical-v6.cjs

난이도 보통, 시드 100, 크기별 1개 `version:4` 무작위 후보를 SAT CNF로 변환해 최대 5초 안에 판정했다. 시간은 GitHub의 Linux / Node.js CI 측정값이며, 일반 사용자의 휴대전화에서의 속도가 아니다.

| 크기 | 실제 처리 시간 | 판정 |
|---|---:|---|
| 5×5 | 22.5ms | 복수해 |
| 10×10 | 36.3ms | 유일해 |
| 15×15 | 62.4ms | 복수해 |
| 20×20 | 250.8ms | 복수해 |
| 25×25 | 298.1ms | 복수해 |
| 30×30 | 690.9ms | 복수해 |
| 50×50 | 3026.9ms | 복수해 |
| 75×75 | 5038.6ms | 판정 불가(시간 초과) |
| 100×100 | 5062.3ms | 판정 불가(시간 초과) |

이 표에서 유일해로 판정한 경우는 10×10 한 개이며, 다른 크기는 해당 무작위 후보가 **복수해**였거나 시간 초과된 것이다. `복수해`는 솔버의 오류가 아니라 해당 후보를 버리고 다시 만들어야 한다는 뜻이다. 크기당 1개 표본이므로 **전체 생성 성공률은 정보 없음**이다.

**배포 판단**: 전문 솔버가 동작한다는 사실은 확인했지만 75×75·100×100의 현재 5초 판정 능력이 부족하며, 여러 시드에 대한 랜덤 생성 성공률도 측정되지 않았다. 따라서 유일해를 보장하지 못하는 퍼즐을 등록하지 않는 정책을 유지하고, 운영 Firebase·사이트 배포는 별도로 검증해야 한다.

## 출처
CaDiCaL WebAssembly: https://github.com/dgreensp/cadical-wasm
CaDiCaL 원본: https://github.com/arminbiere/cadical
