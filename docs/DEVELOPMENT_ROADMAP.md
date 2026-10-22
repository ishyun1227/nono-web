# NONO development order — agreed 2026-10-22

## Working agreement
Do not keep building themes while fundamental NONO design or nonogram gameplay are unfinished. The default theme is the product baseline. Premium worlds become independent interface shells around the *finished* common gameplay engine.

## Phase 0 — reusable theme-design skill
- [x] Install .agents/skills/visual-world-builder with design process, unique feature ownership contract and test instructions.
- [x] Include checker for duplicate declared actions, invalid ornaments and Easter egg state changes.
- [ ] Verify skill in a real Codex session with a small design request; a static checker alone is not a skill execution test.

## Phase 1 — finish the default site (NEXT)
- [ ] Audit the default homepage and in-game interface for duplicated controls and incoherent UI.
- [ ] Define canonical site navigation, mode selection, puzzle picker, game controls, results, settings and profiles.
- [ ] Improve layout and visual style as one clear, attractive base theme without unnecessary performance/graphics options.
- [ ] Check mobile/tablet/desktop; accessible keyboard focus; typography; text fit and settings tabs.
- [ ] Validate that game/setup/player functions still work and no duplicate controls appear.
- [ ] Obtain user's acceptance of default design before treating Phase 1 as finished.

## Phase 2 — finish nonogram core and playable puzzles
- [ ] Verify board generation, grid sizes, difficulty, row/column clues, answer consistency and completion behavior.
- [ ] Verify keyboard mapping, arrow moves, Space fill, X, undo/redo, drag/touch, hint and settings behavior against previously agreed decisions.
- [ ] Verify save/resume, timer, progress, reset and accessibility.
- [ ] Verify real-time race, co-op, records, room join/reconnect, and back-end security with multiple clients.
- [ ] Build repeatable Playwright and emulator tests plus representative puzzle fixtures.
- [ ] Confirm what is genuinely complete vs pending in GitHub and Notion.

## Phase 3 — rebuild themes on the finished application
- [ ] Cheap color skins change palette without duplicating app shell.
- [ ] Premium worlds may use radically different structure; keep ONE home for each action.
- [ ] Fix terminal-theme duplication: Explorer AVAILABLE PUZZLES and Inventory PUZZLE CARTRIDGES currently offer the same puzzles. Keep one real selector; make the other pure themed decoration or harmless Easter egg.
- [ ] Audit every existing world (Arcade, Library, Forest, Cosmos, Terminal) against the new shared feature-ownership plan.
- [ ] Verify two clients using different themes during the same multiplayer session.
- [ ] Visually compare each implemented page with references and verify public deployment separately from CI.

## Phase 4 — progression & commerce (later, separately)
- [ ] Define point economy based on difficulty/size after difficulty and puzzle integrity are final.
- [ ] Server-authoritative puzzle completion, point ledger, purchase/ownership and non-abusable repeated-play rules.
- [ ] Replace "planned prices" with real prices ONLY when purchase and server-side ownership are implemented.
- [ ] Keep free color themes and high-cost premium worlds clearly distinguished.

## Progress reporting
For each milestone: record affected files/commit, test evidence, visual inspection evidence, Cloudflare deploy check, and unimplemented items. Do not confuse "documented" with "built".
