# POS shared layer

Use this folder when **both** restaurant POS and market POS need the same React hooks or small helpers.

## What belongs here

- React Query hooks that wrap ERP APIs (catalog, warehouses, tax treatments)
- Formatting helpers used by both terminals (money, barcode display)
- **Thermal receipt layout** — shared 80mm table-based HTML/CSS for customer receipts (`thermal-receipt-layout.ts`)
- Shared POS types that are not UI-specific
- **QZ Tray signing** — shared certificate/signature setup for restaurant and market print bridges (`qz-tray-security.ts`; API in `lib/api/qz-tray.ts`)
- **Local print agent client** — HTTP calls to the Windows Print Agent on `127.0.0.1:9188` (`local-print-agent.ts`)
- **Register mobile layout** — sticky cart bar, slide-up order sheet, wide-layout hook, responsive grid classes

## What does not belong here

- Restaurant screens (`features/pos`)
- Market screens (`features/pos-market`)
- Restaurant-only API calls (`/api/pos/*`)
- Market-only API calls (`/api/pos-market/*`)

## Register layout exports

| Export | File | Purpose |
|--------|------|---------|
| `PosRegisterMainGrid` | `pos-register-main-grid.tsx` | Catalog + cart; mobile sheet below `960px` |
| `PosRegisterStickyCartBar` | `pos-register-mobile-cart.tsx` | Bottom cart summary bar |
| `PosRegisterMobileOrderSheet` | `pos-register-mobile-cart.tsx` | Slide-up cart panel |
| `useRegisterWideLayout` | `use-register-wide-layout.ts` | `true` when viewport ≥ `960px` |
| `posProductGridClass`, etc. | `pos-layout-classes.ts` | Responsive grid / register shell classes |
| `POS_REGISTER_DEFAULT_THEME` | `pos-layout-classes.ts` | Restaurant green accent (default) |
| `POS_REGISTER_MARKET_THEME` | `pos-layout-classes.ts` | Market blue accent |
| `buildThermalReceiptDocumentHtml`, `thermalReceiptRowLine`, etc. | `thermal-receipt-layout.ts` | Shared 240px receipt HTML with inset LTR amount column and wrapped payment block |

Pass `mobileCartBar` to `PosRegisterMainGrid` (item count, labels, total). Optional `theme` on the cart bar props overrides accent colors.

Restaurant POS re-exports these from `features/pos/pos-register-layout.tsx` and `pos-register-mobile-cart.tsx` for backward compatibility.

## Where fetchers live

| Kind | Location | Used by |
|------|----------|---------|
| ERP inventory, customers, tax | `frontend/lib/api` | Both POS products |
| Restaurant POS API | `frontend/lib/api` (`/pos/*` functions) | `features/pos` only |
| Market POS API | `frontend/lib/api` (`/pos-market/*` functions) | `features/pos-market` only |
| Shared hooks | `frontend/features/pos-shared` | Both |

## Example (market register)

```tsx
import {
  PosRegisterMainGrid,
  POS_REGISTER_MARKET_THEME,
  posProductGridClass,
} from "@/features/pos-shared";
import { getPosMarketHealth } from "@/lib/api";

// UI stays in features/pos-market
// Shared register layout comes from pos-shared
// Market API calls come from lib/api
```

## Import rules

- `pos-shared` may import `@/lib/api`, `@/lib/query-keys`, `@/types/api`, `@/lib/hooks/use-viewport-breakpoints`
- `pos-shared` must **not** import `@/features/pos` or `@/features/pos-market`
- `pos-market` may import `pos-shared` and `@/lib/api`
- `pos` may import `pos-shared` and `@/lib/api`
- `pos` and `pos-market` must not import each other
