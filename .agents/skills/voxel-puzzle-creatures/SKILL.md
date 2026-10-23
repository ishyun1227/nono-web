---
name: voxel-puzzle-creatures
description: Create or refine brainrot and monster voxel assets as actual downloadable .vox files using code or voxel editing tools. Apply to requests to make these 3D assets, even when phrased as simply make a brainrot. Requires monochrome geometric detail and a fixed shared cube grid; image generation is not a substitute.
---

# Voxel puzzle creatures

## Required deliverable: a model file, never an image substitute

- Interpret character creation under this skill as a request for an actual editable 3D voxel asset. A raster picture of cubes, a concept image, a rendered-looking illustration or a prompt for an image generator does not fulfill the request.
- Before creating anything, establish whether the current environment can execute code or use a voxel editor and return a real downloadable `.vox` file. Having image generation tools alone is insufficient. If the required capabilities are absent, clearly report that limitation and stop asset creation; do not silently switch to image generation or promise a model that cannot be delivered.
- Do not invoke image-generation tools to produce the requested asset or its final preview. Use code or a voxel editor to construct integer-grid occupancy and serialize the model. If the user separately and explicitly requests concept art, treat that as a separate deliverable, not as completion of the model request.
- Deliver a clickable link to the actual `.vox` file. Do not claim completion with only a PNG, JPEG, screenshot, code listing or conceptual explanation. A renamed image with a `.vox` extension is not a model.
- Reopen and parse the exported `.vox`, checking its header, dimensions, voxel records and palette references (and scene placement for multi-model assets). Use the reopened geometry for preview rendering. A preview must depict the delivered model, never an independently generated approximation.
- In the final response, identify the model file first and label any rendered images as previews. If export or validation fails, fix it or state that the model is not yet complete; an image is not a fallback success.

## User's established direction

- Deliver actual integer-grid voxel geometry in `.vox`, with previews rendered from the same geometry. A generated picture is not the model.
- Follow the user's `nonomonster.zip` reference for blocky geometry when available. Its common 32/48-scale assets are historical examples, not a target resolution, default size, or maximum. Reinspect relevant reference models when available; do not depend on a temporary attachment path.
- Default to a single neutral, opaque material. Maximize readable geometric detail at the chosen grid resolution. Color is optional and secondary, introduced only when requested. Monochrome does not mean flat lighting: neutral shaded renders should reveal volume without painted shading.
- The sneaker-shark example was corrected for overly thick, uniformly extruded fins. Its overall appearance was not approved as a reusable character template.

## Detail, cell size and grid alignment

- Prioritize preserving meaningful geometric detail over keeping the model small. There is no user-imposed overall dimension or voxel-count cap. Increase the model's cell counts as needed for recognizable anatomy, facial features, surface relief and accessory construction; do not automatically fit assets into 32 or 48 cells.
- Use one fixed base cell size throughout the entire asset, including all body parts and accessories. Every occupied cell is an identically sized cube; dimensions along X, Y and Z are equal. Detail comes from arrangements of these cubes, never from smaller cubes or fractional-cell geometry inserted locally.
- Use one shared origin and axis-aligned integer lattice. All cell positions are integer coordinates on that lattice. No half-cell offsets, arbitrary per-part translations, tilted cubes, stretched cells or mixed voxel scales. Adjacent cells align face-to-face without offset seams.
- No overlapping or duplicate cells in the delivered asset: each world-grid coordinate may contain at most one voxel, across all parts, layers, chunks and model instances. Face-to-face contact is allowed; positive-volume intersection is not.
- When construction shapes intersect at a joint (such as an arm meeting the torso), merge their occupied cells into one unified occupancy set before export. Do not export intersecting solids as stacked copies, hidden duplicate blocks or interpenetrating submodels. Preserve intentional gaps between distinct parts and shape joints so accessories do not accidentally pass through anatomy.
- Validate overlap after applying every scene/instance transform into the shared world grid, not just by checking each local model separately. Require zero duplicate occupied world coordinates and zero off-grid partial intersections. Chunk boundaries must partition occupancy without double-owning boundary cells. Fix overlaps in geometry rather than hiding them with rendering or materials.
- Slopes, curves, rotated appendages and taper must be represented by stepped occupancy on the shared grid. Do not rotate an individual cube or leave a rotated submodel off-grid. Arbitrary-angle transforms must be revoxelized onto the same lattice before export; exact grid-preserving transforms may be used directly.
- Keep this cell scale consistent across the export, assembled submodels and model preview. Perspective and shading may change how a cube looks on screen, but must not change its actual geometry. Do not use smooth meshes or painted detail to disguise missing voxel geometry.
- Larger is useful only when it preserves real features: avoid enlarging an unchanged coarse model by duplicating each cell or adding arbitrary noisy surface bumps. Allocate resolution to readable, intentional detail and retain the single-material-first requirement.
- If format or tool limits prevent the required detail, report the concrete limit instead of silently reducing quality. Where supported, use aligned chunks/models with the same cell size and integer translations; do not assume a single-model format can store arbitrarily large coordinates.

