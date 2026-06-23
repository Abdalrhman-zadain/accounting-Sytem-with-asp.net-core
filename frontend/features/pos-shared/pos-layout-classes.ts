/**
 * Shared responsive layout classes for POS register screens.
 * Uses auto-fill grids so columns adapt to available width (phone, tablet, desktop).
 */

/** Product catalog grid — scales from narrow phones to wide registers. */
export const posProductGridClass =
  "grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,148px),1fr))] sm:grid-cols-[repeat(auto-fill,minmax(min(100%,168px),1fr))]";

/** Waiter catalog grid — capped columns for touch tablets (3 at waiter-wide, 4 at lg). */
export const waiterProductGridClass =
  "grid gap-3 grid-cols-2 sm:grid-cols-3 waiter-wide:grid-cols-3 lg:grid-cols-4";

/**
 * Waiter order shell: full-height catalog + sticky cart bar below 768px;
 * side-by-side catalog + cart from waiter-wide up.
 */
export const waiterOrderGridClass =
  "flex min-h-0 flex-1 flex-col gap-0 overflow-hidden pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] waiter-wide:grid waiter-wide:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] waiter-wide:pb-0";

/** Waiter catalog column. */
export const waiterOrderCatalogClass =
  "order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-[#dde5df] waiter-wide:border-e";

/** Waiter cart panel on wide screens. */
export const waiterOrderCartPanelClass =
  "order-2 flex min-h-0 min-w-0 flex-col overflow-hidden bg-white waiter-wide:h-full";

/**
 * Register shell: full-height catalog on narrow viewports (sticky cart bar + sheet),
 * side-by-side from 960px up.
 */
export const posRegisterGridClass =
  "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[#fafafc] p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:gap-4 sm:p-4 pos-wide:grid pos-wide:grid-cols-[minmax(0,1fr)_minmax(280px,36%)] pos-wide:pb-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]";

/** Catalog — full height on mobile/tablet; shares row with cart panel on wide screens. */
export const posRegisterCatalogClass =
  "order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pos-wide:h-full";

/** Order panel on wide screens (side column). */
export const posRegisterCartPanelClass =
  "order-2 flex min-h-0 min-w-0 flex-col overflow-hidden pos-wide:h-full pos-wide:sticky pos-wide:top-4 pos-wide:max-h-[calc(100dvh-6rem)] pos-wide:self-start";

/** Touch-friendly minimum control height (Apple HIG ~44pt). */
export const posTouchButtonClass = "min-h-[44px]";

/** Show on touch; hide on fine-pointer desktops until hover. */
export const posTouchOrHoverRevealClass =
  "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100";

/** Hide on fine-pointer hover devices only — keeps controls visible on touch tablets. */
export const posFinePointerHoverRevealClass =
  "opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100";

export type PosRegisterMobileTheme = {
  stickyBarBorder?: string;
  stickyBarBg?: string;
  cartButtonBorder?: string;
  cartButtonBg?: string;
  accentBg?: string;
  accentText?: string;
};

export const POS_REGISTER_DEFAULT_THEME: PosRegisterMobileTheme = {
  stickyBarBorder: "border-[#dce3de]",
  stickyBarBg: "bg-white/95",
  cartButtonBorder: "border-[#d6e1d9]",
  cartButtonBg: "bg-[#f8fbf9]",
  accentBg: "bg-[#16a34a]",
  accentText: "text-white",
};

export const POS_REGISTER_MARKET_THEME: PosRegisterMobileTheme = {
  stickyBarBorder: "border-[#d5deea]",
  stickyBarBg: "bg-white/95",
  cartButtonBorder: "border-[#d5deea]",
  cartButtonBg: "bg-[#eef4fb]",
  accentBg: "bg-[#1f4f8a]",
  accentText: "text-white",
};

export const WAITER_REGISTER_THEME: PosRegisterMobileTheme = {
  stickyBarBorder: "border-[#dde5df]",
  stickyBarBg: "bg-white/95",
  cartButtonBorder: "border-[#d6e1d9]",
  cartButtonBg: "bg-[#f8faf9]",
  accentBg: "bg-[#46644b]",
  accentText: "text-white",
};
