# Project Documentation

This directory is the engineering handbook for the current project state.

Use these docs before making changes so you can answer:

- what exists today
- where each responsibility lives
- which layer owns a change
- which accounting rules must remain intact
- which routes and module boundaries should stay stable

## Reading Order

1. [System Design](./system-design.md)
2. [Project Structure](./project-structure.md)
3. [System Structure Report](./system-structure-report.md) (one-page layout and route map)
4. [Accounting Core](./accounting-core.md)
5. [Data Model](./data-model.md)
6. [Change Guide](./change-guide.md)
7. [Known Issues](./known-issues.md)

Additional phase requirements baselines:

- [Phase 4 Purchases Requirements](./phase-4-purchases-requirements.md)
- [Phase 5 Inventory Requirements](./phase-5-inventory-requirements.md)
- [Phase 6 Payroll Requirements](./phase-6-payroll-requirements.md)
- [Phase 7 Fixed Assets Requirements](./phase-7-fixed-assets-requirements.md)
- [Phase 8 Reporting Requirements](./phase-8-reporting-requirements.md)
- [Phase 9 Tax & Compliance Requirements](./phase-9-tax-compliance-requirements.md)
- [POS Roles & Permissions Requirements](./pos/Phase_POS_Roles_and_Permissions_Requirements.md)
- [Restaurant POS Requirements Addendum](./pos/Restaurant_POS_Requirements_Bilingual_MD_Style.md)
- [Restaurant POS Implementation Plan](./pos/restaurant_pos_implementation_plan.md)
- [Market POS](./pos-market/README.md)

## Scope

These docs describe the currently implemented accounting modules.

