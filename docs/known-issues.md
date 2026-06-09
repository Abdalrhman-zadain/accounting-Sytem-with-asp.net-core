# Known Issues

## Purpose

This file tracks current engineering limitations that matter when editing the system. These are not architectural intentions.

## Frontend Production Build

Previously identified issue (Resolved/Intermittent):

- `frontend` production build occasionally failed after compile and typecheck with:
  - `Next.js build worker exited with code: 1 and signal: null`

Current Status:

- The build currently succeeds (`npm run build`) in the engineering environment.
- `frontend` typecheck is currently blocked by two existing errors in `features/pos/pos-addon-admin-panel.tsx`:
  - `Property 'items' does not exist on type 'InventoryItemsResponse'.`
  - `Parameter 'item' implicitly has an 'any' type.`
- the issue is documented here for reference if it reappears during heavy CI loads or environment changes.
- performance verification must run from `frontend/` against the production Next server (`npm run build && npm run start`), not against dev mode or another package/toolchain in the repo
- the frontend shell now mirrors the language preference into a cookie so server rendering can keep `lang`/`dir` aligned with the persisted setting and avoid avoidable LTR/RTL layout shift on reloads
- local fonts should stay compressed (`.woff2`) in `frontend/app/fonts`; shipping raw `.ttf` assets materially increases first-load transfer size
- the frontend npm scripts route Next through `frontend/scripts/next-run.mjs`, which clears stale `.next` artifacts before `dev` and `build` so OneDrive-backed reparse-point files do not break Next startup while staying runnable on Linux and Windows

What this means for future edits:

- if a change touches app-router behavior, route wrappers, auth gating, or page composition, re-verify the production build to ensure the fix remains stable.
- if a change touches language initialization, shell layout, or global font wiring, re-run Lighthouse against the production server to catch regressions in request weight or CLS.
- if the failure recurs, document the specific triggers or environment details here.
- if frontend script changes bypass `next-run.mjs`, re-verify that stale `.next` artifacts are not the cause before assuming dev/build failures come from application code

## Frontend Dev Watchers On Linux

Current limitation:

- some Linux environments hit `OS file watch limit reached` / `ENOSPC` errors when Next.js development mode runs with native file watching, especially when Turbopack tries to watch large dependency trees under `node_modules`.
- the frontend `npm run dev` launcher now routes through `frontend/scripts/next-run.mjs`, forces `next dev --webpack`, and enables polling-friendly watcher env vars (`WATCHPACK_POLLING=true`, `CHOKIDAR_USEPOLLING=true`) by default so local development does not depend on the host inotify watcher ceiling.
- polling is more resilient for local development, but it can use more CPU than native watchers on large projects.

What this means for future edits:

- keep frontend dev-start documentation aligned with the launcher behavior if the watcher strategy changes again.
- if `npm run dev` is changed to go back to Turbopack or native watching, document the required Linux `fs.inotify.max_user_watches` guidance here so watch-limit startup failures are not mistaken for missing files or broken imports.

## Documentation Warning

If code and docs drift:

- trust the code first
- update docs immediately after confirming behavior
- do not keep outdated architecture descriptions in `docs/`

## Backend Dev Watchers On Linux

Current limitation:

- some Linux environments hit `ENOSPC: System limit for number of file watchers reached` when `ts-node-dev` uses native file watching during `backend` development.
- the backend `npm run start:dev` script now runs `ts-node-dev` in polling mode to avoid depending on the host inotify watcher ceiling.
- polling is more resilient for local development, but it can use more CPU than native watchers on large projects.

What this means for future edits:

- keep backend dev-start documentation aligned with the script behavior if the watcher strategy changes again.
- if native watcher mode is restored in package scripts, document the required Linux `fs.inotify.max_user_watches` guidance in `backend/README.md` or here so startup failures are not mistaken for backend code regressions.

## Backend POS Enum Bootstrap

Current behavior:

- the auth baseline now self-heals older local databases by adding missing `PosAccessRoleCode` enum values for `KITCHEN` and `WAITER` before seeding POS access roles.
- this keeps login/register startup compatible with databases that were created before the restaurant POS role extensions were applied.

What this means for future edits:

