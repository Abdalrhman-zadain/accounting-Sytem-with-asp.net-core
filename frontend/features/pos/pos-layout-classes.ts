/**
 * Shared responsive layout classes for POS screens.
 * Uses auto-fill grids so columns adapt to available width (phone, tablet, desktop).
 */

export {
  posProductGridClass,
  waiterProductGridClass,
  posRegisterCartPanelClass,
  posRegisterCatalogClass,
  posRegisterGridClass,
  posTouchButtonClass,
  posTouchOrHoverRevealClass,
  posFinePointerHoverRevealClass,
} from "@/features/pos-shared";

/** Restaurant table floor plan — cards stay readable at any width. */
export const posTableFloorGridClass =
  "grid gap-4 sm:gap-5 grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] md:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,272px),1fr))]";
