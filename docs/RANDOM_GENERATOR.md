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
- 실제 정적 사이트 배포, 다양한 운영 브라우저의 Worker/WASM 구동 및 50~100칸의 5초 내 성공률은 **아직 별도 측정 필요**. 5초를 주어도 해당 크기의 모든 후보를 인증할 수 있다는 뜻이 아니다.
- 현재 `generate()`(동기식)는 기존 테스트 및 직접 API 사용자를 위해 v5 호환으로 남겨 둔다. 사이트 사용자 버튼은 `generateAsync()`(v6)를 사용한다.

## 출처
CaDiCaL WebAssembly: https://github.com/dgreensp/cadical-wasm
CaDiCaL 원본: https://github.com/arminbiere/cadical
