# Nonogram solver 10-second benchmark — final three-fixture matrix

**Last updated: 2026-11-05.** Real execution on GitHub Actions, `cadical-wasm@0.1.2`.

- Final run: https://github.com/ishyun1227/nono-web/actions/runs/42004561929
- Initial two-fixture run: https://github.com/ishyun1227/nono-web/actions/runs/42003712576
- Code: `tests/benchmark-ten-seconds.mjs`, workflow: `.github/workflows/benchmark-ten-seconds.yml`.
- **216 independent evaluations**: 9 sizes × 3 proven-unique structural fixtures × 8 modes.
- Results: **202 solved, 5 partial and 9 timeouts**. All finished models validated against their references.
- Each solver/case runs in its own Node child process with a hard **10,000ms timeout** and an in-child 9,700ms deadline. Due to process teardown, a hard timeout's measured wall duration may slightly exceed 10,000ms.
- `elapsedMs` measures the algorithm and SAT encoding+WASM initialization where applicable, **excluding child process startup**. `wallMs` (in the uploaded JSONL) includes startup.
- Each fixture is run **once**, not repeated statistics. Mean timings below include successful cases only; **n/3 is crucial** when comparing speed.
- All three fixtures have exactly one solution by construction: (1) triangular Ferrers grid, (2) frame border, (3) deterministic independent permutation of the triangle's row and column order. For (3), distinct row and column sums and nested fill sets uniquely determine the matrix. These are not representative arbitrary hard puzzles.

## 3-fixture results: solved-case mean time, success count

| Size | monkeyArms | Nonogram-Maker | Adaptive | Combine 2 | Combine 3 | CaDiCaL | Adaptive 50% → CaDiCaL | Adaptive full → CaDiCaL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5×5 | 2.1 ms (3/3) | 1.0 ms (3/3) | 1.2 ms (3/3) | 2.1 ms (3/3) | 2.1 ms (3/3) | 19.0 ms (3/3) | 19.1 ms (3/3) | 1.2 ms (3/3) |
| 10×10 | 3.4 ms (3/3) | 3.9 ms (3/3) | 2.1 ms (3/3) | 3.4 ms (3/3) | 3.4 ms (3/3) | 28.3 ms (3/3) | 28.6 ms (3/3) | 2.2 ms (3/3) |
| 15×15 | 5.5 ms (3/3) | 10.6 ms (3/3) | 3.8 ms (3/3) | 5.7 ms (3/3) | 5.7 ms (3/3) | 47.9 ms (3/3) | 44.4 ms (3/3) | 4.1 ms (3/3) |
| 20×20 | 8.2 ms (3/3) | 56.6 ms (3/3) | 5.6 ms (3/3) | 7.2 ms (3/3) | 8.4 ms (3/3) | 84.7 ms (3/3) | 74.5 ms (3/3) | 6.0 ms (3/3) |
| 25×25 | 9.6 ms (2/3) | 223.8 ms (3/3) | 9.3 ms (3/3) | 159.7 ms (3/3) | 158.4 ms (3/3) | 109.9 ms (3/3) | 91.7 ms (3/3) | 9.7 ms (3/3) |
| 30×30 | 7.9 ms (2/3) | 1960.8 ms (3/3) | 9.8 ms (3/3) | 972.3 ms (3/3) | 985.7 ms (3/3) | 88.7 ms (3/3) | 80.7 ms (3/3) | 8.1 ms (3/3) |
| 50×50 | 15.0 ms (2/3) | 108.0 ms (2/3) | 25.1 ms (3/3) | 16.8 ms (2/3) | 18.0 ms (2/3) | 284.6 ms (3/3) | 304.6 ms (3/3) | 23.1 ms (3/3) |
| 75×75 | 32.3 ms (2/3) | 419.2 ms (2/3) | 48.3 ms (3/3) | 34.2 ms (2/3) | 35.1 ms (2/3) | 652.2 ms (3/3) | 626.8 ms (3/3) | 47.1 ms (3/3) |
| 100×100 | 26.3 ms (2/3) | 1239.1 ms (2/3) | 92.6 ms (3/3) | 29.7 ms (2/3) | 28.3 ms (2/3) | 1226.1 ms (3/3) | 1062.4 ms (3/3) | 93.6 ms (3/3) |

