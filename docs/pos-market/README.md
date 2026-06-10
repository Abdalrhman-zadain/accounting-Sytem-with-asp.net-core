# Market POS

Market POS is the retail/market checkout product. It is intentionally isolated from restaurant POS.

## Ownership

| Layer | Location |
|-------|----------|
| Frontend feature | `frontend/features/pos-market/` |
| Frontend routes | `frontend/app/(erp)/pos-market/` |
| Backend API | `backend/src/modules/phase-3-sales-receivables/pos-market/` |
| API prefix | `/api/pos-market` |
| Route prefix | `/pos-market` |
| Docs | `docs/pos-market/` |

## Restaurant POS (frozen)

Restaurant POS remains in:

- `frontend/features/pos/`
- `backend/src/modules/phase-3-sales-receivables/pos/`
- Routes `/pos/*`

Do not add market features to restaurant POS files. Do not import across `pos-market` and `pos`.

## Auth

- Role: `MARKET_CASHIER`
- Seed logins: `market` / `market123` (primary register cashier) or `market_cashier` / `market123`
- Default route: `/pos-market/register`
- Restaurant cashier (`cashier` / `cashier123`) cannot call `/api/pos-market`
- Market cashier cannot call `/api/pos` (restaurant API)

Accountants receive market review/report routes under `/pos-market/*` in addition to restaurant POS routes.

## Shared fetchers (both POS products)

Restaurant POS does **not** keep API fetchers inside `features/pos`. Both products should follow this split:

| Layer | Path | Use for |
|-------|------|---------|
| ERP APIs | `frontend/lib/api` | inventory items, warehouses, customers, tax |
| Shared hooks | `frontend/features/pos-shared` | React Query hooks both terminals reuse |
| Restaurant API | `frontend/lib/api` (`/pos/*`) | restaurant sessions, tables, KOT, etc. |
| Market API | `frontend/lib/api` (`/pos-market/*`) | market sessions, checkout, etc. |
| Restaurant UI | `frontend/features/pos` | restaurant screens only |
| Market UI | `frontend/features/pos-market` | market screens only |

Example in market POS:

```tsx
import { usePosCatalog } from "@/features/pos-shared";
import { getPosMarketHealth } from "@/lib/api";
```

Do **not** import `features/pos/pos-page.tsx` or other restaurant UI. When restaurant and market need the same hook, add it to `pos-shared`.

## User setup: restaurant vs market POS

Access is controlled by **POS access roles** on the user (`UserPosAccessRole`).

| Role | Product | Default route | Sees in sidebar |
|------|---------|---------------|-----------------|
| `CASHIER` | Restaurant | `/pos/register` | Restaurant POS menu |
| `MARKET_CASHIER` | Market | `/pos-market/register` | Market POS menu |
| `MARKET_REP` | Market | `/pos-market/receivables` | Register, receivables, printers |
| `WAITER`, `KITCHEN` | Restaurant | waiter/kitchen routes | Restaurant only |
| `ACCOUNTANT` | Both | `/dashboard` | Restaurant + market review routes + receivables |

### Create a market cashier

**Seed (dev):** `market_cashier` / `market123` — created by `npm run seed:market-cashier` (`backend/prisma/setup-pos-market-cashier.ts`)

**Market sales rep (dev):** `market_rep` / `market123` — created by `npm run seed:market` with `MARKET_REP` role and linked `User.salesRepId` → `REP-MARKET-01`. Sees only destination markets assigned to that rep.

**Register API:**

```json
{
  "username": "market1",
  "email": "market1@example.com",
  "password": "secret123",
  "posRoles": ["MARKET_CASHIER"]
}
```

**Restaurant cashier:**

```json
{ "posRoles": ["CASHIER"] }
```

### Rules

- Give **either** `CASHIER` **or** `MARKET_CASHIER` for a single-terminal cashier. Do not assign both unless that user must operate both products.
- `ACCOUNTANT` always receives both review/report route sets.
- `ADMIN` / `MANAGER` ERP users are not POS cashiers unless you also assign POS roles.
- Backend JWT guard blocks cross-API access: restaurant cashiers cannot call `/api/pos-market`; market cashiers cannot call `/api/pos`.

### Check in frontend code

```ts
import { getUserPosProducts, userHasPosProduct } from "@/lib/auth-access";

getUserPosProducts(user); // ["restaurant"] | ["market"] | ["restaurant", "market"]
userHasPosProduct(user, "market");
```

## Demo product seed

Market test products (codes `MKT-*`) with online product images (Unsplash HTTPS URLs):

```bash
cd backend && npm run seed:market
```

Market cashier login only (no catalog wipe):

```bash
cd backend && npm run seed:market-cashier
```

Included in the main `npm run seed` flow after restaurant POS demo seed. Requires foundation data (`admin` user) when run standalone.

