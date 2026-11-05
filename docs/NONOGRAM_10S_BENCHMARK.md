# Nonogram — 10-second, nine-way solver benchmark

**Verified run date: 2026-11-05**

- Latest GitHub Actions run: https://github.com/ishyun1227/nono-web/actions/runs/42005282153
- Benchmark source: https://github.com/ishyun1227/nono-web/blob/main/tests/benchmark-ten-seconds.mjs
- Upstream sources: `monkeyArms/nonogram@a61efe2` and `kniffen/Nonogram-Maker@de98a2e`. Original logic is retained; the latter has an initial-grid adapter for combined tests.
- Comparison: nine implementations × nine grid sizes (5, 10, 15, 20, 25, 30, 50, 75, 100) × three uniquely solvable fixtures (triangle, border, shuffled triangle) = **243 solver executions**.
- Outcomes: **226 fully solved, 5 partial, 12 timeouts**, no unverified "solved" verdict. This is one run with three designed fixtures per size—not a population benchmark of difficult puzzles.
- Each case uses an isolated Node child process with a hard timeout configured to **10,000ms** and internal algorithm deadline 9,700ms. Termination overhead may extend observed process wall time slightly beyond 10 seconds.
- `elapsedMs` measures solver work including CNF encoding and WASM startup where applicable but excluding the child process startup; `wallMs` in JSONL includes startup.
- Two or three solvers are run sequentially, passing confirmed cells between them; a slow early solver consumes the same shared 10s deadline.

## All sizes: average successful solve time and success count

**Important:** each cell says `time (successful/3)`. A mode with `2/3` has failed or timed out on the hardest fixture, so its fast average must not be ranked against a `3/3` solver without mentioning success rate.

| Size | monkeyArms | Nonogram-Maker | Adaptive | 2 original combined | 3 original (with CaDiCaL) | 3 logic (with Adaptive) | CaDiCaL | Adaptive 50% → CaDiCaL | Adaptive full → CaDiCaL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5×5 | 3.2ms (3/3) | 1.3ms (3/3) | 1.8ms (3/3) | 3.1ms (3/3) | 3.1ms (3/3) | 3.0ms (3/3) | 26.1ms (3/3) | 30.4ms (3/3) | 1.8ms (3/3) |
| 10×10 | 3.4ms (3/3) | 4.5ms (3/3) | 2.1ms (3/3) | 3.4ms (3/3) | 3.4ms (3/3) | 3.4ms (3/3) | 29.7ms (3/3) | 29.2ms (3/3) | 2.6ms (3/3) |
| 15×15 | 5.5ms (3/3) | 9.3ms (3/3) | 4.0ms (3/3) | 5.2ms (3/3) | 5.5ms (3/3) | 5.6ms (3/3) | 45.0ms (3/3) | 41.9ms (3/3) | 3.5ms (3/3) |
| 20×20 | 5.0ms (3/3) | 28.6ms (3/3) | 3.9ms (3/3) | 4.9ms (3/3) | 4.9ms (3/3) | 5.2ms (3/3) | 55.6ms (3/3) | 48.4ms (3/3) | 3.9ms (3/3) |
| 25×25 | 5.4ms (2/3) | 176.8ms (3/3) | 5.5ms (3/3) | 128.4ms (3/3) | 125.2ms (3/3) | 117.1ms (3/3) | 60.1ms (3/3) | 64.4ms (3/3) | 5.9ms (3/3) |
| 30×30 | 10.0ms (2/3) | 2359.9ms (3/3) | 10.9ms (3/3) | 1201.0ms (3/3) | 1126.1ms (3/3) | 1114.2ms (3/3) | 112.3ms (3/3) | 114.3ms (3/3) | 11.9ms (3/3) |
| 50×50 | 11.5ms (2/3) | 79.6ms (2/3) | 17.4ms (3/3) | 12.5ms (2/3) | 12.5ms (2/3) | 11.3ms (2/3) | 206.2ms (3/3) | 214.1ms (3/3) | 17.3ms (3/3) |
| 75×75 | 17.9ms (2/3) | 252.5ms (2/3) | 35.2ms (3/3) | 18.5ms (2/3) | 18.6ms (2/3) | 19.6ms (2/3) | 387.8ms (3/3) | 370.6ms (3/3) | 27.6ms (3/3) |
| 100×100 | 48.7ms (2/3) | 1557.3ms (2/3) | 141.5ms (3/3) | 46.7ms (2/3) | 47.5ms (2/3) | 45.7ms (2/3) | 1836.1ms (3/3) | 1632.8ms (3/3) | 139.8ms (3/3) |