- `platform/auth` is implemented, including username/password login, inactive-user blocking, JWT session hydration, and POS access snapshots with `cashier` / `accountant` role-to-permission resolution.
- `phase-1-accounting-foundation/accounting-core` is implemented.
- Phase 1 Master Data now includes tax code setup for sales/purchase document entry, with tax rates, tax types, account mapping, active/inactive control, and protected deletion when tax records are used historically.
- `phase-2-bank-cash-management/bank-cash-accounts` is implemented.
- `phase-2-bank-cash-management/bank-cash-transactions` is implemented for receipt, payment, and transfer drafts/posting, and its frontend workspace is now surfaced from the unified `/bank-cash-accounts` screen.
- `phase-2-bank-cash-management/bank-reconciliations` is implemented for statement-line entry/import, matching, and reconciliation status tracking.
- `phase-3-sales-receivables` is implemented for customer masters, sales quotations, sales orders, sales invoices, customer receipts, credit notes, receipt allocation, customer balances, and aging reports. Posted sales invoices now also issue stock for inventory-tracked lines and add COGS/inventory relief accounting while service lines remain revenue-only.
- `phase-4-procure-to-pay/purchases` now includes Supplier master records, Purchase Requests (draft/submit/approve/reject/close, request lines, status history, and request-to-order conversion), Purchase Orders (draft/issue/partial receipt/full receipt/cancel/close, direct creation, request-linked creation, and receipt-history tracking), Purchase Receipts (draft/post/cancel, PO-line quantity receipt, and automatic PO receiving-status updates), Purchase Invoices (direct/order-linked draft capture, line account classification, discounts/tax/totals, posting to journal entries, draft-to-posted locking, and reversal), Supplier Payments (draft capture, invoice allocation, posting through Bank & Cash, cancellation, supplier-balance reduction, and reversal), and Debit Notes (draft/edit/post/cancel, optional purchase-invoice linkage, purchase-policy-driven discount accounts, journal posting that debits supplier payable and credits purchase discount plus input VAT reduction when applicable, payable-balance reduction on linked invoices, and reversal).
- `phase-5-inventory-management/inventory` now includes Item Master, Warehouses (including default transit designation), Goods Receipts, Goods Issues, Sales Invoice stock issues, Inventory Transfers, Inventory Adjustments, stock ledger inquiry, inventory policy configuration (`/inventory/policy` for valuation method), warehouse-level balances, FIFO/weighted-average costing control, posting/accounting integration hooks, and bilingual ERP workspace coverage. Posted movements now maintain both item-level and warehouse-level quantity/value balances with stock movement history, source-transaction drill-down, and reverse-status history for posted inventory documents. Purchase-invoice reversal now creates a real opposite stock movement (`PURCHASE_RETURN`) on the same item and warehouse inside the same database transaction as the accounting reversal, while the stock-ledger read model continues to label sales-invoice rollback rows as explicit opposite-direction reversals so the visible movement rows net back to the final on-hand balance.
- `phase-6-payroll-management/payroll` is implemented for employee masters, payroll groups, payroll components, employee/group component assignments, payroll rules with fixed/percentage/quantity/formula calculation, payroll periods, payslip generation/editing/adjustment, payroll posting and reversal through Phase 1 journal entries, salary payment allocation/settlement/reversal through Phase 2 bank/cash payments, and summary inquiry.
- `phase-7-fixed-assets-management/fixed-assets` is implemented for fixed-asset category setup, asset register maintenance/editing, acquisition draft/post/reverse, depreciation run draft/post/reverse with schedule/history visibility, disposal draft/post/reverse, transfer draft/post/reverse, audit-history capture, summary inquiry, and bilingual ERP workspace coverage.
- `phase-8-reporting-control/reporting` is implemented for a bilingual reporting workspace covering summary inquiry, trial balance, balance sheet, profit and loss, cash movement, general ledger, audit inquiry, saved report definitions, point-in-time snapshots, export/print output generation, and reporting activity logging using posted accounting data.
- a POS module now exists at `/pos` with backend-backed session open/close, draft/hold/resume/void sale capture, barcode/code add, item search, cart editing, discounts, payment capture, complete sale, enriched receipt preview/print, controlled receipt reprint, inventory issue on completion, grouped session-level accounting journal preparation/review for completed POS sales, accounting rejection/reversal controls aligned with session posting, cashier-side POS return/refund capture, detailed tax/payment/cashier/branch/item/inventory reporting, session reporting using `SalesInvoice.invoiceType = POS`, `PosSession`, `PosPayment`, `PosReturn`, `PosReturnLine`, and `PosReturnPayment`, plus route/menu/API gating between cashier-only operational screens and accountant review/reporting screens.
- the restaurant POS addendum is now implemented as an extended operational slice on top of the base POS: schema/migrations/seeds, permission definitions, table management APIs, kitchen order APIs, delivery company/driver APIs, POS sale persistence for `orderType` / `tableId` / waiter / service charge / delivery fields, register-side order-type selection for dine-in, takeaway, and delivery, dine-in table controls, waiter selection for dine-in flows, driver/company selection for delivery flows, delivery panels, table transfer/merge/split actions, a cashier close-shift modal, and accountant review tabs with both order-type correction and payment-method correction are in place. Dine-in kitchen production is print-only (KOT on send). Client-side POS printing now routes kitchen KOT, customer receipt, and session roll templates through a shared printer service with QZ Tray named-printer support and browser-print fallback; each cashier PC stores its local kitchen/receipt printer names in browser storage via `/pos/printers` for cashier users or the printer panel inside `/pos/settings` for accountant users (see [POS Printer Setup](./pos/printer-setup.md)). Waiters track open table orders at `/pos/waiter/orders` (waiting → received → departed); `/pos/kitchen` redirects there for legacy bookmarks. The delivery route is also role-split inside the shared POS workspace: cashier-style users see the operational delivery board, while accounting/report users see only delivery receivables and settlement follow-up. POS cashier payment capture now hides accounting-account selection and stores only payment method and paid amount; the accounting side is driven by POS settings mappings in `PosRuntimeSetting` plus delivery-company receivable accounts. Third-party delivery orders now also store whether payment was collected by the restaurant or by the delivery company, keep delivery-company receivables open with `deliverySettlementStatus`, support accountant-side settlement preview/confirmation/reversal, and provide delivery-company receivable / settlement / sales reports. Session/invoice posting now resolves payment debits from those configured mappings, blocks unmapped methods with `طريقة الدفع غير مربوطة بحساب محاسبي`, and keeps card settlements on clearing accounts by default instead of posting directly to bank unless explicitly configured. Payment correction now updates POS payment rows, session cash/payment breakdowns, expected cash, and draft accounting preview without changing revenue/VAT. The accountant POS session review page now includes a print dropdown with three 80mm thermal roll print options (طباعة رول الوردية / session shift closure roll report, طباعة قائمة الفواتير رول / invoice list roll, and طباعة كل الإيصالات / all receipts roll); each print option logs a `SESSION_ROLL_REPORT`/`INVOICE_LIST_ROLL`/`ALL_RECEIPTS_ROLL` audit trail via `POST /pos/sessions/:id/print-roll-report` without changing accounting status; the client-side thermal receipt HTML is generated in `frontend/features/pos/pos-session-roll-print.ts` using 80mm/76mm Courier monospace layout with Arabic RTL text. Richer waiter administration, deeper KDS workflows, and broader reopen/correction auditing refinements remain for later passes as detailed in [Restaurant POS Implementation Plan](./pos/restaurant_pos_implementation_plan.md).
- a separate **market POS** product now exists at `/pos-market` with full retail core parity (register, sessions, held, returns, review, reports, settings, printers), frontend ownership in `frontend/features/pos-market`, backend API namespace `/api/pos-market`, role `MARKET_CASHIER`, and seed login `market / market123` (or `market_cashier / market123`). Restaurant POS remains under `/pos` and is frozen for new features unless explicitly requested. See [Market POS](./pos-market/README.md).
- other later ERP phases are **not implemented yet** and should not be described as existing behavior