- keep the enum bootstrap in sync with any future `PosAccessRoleCode` additions so legacy databases can still hydrate POS roles without a manual enum migration step.

## POS Dual Printer Routing

Current behavior:

- POS kitchen KOT, customer receipt, and session roll prints route through a client-side print service.
- Silent named-printer routing requires QZ Tray to be installed and running on each cashier computer.
- Kitchen and receipt printer names are saved in browser `localStorage` because the same XPrinter model can have different OS printer names on different machines.
- If QZ Tray or a configured printer is unavailable, the POS falls back to the browser print window where possible; browser printing cannot automatically choose between kitchen and receipt printers.

What this means for future edits:

- do not move local OS printer names into global POS settings unless printing is changed to a network/IP or local-agent model with stable printer identifiers.
- keep `docs/pos/printer-setup.md` aligned with any bridge, certificate, script-hosting, or fallback changes.

## Local Docker Port Reservation On Windows

Current limitation:

- some Windows environments reserve dynamic TCP ranges that can block Docker from binding specific localhost ports even when the compose file is correct.
- the previous local PostgreSQL host port `55432` can fall inside an excluded Windows TCP range, which causes Docker startup failures such as `bind: An attempt was made to access a socket in a way forbidden by its access permissions.`
- the project now uses local host port `15432` for PostgreSQL to avoid the reserved range seen on affected machines.

What this means for future edits:

- keep `docker-compose.yml`, `backend/.env`, and `backend/.env.example` aligned if the local PostgreSQL host port changes again.
- if Docker reports a bind-permission error on startup, check `netsh int ipv4 show excludedportrange protocol=tcp` before assuming PostgreSQL or Prisma is misconfigured.

## Phase 2 Bank & Cash Scope

Current limitation:

- supplier master records are not implemented yet, so payment transactions still rely on `counterpartyName` rather than a relational supplier link.
- customer-linked receipt transactions are now supported for Sales & Receivables flows, but the generic Phase 2 payment/receipt UI still primarily exposes `counterpartyName`.
- reconciliation statement import currently uses structured line entry and bulk line import inside the app/API; bank-specific file parser formats are not implemented yet.

What this means for future edits:

- add supplier relations only after the owning supplier module or master records exist
- keep reconciliation as a separate Phase 2 submodule instead of mixing statement matching into the receipt/payment/transfer transaction service

## Phase 3 Sales UI Coverage

Current limitation:

- the main `/sales-receivables` page now exposes customers, quotations, sales orders, invoices, receipts, credit notes, receipt allocation, and aging in one workspace. Customer and sales-invoice list print/PDF/Excel output is available through the shared frontend export engine, but formal single-document outputs and customer statement output are still not implemented.
- the Sales invoice editor now includes a guided `Post & Create Receipt` action that opens a prefilled linked receipt while preserving separate invoice and receipt postings; customer statement output and formal single-document print layouts are still not implemented.
- posted sales invoices now issue stock for inventory-tracked lines and create COGS/inventory-relief accounting from the selected warehouse, but invoice-line unit conversion/multi-UOM stock relief is still not implemented.
- printable quote/order/invoice outputs and customer statement output are still not implemented.
- a customer-facing sales debit note document is not implemented yet. The current codebase includes sales credit notes and purchase-side supplier debit notes, but not a separate receivable-increasing customer debit note workflow/UI.

What this means for future edits:

- keep new Phase 3 changes inside `frontend/features/phase-3-sales-receivables` and preserve Arabic/English translation coverage when adding more document actions.
- add formal document print/export and statement-generation workflows only when their backend routes and output formats are intentionally designed.

## Phase 4 Purchases Status

Current limitation:

