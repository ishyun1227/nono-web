---
name: nonogram-studio
version: 1.0.0
description: Create nonogram source art and real playable puzzles together. Use for puzzle-source-image design, pixel-grid conversion, clue generation, exact solution uniqueness checks, dense-feature fidelity checks, and bounded reject/repair/regenerate loops.
---

# Nonogram Studio · 통합 제작/검증 스킬

**One skill, not two disconnected instruction files.** Run real scripts, inspect outputs, and reject failures. The source-art generation is performed by the host's image generation/editing tool; deterministic conversion and verification use `scripts/nonogram.py`. All claimed validation must be backed by the saved `report.json`. Respond in the user's language.

## What this skill can and cannot execute

- **Executable now:** normalize actual image pixels to binary; try alternate grid sizes, thresholds and resampling; calculate real row/column clues; compute side-by-side comparisons and named hotspot proxies; exact uniqueness proof using MILP (unless timed out); line-overlap logical propagation; bounded small edge-cell uniqueness repair; export PNGs, JSON and reports.
- **Requires host AI tool:** generate or revise a new original/source image. This Python script **does not call an image-generation model or API**. Use an available image-generation/editing tool yourself, then pass the saved image to the script. If no host image tool or re-entry is available, honestly label source regeneration unavailable; don't invent a generated file.
- **Requires visual judgment:** semantically recognizable silhouette, teeth vs random pixels, eyes, layered body parts, emotional expression, human enjoyment. Numeric image similarity alone does not prove these.
- **Never guarantee eventual success.** Use bounded attempts; return explicit unfinished status if repeated trials fail.

## Exact workflow (mandatory)

1. **Lock the creative brief.** Extract user's essential identity cues and composition constraints. If they refer to a particular source image, use it; **do not silently substitute a new pose or different character.** If only a concept is supplied, create an original colored version if requested, and a separate binary version. Don't label a colored original as the binary source.
2. **Create the actual black/white source image** with a host image tool. Focus on robust filled masses and negative spaces, not thin black outlines beside a huge solid blob. No grids/clues/numbers drawn by image generation. Identify 3–6 subject-specific identity cues. Identify **micro-feature hotspots** (dense areas such as teeth, eyes, small holes/gaps, fold separations) that carry the identity. Each hotspot needs enough relative size and clearance at the intended grid size.
3. **Run deterministic trial conversion and solver**, adjusting sizes/regions to the user's chosen size. Example:

   ```bash
   python scripts/nonogram.py build \
     --image "/path/to/real-source.png" \
     --output "/path/to/result" \
     --sizes 30,35,40,45,50 \
     --hotspot 'mouth:0.43:0.30:0.80:0.54' \
     --hotspot 'eye:0.42:0.17:0.68:0.36' \
     --max-candidates 18 --solver-seconds 12 --repair-trials 12
   ```

   Coordinates for hotspot regions are **normalized 0–1 coordinates of the script's square, crop-aligned `source_binary.png`**, not the untrimmed upload. Inspect that generated image first to choose meaningful coordinates; example coordinates above are only placeholders. If the user specifies an exact grid size use `--sizes 30` instead of changing it silently. The tool supports square grids 5–100; extreme grids may time out or be computationally expensive.
4. **Read `report.json` (`next_action`, `failing_hotspots`), `comparison.png` and `answer.png`.** A returned PNG is not enough. Inspect the whole figure and each hotspot. In particular reject if teeth merge into a jagged patch, small white eye holes disappear, or overlapping parts change identity. High IoU is *not* grounds to overrule these failures. `source_binary.png` must preserve key identity. The `--hotspot` metric is only a proxy; it cannot recognize teeth semantically.
5. **Branch on actual evidence.**
   - If conversion/crop/threshold issue: the script already tried variants. If no acceptable one was selected, adjust candidate sizes/parameters and rerun.
   - If a few **noncritical boundary cells** may fix answer ambiguity: script may try `--repair-trials` bounded edge-only edits, logging every change. **Never silently alter a critical hotspot.** Recalculate clues and re-prove uniqueness after edits.
   - If the *source artwork* is structurally weak (critical hotspot merged, outline too thin, identity lost): **REJECT the source**. Use host image-edit/generation tool to change the actual **composition and black/white shape structure**, not merely rephrase the same prompt or bump grid size. Rerun from step 3 using the revised file.
   - If exact solver reports `multiple`, `unknown`, `invalid`, or lacks a proof: **not a verified unique nonogram**. `unknown` means timeout/error, not non-unique. Increase solver budget or revise.
   - If line propagation reports `stalled`, record this as a *limited solver stall*, not mathematical impossibility nor necessarily bad fun. For an easy puzzle, prefer a simpler source; for hard puzzles, reasoned assumptions may be appropriate.
6. **Bound the full AI image loop** at 3 source redesign attempts (or the user's explicit limit), and conversion/repair via CLI limits. If still unsuccessful, deliver the best **clearly labeled rejected/unverified candidate**, with exact reasons and next step. Never call such a result complete.
7. **Deliver** `source_binary.png`, `puzzle.png` (empty grid and authentic numbers), `answer.png`, `puzzle.json`, `comparison.png`, `report.json`; color art separately if requested. State whether exact uniqueness was **proved**, if logic propagation solved/stalled, which hotspots were visually inspected, and what was not verified. To recheck final export run:

   ```bash
   python scripts/nonogram.py verify --json "/path/to/result/puzzle.json" --solver-seconds 30
   ```

## Acceptance checklist: all must pass

- [ ] **Art fidelity:** correct original identity, viewpoint and key subparts; not a different lookalike.
- [ ] **Hotspot fidelity:** every identity-critical mouth/eye/teeth/etc. region inspected at actual cells; no collapse into noise.
- [ ] **Authenticity:** black/white answer is computed, not imagegen-drawn grid; clues match the exact final matrix.
- [ ] **Uniqueness:** `report.json` says `selected.uniqueness = unique`; proof uses a second-solution exclusion constraint, not merely discovery of one answer.
- [ ] **Playability:** clue display legible; line-logic trace and workload actually inspected. Use **estimated** difficulty/fun language, never fabricated research scores.
- [ ] **Audit trail:** any single-cell repair is recorded; failed regeneration clearly explained; `REQUIRES_VISUAL_REVIEW` is not itself a final semantic acceptance.

## File and dependency notes

- Script: `scripts/nonogram.py` (Python 3.10+, Pillow, numpy, scipy)
- Run tests: `python -m unittest discover -s tests -v`
- Setup: `python -m pip install -r requirements.txt` only where installs are supported.
- Exact solver uses SciPy/HiGHS MILP and may time out on large/highly ambiguous grids. A time-out is explicitly reported `unknown`.
- Further detail: `references/implementation-notes.md`

## What went wrong with earlier versions

A rule saying “reject and regenerate” is not a working automated loop. The old skills had no executable converter/solver and accepted an image after a failed mouth-region preview. This skill separates **tested deterministic checks** from the **host-required image regeneration** step. Do not say this ZIP alone causes automatic image generation on every device.
