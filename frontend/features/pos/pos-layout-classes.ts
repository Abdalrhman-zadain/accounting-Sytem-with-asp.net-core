/**
 * Shared responsive layout classes for POS screens.
 * Uses auto-fill grids so columns adapt to available width (phone, tablet, desktop).
 */

/** Product catalog grid — scales from narrow phones to wide registers. */
export const posProductGridClass =
  "grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,148px),1fr))] sm:grid-cols-[repeat(auto-fill,minmax(min(100%,168px),1fr))]";

/** Restaurant table floor plan — cards stay readable at any width. */
export const posTableFloorGridClass =
  "grid gap-4 sm:gap-5 grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,272px),1fr))]";

/**
 * Register shell: full-height catalog on narrow viewports (sticky cart bar + sheet),
 * side-by-side from 960px up.
 */
export const posRegisterGridClass =
  "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[#fafafc] p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:gap-4 sm:p-4 min-[960px]:grid min-[960px]:grid-cols-[minmax(0,1fr)_minmax(280px,36%)] min-[960px]:pb-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]";

/** Catalog — full height on mobile/tablet; shares row with cart panel on wide screens. */
export const posRegisterCatalogClass =
  "order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto min-[960px]:h-full";

/** Order panel on wide screens (side column). */
export const posRegisterCartPanelClass =
  "order-2 flex min-h-0 min-w-0 flex-col overflow-hidden min-[960px]:h-full xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)] xl:self-start";

/** Touch-friendly minimum control height (Apple HIG ~44pt). */
export const posTouchButtonClass = "min-h-[44px]";

/** Show on touch; hide on fine-pointer desktops until hover. */
export const posTouchOrHoverRevealClass =
  "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100";