- supplier masters, purchase requests, purchase-order maintenance, purchase invoices, supplier payments, and debit notes are now implemented end-to-end for their current draft/post/cancel slices, including journal posting for purchase invoices and debit notes; posted purchase invoices now also update inventory balances/movements for inventory-tracked lines while service lines remain accounting-only.
- supplier and purchase-invoice list print/PDF/Excel output is available through the shared frontend export engine, while formal purchase document templates remain a separate future refinement.
- purchase orders now support draft/issue/receipt/cancel/close lifecycle management and now store operational purchase-receipt records, but they still do not create inventory or accounting journal entries from receipt posting.
- purchase invoices, supplier payments, and debit notes now provide explicit reverse-document workflows that create reversal journal entries and mark the source documents as `REVERSED`.
- purchase debit-note posting now supports master-data-driven supplier debit note types for purchase discount, purchase return, price correction, tax correction, and supplier settlement flows; the foundation seed now creates a default active baseline, but custom environments still need equivalent `SupplierDebitNoteType` master data.
- purchase invoice posting no longer requires a dedicated purchase tax/VAT account; line tax amounts are posted with the line debit accounts instead of a separate tax line. Purchase document entry can now store `taxId`, but posting has not yet been fully refactored to use each tax record's mapped account.
- purchase transaction audit history now includes reversed purchase invoices, supplier payments, and debit notes, but purchase receipts still do not yet have their own reversal flow.

What this means for future edits:

- keep new purchases code inside `backend/src/modules/phase-4-procure-to-pay/purchases` and `frontend/features/phase-4-procure-to-pay`
- preserve Arabic/English translation coverage when adding purchase statuses, document labels, and workflow actions
- do not document non-implemented purchase workflows as implemented until the actual routes, data model, and posting behavior exist
- treat purchase receipt posting impact and receipt reversal as separate future slices; purchase receipts still do not create inventory/accounting effects even though posted purchase invoices now create inventory receipts for stock lines

## Phase 5 Inventory Status

Current limitation:

- item master, warehouses, goods receipts, goods issues, transfers, adjustments, stock-ledger inquiry, warehouse balances, and costing/accounting integration are implemented; posted inventory documents now support reverse status workflows, but reverse currently marks status/audit history only and does not yet create stock-rollback or accounting-reversal entries.
- sales-invoice posting now participates in inventory by creating `SALES_ISSUE` stock movements and warehouse-level stock relief for inventory-tracked lines, but reversal/rollback for those sales-linked stock movements is not implemented yet because sales-invoice reversal is not currently part of the Phase 3 workflow.
- inventory master data now includes item groups, item categories, units of measure, and enforced group/category/material selection in the item card UI/API.
- item cards now support default prices and unit-conversion setup, but inventory, sales, and purchase transaction lines still operate on their current implemented unit workflow; do not assume document-line unit conversion/storage is live until those modules are updated.
- `docs/phase-5-inventory-requirements.md` remains the planning/reference document for the full inventory roadmap and translation alignment.
- inventory accounting entries are conditional and only run when `INVENTORY_ACCOUNTING_ENABLED` is enabled.
- prevent-negative-stock behavior is policy-driven and follows `INVENTORY_PREVENT_NEGATIVE_STOCK` (defaults to enabled).
- inventory valuation method is now organization-configurable via `GET/PATCH /inventory/policy` and falls back to `INVENTORY_COSTING_METHOD` only when no policy row exists.
- on some Windows environments, `npm run prisma:generate` may still end with EPERM rename on `query_engine-windows.dll.node` after updating generated artifacts.

What this means for future edits:

- keep future inventory code inside the dedicated Phase 5 ownership roots rather than mixing it into purchases, sales, or Phase 1 accounting modules.
- preserve Arabic/English translation coverage when adding inventory statuses, movement labels, warehouse terminology, and costing method names.
- document inventory policy behavior (`/inventory/policy` plus `INVENTORY_COSTING_METHOD` fallback) and policy toggles (`INVENTORY_PREVENT_NEGATIVE_STOCK`, `INVENTORY_ACCOUNTING_ENABLED`) whenever behavior changes.

## Phase 6 Payroll Status

Current status:

- Phase 6 Payroll is implemented for employee masters, payroll groups, component setup, employee/group component assignment, payroll rules, payroll periods, payslip generation/editing, payroll period posting/reversal, posted-payslip adjustment, salary payment allocation/settlement/reversal through Bank & Cash, and summary inquiry.
- Formula-based payroll calculations are implemented with a constrained arithmetic evaluator using payroll variables such as `amount`, `base`, `percentage`, `quantity`, `grossPay`, `totalDeductions`, `employerContributions`, and `netPay`.
- Installment-based deductions are represented on component assignments through tracked installment amounts and outstanding balances.
- The `/payroll` frontend exposes group setup, rule setup, employee/component assignment, period processing, payslip adjustment, batch payment allocation capture, payment posting/cancellation/reversal, period reversal, and summary inquiry.

