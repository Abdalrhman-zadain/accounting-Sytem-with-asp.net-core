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
| `MARKET_REP` | Market | `/pos-market/receivables` | Market POS only (register, receivables, my stock, printers). Restaurant POS (`/pos/*`) is hidden and blocked. |
| `WAITER`, `KITCHEN` | Restaurant | waiter/kitchen routes | Restaurant only |
| `ACCOUNTANT` | Both | `/dashboard` | Restaurant + market review routes + receivables |

### Create a market cashier

**Seed (dev):** `market_cashier` / `market123` — created by `npm run seed:market-cashier` (`backend/prisma/setup-pos-market-cashier.ts`)

**Market sales rep (dev):** `market_rep` / `market123` — created by `npm run seed:market` with `MARKET_REP` role and linked `User.salesRepId` → `REP-MARKET-01`. Sees only destination markets assigned to that rep. The sidebar does not show **نقاط بيع المطعم** (restaurant POS); direct `/pos/*` URLs are denied by `canAccessRoute`.

### Create a market sales rep login (admin UI)

1. Open **Sales Receivables → Sales Reps** (`/sales-receivables?tab=sales-reps`).
2. Create or select an **active** sales representative.
3. Click **Create login** (admin/manager only).
4. Enter username, email, password, and optional display name.
5. The system creates a `MARKET_REP` user with `User.salesRepId` linked to that rep. Only one active market login is allowed per rep.
6. Assign destination markets to the rep on the **Customers** tab (`salesRepId` on the customer).
7. Post a rep car load at `/pos-market/rep-loads` before the rep can sell from the register.

**API (admin/manager, authenticated):**

```json
POST /api/sales-receivables/sales-reps/:id/market-login
{
  "username": "ahmad_rep",
  "email": "ahmad@example.com",
  "password": "secret123",
  "name": "Ahmad — Market Rep"
}
```

**Register API (market cashier only):**

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

## Onboarding products (Excel import)

For a new site with many products, use **Inventory → Items → Import Products** instead of entering cards one by one.

1. Ensure item **groups**, **categories**, and **units of measure** exist first. The core foundation seed still creates the standard inventory units, but item groups/categories and warehouses are no longer auto-seeded.
2. Download the Excel template from the import modal (Arabic columns: `رمز المادة`, `وصف المادة`, `الوحدة`, `الكمية`, `الكلفة`, `سعر البيع`).
3. Fill rows — `كيلو` / `حبة` map to `KG` / `PCS`; numeric `رمز المادة` becomes `MKT-SHQ-001` style codes for Market POS. Legacy English headers (`name`, `groupCode`, …) still work.
4. Upload, review the preview (valid / skipped / error per row), then import. Existing codes are skipped automatically. KG rows get sell-by-weight enabled.
5. Opening stock (`الكمية`) is **not** imported via the UI — use goods receipts or the optional Shouq seed script below. The Shouq seed posts warehouse opening stock and mirrors the total into GL (`1131001` Merchandise Inventory debited to `3410001` Opening Balance Equity, journal ref `JE-SHOUQ-OPENING-INV`).

## Shouq catalog seed

Market products can be loaded from `backend/data/shouq.xlsx` (sweets/snacks catalog). Codes are `MKT-SHQ-*` under `MARKET-SNACKS`. This script now expects the target item group/category and warehouse to already exist. Legacy demo products (`MKT-001` … `MKT-012`) are deactivated when this seed runs.

```bash
cd backend && npm run seed:market    # destination markets, reps, market logins
cd backend && npm run seed:shouq     # load Shouq catalog inventory only (requires existing group/category + warehouse)
```

Replace `backend/data/shouq.xlsx` with an updated spreadsheet (same column layout), then re-run `npm run seed:shouq`.

`npm run seed:shouq` is optional and separate from the main `npm run seed` flow. It still requires foundation data (`admin` user) when run standalone.

Market cashier login only (no catalog wipe):

```bash
cd backend && npm run seed:market-cashier
```

### Boss demo showcase

The old hardcoded showcase inventory products (`MKT-DEMO-01` … `MKT-DEMO-08`) are no longer seeded. `npm run seed:market-showcase` now exits without creating inventory demo items so existing automation stays safe.

### Destination markets (customers)

Market POS sells **to** downstream markets. Each destination market is an ERP `Customer` record (not the session warehouse).