## Shuffled triangle only: difficult structural fixture

| Size | monkeyArms | Nonogram-Maker | New Adaptive | Original 3-stage | CaDiCaL | 50% → CaDiCaL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 25×25 | 99.8% partial | 636.9ms | 13.8ms | 364.1ms | 132.9ms | 108.1ms |
| 30×30 | 99.3% partial | 7030.3ms | 18.3ms | 3358.6ms | 177.1ms | 155.9ms |
| 50×50 | 98.3% partial | TIMEOUT | 35.6ms | TIMEOUT | 424.5ms | 433.5ms |
| 75×75 | 92.8% partial | TIMEOUT | 81.9ms | TIMEOUT | 841.7ms | 739.5ms |
| 100×100 | 91.8% partial | TIMEOUT | 364.5ms | TIMEOUT | 4352.2ms | 3742.0ms |

The shuffled triangle is a row/column permutation of a Ferrers (nested-ones) matrix. Distinct row/column sums uniquely specify this matrix, so its uniqueness is not an assumption based solely on one retrieved solution. The border and ordinary triangle are also uniquely solvable by construction.

## Definitive mode definitions

1. **monkeyArms:** standalone original six-rule human-logic solver.
2. **Nonogram-Maker:** standalone original full line-pattern enumerator.
3. **Adaptive:** new solver switching between full arrangement enumeration and DFA dynamic programming with constrained-line and edge priorities.
4. **2 original combined:** monkeyArms then Nonogram-Maker until stable.
5. **3 original (with CaDiCaL):** monkeyArms → Nonogram-Maker → CaDiCaL as a completion fallback for unresolved cells. Uniqueness proof time is intentionally *not* included after a grid is already completely solved because the measured endpoint is completion, not uniqueness certification.
6. **3 logic (with Adaptive):** monkeyArms → Nonogram-Maker → Adaptive, with confirmed cells passed between stages.
7. **CaDiCaL:** direct SAT solve from the given nonogram clues (the benchmark's reference-exclusion clause is removed before solving, verified programmatically).
8. **Adaptive 50% → CaDiCaL:** run the Adaptive engine until at least 50% of all cells are known (both black and white), then pass those known values as SAT unit clauses and complete with CaDiCaL. If the first phase stalls, pass its partial state without inventing assignments.
9. **Adaptive full → CaDiCaL:** run Adaptive to logical fixpoint; invoke CaDiCaL only if unfinished. Adaptive finished all 27 fixtures in this corpus, so no SAT call was needed here.

## Interpretation

- **New Adaptive, Adaptive-full→CaDiCaL, CaDiCaL alone, and 50%-handoff all completed 27/27.**
- Original monkeyArms completed **22/27**; original Nonogram-Maker, the two-original combination, original three-stage combination, and the alternative three-logic combination each completed **24/27**.
- On the shuffled **100×100**, Adaptive completed in **364.45ms**; CaDiCaL alone in **4352.19ms**; 50%-handoff in **3741.99ms**. Thus pre-solving half saved ~14% over CaDiCaL-only but was ~10× slower than Adaptive alone on this case.
- On shuffled 50×50 through 100×100, original line enumeration is so expensive it reaches the 10s limit, preventing downstream stages in the fixed-order combinations from running. Ordering the solvers differently or imposing a smaller per-stage budget could change results.
- Recommended runtime strategy based on *these fixtures*: **Adaptive first, CaDiCaL only if Adaptive stalls**, not an unconditional switch at 50%. A hard, diverse, separately uniqueness-certified puzzle corpus and repeated runs are still needed before claiming a universal winner.

## Reproduction and artifacts

The latest run page above provides artifact files named `nonogram-benchmark-5`, `nonogram-benchmark-10`, …, `nonogram-benchmark-100`. Each JSONL archive contains all 27 attempts for its board size, including status, reason, solve percentage, 50% handoff percentage, elapsed time and wall time. This work modified the GitHub benchmark and library, **not the production website's puzzle-solving UI**.
