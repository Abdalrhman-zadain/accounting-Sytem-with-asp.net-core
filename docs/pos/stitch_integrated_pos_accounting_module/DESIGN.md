---
name: Soft Geometric
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#424842'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0f0'
  outline: '#727971'
  outline-variant: '#c2c8c0'
  surface-tint: '#47654d'
  primary: '#46644b'
  on-primary: '#ffffff'
  primary-container: '#5e7d63'
  on-primary-container: '#fdfff9'
  inverse-primary: '#adcfb1'
  secondary: '#59605c'
  on-secondary: '#ffffff'
  secondary-container: '#dde4df'
  on-secondary-container: '#5f6662'
  tertiary: '#5d5d5a'
  on-tertiary: '#ffffff'
  tertiary-container: '#767673'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c9ebcc'
  primary-fixed-dim: '#adcfb1'
  on-primary-fixed: '#04210e'
  on-primary-fixed-variant: '#304d36'
  secondary-fixed: '#dde4df'
  secondary-fixed-dim: '#c1c8c3'
  on-secondary-fixed: '#161d1a'
  on-secondary-fixed-variant: '#414845'
  tertiary-fixed: '#e4e2de'
  tertiary-fixed-dim: '#c8c6c3'
  on-tertiary-fixed: '#1b1c1a'
  on-tertiary-fixed-variant: '#474744'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system is centered on the concept of "Approachable Precision." It blends the structural integrity of geometric layouts with a soft, tactile finish to evoke feelings of calm, reliability, and warmth. The target audience includes users seeking a stress-free digital environment, such as those in wellness, productivity, or community-focused platforms.

The visual style is a hybrid of **Minimalism** and **Soft Modernism**. It prioritizes heavy whitespace and a restricted, organic color palette to reduce cognitive load. Interaction design should feel cushioned and deliberate, avoiding sharp transitions in favor of smooth, eased animations that reinforce the "Soft Geometric" narrative.

## Colors
The palette is rooted in nature-inspired tones to ensure high accessibility and visual comfort. 

- **Primary (Sage Green):** Used for key actions, active states, and brand emphasis. It provides a sophisticated yet calming focal point.
- **Secondary (Pale Sage):** Ideal for subtle backgrounds, secondary buttons, and decorative elements that require a hint of color without overwhelming the user.
- **Tertiary (Warm Bone):** The primary surface color. It replaces pure white to reduce eye strain and provide a "paper-like" warmth to the interface.
- **Neutral (Soft Charcoal):** Used for typography and iconography to ensure high legibility while maintaining a softer contrast than pure black.
- **Functional Colors:** Success, Error, and Warning states should be desaturated to match the overall muted aesthetic, ensuring they stand out through iconography rather than jarring brightness.

## Typography
This design system utilizes **Inter** exclusively to maintain a clean, systematic, and highly readable environment. The typographic hierarchy relies on subtle weight shifts and generous line heights rather than aggressive scale changes.

Headings use semi-bold weights with slight negative letter-spacing to feel tight and professional. Body text is set with generous leading to improve readability for long-form content. Labels and captions use a medium weight to ensure they remain distinct at smaller sizes. All text should be rendered with `antialiased` smoothing to preserve the "Soft" characteristic of the brand.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy with a focus on internal containment. 

- **Desktop:** A 12-column grid with 24px gutters. Content is typically centered in a max-width container of 1280px to prevent excessive line lengths.
- **Mobile:** A 4-column grid with 16px margins. 
- **Spacing Logic:** All spacing is based on a 4px baseline, but the system favors "breathable" increments (16px, 24px, 40px). 

Use vertical rhythm to group related items closely (8px-16px) while separating distinct sections with larger gaps (40px-64px). This creates a sense of organized "islands" of content on the warm neutral background.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and **Ambient Shadows** rather than sharp borders.

- **Level 0 (Base):** The `Tertiary` warm neutral background.
- **Level 1 (Cards/Surfaces):** Pure white or slightly lighter bone surfaces with a very soft, diffused shadow (0px 4px 20px, 4% opacity charcoal).
- **Level 2 (Interactive):** Elements that are hovered or active use a slightly deeper shadow (0px 8px 30px, 8% opacity charcoal) to appear lifted.

Avoid black shadows; instead, tint shadows with a hint of the primary sage green or neutral charcoal to keep them feeling integrated and "airy."

## Shapes
The shape language is the defining feature of the design system. All containers, buttons, and input fields utilize a **12px (0.75rem)** base radius. This large corner radius creates the "Soft Geometric" look, making even dense information-heavy layouts feel welcoming.

- **Small Components:** Checkboxes and small tags use 8px.
- **Standard Components:** Buttons, Cards, and Inputs use 12px.
- **Large Components:** Modals and large sections use 24px.
- **Icons:** Use a rounded stroke-cap and join to mirror the UI's softness.

## Components
- **Buttons:** High-emphasis buttons use the primary Sage Green with white text. Low-emphasis buttons use a Secondary Sage ghost style. The padding is generous (12px 24px) to create a "pill-like" but structured appearance.
- **Input Fields:** Use a 1px border in a light neutral shade. On focus, the border thickens to 2px in Sage Green with a soft glow effect.
- **Cards:** Cards should have no border, relying entirely on the ambient shadows and the contrast between white surfaces and the warm neutral background.
- **Chips & Tags:** Use fully rounded (pill) shapes with a light Sage Green tint and dark green text for high legibility.
- **Lists:** Items are separated by subtle horizontal rules in a very light gray, or grouped into "Soft Geometric" card containers for better visual separation.
- **Checkboxes/Radios:** These should be slightly oversized (20px) to enhance the friendly, accessible touch-targets required by the brand.