Products cover dairy, bakery, grocery, produce (weight sale), meat, beverages, snacks, and household items. Images load directly from the internet in the market register grid.

### Destination markets (customers)

Market POS sells **to** downstream markets. Each destination market is an ERP `Customer` record (not the session warehouse).

- Cashier must select a destination market before **Pay** or **Hold** (picker below the shift bar on `/pos-market/register`).
- Markets load from `GET /api/pos-market/destination-markets` (market cashiers cannot use `/api/sales-receivables/customers`).
- Walk-in customer (`POS-WALKIN`) is rejected for market sales.
- Demo destination markets are seeded with codes `MKT-AMMAN-01`, `MKT-IRBID-02`, `MKT-ZARQA-03` (`npm run seed:market`).
- Session warehouse = stock source; customer = who received the goods.
- Register catalog on-hand quantities are scoped to the **session warehouse** (same check used at sale completion). Demo `MKT-*` stock is seeded into every active non-transit warehouse (`npm run seed:market`).
- Demo markets are linked to sales reps `REP-MARKET-01` / `REP-MARKET-02` for receivables filtering.

### Credit sales (ذمم)

- `MARKET_CASHIER` and `MARKET_REP` include `POS_CREDIT_SALE`.
- Register checkout allows **partial payment** or **pay later** (zero tender) when `allowCreditSale` is true in POS settings (permission or `POS_ALLOW_CREDIT_SALE`).
- Outstanding balance is stored on the POS `SalesInvoice` (`outstandingAmount`, `PARTIALLY_PAID`) and debited to the customer's receivable account on accounting posting.
- Receipts print **المتبقي على الذمم** when applicable.

### Market receivables workspace

| Route | API | Purpose |
|-------|-----|---------|
| `/pos-market/receivables` | `GET /api/pos-market/receivables` | Customers with open market POS balances |
| `/pos-market/receivables/:customerId` | `GET /api/pos-market/receivables/:customerId/detail` | Market account — deliveries, collections, totals |
| | `GET /api/pos-market/receivables/:customerId/invoices` | Open invoices for one market |
| | `GET /api/pos-market/receivables/sales-reps` | Rep filter list (accountant only) |
| | `POST /api/pos-market/receivables/collect` | Posted customer receipt; FIFO allocation to oldest open deliveries when no manual allocations |

- `MARKET_REP` users are scoped to `User.salesRepId` → only their assigned destination markets (register picker + receivables list).
- Accountants see all markets and can filter by sales rep.
- Full ERP collections remain in `/sales-receivables`; this screen is the rep-focused follow-up UI.

## Current status

Implemented:

- `GET /api/pos-market/health`
- Register product grid with images (`MKT-*` catalog filter)
- Demo seed data (`backend/prisma/seed-pos-market.ts`)
- Backend core retail API at `/api/pos-market/*` (sessions, sales, returns, settings, favorites, reports, accounting review) via `PosTerminalService` → shared `PosService` with `PosProduct.MARKET`
- `PosSession.posProduct` schema field (`RESTAURANT` | `MARKET`) isolates market sessions from restaurant sessions

Frontend workspaces (in `frontend/features/pos-market/`):

| Route | Workspace |
|-------|-----------|
| `/pos-market/register` | Register — destination market (customer) required, catalog, cart, checkout, receipt print |
| `/pos-market/sessions` | Shift list and session reports |
| `/pos-market/held-sales` | Draft and held sales |
| `/pos-market/accounting-review` | Pending sales approve/reject/reverse |
| `/pos-market/returns` | Create returns from completed sales |
| `/pos-market/reports` | Overview and report cards |
| `/pos-market/printers` | Receipt printer setup (local browser storage) |
| `/pos-market/receivables` | Destination market balances; link to per-market account detail |
| `/pos-market/receivables/:customerId` | Deliveries (what they got), collections (what they paid), amount due |
| `/pos-market/settings` | Payment method GL account mappings |

Shared payment GL mappings (`PosRuntimeSetting`) are used by both restaurant and market POS in v1. Market and restaurant sessions are isolated via `PosSession.posProduct` (`RESTAURANT` | `MARKET`).

## Manual test checklist

1. Login `market / market123` → lands on `/pos-market/register`
2. Open session (warehouse + cash account) → **select destination market** (ERP customer, e.g. `MKT-AMMAN-01`) → add `MKT-*` products → pay → complete sale
3. Hold/resume sale; close session with report
4. Receipt print (browser fallback when QZ Tray unavailable)
5. Restaurant user `cashier` still works on `/pos/register`; cannot call `/api/pos-market`
6. Accountant sees market review/reports routes under `/pos-market/*`
7. Login `market_rep / market123` → `/pos-market/receivables` shows only `REP-MARKET-01` markets
8. Partial or pay-later sale from register → balance appears in receivables; collect reduces `outstandingAmount`
