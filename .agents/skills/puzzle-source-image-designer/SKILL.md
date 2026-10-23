---
name: puzzle-source-image-designer
description: Create puzzle-friendly source images of animals, objects, food, vehicles, monsters, and characters for later nonogram/picross conversion. Use for 퍼즐용 원본 이미지 or 노노그램용 이미지 requests. Produces actual images, not final grids, clues, uniqueness proofs, or 3D models.
---

# Puzzle Source Image Designer

Create recognizable original images that survive simplification into a nonogram. Default nonogram source images to pure binary black and white: only #000000 and #FFFFFF pixels, with no gray, gradients, shading, texture or antialiased intermediate colors. Optimize the source artwork, keeping image creation separate from final puzzle conversion. Respond in the user's language.

## Inputs and scope

Use the subject, reference image, category, intended grid size, view, style, must-keep features, and purpose when supplied. Otherwise choose a puzzle-friendly interpretation and briefly state the size/view chosen; do not ask a questionnaire. Preserve identity when using a reference. Ask for a missing reference only when faithful reproduction depends on it.

Distinguish a **general color original** from a **puzzle-ready black-and-white original**. A general original may use color and a general illustration style when requested; it is not the puzzle-ready deliverable. For puzzle requests, deliver the binary black-and-white version by default. If both are requested, provide two separately labeled images of the same character, preserving its identity, signature silhouette, eyes, mouth, limbs and meaningful negative spaces across versions. Do not substitute a color original or grayscale image for the binary puzzle source. An explicit request for a colored puzzle is an exception to the default; identify that exception clearly.

Deliver a real generated image, not only a concept or prompt, unless the user asks for planning only. Use the available built-in image-generation tool and its imagegen skill. For edits inspect the actual reference, pass it to the tool, and preserve its identity. If generation is unavailable, clearly report that limitation; a prompt is not a generated image.

## Essential design rules

