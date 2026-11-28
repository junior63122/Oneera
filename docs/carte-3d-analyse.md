# Map: 2.5D and real 3D — analysis (28/11/2026)

## What exists

- **The image provided** (`bdf_fest.webp`, 3000 × 1891) is already a **2.5D (isometric) view**, drawn by an illustrator. Its quality is excellent, and the app uses it as is, so the **2.5D view is already at the level of the image**.
- **The current "3D" button** only tilts this flat image in perspective. The buildings are painted into the image, so the tilt **stretches** them, for example the large facade at the bottom of the screen, instead of showing them in relief. You cannot walk around them, and the hidden sides do not exist. **This is not a real 3D plan.**

## What the documents ask for

- "Visualisation 2D/3D immersive du lieu" (why-the-map document, § 2 and § 6, BDF, ACTE).
- V1MAP asks for 2D only. The priority of 3D is not specified (F-032).
- This contradiction (X-06) is listed in `docs/conformite-documents.md`.

## Can the exact 3D plan be built from this single image?

**Not at "perfect quality".** One isometric drawing shows only two faces of each building. The other sides, the true heights and the floors do not exist in the image. Anything rebuilt from it would be guessed. Three serious options:

| Option | Result | Cost / constraint |
|---|---|---|
| **A. 3D model from the venue's plans** (Palais des Festivals: building plans or a drone scan), made by a 3D designer in the style of the illustration | Real 3D you can turn around, consistent with the 2.5D view; that same model also produces a perfect 2.5D (fixed camera) and any new venue | **Expense** (3D designer, or drone photogrammetry) and the plans to obtain from the venue |
| **B. AI generation "image → 3D"** (e.g. Meshy) from the illustration | Fast, but on a whole architectural scene the result is usually soft and approximate, far from "perfect" | Credits to buy (**expense**); a one-off test is possible |
| **C. Simplified 3D scale model coded here** (volumes extruded from the zones and building outlines, three.js), with the illustration kept for 2.5D | Clean, light, free; the exact positions of friends and zones are kept. Visually simpler than the illustration ("scale model" look). | No expense; several days of work; style to validate |

## Recommendation

1. **Right away (free):** keep the illustration as the 2.5D view. **Rename the current button** to "Inclinée" so it no longer promises real 3D, and remove the distortion at the edges (limit the tilt).
2. **For real 3D:** option **A**, which is the only one that meets "perfect quality". Option **C** can serve as an interim solution if you want it before the end of the event; option **B** only as a quick test.

**Decision expected from you:** budget for option A, a credits test for option B, or option C at no cost.
