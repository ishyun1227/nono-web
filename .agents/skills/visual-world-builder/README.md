# Visual World Builder — reusable skill

Converts a reference screenshot into a genuinely redesigned, working web/game interface. It treats a premium world as an independent experience instead of a color patch, refuses duplicated main actions, and protects underlying app state.

## Install and invoke
This folder is installed for this NONO repository at .agents/skills/visual-world-builder. Codex discovers project skills from .agents/skills.

Example invocation in Codex:
$visual-world-builder 참고 이미지를 기준으로 프리미엄 테마를 디자인해. 기존 박스 위치는 따르지 말고 기능을 반복하지 마. 장식이나 이스터에그는 가능하지만 실제 게임 기능은 유지해. 렌더링과 기능을 모두 검증해.

To use in other repositories, copy this entire folder into that project's .agents/skills directory. For personal installation, copy to ~/.agents/skills/visual-world-builder.

## Static contract check
1. Copy assets/theme-contract.example.json into your theme's working location.
2. Specify one primary surface per user-facing action.
3. Run: node .agents/skills/visual-world-builder/scripts/audit-contract.mjs path/to/theme-contract.json
4. Run included self-test: node .agents/skills/visual-world-builder/scripts/test-audit.mjs

The check documents design intent and detects declared duplicates. It does not inspect the browser DOM or guarantee the UI is good. Real rendering and game tests are mandatory.

## Important NONO development order
First finish the default NONO site. Then finish the nonogram engine and its puzzles. Then redesign premium themes to match the completed core. See references/nono-adapter.md and docs/DEVELOPMENT_ROADMAP.md in the repository.

Source of skill directory convention: https://learn.chatgpt.com/docs/customization/overview