1. **Readability first:** prioritize recognition at the intended small size over realism. Never rely on a detail that disappears when reduced.
2. **Distinctive contour:** preserve signature features: rabbit ears, crab claws and legs, bird beak and wings, elephant trunk, teapot handle and spout, vehicle roof and wheels, toaster box and slots. Avoid a generic blob.
3. **Preserve useful negative space:** retain gaps between ears, under arms, between legs, inside handles, windows, slots and open claws. Widen critical gaps when needed. Internal white facial marks are graphic expression, not necessarily physical holes through a 3D object.
4. **Separate parts:** keep legs, horns, wings, claws, handles and tails distinct from the body. Slight exaggeration of spacing/proportions is appropriate; do not erase identifying anatomy to simplify it.
5. **Simple intentional face:** when a face belongs to the subject, make eyes, nose and mouth clear, minimal, deliberately spaced shapes. Do not rely on tiny pupils or realistic shading. Do not add a face to an ordinary object unless requested.
6. **Pure binary black and white:** puzzle source pixels must be pure black (#000000) or pure white (#FFFFFF), with hard edges and no gray, color, gradients, shading, reflections, texture, fur/feather noise or antialiasing. Preserve identity through contour, deliberate internal white shapes and separated parts rather than color or a featureless solid silhouette. Color belongs to a separately requested general original unless the user explicitly requests a colored puzzle.
7. **One clear subject:** center the complete subject, keep distinctive extremities inside the frame, and omit scenery, unrelated props, labels, text, grids and clue numbers unless explicitly requested. Avoid overlapping subjects and excessive perspective.
8. **Background removal:** default the binary puzzle source to an opaque pure white background so the entire image contains only two colors. Preserve deliberate white interior shapes such as eyes and mouth. For a general original, retain the genuinely transparent background default using the image tool's transparency option unless the user requests another background. If a transparent puzzle source is explicitly requested, provide it as a separately labeled cutout with binary alpha (fully opaque or fully transparent), preserve opaque white interior marks, and also provide the opaque white-background binary version. A checkerboard drawn into the picture is not transparency.
9. **Puzzle interest:** seek readable internal structure and useful empty spaces instead of one solid mass. Symmetry can help recognition; do not add random asymmetry/noise just to imply difficulty. Visual appeal alone cannot prove uniqueness, difficulty or fun.

## View selection

- Front: expressive faces, mascots, monsters, robot heads and toaster creatures; useful symmetry and front details.
- Side: distinctive profiles and long forms such as birds, fish, cars, airplanes and dinosaurs.
- Top: spread/radial forms such as crabs, spiders, starfish, helicopters and flowers.
- Three-quarter: only when iconic parts remain separate and readable after simplification. Avoid if perspective merges them.

Honor an explicit requested view; explain any resulting limitation rather than silently changing it.

## Size-aware design

These ranges describe the future puzzle, not the resolution of the generated image. Do not claim an image-generation tool produced an exact cell grid.

| Label | Intended grid | Design budget |
| --- | --- | --- |
| 작음 / Small | 5×5–9×9 | Very simple silhouette, 1–2 defining traits; face only if it remains legible. |
| 중간 / Medium | 10×10–15×15 | Simple face when relevant, separate limbs, 2–4 defining traits. |
| 큼 / Large | 16×16–20×20 | Clear internal shapes, expressive silhouette, deliberate negative spaces. |
| 거대 / Huge | 21×21–30×30 | Facial/structural details and more complex limbs, still no texture noise. |

Honor other requested dimensions. If unspecified, choose the smallest range that plausibly preserves the defining features. A complex character may need Large/Huge; a 5×5 source cannot preserve every feature. Explain the tradeoff and keep the requested size unless the user changes it. Plan critical marks and gaps to survive at least one target cell, preferably two when space allows; this is a design estimate until a separate conversion measures it.

## Category cues

- Animals: ears/horns, beak/snout/trunk, eyes, tail, spaced legs and wing/claw shape; no reliance on fur or feather marks.
- Objects: functional outline, holes, handles, windows, controls. Teapot: handle/spout/lid; toaster: slots/lever/box; scissors: finger holes/blades.
- Food: recognizable contour; only large simple toppings or useful cut sections.
- Vehicles: roof/profile, wheels or wings, windows and characteristic structure; avoid wheel/body mergers.
- Creatures/characters: preserve one or two signature traits plus readable face and limbs. Keep unusual asymmetry when it defines identity and still reads.

## Generate, inspect, deliver

1. Identify the essential cues and best view. Translate them into an image brief including size, gaps, face, contrast and omissions. Select the deliverable type explicitly: general color original, binary puzzle source, or both.
2. Generate the actual source image with available image tools. Example intent: “A single [subject], [view], designed for a later [size] nonogram. Preserve [signature traits], separate [parts], retain [gaps], use simple readable [facial/structural marks], pure #000000 and #FFFFFF binary pixels only, hard-edged flat shapes on an opaque pure white background, no gray, other colors, antialiasing, gradients, scenery, texture, shading, shadows, text, grid or clues.” Adapt rather than blindly repeat this template.
3. Inspect the returned image. Check contour recognition, survival of defining details at small display size, merged limbs, gaps, face clarity, complete framing, background and clutter. For the puzzle source, check that eyes, mouth, limbs and internal white gaps retain the original identity rather than disappearing into a solid silhouette. Inspect the final decoded image pixels when file access is available: require the color set to be a subset of {#000000, #FFFFFF} with fully opaque alpha for the standard output. Visual inspection alone does not verify binary pixels; disclose if pixel validation was unavailable and do not call an unverified file pixel-validated. If gray or extra colors remain, request a targeted correction; when image-editing rules and user authorization allow deterministic thresholding, inspect the result again for lost facial marks, merged limbs and closed gaps and validate its pixels before delivery. A mental estimate is not a measured downsampling test; disclose what was actually checked. If a critical cue failed, request a targeted image edit and inspect again. After two unsuccessful corrections, report the remaining issue rather than promise a successful result.
4. Show the image, label it as “퍼즐용 흑백 원본” or “컬러 일반 원본” as appropriate, and provide concise notes: emphasized features, reason for view, recommended size range, features that the later converter must preserve, and any unresolved limitations.

## Separate downstream handoff

Stop at source-image creation unless conversion was also requested. Do not generate decorative clue numbers or claim a solvable/unique puzzle from the image alone. Later conversion is a distinct process: choose exact dimensions, simplify/resample while preserving binary pixels (binarize only if the input is not already binary), manually preserve features, crop only exterior empty margins, derive clues from the actual bitmap, test uniqueness and logical difficulty, then revise and retest. Never delete internal empty rows/columns merely to remove zero clues if doing so collapses meaningful spacing. A 3D model, if wanted, is another separate output based on the shared reference.

## Example requests

- “귀여운 게를 15×15 퍼즐용 원본 이미지로 만들어줘”: front/top, open claws and separated legs, simple visible eyes, no shell texture.
- “토스터 괴물 25×25 원본 이미지”: readable front, slot gaps, box outline, lever/face and separated legs.
- “부엉이 퍼즐용 이미지”: front view, large separated eyes, simple wing/body mass and visible feet if space permits.
- “5×5 사과 퍼즐용 이미지”: minimal apple contour and stem; no unnecessary face or texture.
- “자동차 20×20 퍼즐용 원본”: side profile, two distinct wheels, roofline and simple windows.
