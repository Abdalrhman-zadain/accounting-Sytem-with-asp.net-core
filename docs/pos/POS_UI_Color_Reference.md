# POS UI Color Reference

This file is the design-memory reference for the current POS screen palette.

If future AI edits or developers extend the POS UI, they should reuse this palette unless the user explicitly asks for a redesign.

## Scope

- Applies to the POS workspace in `frontend/features/pos`
- Especially applies to the current sales screen in `frontend/features/pos/pos-page.tsx`
- Theme tokens are stored in `frontend/features/pos/pos-theme.ts`

## Approved Reference

- Visual source: the approved POS screenshot from the current conversation
- Design baseline: `docs/pos/stitch_integrated_pos_accounting_module`

## Core Palette

- Primary sage green: `#46644b`
- Primary dark text: `#223228`
- Primary body text: `#233329`
- Muted text: `#596760`
- Soft muted text: `#6c7a72`
- Soft sage surface: `#eef3ef`
- Soft sage surface alt: `#f7faf8`
- Warm page surface: `#fbf9f8`
- Card surface: `#ffffff`
- Muted card surface: `#f9faf8`
- Soft card fill: `#f4f7f4`
- Border default: `#d7ddd8`
- Border soft: `#dbe2dd`
- Border muted: `#d4ddd7`
- Open-status / primary pill: `#46644b`
- Closed-status background: `#ead7d5`
- Closed-status text: `#7d3f38`

## Hero Gradient

Use this for the current POS hero section when needed:

```css
radial-gradient(circle at top left, rgba(201,235,204,0.95), rgba(251,249,248,0.98) 45%, rgba(244,240,237,1) 100%)
```

## Rule For Future POS Screens

- Prefer importing `POS_THEME` from `frontend/features/pos/pos-theme.ts`
- New POS pages should visually feel like the current sales screen
- Do not switch the POS UI to a different palette unless the user asks for it