- Cashier must select a destination market before **Pay** or **Hold** (picker below the shift bar on `/pos-market/register`).
- Markets load from `GET /api/pos-market/destination-markets` — **every active ERP customer** except walk-in (`POS-WALKIN`). No customer is exclusive to a sales rep; optional `salesRepId` on the customer is for reporting only.
- Walk-in customer (`POS-WALKIN`) is rejected for market sales.
- Demo destination markets are seeded with codes `MKT-AMMAN-01`, `MKT-IRBID-02`, `MKT-ZARQA-03` (`npm run seed:market`).
- Session warehouse = main stock location for **loads** (تحميل سيارة); customer = who received the goods on sale.
- Register catalog on-hand quantities are scoped to the **active sales rep's car balance** (`RepCarStockBalance`), not main-warehouse on-hand. Provide actual market inventory through normal inventory entry/import/receipt flows or the optional `npm run seed:shouq` catalog load if you need seeded stock.
- Demo markets are linked to sales reps `REP-MARKET-01` / `REP-MARKET-02` for receivables filtering.

### Credit sales (ذمم)

- `MARKET_CASHIER` and `MARKET_REP` include `POS_CREDIT_SALE`.
- Register checkout allows **partial payment** or **pay later** (zero tender) when `allowCreditSale` is true in POS settings (permission or `POS_ALLOW_CREDIT_SALE`).
- Outstanding balance is stored on the POS `SalesInvoice` (`outstandingAmount`, `PARTIALLY_PAID`) and debited to the customer's receivable account on accounting posting.
- Register receipts print as **فاتورة مبيعات** (sales invoice), not a tax receipt: no VAT lines on the slip. Thermal layout is **compact** (table-based rows at 302px / 80mm, one line per product, up to 28 characters per item name) to reduce paper use and avoid empty gaps between text and amounts.
- Each invoice shows **مدفوع** / **متبقي** when relevant; **الذمم** (account balance) prints as a single line when outstanding. Full delivered/collected lifetime totals are on the receivables screens, not repeated on every slip.
- **المندوب** (customer-linked sales rep) prints on the invoice when configured on the market customer.

### Market account statements (كشف حساب)

| Route | API | Purpose |
|-------|-----|---------|
| `/pos-market/receivables` | `GET /api/pos-market/receivables` | Per-market summary: **delivered / collected / remaining** for all active destination markets |
| `/pos-market/receivables/:customerId` | `GET /api/pos-market/receivables/:customerId/detail` | Market statement detail — summary tiles, deliveries tab, collections tab, thermal print |
| | `GET /api/pos-market/receivables/:customerId/statement?fromDate=&toDate=` | Period account statement ledger (opening balance, debit/credit lines, running balance) for A4 print/PDF |
| | `GET /api/pos-market/receivables/:customerId/invoices` | Open invoices for one market |
| | `GET /api/pos-market/receivables/sales-reps` | Rep filter list (accountant only) |
| | `POST /api/pos-market/receivables/collect` | Posted customer receipt; FIFO allocation to oldest open deliveries when no manual allocations |

**List query params**

- `salesRepId` — accountant filter by sales rep
- `search` — market name or code
- `balanceOnly=true` — hide markets with zero remaining balance (optional toggle on receivables screen)

**List response fields (per market)**

- `totalDelivered` — sum of completed market POS `SalesInvoice.totalAmount`
- `totalPaid` — sum of posted customer `BankCashTransaction` receipts
- `outstandingBalance` — sum of open market POS invoice `outstandingAmount`
- `openInvoiceCount` — count of invoices with outstanding balance

- Any active ERP customer (except walk-in) can be sold to from the register; **no customer is locked to a specific sales rep/rider**.
- Optional `salesRepId` on the customer record is for reporting/filtering only — it does **not** restrict who may sell or collect.
- `MARKET_REP` users see the same customer list as cashiers on register and receivables (not limited to “their” markets).
- **A4 account statement** (Bonanza-style layout): on `/pos-market/receivables/:customerId`, pick **from/to dates**, then **Print A4** or **PDF**. Ledger columns: document type, number, date, details (document reference only — no product line items), debit (منه), credit (له), running balance. Opening row = **الرصيد المدور**. Company name comes from `POS_RECEIPT_COMPANY_NAME` env (per deployment).
- Accountants see all markets and can filter by sales rep or **أسواق عليها رصيد فقط**.
- Full ERP collections remain in `/sales-receivables`; this screen is the rep-focused follow-up UI.

