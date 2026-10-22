# Quality gates: prove it works AND looks intentional

## Gate 0 — Scope and base readiness
- If base UI is not finished, do not design more premium worlds before resolving the base unless the user explicitly reprioritizes.
- If puzzle mechanics are still incomplete, stabilize their behavior before adding themed wrappers.

## Gate 1 — Theme contract
- One primary interactive surface per action.
- No repeat choice lists in another functional panel.
- No pretend/unsourced point balances, stats, friends, chat, inventory or leaderboards.
- Nonfunctional decorative areas have no click affordance. Easter eggs have a bounded, harmless effect.
- Run: node .agents/skills/visual-world-builder/scripts/audit-contract.mjs path/to/theme-contract.json

## Gate 2 — Real visual review
- Compare 1440x900 (or reference ratio) and mobile 390x844 screenshots.
- Check landing page AND active puzzle board.
- Check panel titles, text length, controls, visual rhythm and icon clarity.
- Inspect whether original site's component layout still leaks into premium theme.
- On image-inspired work, inspect the reference and the *rendered result*, not only source CSS.
- Record actual differences; if browser/screenshots unavailable, do not mark this gate passed.

## Gate 3 — Functional regressions
- Open theme gallery; preview, apply, close/cancel and switch away while puzzle is active.
- Select one actual puzzle in one place; change size/difficulty if supported.
- Keyboard Arrow keys / Space / X / Undo / hint mode, pointer drag, touch when supported.
- Puzzle clues align exactly with actual filled answer cells; completion logic valid.
- Timer, mistakes, solved status, rankings only if supported by real data.
- Persistence across reload and returning from the theme.
- Multiplayer room join, real-time synchronization, no duplicated listeners or data loss when themes switch.
- Focus handling, labels, keyboard traps, visible focus, reduced motion.
- Browser console errors and overflow at desktop/tablet/mobile.

## Gate 4 — Evidence
Use clear evidence levels:
1. Source changed (commit)
2. Static checks passed
3. Automated functional tests passed
4. Human/visual rendering inspected
5. Public deployment separately verified

A passing GitHub Action does NOT imply public Cloudflare deployment was observed. Never upgrade an evidence level without proof.

## Release report
- Reference and interpretation limits.
- Primary functional placements and what was deliberately decorative.
- Files changed, commit and version.
- Build/tests run and pass/fail.
- Screens actually inspected.
- Deployment exact status.
- Known visual differences and missing functions.