## POS Roles & Permissions Status

Current implementation status against [POS Roles & Permissions Requirements](./pos/Phase_POS_Roles_and_Permissions_Requirements.md):

Implemented:

- unique username/password login is supported, and passwords are stored as bcrypt hashes
- inactive users are blocked from login
- users now carry POS access roles and permission snapshots for `CASHIER`, `ACCOUNTANT`, `KITCHEN`, `WAITER`, and `MARKET_CASHIER`
- login/session payloads now include POS permissions, allowed routes, and a role-based default route
- cashier-only users are redirected to `/pos/register`
- accountant-access users are redirected to `/dashboard`
- frontend route protection now blocks screens outside the signed-in user's allowed route list
- sidebar/navigation visibility now changes by allowed route access instead of showing the same ERP menu to everyone
- cashier-only backend sessions are blocked from non-POS APIs by the JWT auth guard
- POS backend actions now enforce permission-based access inside the POS service for session open/close, sales completion, held sales, review, reports, and accounting approval/rejection flows
- POS route aliases now exist for cashier and accountant flows, including `/pos/register`, `/pos/session`, `/pos/sessions`, `/pos/held-sales`, `/pos/accounting-review`, `/pos/completed-sales`, `/pos/reports`, and `/pos/settings`
- the restaurant dine-in tables screen `/pos/tables` is treated as a cashier-side operational route and is no longer granted to accountant-only access snapshots
- the POS returns screen `/pos/returns` is treated as a cashier-side operational route and is no longer granted to accountant-only access snapshots
- seed/setup support now includes dedicated POS logins: `cashier / cashier123` (restaurant POS), `market / market123` and `market_cashier / market123` (market POS only; default route `/pos-market/register`), `kitchen / kitchen123` (legacy role, no screen), and `waiter / waiter123` (waiter lands on `/pos/waiter/tables`, confirms orders via `POST /pos/sales/:id/send-to-kitchen`, tracks service at `/pos/waiter/orders`, cannot pay)

Not fully implemented yet:

- full system-wide backend permission enforcement for every non-POS accounting controller is not yet driven by the new POS permission list; existing accounting modules still primarily rely on legacy auth/module behavior
- POS report export is not yet explicitly enforced by `POS_EXPORT_POS_REPORTS`
- the accountant review UI does not yet expose a dedicated POS-to-journal-entry drill-down workflow even though accountants can reach `/journal-entries`
- the shared `/pos` workspace still serves both cashier and accountant flows from one feature shell; visibility differs by access, but the UI is not yet split into fully distinct role-specific shells

Practical meaning:

- the POS roles/permissions baseline is substantially implemented
- the requirements document should currently be treated as partially complete rather than 100% closed

## How To Use These Docs

- Start with [System Design](./system-design.md) if you need the big picture.
- Use [System Structure Report](./system-structure-report.md) for a concise repository layout, stack table, and route-to-feature map.
- Use [Project Structure](./project-structure.md) to decide where new code belongs.
- Use [Accounting Core](./accounting-core.md) before changing accounting behavior or APIs.
- Use [Data Model](./data-model.md) before changing schema assumptions or posting logic.
- Use [Change Guide](./change-guide.md) when implementing a common task.
- Check [Known Issues](./known-issues.md) before treating current behavior as intentional.