### Rep sales report (كشف مبيعات مندوب)

| Route | API | Purpose |
|-------|-----|---------|
| `/pos-market/rep-statement` | `GET /api/pos-market/rep-statements?salesRepId=&fromDate=&toDate=&customerId=&documentTypes=&paymentTypes=` | Per-rep **sales document register**: completed sales invoices and sales returns (returns as negative amounts), optional market filter, A4 print/PDF |
| `/sales-receivables?tab=rep-statement` | same API | Same rep sales report embedded in **Sales & Receivables** admin workspace (for `ADMIN` / `MANAGER` / accountants) |

**Format:** document-list (not a ledger). Columns: document type, number, date, cash/credit at checkout, customer code/name, sales rep, document value. Footer **المجموع** = sum of document values. No opening balance, no collection (قبض) rows, no product line sub-rows.

**Query filters:**

| Param | Values | Default |
|-------|--------|---------|
| `documentTypes` | `sales` \| `returns` \| `both` | `both` |
| `paymentTypes` | `cash` \| `credit` \| `both` | `both` |

**Payment mode (at sale/return time):** **نقدي** when `sum(posPayments.amount) >= totalAmount` at checkout; otherwise **ذمم**. Returns inherit payment mode from the linked sales invoice.

**Attribution:**

| Movement | Source |
|----------|--------|
| Sales | `SalesInvoice` via `PosSession.salesRepId` (rep on the active session at checkout) |
| Returns | `PosReturn` (`status = COMPLETED`) via `PosSession.salesRepId`; value = `-abs(totalAmount)` |

**Permissions:** `POS_MARKET_VIEW_RECEIVABLES` (or `ADMIN` / `MANAGER` role). `MARKET_REP` users are locked to their own `User.salesRepId`; accountants pick any active rep and may filter by one destination market (default: all markets).

**A4 layout:** landscape; title **كشف مبيعات مندوب**; eight-column table matching the document register above.

**Distinction from customer statement:**

| Report | Scope | Format |
|--------|-------|--------|
| Customer A4 (`/pos-market/receivables/:customerId`) | One market, all reps | Bonanza ledger (deliveries + collections, running balance) — **unchanged** |
| Rep A4 (`/pos-market/rep-statement`) | One rep, all markets (optional filter) | Sales document register (invoices + negative returns) |

### Rep car stock (تحميل سيارة / جرد)

Market POS sells from stock loaded onto a sales rep's car, not directly from main-warehouse balances at checkout.

**Buying stock into the main warehouse** (purchase qty + unit cost) is **not** done in Market POS. Use ERP **Inventory → Goods Receipts** at `/inventory` (admin/accountant). After the warehouse has stock, post a **rep car load** to move quantities onto the rep's car.

| Step | Where | Who |
|------|-------|-----|
| 1. Receive purchased goods into main warehouse | `/inventory` → Goods Receipts | Admin / accountant |
| 2. Load rep car from warehouse | `/pos-market/rep-loads` | Admin |
| 3. Sell to destination market | `/pos-market/register` | Market cashier / rep |
| 4. Rep views remaining car stock | `/pos-market/my-stock` | `MARKET_REP` only |

| Concept | Behavior |
|---------|----------|
| Main warehouse | Single shared pool; goods receipts increase it; rep loads decrease it |
| Rep car balance | `RepCarStockBalance` per `(salesRepId, itemId)` — what the register shows as on-hand |
| Posted load undo | `POST /api/pos-market/rep-car-loads/:id/reverse` returns stock to the warehouse only when every line is still fully on the rep car and no `SALE_OUT` movement exists after the load was posted |
| Rep unload | `POST /api/pos-market/rep-car-unloads` (+ post) returns stock from rep car to warehouse (`InventoryStockMovementType.REP_CAR_UNLOAD`); general-purpose alternative to reversing a specific load document |
| Stock hub | `GET /api/pos-market/stock-overview` aggregates warehouse + all rep car balances; `/pos-market/stock-hub` routes transfers to load, unload, rep transfer, or ERP warehouse transfer APIs |
| Session | Market sessions require `salesRepId` on open; cashiers pick a rep; `MARKET_REP` users are locked to `User.salesRepId` |
| Sale | `completeSale` / `holdSale` deduct `RepCarStockBalance` only; warehouse is not decreased again |
| Oversell | Blocked when cart quantity exceeds rep car on-hand (unless `POS_SELL_NEGATIVE_STOCK`) |
| Returns | POS returns do **not** yet restore rep car stock (see `docs/known-issues.md`) |
| Monthly جرد | Main warehouse via ERP inventory adjustments; rep car via `/pos-market/rep-stocktakes` |