What this means for future edits:

- keep future payroll code inside dedicated Phase 6 ownership roots rather than mixing payroll behavior into purchases, sales, bank/cash, or Phase 1 accounting modules.
- preserve Arabic/English translation coverage when adding payroll components, employee/payment terminology, payslip labels, statuses, and reporting filters.
- treat future payroll extensions as refinements to this implemented module rather than as unimplemented Phase 6 basics.

## Phase 7 Fixed Assets Status

Current status:

- Phase 7 Fixed Assets is implemented for category setup, fixed-asset register maintenance/editing, acquisition capture/posting/reversal, depreciation run capture/posting/reversal, disposal capture/posting/reversal, transfer capture/posting/reversal, asset-level depreciation schedule/history inquiry, and summary inquiry.
- Asset categories store default depreciation assumptions and posting-account references used to seed fixed-asset masters and lifecycle documents.
- The `/fixed-assets` frontend exposes category setup, asset register, asset editing/deactivation, acquisition, depreciation, disposal, transfer, audit history, and summary workflows with Arabic/English translation coverage.

What this means for future edits:

- keep future fixed-asset code inside dedicated Phase 7 ownership roots rather than mixing asset lifecycle behavior into purchases, inventory, bank/cash, or Phase 1 accounting modules.
- preserve Arabic/English translation coverage when adding fixed-asset statuses, depreciation methods, disposal terminology, document labels, and reporting filters.
- treat future fixed-asset extensions as refinements to this implemented module rather than as unimplemented Phase 7 basics.

## Phase 8 Reporting Status

Current status:

- Phase 8 Reporting is implemented as a bilingual workspace at `/reporting` with saved definitions, snapshots, export controls, and activity visibility in addition to the core financial inquiries.
- The current slice includes summary inquiry, trial balance, balance sheet, profit and loss, classified cash flow reporting, general ledger inquiry, audit inquiry, comparison-period filters, reusable saved definitions, persisted snapshots, snapshot locking/versioning, native XLSX/PDF/print export output generation, and reporting activity logging.
- The current implementation derives report values from posted ledger, bank/cash, account, and audit data and persists reporting controls in Phase 8-owned runtime tables.

Current limitation:

- reporting control persistence is created at runtime by the reporting service and is not yet modeled through a generated Prisma delegate workflow.
- reporting persistence bootstrap is serialized inside the reporting service to avoid PostgreSQL duplicate-type races when multiple reporting requests hit the runtime table initializer at the same time.
- exported document layouts are functionally complete for the baseline requirements, but the PDF/XLSX output remains intentionally minimal rather than visually polished.
- cash-flow classification currently uses posted counter-account heuristics from the journal entry to split operating, investing, financing, and unclassified movement.

What this means for future edits:

- keep new reporting code inside `backend/src/modules/phase-8-reporting-control/reporting` and `frontend/features/phase-8-reporting-control`.
- preserve Arabic/English translation coverage when adding report names, filters, actions, column labels, and comparison/snapshot terminology.
- do not document the remaining Phase 8 roadmap items as implemented until the actual routes, data structures, and output behavior exist.

## POS Sales Screen Status

Current limitation:

