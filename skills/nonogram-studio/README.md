# Nonogram Studio v1.0 · one integrated agent skill

Inside:

- `SKILL.md`: agent instructions for source creation, rejection, repair, return-to-image-generation, output and acceptance.
- `scripts/nonogram.py`: executable image conversion, authentic clues, mathematical uniqueness test, logical line propagation, preview creation, bounded repair attempts.
- `tests/test_nonogram.py`: automated unit/integration tests.
- `references/implementation-notes.md`: exact methods, limits and claims.
- `examples/`: source-to-puzzle demonstrations where available.

For ChatGPT/mobile: this zip is a source skill bundle, **not an already-installed mobile plugin**. The script runs only in a host that supports a Python execution environment and required dependencies. Image generation/editing requires the host's separate tool.

To run: `python -m pip install -r requirements.txt`, then use the examples in `SKILL.md`.