| Route | API | Permission | Purpose |
|-------|-----|------------|---------|
| `/pos-market/rep-loads` | `GET/POST/PATCH /api/pos-market/rep-car-loads` (+ post/cancel/reverse) | `POS_MARKET_MANAGE_REP_LOADS` | Admin load documents: warehouse → rep car; posted loads can be reversed only when the full quantity is still on the rep car and no sales happened after post |
| `/pos-market/rep-car-unloads` (API) | `GET/POST/PATCH /api/pos-market/rep-car-unloads` (+ post/cancel) | `POS_MARKET_MANAGE_REP_LOADS` | Rep → warehouse unload documents (used by stock hub and direct API) |
| `/pos-market/stock-hub` | `GET /api/pos-market/stock-overview` + routed transfer APIs | `POS_MARKET_MANAGE_REP_LOADS` (rep→rep requires `ADMIN`/`MANAGER`) | Unified network overview and transfer wizard |
| `/pos-market/rep-transfers` | `GET/POST/PATCH /api/pos-market/rep-car-transfers` (+ post/cancel/reverse) | `ADMIN` / `MANAGER` only | Admin rep-to-rep transfer documents: move on-car stock between sales reps (no warehouse/GL); riders cannot access |
| `/pos-market/rep-stocktakes` | `GET/POST/PATCH /api/pos-market/rep-car-stocktakes` (+ post/cancel) | `POS_MARKET_REP_STOCKTAKE` | Monthly rep-car physical count (per-product variance in UI) |
| `/pos-market/my-stock` | `GET /api/pos-market/rep-car-stock`, `.../movements` | `MARKET_REP` only | Rep dashboard: on-hand + recent movements |
| (register) | `GET /api/pos-market/catalog?salesRepId=` | session POS permissions | Catalog grid scoped to rep car on-hand |
| (register) | `GET /api/pos-market/sales-reps` | session POS permissions | Active reps for session open picker |

Backend services live in `backend/src/modules/phase-3-sales-receivables/pos-market/rep-car-stock/`.

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
| `/pos-market/register` | Register — destination market (customer) required, catalog, cart, checkout, **compact thermal receipt** print (one line per item); sell-by-weight items show quick-pick buttons (ربع كيلو / نص كيلو / 750 غم / كيلو) plus manual weight entry; **rep discount** on line (fixed or %) in the add-to-cart modal, weight modal, or cart; whole-invoice discount in cart; receipt shows **خصم المندوب** when applicable |
| `/pos-market/sessions` | Shift list and session reports |
| `/pos-market/held-sales` | Draft and held sales |
| `/pos-market/accounting-review` | Pending sales approve/reject/reverse |
| `/pos-market/returns` | Create returns from completed sales |
| `/pos-market/reports` | Overview and report cards |
| `/pos-market/printers` | Receipt printer setup (local browser storage) |
| `/pos-market/receivables` | Destination market account statements (delivered / collected / remaining); print thermal statement |
| `/pos-market/receivables/:customerId` | Per-market statement detail — deliveries, collections, thermal print, **A4 period statement** |
| `/sales-receivables?tab=market-statement` | Same market receivables list + per-market A4 statement embedded in **Sales & Receivables** admin |
| `/pos-market/rep-statement` | Rep sales report (كشف مبيعات مندوب) — sales invoices and returns, A4 print/PDF |
| `/pos-market/rep-loads` | Rep car load documents (warehouse → rep) |
| `/pos-market/stock-hub` | Network stock hub — transfer wizard + link to overview |
| `/pos-market/stock-hub/overview` | Full-screen network stock overview grid (warehouses + all reps) |
| `/pos-market/rep-transfers` | Rep car transfer documents (rep → rep) |
| `/pos-market/rep-stocktakes` | Rep car monthly stocktake (جرد) with per-product variance |
| `/pos-market/my-stock` | Rep car on-hand dashboard (`MARKET_REP` only) |
| `/pos-market/settings` | Payment method GL account mappings |