- the POS workspace now persists sessions, draft sales, held sales, completed sales, payments, receipt numbers, returns/refunds, and review-state data through backend POS APIs backed by `SalesInvoice.invoiceType = POS`, `PosSession`, `PosPayment`, `PosReturn`, `PosReturnLine`, and `PosReturnPayment`.
- POS completion creates immediate stock relief and refreshes a grouped draft journal entry for the owning session when `POS_POSTING_MODE = BY_SESSION`; the review tab now posts sales accounting at the session level by default, while return/refund accounting remains a separate review flow.
- POS returns now create immediate stock-in for inventory items, record refund methods, prepare a separate draft journal for accountant approval, and appear in the new returns/reporting queries.
- POS session posting currently keeps inventory cost and warehouse movement detail for operational reporting while defaulting `POS_COGS_POSTING_ENABLED = false`, so session accounting preview/posting excludes COGS/inventory journal lines unless a later implementation explicitly enables and extends grouped COGS logic.
- the `/pos` frontend now supports cashier-side return entry, held-sale review, accountant review actions, and detailed report grids backed by POS APIs, but it still does not implement offline mode, loyalty/promotions, branch master integration, or fine-grained non-role permission administration.
- POS sales now support optional customer selection from the cart sidebar: the cashier can search existing active customers, select one via a live search dropdown, or quick-create a new customer (name + tax treatment) without leaving the POS screen. If no customer is selected the system defaults to `ensureWalkInCustomer()` for backward compatibility. The selected customer ID is persisted on `SalesInvoice.customerId` and is restored when a draft or held sale is resumed.
- the register screen uses warehouse-scoped inventory list (`GET /inventory/items?warehouseId=`) for on-hand in the grid and gates over-selling using `runtime.negativeStockAllowed` plus POS permissions; partial/credit completion requires a selected real customer when tendered is below total and policy allows it.
- cashier catalog favorites persist through `GET`/`PUT /pos/favorites/items` (requires the Prisma migration that adds `PosUserFavoriteItem` and related enum values when the database is upgraded).
- register layout is partially split into `pos-product-card.tsx`, `pos-session-bar.tsx`, and `pos-register-layout.tsx` while state and mutations remain in `pos-page.tsx`.
- the **Offers** category chip still uses a lightweight text/metadata heuristic (not a dedicated promotion price table); treat it as UX-only until item master exposes promotional fields.
- POS sell-by-weight now supports quick-pick preset weights (`0.25`, `0.5`, `0.75`, `1` of the base weight unit) in the add-on modal for both cashier and waiter product selection, but integrated scales, weight-embedded barcodes, automatic tare handling, and richer waiter-side decimal quantity editing are still not implemented.
- the restaurant POS addendum now includes live table and kitchen APIs, delivery company/driver endpoints, restaurant metadata persistence across draft/hold/complete flows, register-side order-type selection (DINE_IN / TAKEAWAY / DELIVERY toggle in cart), dine-in table controls, waiter/driver/company selectors in the cart sidebar, table transfer/merge/split action buttons now visible in the register while an order is open, cashier close-shift cash counting, and accountant review tabs with order-type and payment-method correction.
- the floor plan now shows all five table states (AVAILABLE, OCCUPIED, RESERVED, WAITING_FOR_PAYMENT, CLEANING) and a per-card status/waiter-assign modal reachable by hovering the card and clicking the gear icon.
- **Next.js dev `ChunkLoadError` (layout chunk timeout):** usually means the browser still references old `/_next/static/...` hashes after the dev server restarted or `.next-dev` was wiped. Fix: hard-refresh (`Ctrl+Shift+R`), or restart `npm run dev` once. Use `NEXT_DEV_CLEAN=1 npm run dev` only when you need a full cache reset; normal `npm run dev` no longer deletes `.next-dev` on every start.
- dedicated operational boards: **Waiter order tracking** at `/pos/waiter/orders` (dine-in only: waiting → received → departed) and **Delivery Board** at `/pos/delivery` (kanban by delivery status, driver assign, status advance). Kitchen has no digital screen — KOT prints on send only. `/pos/kitchen` redirects to the waiter board for legacy bookmarks.
- POS sidebar links are gated by explicit role routes plus permission fallbacks in `frontend/lib/auth-access.ts`. The `/pos` prefix no longer unlocks every sub-route; cashiers need a fresh login after route/permission seed changes to pick up `/pos/returns` and `POS_VIEW_COMPLETED_SALES`.
- **Waiter role:** assign POS role `WAITER` (seed user `waiter` / `waiter123` via `backend/prisma/setup-pos-waiter.ts`). Waiter-only users use `/pos/waiter/tables`, `/pos/waiter/order`, and `/pos/waiter/orders`. They build dine-in orders, confirm via `POST /pos/sales/:id/send-to-kitchen` (prints KOT), then advance service on the waiter board: **في انتظار → تم الاستلام → مغادرة**. `مغادرة` sets the table to `CLEANING`; cashier pays afterward from held sales/register. After dine-in payment, the table stays on `CLEANING` until the waiter taps **Table ready / الطاولة جاهزة** on the floor plan. The floor plan also exposes a **Needs cleaning** filter when any table is in that state. After waiter confirm (`waiterConfirmedAt`), both waiter and cashier carts are locked until payment.
- **Kitchen role (`KITCHEN`)** is legacy: no dedicated screen route remains. Use waiter accounts for dine-in service tracking.
- the delivery board lists completed POS sales with `orderType === "DELIVERY"` (same data source as the old register tab); orders must be completed at the register before they appear on the board.
- **Waiter-confirmed order lock:** when `waiterConfirmedAt` is set on a dine-in sale, the register cart is frozen — no add/edit/remove or order changes until payment. Cashier can still **Pay** after the waiter marks **مغادرة** (table `CLEANING`). Backend `saveDraft` / hold paths enforce the same rule server-side.
- the restaurant workflow is still incomplete: waiter master-data administration is still lightweight, delivery-company settlement is now available for accountant confirmation/reversal and reporting but still uses manual statement/attachment URLs rather than a dedicated upload subsystem or external delivery API integration, pre-order completion still does not auto-occupy the table at the database level (cashier must confirm via the new handoff prompt), and broader reopen/correction lifecycle tooling remains narrower than the full restaurant requirements.
- table reservations support multiple non-overlapping time slots on the same table even while it has a live order; the reserve modal lists each slot with **Pre-order products** and **Cancel reservation** only (no guest-note or arrival fields in the UI). When the current order closes, table status is recalculated so later reservations can show as **Reserved** again. Waiter assignment remains at the table level via the table gear menu.
- **Third-Party Delivery Order Payment Enforcement:** POS sales with `orderType === "DELIVERY"` and `deliveryMode === "THIRD_PARTY"` (e.g., Talabat, Careem, Ashyaai) are forced to have `deliveryCollectionMethod === "COMPANY"` (Customer Paid via Delivery App). Cashier-selectable payment methods are disabled and bypassed, and completing the order automatically sets `deliverySettlementStatus === "PENDING"`. The resulting transaction journal entry debits the selected delivery company's receivable account instead of the session's cash/bank account. Reversal/correction flows enforce these validation rules backend-side.

