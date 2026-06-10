# POS shared layer

Use this folder when **both** restaurant POS and market POS need the same React hooks or small helpers.

## What belongs here

- React Query hooks that wrap ERP APIs (catalog, warehouses, tax treatments)
- Formatting helpers used by both terminals (money, barcode display)
- Shared POS types that are not UI-specific

## What does not belong here

- Restaurant screens (`features/pos`)
- Market screens (`features/pos-market`)
- Restaurant-only API calls (`/api/pos/*`)
- Market-only API calls (`/api/pos-market/*`)

## Where fetchers live

| Kind | Location | Used by |
|------|----------|---------|
| ERP inventory, customers, tax | `frontend/lib/api` | Both POS products |
| Restaurant POS API | `frontend/lib/api` (`/pos/*` functions) | `features/pos` only |
| Market POS API | `frontend/lib/api` (`/pos-market/*` functions) | `features/pos-market` only |
| Shared hooks | `frontend/features/pos-shared` | Both |

## Example (market register)

```tsx
import { usePosCatalog } from "@/features/pos-shared";
import { getPosMarketHealth } from "@/lib/api";

// UI stays in features/pos-market
// Shared catalog hook comes from pos-shared
// Market API calls come from lib/api
```

## Import rules

- `pos-shared` may import `@/lib/api`, `@/lib/query-keys`, `@/types/api`
- `pos-shared` must **not** import `@/features/pos` or `@/features/pos-market`
- `pos-market` may import `pos-shared` and `@/lib/api`
- `pos` may import `pos-shared` and `@/lib/api`
- `pos` and `pos-market` must not import each other
