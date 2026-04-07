# Design System Document

## 1. Overview & Creative North Star: "The Celestial Cradle"

The design system is built upon the **Creative North Star: The Celestial Cradle**. For Brazilian parents, the transition into parenthood is a mix of profound love and overwhelming exhaustion. This system moves away from the "clinical and cold" aesthetic of typical tracking apps, opting instead for a high-end, editorial experience that feels like a midnight sky—calm, deep, and supportive.

We break the "template" look by rejecting rigid, boxy layouts. Instead, we use **intentional asymmetry**, where elements appear to float in a weightless, cosmic environment. By layering semi-transparent surfaces and using expansive typography, we create an interface that feels like a "warm best friend"—authoritative yet deeply empathetic.

---

## 2. Colors & Surface Philosophy

Our palette is rooted in deep violets and soft blushes, designed to be easy on the eyes during late-night feedings while maintaining a premium, "commercially persuasive" edge.

### Color Tokens (Material Design 3 Mapping)
*   **Background:** `#0d0a27` (The void; deep, infinite, and calming)
*   **Primary:** `#d0c0ff` (The guiding light)
*   **Primary Container:** `#b79fff` (The active energy)
*   **Secondary (Glow): `#cebdff`
*   **Tertiary (Blush):** `#ffb4cb` (Humanity and warmth)
*   **Surface Tiers:**
    *   `surface-container-lowest`: `#0d0a27`
    *   `surface-container-low`: `#1a1835`
    *   `surface-container-high`: `#292644`
    *   `surface-container-highest`: `#343150`

### The "No-Line" Rule
**Strict Mandate:** Prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or subtle tonal transitions.
*   Instead of a line between the header and body, transition from `surface` to `surface-container-low`.
*   To separate list items, use vertical whitespace (16px–24px) rather than dividers.

### The "Glass & Gradient" Rule
To achieve a bespoke feel, use **Glassmorphism** for all floating UI elements (Modals, Navigation Bars, Quick-Action Cards).
*   **Formula:** `surface-container-high` at 60% opacity + `backdrop-blur: 20px`.
*   **Signature Textures:** Use a subtle linear gradient for main CTAs: `primary-container` (#b79fff) to `secondary-container` (#4f319c) at a 135° angle. This adds "soul" and depth that flat colors cannot replicate.

---

## 3. Typography: Editorial Authority

We pair the geometric confidence of **Manrope** with the modern warmth of **Plus Jakarta Sans**.

*   **Display & Headlines (Manrope):** Set in ExtraBold or Bold. These should feel large and evocative. Use `display-lg` for milestones (e.g., "1 month old") to create a sense of celebration.
*   **Body & Titles (Plus Jakarta Sans):** Chosen for its high x-height and readability. Use `body-lg` for the "best friend" voice—conversational tips and insights.
*   **Hierarchy as Identity:** Brazilian Portuguese can be wordy; use generous leading (1.5x) and `title-lg` for section headers to ensure the UI feels editorial rather than cluttered.

---

## 4. Elevation & Depth: Tonal Layering

We eschew traditional drop shadows in favor of **Ambient Luminosity**.

*   **The Layering Principle:** Stacking tiers creates organic lift. Place a `surface-container-highest` card on a `surface-container-low` section. The contrast provides all the "elevation" needed.
*   **Ambient Shadows:** For high-priority floating elements, use an "Aura" shadow. 
    *   *Color:* `#ab8ffe` (Primary Glow) at 8% opacity.
    *   *Blur:* 40px–60px.
    *   *Spread:* -5px.
*   **The "Ghost Border" Fallback:** If a container requires more definition against a complex background, use a `outline-variant` token at **15% opacity**. It should feel like a faint reflection on glass, never a "line."

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary-container` to `secondary-container`). `XL` roundedness (1.5rem). High-contrast `on-primary` text.
*   **Secondary:** Glassmorphic background with a "Ghost Border."
*   **Tertiary:** No background; `primary` text color with an icon.

### Cards (The "Cradle" Card)
*   Forbid dividers. Use `surface-container-low` for the card body. 
*   Incorporate a 15% opacity purple glow (`#ab8ffe`) in the top-right corner of the card to draw the eye to key metrics (e.g., "Last Feeding").

### Input Fields
*   **State:** Default state uses `surface-container-highest`.
*   **Focus:** The border glows with a 1px `primary` stroke and an ambient `primary` shadow. Never use harsh boxes; use `md` (0.75rem) roundedness.

### Interactive "Moments" (Specialty Components)
*   **The Timeline Bloom:** Instead of a vertical line for activity history, use a series of soft, glowing circles that "bloom" (increase in opacity) as the user scrolls.
*   **Mood Tracker:** A fluid, amorphous gradient shape that changes color from `primary` (calm) to `tertiary` (fussy) based on baby’s data.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins. If a headline is left-aligned, consider right-aligning the supporting body text to create a high-end magazine feel.
*   **Do** use "Warm Best Friend" copy. Instead of "Enter Weight," use "How much is our little one weighing today?"
*   **Do** leverage `blush` (#ff96b9) for emotional moments—health alerts, heart icons, and milestones.

### Don't
*   **Don't** use pure black (#000000). Always use the deep indigo of `surface-dim`.
*   **Don't** use 100% opaque borders. It breaks the "Celestial" immersion.
*   **Don't** use standard Material Design "Floating Action Buttons" (FABs). Instead, use a centered, glassmorphic bottom navigation bar that feels integrated into the screen's depth.
*   **Don't** crowd the layout. If in doubt, add 8px more padding. Brazilian parents are navigating this while holding a baby; space is accessibility.