## Shuffled triangle only (the harder of the three)

| Size | monkeyArms | Nonogram-Maker | Adaptive | Combine 2 | Combine 3 | CaDiCaL | Adaptive 50% → CaDiCaL | Adaptive full → CaDiCaL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 25×25 | 99.8% partial | 636.9 ms | 13.8 ms | 460.8 ms | 459.5 ms | 132.9 ms | 108.1 ms | 14.9 ms |
| 30×30 | 99.3% partial | 5847.8 ms | 17.4 ms | 2900.8 ms | 2940.8 ms | 144.3 ms | 119.0 ms | 13.5 ms |
| 50×50 | 98.3% partial | TIMEOUT | 46.0 ms | TIMEOUT | TIMEOUT | 567.7 ms | 607.4 ms | 47.9 ms |
| 75×75 | 92.8% partial | TIMEOUT | 102.1 ms | TIMEOUT | TIMEOUT | 1422.9 ms | 1281.4 ms | 98.7 ms |
| 100×100 | 91.8% partial | TIMEOUT | 240.7 ms | TIMEOUT | TIMEOUT | 2924.0 ms | 2470.7 ms | 246.1 ms |

## Mode definitions

- **monkeyArms**: original MIT-licensed `monkeyArms/nonogram` source at commit `a61efe2` (its native logical rules).
- **Nonogram-Maker**: original MIT-licensed `kniffen/Nonogram-Maker` source at `de98a2e` (native line placement enumerator). Combined modes adapt the function signature to accept previously fixed cells without changing its underlying enumeration logic.
- **Adaptive**: repository's new enumeration/DP line solver, prioritizing constrained lines and edges.
- **Combine 2**: run monkeyArms then Nonogram-Maker, sharing fixed cells, repeat as needed.
- **Combine 3**: monkeyArms then Nonogram-Maker then Adaptive, sharing fixed cells. Order matters because a slow earlier stage can consume the entire deadline.
- **CaDiCaL**: solve from clues through encoded DFA CNF, removing the reference-exclusion clause (asserted correct); output independently validated.
- **Adaptive 50% → CaDiCaL**: stop new logic after at least half of **all black AND white cells** are proven, hand known cells to CaDiCaL as unit clauses; if logic stalls early, hand off what it has.
- **Adaptive full → CaDiCaL**: run new logic to its fixpoint, use CaDiCaL only if unsolved. In this corpus the adaptive logic always finished, so CaDiCaL was never invoked for that mode.

## Observations

- **Adaptive solved 27/27**, as did CaDiCaL alone, Adaptive 50%→CaDiCaL, and full Adaptive→CaDiCaL.
- Original monkeyArms solved **22/27**; Nonogram-Maker 24/27; Combine 2 24/27; Combine 3 24/27.
- The shuffled 100×100 board: monkeyArms left 91.8% solved; Nonogram-Maker and both fixed-order combinations hit 10s; new Adaptive finished in 240.66ms; CaDiCaL alone 2923.96ms; Adaptive 50%→CaDiCaL 2470.68ms.
- The fixed 50% switch can sometimes accelerate CaDiCaL versus CaDiCaL alone, but it is much slower than allowing Adaptive to finish when the puzzle is straightforward. Best engineering default from this evidence: **Adaptive first; invoke CaDiCaL only upon logical stall or a configured meaningful time budget**.
- These limited structural cases do **not** establish success or speed on arbitrarily challenging uniquely solvable nonograms. Those require a separately proven unique corpus with adequate repetitions.

## Evidence and reproduction

GitHub Actions artifact names `nonogram-benchmark-5`, `nonogram-benchmark-10`, ..., `nonogram-benchmark-100` each contain 24 per-mode JSONL records. Source snapshots are fetched from pinned upstream commits, not unofficial rewrites. Neither the website's live player nor production puzzle generation was changed by this benchmark.
