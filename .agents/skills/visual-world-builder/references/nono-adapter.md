# NONO project-specific adapter (ishyun1227/nono-web)

This file documents project context, not a claim that current production has been retested.

## Current implementation map
- GitHub: ishyun1227/nono-web.
- Deployment: Cloudflare Workers, source branch main.
- Main screen/game: index.html and settings.js.
- Cosmetic gallery: themes.js.
- Examples of currently separate premium worlds: forest-world.js and terminal-world.js.
- Backend: Firebase Realtime Database and guest authentication.
- Repository tests include Playwright browser smoke and Firebase emulator multiplayer tests.

Inspect the live repository on every invocation; the paths above can change.

## Confirmed user priorities as of 2026-10-22
1. First create and use the reusable design skill.
2. Next finish the standard/default NONO website and its core screen design; remove redundant controls and confusing settings/UI. Treat this as the visual and information architecture baseline.
3. Next complete the actual nonogram puzzle engine/gameplay and verify clues, solving, input, saving, keyboard and multiplayer behavior.
4. Only AFTER those are stable, rebuild premium worlds according to the finished engine and shared app state. Cheaper color themes may preserve the default layout. Premium themes may replace the UI architecture entirely.
Do not do steps 2-4 all at once without scope agreement, and do not present them as complete merely because documentation exists.

## Known duplicate to eliminate in future premium rebuild
The terminal screenshot has AVAILABLE PUZZLES in the Explorer and PUZZLE CARTRIDGES in Inventory. Both appear to offer the same real puzzle choices, which violates the single primary chooser rule. During the later theme-redesign phase, remove the duplicate chooser: keep selection only in Explorer and use Inventory for noninteractive cartridge decorations, or an Easter egg unrelated to puzzle selection.

## Core application behavior that should survive any redesign
- Puzzle grid, column/row clues and answer validation must be consistent.
- Arrow keys, Space fill, X mark, undo/redo, mouse/touch behavior.
- H hints, Tab overview, configurable settings where supported by current engine.
- Mode switching: solo, multiplayer race, co-op, records.
- Save/resume and progress identity, Firebase state and room logic.
- Only truthful account/point balance, never a fabricated inventory/shop.

## Technical caution
Present premium worlds may physically re-parent #setup / #game / #toast into theme containers. Before modifying, inspect how theme switch observers interact. Prefer a single controller / wrapper abstraction rather than layering another observer that moves the same live node. Revisit after core game stabilizes.

## Later implementation tests to add
- DOM uniqueness and actual one-surface action audit.
- Theme change mid-puzzle retains active cells, timer and settings.
- Multiplayer with clients on different themes.
- Browser reload and session restoration.
- Visual snapshot/a11y for every default and premium screen.
