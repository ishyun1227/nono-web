# From reference image to a distinct working visual world

## Design fingerprint (capture BEFORE coding)
Record these observations from the image:
- Page type and camera/composition (game HUD, desktop window manager, illustrated world, dashboard)
- Navigation and hierarchy (what occupies most attention, how the user starts a task)
- Materials (CRT scanlines, parchment, glass, wood, paper, pixel edges, organic forms)
- Typography (weight, optical density, serif/mono/pixel, contrast)
- Motifs/illustrations (ornament, scenery, repeated shapes), including assets that cannot be reused
- Color/value/lighting relationships, not just hex codes
- Component language (frames, cards, controls, progress indicators)
- Functional UI identifiable in the reference and nonfunctional story/detail
- Behavior which can be inferred vs must be verified
- Mobile layout strategy when the reference is desktop-only

## Distinguish the two product levels

Color theme: same information architecture, same functionality, different palette and optional subtle effects. Cheap tier.

Premium theme: different visual hierarchy and potentially different navigation model. It may use independent markup/route/layout, immersive environment, themed activity surface, animations, typographic system and custom components. Expensive tier.

Visual similarity is not measured by extracting image pixels. Recreate a style with actual programmatic graphics and DOM/CSS/SVG, preserving usable input.

## Work in this order
1. Capture source app features, screen states and layout constraints.
2. Build user flow and feature-ownership map.
3. Sketch a NEW premium sitemap/layout. The default page layout is NOT a constraint.
4. Specify unique, original decorative graphics and optional tiny Easter eggs.
5. Create functional components wired to real app data/events.
6. Compare real rendering to reference; adjust scales/materials/density.
7. Handle accessibility and mobile as designs, not emergency CSS overrides.

## Reference screenshot pitfalls
- Never hide the true application behind a screenshot and place invisible hit areas over it.
- Never cut pieces from the mockup into low-resolution background fragments to simulate cards or controls.
- Do not substitute one generic glyph or animal mascot into every mode tile.
- Do not implement RPG health/money/inventory just because reference art shows it; show genuine puzzle features only.
- Do not place the same list of available puzzles in two windows. A second window can be an atmospheric field journal with noninteractive lore or an Easter egg.
- Do not fabricate metrics, notifications, player names, chat or purchases.
- Do not say an image was sourced from a particular game or artist unless verified.
- Do not equate a successful CI job with a successful visual comparison or published deployment.

## Useful pattern: arcade terminal reference
Reference: green CRT desktop with multiple thick bordered windows.
Functional design choices: one Explorer for modes and puzzle selection; one Stats window for real time/progress; one Tools window for actions ONLY if needed; Properties can contain genuine help.
Inventory should NOT duplicate Explorer's puzzle choices. Replace it with a static illustrated cartridge shelf with no controls, an ambient animated sprite or a harmless Easter egg.
A screen designed like the reference is not the same as copying protected sprites or full game art.
