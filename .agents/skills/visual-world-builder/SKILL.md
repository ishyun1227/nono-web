---
name: visual-world-builder
description: Build real, functional website/game UI themes from reference screenshots. Use for color skins or radically redesigned premium worlds. Analyze the reference, freely redesign layout, prevent duplicated functions, preserve underlying behavior, and verify rendering. Do not use for image-only mockups or ordinary bug fixes.
---

# Visual World Builder

## Goal
Turn a user-supplied image into a working interface, not another image. The reference may inspire a wholly different site layout. A premium theme is NOT the default site's boxes rearranged or recolored.

## When to invoke
Use when asked to create a theme or redesign an existing app based on a screenshot, game, illustration, or UI reference. Do not activate for requests only to explain an image, produce an image, or fix an unrelated programming issue.

## Mandatory read order
1. This SKILL.md.
2. references/design-to-code.md for visual architecture.
3. references/feature-ownership.md before adding any controls.
4. references/verification.md before claiming completion.
5. references/nono-adapter.md only for NONO.

## Workflow

### 1. Inspect the real application and reference
- Locate the repository, actual entrypoints, app routes, state/data and feature owners. Read tests, settings and deployment rules before coding.
- Inspect the reference image directly. Write a short design fingerprint: spatial composition, navigation, colors, texture, borders, artwork, typography, interaction conventions and mood.
- Mark facts visible in the screenshot separately from interpretation. Never assert an unknown image's source or license without evidence.
- Identify the user's desired tier: color skin or premium world.

### 2. Lock feature ownership before drawing UI
- List each user-facing action and designate ONE canonical interactive home per screen/context.
- Do not repeat a puzzle selector in Explorer AND Inventory, add multiple settings menus with equal prominence, or duplicate status widgets simply to match a screenshot.
- If a second invocation is truly essential (for example, a mobile toolbar for the same action), document why and whether the user approved it. Otherwise remove it.
- Replace unused reference windows with clearly decorative, non-actionable illustrated surfaces, atmosphere, lore text, or tiny optional Easter eggs. Never invent functional player stats, currency, leaderboards, inventory items, multiplayer chat, or achievements.
- Decorative art must NOT look like a button, disabled control, or fake data table. Easter eggs must be optional, reversible, accessible, and must not change the puzzle/game state or grant unearned rewards.
- Write a theme contract using assets/theme-contract.example.json. Validate with node scripts/audit-contract.mjs PATH. This is a documentation/static guard, NOT a runtime test.

### 3. Build the correct tier
Color skin:
- Keep navigation, structure and component semantics. Update design tokens, palette and limited visual treatments.

Premium world:
- Design an independent sitemap and information hierarchy; do NOT copy the base layout or assign every old panel to a new window.
- Create distinct landing/home, main activity, settings/overlays, mobile layouts as needed. Preserve features, not their old coordinates.
- Define a theme-specific UI layer or framework route/layout with a clean adapter to shared business/game logic. Prefer shared components/state interfaces over duplicating core implementation.
- Keep the canonical DOM ownership stable. If moving mounted elements is unavoidable, ensure event listeners, focus, scroll, state, IDs and restoration work. Avoid competing MutationObservers that each move the same nodes.
- Create original vector/CSS graphics and real semantic controls. Do not paste screenshots or cropped concept art behind UI to imitate implementation.
- Use reference works for high-level style inspiration, not unauthorized reuse of proprietary characters, sprites, illustrations, logos, or exact trade dress.

### 4. Make it really playable
- Every visible control does its stated job. Decorative elements are not controls.
- Keep keyboard, pointer/touch, hints, undo, accessibility, mobile usability, settings, persistence and back-end operations that already exist.
- Theme switching during an active session must not erase or duplicate progress or disconnect a shared session.
- If a requested feature is not implemented, omit it or label it clearly as a future item; do not make a fake functional UI.

### 5. Inspect rendered output and iterate
- Render desktop and mobile, both home AND real activity screen, with the actual reference alongside.
- Check composition, hierarchy, typography, illustration quality, panel scale, spacing, borders, clarity and responsive behavior.
- Ask: "Could this be mistaken for the old site with changed colors?" If yes and tier is premium, revise architecture.
- Look for repeated controls and data presentations. Do not approve a page just because automated tests pass.

### 6. Test and deliver
- Run the project's syntax/build/tests plus representative UI workflows. Refer to references/verification.md.
- Test keyboard and focus, selecting/solving a real puzzle, switching modes, switching themes while playing, returning to base, mobile sizing, saved state, and multiplayer when applicable.
- Keep changes scoped to the requested phase. Do not start premium themes while base UI or puzzle engine are pending, unless the user explicitly changes priority.
- Report files/commits, tests actually run, what was visually inspected, whether deployment was separately verified, and remaining differences.
- Never claim "looks exactly like the reference" or "live deployed" without verifying those things.

## Done criteria
A premium theme has a distinct visual architecture, exactly one main placement for each feature, no fabricated functionality, playable underlying application, usable mobile layout, real visual review, passing relevant tests, reversible theme switching and truthful delivery notes.