### Mobile register UX

On viewports below `960px` (`pos-wide`), the market register matches restaurant POS mobile behavior via `pos-shared`:

- full-screen product catalog with auto-fill grid (`posProductGridClass`)
- sticky bottom cart bar (item count + total)
- slide-up order sheet containing the full cart panel
- market blue accent theme (`POS_REGISTER_MARKET_THEME`)

At `960px` and above, catalog and cart stay side by side. Navigation on phones/tablets uses the global mobile drawer (`frontend/components/mobile-nav-bar.tsx` floating menu on POS routes).

Shared payment GL mappings (`PosRuntimeSetting`) are used by both restaurant and market POS in v1. Market and restaurant sessions are isolated via `PosSession.posProduct` (`RESTAURANT` | `MARKET`).

## Integration verification (preflight + golden path)

Automated checks confirm Market POS accounting linkage without opening every UI screen.

### Prerequisites

```bash
cd backend
npm run db:up
npm run prisma:deploy
npm run seed:market-showcase   # demo products, rep car stock, POS GL mappings
npm run start:dev              # separate terminal — default http://localhost:3007/api
```

`seed:market-showcase` also runs `seedMarketPosRuntimeSettings` (cash/revenue/card/VAT mappings from foundation accounts).

### Commands

| Command | Needs backend? | What it proves |
|---------|----------------|----------------|
| `npm run check:market-preflight` | No | DB/config readiness: GL mappings, destination markets, rep car stock, users |
| `npm run check:market-golden-path` | Yes | End-to-end: cash sale + credit sale + session approve + receivables collect |
| `npm run check:market-integration` | Yes | Runs preflight then golden path |

Flags:

- `npm run check:market-preflight -- --json` — machine-readable report (CI)
- `npm run check:market-preflight -- --quiet` — exit code only
- `npm run check:market-golden-path -- --dry-run` — preflight only (no HTTP)

Environment (golden path):

- `API_BASE_URL` — default `http://localhost:3007/api`
- `MARKET_CASHIER_USER` / `MARKET_CASHIER_PASSWORD` — default `market_cashier` / `market123`
- `ADMIN_USER` / `ADMIN_PASSWORD` — default `admin` / `admin123`
- `MARKET_GOLDEN_PATH_ALLOW_PRODUCTION=1` — required to run when `NODE_ENV=production`

### Preflight checks

| Check ID | Fix when failing |
|----------|------------------|
| `mapping_cash`, `mapping_revenue` | `/pos-market/settings` |
| `destination_markets` | `/sales-receivables?tab=customers` |
| `rep_car_stock` | `/pos-market/rep-loads` |
| `market_cashier_user` | `npm run seed:market-cashier` |
| `credit_sale_ready` | grant `POS_CREDIT_SALE` to `MARKET_CASHIER` or set `POS_ALLOW_CREDIT_SALE` |

Implementation: [`backend/src/modules/phase-3-sales-receivables/pos-market/market-readiness.service.ts`](../backend/src/modules/phase-3-sales-receivables/pos-market/market-readiness.service.ts), CLI in [`backend/scripts/`](../backend/scripts/).

Golden path creates real auditable POS sales and a customer receipt (not rolled back in v1).

## Manual test checklist

1. Login `market / market123` → lands on `/pos-market/register`
2. Admin: create/post a rep load at `/pos-market/rep-loads`
3. Open session (warehouse + cash account + **sales rep**) → **select destination market** (ERP customer, e.g. `MKT-AMMAN-01`) → add `MKT-*` products (on-hand = rep car) → pay → complete sale
3. Hold/resume sale; close session with report
4. Receipt print (browser fallback when QZ Tray unavailable)
5. Restaurant user `cashier` still works on `/pos/register`; cannot call `/api/pos-market`
6. Accountant sees market review/reports routes under `/pos-market/*`
7. Login `market_rep / market123` → `/pos-market/receivables` shows only `REP-MARKET-01` markets; `/pos-market/my-stock` shows car balances after a rep load
8. Partial or pay-later sale from register → balance appears in receivables; collect reduces `outstandingAmount`
