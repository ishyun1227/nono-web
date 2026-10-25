# Implementation and validation notes

## Exact uniqueness mechanism

1. Take the computed answer grid from the source image.
2. Calculate all row/column clues from that grid and validate totals.
3. Encode each possible legal *start position* of every run as a binary MILP variable, constrain exactly one start for each run, enforce one-cell separation and tie coverage to binary grid variables.
4. Add a no-good constraint forbidding the provided complete answer grid.
5. If the solver **proves infeasible**, the reference was the only solution (unique). If it finds another feasible binary grid with the same clues, multiple solutions exist. Timeouts/errors return `unknown`. This is exact for completed solver outcomes, not heuristic sampling.

The algorithm can be expensive at large puzzle sizes. `--solver-seconds` is a per-attempt budget, not total run time. If performance is too slow, narrow candidate count/grid sizes. No performance claims without testing a particular case.

## Logical trace limits

`logic_trace` computes every black/white cell forced by the present state of each row/column, and repeats until fixed point. It is a deterministic **line-domain propagation** model. It is not a full human deduction model and does not evaluate real enjoyment; status `stalled` does not show puzzle is illogical or requires arbitrary guessing. Some enjoyable hard nonograms deliberately require an assumption and contradiction.

## Visual similarity limits

Global IoU scores and named local IoU scores compare binary raster masks. These can catch loss of substantial shapes but do **not** know whether a tooth appears as a tooth. A host vision inspection is required for identity-critical micro-features. The source is rejected if a critical feature merges or changes identity even if quantitative IoU passes.

## Automatic retries and responsibility

Code automatically tries multiple threshold/resample/grid variants, and if the best clue set is ambiguous, may flip a single non-hotspot boundary cell in each bounded candidate to seek a proved unique puzzle. Each such action is logged in `report.json`. These are not arbitrary background decorations and there is no guarantee of success.

When the source artwork itself needs redesign, a caller with an image-generation/editing tool must perform that edit and rerun the script. **The ZIP cannot invoke that tool autonomously in every ChatGPT client.**

## Research

Roucairol, G. & Cazenave, T. (2024). *Generating Difficult and Fun Nonograms*: https://www.lamsade.dauphine.fr/~cazenave/papers/Nonogram2024.pdf

This study proposes solver-based difficulty/fun heuristics; the present package does **not** implement or claim their exact research scoring variables. Human enjoyment is not established by a mathematical score alone.
