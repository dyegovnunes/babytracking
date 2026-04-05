# Design System Strategy: The Nocturnal Sanctuary

## 1. Overview & Creative North Star
The "Nocturnal Sanctuary" is the creative north star for this design system. We are designing for a specific, vulnerable user: the sleep-deprived parent navigating the "fourth trimester" in the dark of night. 

To move beyond the generic "baby app" aesthetic, we are discarding pastel clutter in favor of **High-End Digital Editorial**. This system prioritizes visual calm through deep, atmospheric layering and high-contrast legibility. We break the "template" look by utilizing intentional asymmetry in our timeline layouts and using "soft glows" as functional wayfinding tools rather than just decoration. The interface should feel like a premium concierge—authoritative, quiet, and profoundly clear.

---

## 2. Colors & Surface Logic
Our palette is rooted in the deep midnight of `#0d0a27`. This isn't just "dark mode"; it is a functional choice to reduce eye strain and blue-light stimulation during night feeds.

### The "No-Line" Rule
**Strict Mandate:** Prohibit the use of 1px solid borders for sectioning or containment. 
Boundaries are defined exclusively through background shifts. A `surface-container-low` section sitting on a `surface` background provides all the structural definition required. This creates a "seamless" interface that feels organic rather than mechanical.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the Material surface tiers to create "nested" depth:
- **Base Layer:** `surface` (#0d0a27) – The foundation.
- **Content Blocks:** `surface-container` (#181538) – Standard content areas.
- **Interactive Elements:** `surface-bright` (#2a2653) – Elements that need to "lift" toward the user.

### The "Glass & Gradient" Rule
To inject "soul" into the dark aesthetic, use Glassmorphism for floating elements (like the Bottom Sheet). Utilize `surface-variant` at 60% opacity with a 20px backdrop blur. For primary CTAs, apply a subtle linear gradient from `primary` (#b79fff) to `primary-container` (#ab8ffe) at a 135-degree angle.

---

## 3. Typography: The Editorial Voice
We utilize a dual-font approach to balance high-end sophistication with utility.

*   **Display & Headlines (Manrope):** Chosen for its wide apertures and modern geometric structure. It provides an authoritative yet "round" and comforting feel. Use `display-lg` for hero stats (e.g., "Last Fed: 2h ago") to ensure they are readable at arm's length in low light.
*   **Labels & Metadata (Plus Jakarta Sans):** A high-performance sans-serif used for technical data. The slightly tighter tracking in `label-sm` ensures that even complex timestamps remain legible in the vertical timeline.

**Hierarchy as Identity:** Use extreme scale contrast. Pair a `headline-lg` title with `body-sm` metadata to create an editorial layout that feels curated rather than crowded.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are forbidden. We achieve "lift" through light, not shadow.

*   **The Layering Principle:** Place a `surface-container-lowest` (#000000) card on a `surface-container-low` (#120f2f) section. This "recessed" look creates a soft, natural pocket for data without adding visual noise.
*   **Ambient Shadows:** For floating Bottom Sheets, use a diffused glow: `Shadow: 0px 20px 40px rgba(167, 139, 250, 0.08)`. The shadow color must be a tint of our `primary` token to mimic the ambient purple glow of the interface.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use the `outline-variant` (#474464) at 15% opacity. It should be felt, not seen.
*   **The Signature Glow:** Interactive icons (the 3x3 grid) should feature a 12px radial blur of the `primary` color behind the circular icon container, creating a "halo" effect that guides the thumb.

---

## 5. Components

### The Activity Grid (3x3 Buttons)
- **Style:** Large square tiles with `lg` (2rem) corner radius. 
- **Surface:** `surface-container-high`.
- **Inner Icon:** 48dp circular container using `primary-container`.
- **State:** On press, the background shifts to `primary-dim` and the "Soft Glow" increases in intensity.

### The Vertical Timeline
- **No Lines:** Avoid a continuous vertical line. Use the "Color-Coded Status Indicators" (8dp dots using `primary`, `tertiary`, or `error`) as the anchors.
- **Asymmetry:** Align timestamps to the far left (`label-md` in `on-surface-variant`) and activity descriptions to the right, using white space to separate events.

### Bottom Sheets (The "Drawer")
- **Radius:** `24px` top-only.
- **Surface:** `surface-container-highest` (#24204a) with a 60% opacity backdrop-blur.
- **The Signature Border:** A 2px top-only stroke using `primary-fixed` (#ab8ffe) to create a clear "handle" and visual entry point.

### Cards & Lists
- **Rule:** Forbid divider lines. Use `1.5rem` (spacing scale) vertical padding to separate list items. 
- **Contrast:** High-contrast text (`on-surface` #e7e2ff) is non-negotiable for primary data points.

### Inputs & Selection
- **Chips:** Use `full` radius. Unselected: `surface-variant`. Selected: `primary` with `on-primary` text.
- **Input Fields:** No bottom line. Use a `surface-container-low` filled box with `sm` (0.5rem) radius.

---

## 6. Do's and Don'ts

### Do:
- **DO** use the spacing scale religiously to create "breathing room." Fatigue is exacerbated by visual clutter.
- **DO** use the `tertiary` (#ff96b9) token for health-related alerts (fever, medication) to differentiate from routine tasks.
- **DO** ensure all touch targets are at least 48x48dp, accounting for the reduced motor precision of a tired parent.

### Don't:
- **DON'T** use pure white (#ffffff). It is too jarring in a dark room. Use `on-background` (#e7e2ff).
- **DON'T** use 100% opaque borders. They create "cages" for content.
- **DON'T** use "baby" icons (rattles, pacifiers) unless necessary. Stay premium, clean, and clinical-yet-warm.