## Shape decisions

- Model distinguishing features through volume, silhouette, recesses, protrusions, holes, and separation between parts. Eyes, mouth, teeth, gills, shoe uppers, soles and laces must remain legible without contrasting colors when those features matter for recognition.
- Do not merely replace all colors of a color-dependent model and call it a finished monochrome asset. Inspect which features disappear, then sculpt the requested features into geometry within the authorized scope.
- Fins and other naturally tapered parts must vary in thickness from a substantial attachment to a narrow tip/edge. Uniformly thinning an extruded plate does not resolve a taper complaint. Check thickness across the span and relevant edges as well as its side outline.
- Choose taper relative to resolution and anatomy. A 4-to-3-to-2-to-1-cell transition is an example, not a mandatory numeric recipe. Avoid arbitrary broad terraces, disconnected tips, or thick slab-like appendages.
- Keep intentional 1-cell tips when they improve shape; do not impose a universal 2-cell minimum. Check that reduced resolution still preserves important connections and recognizable features.
- For a targeted correction, preserve unrelated body proportions, colors, pose and accessories. A preference discussion or skill update alone does not authorize recoloring or rebuilding an existing asset.

## Workflow and checks

1. Use the supplied character or select one when the user authorizes an arbitrary example. Select resolution to preserve detail using the fixed-cell shared-grid rules above. Apply an overall size limit only if the user supplies one. Establish puzzle mode from context; clarify only consequential unresolved requirements.
2. Build the neutral-material geometry first. Give characteristic features sufficient grid space instead of relying on paint to imply them. Keep the solid/hollow interior policy explicit when it affects a 3D puzzle.
3. Inspect shaded views from opposing angles and orthographic silhouettes. Monochrome shaded recognition, silhouette recognition, and logical puzzle solvability are separate checks; do not conflate them.
4. Check actual bounds, palette references, connectivity and the zero-overlap rules above. Verify equal cube dimensions, a single cell scale, integer-grid positions and grid-preserving placement of every part, including scene transforms. Check world-coordinate uniqueness across the complete assembled asset, not only within each part. Face-connected versus diagonal-only contacts must be distinguished. Correct accidental floating pieces without joining intentional gaps blindly.
5. Read the exported file back to verify its actual dimensions, occupancy and palette. Render the delivered geometry; correct missing faces, sorting artifacts or clipping before presenting previews. Check taper from an angle that exposes thickness.
6. If color is requested, retain a neutral version and apply a separate palette pass to the same approved occupancy. If geometry must change, say so rather than presenting it as recoloring only.
7. Deliver the `.vox` and a clear preview. Report puzzle uniqueness/difficulty only if a solver actually checked them. Asset creation does not itself constitute a playable puzzle.

For preference updates, maintain these instructions without promoting unapproved examples or incidental parameters into permanent rules.