What this means for future edits:

- keep new POS UI code inside `frontend/features/pos`.
- preserve the deliberate split between operational completion and accountant posting when extending POS.
- when extending the customer selector (e.g. credit-sale enforcement, balance display), read the current customer from `selectedCustomer` state in `PosPage` and pass it as a prop or context; do not duplicate the `customersQuery` fetch.
- if future POS work adds a full return-entry UI, branch master linkage, or finer approval/permission controls, update `docs/README.md`, `docs/system-design.md`, `docs/data-model.md`, and this section together.

## Reservation Pre-Order Limitations

Known limitations as of implementation:

- One pre-order per reservation at a time. Creating a second pre-order from the same reservation replaces the `preOrderSaleId` link if the previous sale is completed, voided, or cancelled. A still-active previous pre-order is resumed instead.
- A pre-order can only be created while there is at least one open `PosSession`. If no session is open, the cashier must open a session first.
- Kitchen ticket (KOT) is created if `orderType = DINE_IN` is passed through hold/save, but the table is not occupied. Cashiers should be aware the kitchen sees the pre-order as a real dine-in ticket. A future pass can add a `PRE_ORDER` kitchen status.
- Pre-order sales are visible in "Held Sales" alongside live table orders. No separate pre-order list view exists yet.
- Completing (charging) a pre-order from the POS register while in pre-order mode (banner visible) now shows a prompt ("Open Table?") in the payment success modal, allowing the cashier to navigate directly to the register with the table pre-selected. The table status update itself still requires the cashier to proceed; it is not automated at the DB level.
- The `preOrderSaleId` and related fields are stored inside the `notes` JSON column on `PosTableReservation` (no schema migration), which means they are not indexed or queryable efficiently at scale. If pre-orders grow to high volume, a dedicated FK column should be added to the schema.
