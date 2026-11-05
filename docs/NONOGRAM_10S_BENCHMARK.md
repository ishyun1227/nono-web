# Nonogram solver benchmark — 10-second limit

- Date: 2026-11-05
- Workflow: https://github.com/ishyun1227/nono-web/actions/runs/42003712576
- Source: `tests/benchmark-ten-seconds.mjs`
- All 144 evaluations completed successfully (9 sizes × 2 fixtures × 8 modes).
- A hard **10,000ms process timeout** applies to each puzzle/mode. Inside the process, algorithm execution has a 9,700ms deadline.
- Measured `elapsedMs` includes algorithm and its solver initialization/encoding/WASM initialization, but excludes Node process cold-start; `wallMs` reports cold-start overhead separately.
- Fixture types: monotone filled triangle and an outline border. Both are uniquely solvable by construction. **These are low-complexity structural cases, not representative random difficult puzzles.**
- Each table cell is mean algorithm elapsed time across exactly two fixtures; the sample is too small for reliable general speed rankings.

## Average solve time (milliseconds)

| Size | monkeyArms | Nonogram-Maker | Adaptive | 2 combined | 3 combined | CaDiCaL | 50% → CaDiCaL | Full adaptive → CaDiCaL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5×5 | 2.23 | 1.00 | 1.29 | 2.21 | 2.19 | 18.25 | 19.27 | 1.29 |
| 10×10 | 3.58 | 4.06 | 2.15 | 3.50 | 3.50 | 29.61 | 35.76 | 2.13 |
| 15×15 | 4.78 | 7.49 | 2.93 | 5.13 | 4.81 | 40.03 | 44.49 | 2.95 |
| 20×20 | 6.58 | 11.43 | 4.52 | 7.61 | 7.14 | 55.23 | 58.29 | 4.38 |
| 25×25 | 8.91 | 16.61 | 5.64 | 8.93 | 7.98 | 82.21 | 80.73 | 6.79 |
| 30×30 | 9.29 | 24.32 | 7.98 | 9.88 | 10.07 | 76.16 | 95.88 | 8.11 |
| 50×50 | 18.39 | 105.52 | 16.41 | 19.27 | 18.57 | 152.83 | 158.24 | 12.36 |
| 75×75 | 21.32 | 354.28 | 15.53 | 22.02 | 21.24 | 194.77 | 213.99 | 14.28 |
| 100×100 | 45.53 | 1522.85 | 29.77 | 49.53 | 47.98 | 600.32 | 566.88 | 29.86 |

## Modes

- `monkey`: upstream monkeyArms/nonogram `a61efe2`, logical solver unchanged.
- `kniffen`: upstream kniffen/Nonogram-Maker `de98a2e`, logical solver unchanged.
- `adaptive`: this repository's adaptive line solver (enumeration ⇄ finite-state DP, constrained-line and edge priorities).
- `combine2`: monkeyArms + Nonogram-Maker alternating passes; the latter has an adapter that accepts already-determined cells.
- `combine3`: monkeyArms + Nonogram-Maker + Adaptive, alternating passes.
- `cadical`: CaDiCaL solving from row/column clues alone. Uses external CNF encoding with reference-blocking clause removed (verified by assertion).
- `adaptive50_cadical`: new solver until at least half the cells are logically determined (or it stalls), then resume the same grid through CaDiCaL unit clauses.
- `adaptivefull_cadical`: full Adaptive logical fixpoint; CaDiCaL only if the puzzle is still unfinished.

## Key observations and limitations

- On these easy structural examples, Adaptive is fastest at sizes 10–100, while Nonogram-Maker is fastest at 5×5. Because all three logical engines solve these cases fully, adding a solver often adds overhead without an opportunity for cooperation.
- At 100×100, the mean Adaptive time is 29.77ms, CaDiCaL-only 600.32ms, and 50%-handoff 566.88ms.
- All results are from exactly one GitHub Actions run. They do not establish what will be fastest on hard, randomly generated, or highly ambiguous puzzles.
- For authentic puzzle comparisons, add a corpus of separately verified unique, high-difficulty puzzles across sizes, then report median/p95 wall time, solve rate, and remaining unresolved percentage.
- `unknown` and timeout must never be presented as uniqueness proofs.

## Reproduction

GitHub Actions fetches both exact upstream source snapshots, installs `cadical-wasm@0.1.2` from the repository lockfile, and runs 9 parallel size jobs. Artifacts named `nonogram-benchmark-<size>` contain individual JSONL results.
