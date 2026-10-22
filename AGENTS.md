# NONO agent project rules

Implementation order: (1) finish default UI, (2) finish playable nonogram/puzzle engine and verify, (3) only then rebuild optional premium themes. See docs/DEVELOPMENT_ROADMAP.md. This does not forbid urgent bug fixes or user-approved priority changes.

Use the project skill .agents/skills/visual-world-builder for image-referenced theme design. A premium theme may have a completely new layout, but must preserve actual app state and gameplay.

Never duplicate primary interaction paths or actual selectors just to fill decorative boxes. E.g. Explorer and Inventory must NOT both show an interactive puzzle picker. If a screen needs more visual depth, use clearly decorative, noninteractive elements or small harmless Easter eggs. Avoid fabricated scores, players, currency and game content.

Do not paste or crop reference screenshots to mimic a real UI. Build original semantic interactive components, CSS and appropriately sourced SVG/art.

Do not call a theme "fully implemented" without live visual review and functional tests. CI success does not prove Cloudflare published the latest build.
