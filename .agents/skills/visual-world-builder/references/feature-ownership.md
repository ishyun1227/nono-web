# One feature, one canonical interactive placement

This document is a hard design gate, especially when a reference image has many windows.

## Build a feature matrix BEFORE writing any HTML
For each screen/context, identify:
1. Feature ID (for example choose-puzzle).
2. Shared application handler/state owner.
3. ONE interactive primary surface.
4. Any optional secondary trigger ONLY if justified and explicitly requested.
5. Decorative surfaces that are NOT triggers.
6. Accessibility name and keyboard/touch path.
7. A meaningful end-to-end test.

Example for a green CRT theme:

| Feature | Canonical surface | Other panels |
| --- | --- | --- |
| Select puzzle | Explorer / AVAILABLE PUZZLES | Inventory = noninteractive illustrated collectible shelf, no repeat puzzle list |
| Select mode | Explorer / GAME MODES | Player panel = read-only current mode |
| Fill / X | Board plus existing keyboard binding | Tool panel may be alternate input ONLY if user requested; otherwise visual guide |
| Timer/progress | Stats | Player window shows nickname and portrait rather than a duplicate timer |
| Open settings | Taskbar menu | Title-bar gear stays purely decorative unless the user explicitly wants shortcuts |
| Return home | Explorer back control | Other panels need no duplicate home button |

Multiple simultaneous views of the same DATA are permitted only where context truly differs and don't create competing interactive feature entry points. Keep the main action unique.

## Replace duplicates with GOOD decoration
- Art: hand-drawn maps, foliage, window panorama, lore illustration, star chart.
- Ambient elements: particles, faux radio static, fireplace, lantern, rotating compass; avoid motion for reduced-motion preference.
- Status ornament: labels like NONO.EXE, chapter marker, decorative stamp; not fake server numbers.
- Easter egg: click a non-obvious decorative star three times to reveal a short phrase or playful animation. No puzzle mutations, currencies, traps, sounds without user action, or hidden navigation.
- Be honest: placeholder game data must be explicitly marked as sample/demo, or omit it.

## Review test
Ask these in a visual review:
- Can a person choose the same puzzle from more than one main UI area?
- Are the same four mode cards repeated across panels?
- Do decorative panels pretend to be working inventory or stats?
- Are too many visible settings, back and theme buttons competing?
- Does each user action have a single dependable handler?
- If a theme is switched, is active gameplay identical before and after?

Write a theme contract, then run scripts/audit-contract.mjs. That static check will flag repeated feature IDs/surfaces and unsupported duplicates, but DOES NOT inspect the live DOM. A real browser audit remains mandatory.
