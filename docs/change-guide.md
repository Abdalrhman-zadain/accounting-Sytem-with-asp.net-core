# Change Guide

## Summary

This guide explains where to edit the system for common Phase 1 changes and what must be checked before finishing the work.

## Add A New Accounting Screen

Where to edit:

- create the screen in `frontend/features/accounting/<feature>`
- keep the route entry in `frontend/app/(erp)/...`
- add shared UI only if it is truly reusable in `frontend/components/ui`

What else to check:

- route protection with `RequireAuth`
- API calls through `frontend/lib/api`
- whether the new screen belongs to an existing feature or a new Phase 1 subfeature
- if the screen grows beyond a simple page component, split feature-local `components/`, `types`, and `utils` inside the owning feature folder

Must remain compatible:

- current public URLs unless a route change is intentional
- route files stay thin

Checks to run:

- frontend typecheck
- frontend route render check in dev

## Add Print Or Export To A List Screen

Where to edit:

- keep the feature-specific row mapping in the owning `frontend/features/...` page or feature utility
- use `frontend/components/ui/export-actions.tsx` for the shared Print/PDF/Excel controls
- use `frontend/lib/export-print.ts` for output generation

What else to check:

- exported columns must use user-facing Arabic labels, not raw API keys
- filters should be summarized as text metadata above the output instead of exporting input controls
- rows should represent all records matching the current filters; if a list later uses server pagination, add or reuse an API read that fetches the full filtered result set before exporting
- do not print the full page DOM, navigation, buttons, tabs, pagination, or action menus
- include totals when the list has meaningful accounting totals
- keep permissions pluggable through `canPrint`, `canExportPdf`, and `canExportExcel`

Checks to run:

- frontend typecheck
- manual smoke test for print preview and Excel download on at least one RTL list

## Add Or Change Bank/Cash Accounts

Where to edit:

- `frontend/features/phase-2-bank-cash-management/bank-cash-accounts`
- `frontend/app/(erp)/bank-cash-accounts/page.tsx`
- backend `phase-2-bank-cash-management/bank-cash-accounts`
- `backend/prisma/schema.prisma` and Prisma migration files if the registry shape changes

What else to check:

- linked account must be an active posting asset account
- payment-method type must match an active `PaymentMethodType` from Master Data
- the default payment-method set is `Bank` and `Cash`; additional methods are managed in Master Data rather than hard-coded in the bank/cash feature
- linked account must remain unique per bank/cash record
- the create/edit form should let the user select the linked posting account from the dedicated linked-account autocomplete only, but may also create a new eligible linked account inline from that control
- inline linked-account creation must stay inside the seeded `Cash and Cash Equivalents` asset subtree
- inline linked-account creation must support both:
  - creating a new header under `Cash and Cash Equivalents` and then a posting child under that new header
  - creating a posting child under any existing header within the `Cash and Cash Equivalents` subtree
- the stored bank/cash `accountNumber`/reference should be generated from the linked chart-of-accounts code rather than typed manually in the form
- currency must match the linked chart-of-accounts account
- records typed as `Bank` require `bankName`; the system derives the reference/account number from the linked chart-of-accounts code
- if an opening balance is provided, an offset posting account must also be selected so the system can post a balanced opening entry
- opening-balance offset account choices in the bank/cash create form should be limited to active posting `EQUITY` accounts
- the bank/cash create form should default the opening-balance offset account to `3410001 Opening Balance Equity` when that posting equity account is available in the chart of accounts
- deactivated records must stay visible for history but blocked from edit and new selection
- history reads must come from posted ledger transactions, not drafts

Must remain compatible:

- `/bank-cash-accounts` route behavior unless intentionally changed
- current balance meaning from the linked posting account
- historical visibility after deactivation

Checks to run:

- backend tests
- backend build
- frontend typecheck
- Prisma generate and migration review

## Add Or Change Bank/Cash Transactions

Where to edit:

- backend `phase-2-bank-cash-management/bank-cash-transactions`
- `backend/prisma/schema.prisma` and Prisma migration files if transaction shape changes
- frontend Phase 2 transaction features and API wrappers when UI is added
- the primary frontend workspace now lives under `frontend/app/(erp)/bank-cash-accounts/page.tsx`; legacy route files under `frontend/app/(erp)/bank-cash-transactions/...` should stay thin and only redirect into the unified bank/cash workspace

What else to check:

- receipts and payments must select an active bank/cash account and an active posting counter account
- transfers must select active, different source and destination bank/cash accounts
- receipt, payment, and transfer references should be treated as system-generated identifiers in the Phase 2 transaction UI rather than user-entered fields
- transaction drafts must not update balances until posted
- posting must create a journal entry and use Phase 1 posting logic so ledger rows and account balances remain consistent
- posted transactions must stay locked from edit and retain their journal-entry link
- deactivated bank/cash accounts must not be selectable for new receipts, payments, or transfers

Must remain compatible:

- existing `/bank-cash-accounts` route and registry behavior
- `/bank-cash-transactions/receipts`, `/bank-cash-transactions/payments`, and `/bank-cash-transactions/transfers` should keep redirect compatibility into the unified `/bank-cash-accounts` workspace unless intentionally changed
- Phase 1 journal-entry and posting invariants
- ledger history as the authoritative source for posted account activity

Checks to run:

- backend tests
- backend build
- Prisma generate and migration review

## Add Or Change Bank Reconciliation

Where to edit:

- backend `phase-2-bank-cash-management/bank-reconciliations`
- `backend/prisma/schema.prisma` and Prisma migration files if reconciliation data changes
- frontend `features/phase-2-bank-cash-management/bank-reconciliations`
- route files under `frontend/app/(erp)/bank-reconciliations`

What else to check:

- reconciliations must target active bank/cash records with active posting accounts behind them
- statement lines must allow manual entry and bulk import line entry
- matching must only use ledger rows from the linked posting account
- already reconciled ledger rows must not be offered again as new unmatched system transactions
- completing a reconciliation must not bypass match audit state
- unmatched statement lines and unmatched system transactions should stay visible during review

Must remain compatible:

- `/bank-reconciliations` route behavior unless intentionally changed
- linked-account ownership of bank/cash reconciliation history
- Phase 1 ledger meaning as the authoritative source of posted system transactions

Checks to run:

- Prisma generate and migration review
- backend tests
- backend build
- frontend typecheck

## Add Or Change Sales & Receivables

Where to edit:

- backend `phase-3-sales-receivables/sales-receivables`
- `backend/prisma/schema.prisma` and Prisma migration files if customer/quotation/order/invoice/receipt/note/allocation shape changes
- frontend `features/phase-3-sales-receivables`
- route files under `frontend/app/(erp)/sales-receivables`
- frontend API wrappers/types in `frontend/lib/api` and `frontend/types/api` when UI or integration code is added

What else to check:

- sales document tax choices should come from active `Tax` master data (`GET /taxes/active`) rather than manual free-text or arbitrary tax values
- tax setup now has two layers: `Tax` stays the master for actual codes/rates/accounts, while `TaxTreatment` stores customer-facing business treatment defaults and may optionally point to a default tax code
- sales document lines should persist both `taxId` and the calculated `taxAmount` so historical documents remain readable if a tax is later deactivated
- customer records must remain deactivatable without deleting history
- customer creation supports either creating a new posting receivable account automatically under `1121000 Customer Receivables / ذمم عملاء` or linking an existing active posting Asset account from that same subtree
- customer sales-rep assignment should use optional `salesRepId` to an active Sales & Receivables `SalesRepresentative` for follow-up, reports, commissions, and collections; never substitute the representative's employee-payables account for the customer receivable account
- new sales representatives should default their generated codes to sequential `REP-<number>` values such as `REP-1`, `REP-2`, and `REP-3`; when calculating the next number, ignore legacy non-sequential `REP-YYYYMMDD-...` codes
- sales representative account linking may create a new posting liability account under `2130000 Employee Payables / ذمم الموظفين`, link an existing active posting account from that subtree, or leave the representative without an account; this link remains employee-side context only
- market field-sales logins (`MARKET_REP`) are created from **Sales Receivables → Sales Reps** via `POST /sales-receivables/sales-reps/:id/market-login` (admin/manager only); the endpoint auto-links `User.salesRepId`, allows only one active market login per rep, and should not use the public unauthenticated `POST /auth/register` flow for production admin work
- customer names should remain unique, and automatic customer-receivable account creation must not create a second detail account with the same customer name under `1121000`
- customer creation and editing must require an active `TaxTreatment`; the old free-text tax-information field is no longer the authoritative sales tax selector
- deactivated customers must not be selectable for new quotations, sales orders, invoices, receipts, or credit notes
- quotation drafts must stay editable until approved/cancelled, and approved quotations must preserve downstream traceability after conversion
- new sales quotation references should default to a daily sequential format such as `QUO-20260524-1`, `QUO-20260524-2`, and `QUO-20260524-3`; when calculating the next number for a given day, ignore legacy non-matching quotation references
- sales quotation lines may now optionally link to active inventory items for UI-assisted item/service selection, must persist the linked `itemId`, and must still keep `itemName`, `description`, and `revenueAccountId` snapshot context so commercial history and print displays do not depend on future item-master edits
- new sales order references should default to a daily sequential format such as `SO-20260524-1`, `SO-20260524-2`, and `SO-20260524-3`; when calculating the next number for a given day, ignore legacy non-matching sales-order references
- sales-order lines may now optionally link to active inventory items for UI-assisted item/service selection, must persist the linked `itemId`, and must still keep `itemName`, `description`, and resolved revenue-account context so downstream invoice conversion keeps commercial traceability even if the item master changes later
- sales-invoice lines may now optionally link to active inventory items for UI-assisted item/service selection, must persist the linked `itemId`, optional `warehouseId` for stock-tracked items, and must still keep `itemName`, `description`, and resolved revenue-account context so posted commercial history stays readable even if the item master changes later
- selecting or changing an invoice customer should offer to re-apply the customer's tax-treatment default across existing draft invoice lines, and newly added lines should inherit that same default tax automatically
- converting an approved quotation or sales order into an invoice should prefill the invoice editor, let the user choose revenue accounts per line, and only call the convert API when the draft is saved
- the quotation editor supports both `save draft` and immediate `approve quotation` from the same form; when approving a brand-new quotation, the UI should save first and then approve the created draft in the same flow
- sales-order drafts must stay editable until confirmed, and confirmed orders must preserve quotation/invoice traceability
- the sales-order editor now exposes an explicit confirm button (`تاكيد أمر البيع`) alongside draft save; confirming from the modal must save the draft first and then call the existing sales-order confirmation workflow
- all sales documents (quotations, orders, invoices, receipts, and credit notes) create/edit forms should open inline inside their respective tab workspaces using the unified inline workspace presentation pattern, rather than as separate modal overlay popups
- new sales invoice references should default to a daily sequential format such as `INV-20260524-1`, `INV-20260524-2`, and `INV-20260524-3`; when calculating the next number for a given day, ignore legacy non-matching invoice references
- invoice and credit-note drafts must stay editable, but posted documents must be locked
- credit-note type selection must come from active `CreditNoteType` master data (`GET /credit-note-types/active`) rather than a hardcoded frontend-only option list
- `CreditNoteType` now controls whether a linked invoice is required, whether inventory can be affected, whether tax adjustment is allowed, which default posting account is used, and which helper text the credit-note editor should show
- the foundation seed should provide a working default `CreditNoteType` baseline (`CN-DISCOUNT`, `CN-SALES-RETURN`, `CN-PRICE-DIFF`, `CN-TAX-CORRECTION`, and `CN-CUSTOMER-SETTLEMENT`) so fresh environments can open the credit-note editor without manual setup
- sales credit notes must support distinct business types instead of treating every note as a post-sale discount:
  - `CN-DISCOUNT` remains financial-only and keeps the discount-style line editor
  - `CN-SALES-RETURN` must stay separate from discounts because it may restock inventory, reverse COGS, and use sales-return accounts
  - `CN-PRICE-DIFF` adjusts unit-price differences without inventory impact
  - `CN-TAX-CORRECTION` adjusts tax only without revenue/inventory line impact
  - `CN-CUSTOMER-SETTLEMENT` supports financial settlement lines and may leave linked invoice blank when the master-data rule allows it
- sales-return credit-note lines must load from the linked invoice lines, cap returned quantity to sold minus previously posted/applied returns, and require a warehouse whenever the returned item is going back into stock
- posting must create a journal entry and use Phase 1 posting logic so ledger rows and balances remain consistent
- sales invoice, receipt, and credit-note accounting must continue to use the customer's linked receivable account, not `salesRepId` or employee payable/receivable accounts
- sales invoices must derive due date from the supplied due date or the customer payment terms
- sales document references must remain unique across quotations, sales orders, invoices, receipts, and credit notes
- customer balance must increase on posted invoices and decrease on posted credit notes
- inventory-bearing sales-return credit notes must also create `InventoryStockMovement` rows with movement type `SALES_RETURN`, increment item/warehouse balances, add cost layers, and book inventory/COGS reversal lines in the same posting flow
- linked sales credit notes must keep their tax-inclusive total at or below the referenced invoice outstanding balance at save and post time
- customer receipts created from Sales must still use the Phase 2 bank/cash posting behavior and remain allocatable to one or more invoices
- sales-invoice posting must debit the customer's receivable account for the invoice grand total, credit one or more revenue accounts from the invoice lines for the net subtotal, and credit the mapped tax account for any applied tax amount
- inventory-tracked sales-invoice lines must default warehouse selection from the item preferred warehouse when available, require a warehouse before save/post, validate warehouse stock at posting time, create one `InventoryStockMovement` issue row per posted line without duplicating by `sourceLineId`, and add matching COGS/inventory-relief journal lines inside the same database transaction
- sales-invoice posting must reject draft documents that are missing customer/date/currency/lines, any line revenue account, a required tax account, or a balanced posting result
- the Sales Invoice form may offer a guided `Post & Create Receipt` action that still posts the invoice first, then opens a separate prefilled customer-receipt flow; do not merge the receipt posting into the invoice journal entry
- the Sales Invoice form should keep `Save as Draft`, `Post Invoice`, and `Post & Create Receipt` as distinct actions: draft save creates no journal entry, normal post creates only the invoice journal entry, and the guided action posts the invoice first before opening the separate receipt flow
- the Sales receipt UI may collect optional invoice-allocation input inside the same customer-receipt form instead of a separate workspace, but it must still create/post the receipt first and then run allocation without changing posting invariants
- new customer receipt references should default to a daily sequential format such as `RCPT-20260524-1`, `RCPT-20260524-2`, and `RCPT-20260524-3`; when calculating the next number for a given day, ignore legacy non-matching receipt references
- customer-receipt posting must create a separate journal entry that debits the selected bank/cash posting account and credits the customer's receivable account for the receipt amount; receipts must never create tax lines or merge directly into invoice revenue posting
- receipt allocations must allow partial and multi-receipt behavior while preventing over-allocation
- invoice outstanding/allocation status must stay consistent after postings and allocations
- receipt creation from the guided sales flow must require an active bank/cash account, must not allocate above invoice outstanding, and should preserve audit/history links between the receipt and invoice
- aging buckets must be derived from posted outstanding balances as of the report date, using due date when available

Must remain compatible:

- Phase 1 journal-entry and posting invariants
- bank/cash transaction posting behavior used by receipt allocations
- stable API naming under `/sales-receivables/...`

Checks to run:

- Prisma generate and migration review
- backend build
- frontend typecheck

## Add Or Change Market POS

Where to edit:

- frontend `features/pos-market`
- backend `phase-3-sales-receivables/pos-market` (thin controller/service)
- backend `phase-3-sales-receivables/pos-core/pos-terminal.service.ts` for shared retail session/sale/return/report logic
- `frontend/lib/api/pos-market.ts` for market API fetchers (re-exported from `lib/api/index.ts`)
- `frontend/app/(erp)/pos-market/` for thin route entrypoints only
- `docs/pos-market/README.md` when structure, routes, or ownership changes
- `backend/src/modules/platform/auth/access-control.constants.ts` when market cashier/accountant routes or permissions change

What else to check:

- do not add market POS features to `frontend/features/pos` or `backend/.../pos`
- do not import across `features/pos` and `features/pos-market`
- market cashiers use role `MARKET_CASHIER`, routes `/pos-market/*`, and API `/api/pos-market/*`
- market field reps use role `MARKET_REP` with required `User.salesRepId`; routes include `/pos-market/receivables` and `/pos-market/receivables/:customerId`; receivables APIs live under `/api/pos-market/receivables*`
- `MARKET_CASHIER` and `MARKET_REP` include `POS_CREDIT_SALE` for partial/pay-later market sales; collection uses `POS_MARKET_COLLECT_RECEIVABLE` on `/api/pos-market/receivables/collect` (FIFO allocation to oldest open deliveries when allocations are omitted)
- market POS sales require a destination market (`customerId` on complete/hold/draft); walk-in (`POS-WALKIN`) is rejected in `pos.service.ts` for `PosProduct.MARKET`
- market POS sessions require `salesRepId` on open; register catalog uses `GET /api/pos-market/catalog?salesRepId=` (rep car on-hand, not warehouse on-hand)
- rep car loads and stocktakes live in `backend/.../pos-market/rep-car-stock/` with routes under `/api/pos-market/rep-car-loads*` and `/api/pos-market/rep-car-stocktakes*`; permissions `POS_MARKET_MANAGE_REP_LOADS` and `POS_MARKET_REP_STOCKTAKE`
- main-warehouse intake (buying stock in qty + cost) uses ERP `/inventory` goods receipts, not Market POS; rep loads only move warehouse → rep car
- `MARKET_REP` route `/pos-market/my-stock` uses `GET /api/pos-market/rep-car-stock` and is scoped to `User.salesRepId`
- market `completeSale` deducts `RepCarStockBalance` via `RepCarStockService.applySaleDeduction`; do not add a parallel warehouse issue for market sales
- restaurant cashiers must remain limited to `/api/pos/*` and must not receive `/api/pos-market/*` through the JWT cashier guard

Checks to run:

- backend build
- frontend typecheck

## Add Or Change POS Payment Account Mapping

Where to edit:

- frontend `features/pos` (restaurant POS only)
- backend `phase-3-sales-receivables/pos`
- `frontend/lib/api` and `frontend/types/api.ts` when the settings payload changes
- `docs/data-model.md` and `docs/README.md` when posting or cashier behavior changes

What else to check:

- cashier payment UI must not expose manual accounting-account selection or cashier-entered payment reference fields; keep it limited to payment method and paid amount
- POS settings should store payment method mappings in `PosRuntimeSetting`; delivery-company rows in the same POS settings flow should update the linked `DeliveryCompany` receivable, commission, and service-fee accounts
- third-party delivery orders must distinguish between `restaurant collected` vs `delivery company collected`; only company-collected orders should create `PosPayment(paymentMethod=DELIVERY)` rows and enter delivery-company settlement follow-up
- payment-method mappings for `CARD`, `CLIQ`, `WALLET`, and `BANK_TRANSFER` should point to active bank/cash registry rows through their linked posting accounts so `PosPayment.bankCashAccountId` can still be stored
- card/Visa should normally map to a clearing account, not directly to the bank
- grouped session posting and any invoice-level POS posting path must block unmapped methods with the clear message `طريقة الدفع غير مربوطة بحساب محاسبي`
- payment-method correction must keep using the configured mappings; accountant correction may change the method, but should not become a manual account picker
- delivery-company settlement edits belong in backend `phase-3-sales-receivables/pos`, `frontend/features/pos`, and Prisma schema/migrations together; settlement confirmation must post via Phase 1 journal/posting services and reversal must reopen linked POS invoices for settlement

Checks to run:

- backend tests for POS settings/payment correction paths
- backend build
- frontend typecheck

## Add Or Change POS Thermal Printing

Where to edit:

- frontend `features/pos/pos-print-service.ts` for print routing decisions
- frontend `features/pos/pos-print-bridge.ts` for QZ Tray/browser bridge behavior
- frontend `features/pos/pos-printer-config.ts` for per-machine printer preferences
- frontend `features/pos/pos-printer-settings-panel.tsx` for cashier-side printer setup
- frontend `features/pos/pos-kot-print.ts`, `pos-receipt-print.ts`, and `pos-session-roll-print.ts` for the actual 80mm receipt HTML templates
- `docs/pos/printer-setup.md` when setup requirements change

What else to check:

- kitchen KOT and customer receipt templates are intentionally separate; do not merge kitchen notes/table routing into the customer receipt template unless the business explicitly asks for it
- OS printer names are machine-local, so kitchen/receipt printer names should stay in browser-local configuration unless a network/IP print service is introduced
- QZ Tray named-printer routing should fall back to browser `window.print()` when QZ is unavailable so sale completion and kitchen send are not blocked by printer setup

Checks to run:

- frontend typecheck
- manual browser fallback print for KOT and customer receipt
- QZ Tray printer list/test print on a cashier PC with the configured XPrinter devices

## POS Tax-Free Sales Mode

Where to edit:

- backend `phase-3-sales-receivables/pos` (POS service, DTOs, and runtime settings)
- frontend `features/pos` (register page workspace, compact cart line components, settings components)
- types: `frontend/types/api.ts` (API type definitions)
- i18n translation files: `frontend/lib/i18n` (en/ar translations)

What else to check:

- when `taxFreeEnabled` is true in `PosRuntimeSetting`, all POS sale lines (drafts, held, completed) must force tax amount to zero.
- the register cart metrics recalculate tax to zero, and the tax badges on cart lines are hidden.
- setting changes from the POS settings workspace persist correctly to the database and sync instantly.

Checks to run:

- backend unit/integration tests
- backend build
- frontend typecheck

## Start Or Extend Phase 4 Purchases

Where to edit:

- backend `phase-4-procure-to-pay/purchases`
- frontend `features/phase-4-procure-to-pay`
- route files under `frontend/app/(erp)/purchases`
- `backend/prisma/schema.prisma` and Prisma migration files when supplier or purchase document data structures are added
- `docs/phase-4-purchases-requirements.md` when requirements are clarified, split, or translated

What else to check:

- purchase document tax choices should come from active `Tax` master data (`GET /taxes/active`) rather than manual free-text or arbitrary tax values
- purchase document lines should persist both `taxId` and the calculated `taxAmount` so historical documents remain readable if a tax is later deactivated
- supplier debit-note type selection must come from active `SupplierDebitNoteType` master data (`GET /supplier-debit-note-types/active`) rather than a hardcoded frontend-only option list
- `SupplierDebitNoteType` now controls whether a linked purchase invoice is required, whether inventory may be affected, whether tax adjustment is allowed, which default posting account is used, and which helper text the supplier debit-note editor should show
- the foundation seed should provide a working default `SupplierDebitNoteType` baseline (`DN-PURCHASE-DISCOUNT`, `DN-PURCHASE-RETURN`, `DN-PRICE-CORRECTION`, `DN-TAX-CORRECTION`, and `DN-SUPPLIER-SETTLEMENT`) plus an input-VAT asset account for tax-only supplier debit-note flows
- purchase-invoice, supplier-payment, and debit-note detail views should open in the same modal-style workflow and expose `عرض القيد المحاسبي` inline inside that modal instead of forcing navigation away from the current purchase workflow
- supplier debit notes must support distinct business types instead of treating every note as a generic supplier discount:
  - `DN-PURCHASE-DISCOUNT` remains financial-only and keeps the purchase-discount style editor
  - `DN-PURCHASE-RETURN` must stay separate from discounts because it reduces inventory, affects input VAT, and uses purchase-return accounting behavior
  - `DN-PRICE-CORRECTION` adjusts purchase price differences without quantity movement
  - `DN-TAX-CORRECTION` adjusts input VAT only without quantity or stock movement
  - `DN-SUPPLIER-SETTLEMENT` supports supplier settlement lines and may leave linked purchase invoice blank when the master-data rule allows it
- supplier debit-note posting must validate balance on the full assembled journal, including the supplier payable debit plus the offset lines, rather than treating the offset-only lines as a standalone balanced entry
- purchase-return debit-note lines must load from the linked purchase invoice lines, cap returned quantity to purchased minus previously posted/applied returns, and require a warehouse because returning stocked items reduces warehouse inventory
- inventory-bearing supplier debit notes must create `InventoryStockMovement` rows with movement type `PURCHASE_RETURN`, decrement item and warehouse balances, and add inventory-value adjustment journal lines inside the same posting flow
- keep the purchases module split by subdomain ownership such as suppliers, requests, orders, invoices, payments, debit notes, posting/accounting, and validation/control
- route files must stay thin and compose the owning Phase 4 feature page
- supplier creation should support either creating a new posting payable account automatically under `2110000 Accounts Payable / الذمم الدائنة` or linking an existing active posting Liability account from that same subtree
- purchase-request and purchase-order lines may now optionally link to active inventory items for UI-assisted selection, and `itemName` plus line description must remain persisted on the line so operational history does not depend on future item-master edits
- purchase-request workflow actions should stay in the main `/purchases?tab=requests` table `الإجراءات` column, including submit, approve, reject, close, and conversion actions; the dedicated `/purchases/requests/[id]` screen should remain a clean details/history view
- purchase-order list `عرض` actions may open the dedicated `/purchases/orders/[id]` details page so users can review summary, lines, and receipt history without overloading the workspace list
- purchase-order workflow actions should stay in the main `/purchases?tab=orders` table `الإجراءات` column, including issue, receive, partial/full receive transitions, cancel, and close; the dedicated `/purchases/orders/[id]` screen should remain a clean details/history view
- purchase-request references now follow the daily sequence format `PR-YYYYMMDD-N`; new logic must ignore legacy random codes when calculating the next daily number
- purchase-request and purchase-order editor modals now expose explicit confirm buttons (`تاكيد طلب شراء` and `تاكيد امر الشراء`) alongside draft save, and each confirm action must save the document first before calling the existing submit/issue workflow transition
- purchase-request request dates and requested-delivery dates must now be realistic business dates (year `2000` or later), and a requested delivery date must not be earlier than the request date
- purchase-request status-history writes must tolerate stale or missing authenticated user IDs by storing a null audit user reference instead of failing the request transaction on the `PurchaseRequestStatusHistory.userId` foreign key
- shared audit-log writes must also tolerate stale or reseeded authenticated user IDs by retrying with a null `AuditLog.userId` instead of surfacing a false `Internal server error` after the business transaction already succeeded
- approved purchase requests in the main `/purchases?tab=requests` list now expose direct action-column buttons for `convert to draft purchase order` and `convert to draft purchase invoice`, and the same list also owns the submit/approve/reject/close workflow buttons instead of duplicating them inside the request details screen
- request conversion rules must keep source traceability into downstream purchase orders and draft purchase invoices, and only approved requests may be converted
- once an approved purchase request is used to create a draft purchase order or a draft purchase invoice, the source request should move to `CLOSED` so it no longer remains operationally open in the requests list
- request status history should retain both timestamp and acting user when workflow actions are recorded
- posting must reuse Phase 1 journal-entry and posting services instead of writing ledger effects directly
- supplier payments that affect bank/cash must integrate with the existing Phase 2 bank/cash module rather than duplicating payment posting behavior
- Arabic and English terminology must stay aligned when new purchase workflows or statuses are added

Must remain compatible:

- current implemented phase boundaries
- docs must continue to distinguish between scaffolded architecture and implemented purchases behavior
- stable route naming under `/purchases` once specific Phase 4 screens are introduced

Checks to run:

- backend build
- frontend typecheck
- Prisma generate and migration review when schema changes are introduced

## Add Or Change Phase 5 Inventory Master Data

Where to edit:

- backend `phase-5-inventory-management/inventory/item-groups`
- backend `phase-5-inventory-management/inventory/item-categories`
- backend `phase-5-inventory-management/inventory/units-of-measure`
- backend `phase-5-inventory-management/inventory/item-master` when the material/card relationship changes
- frontend `features/phase-5-inventory-management/inventory`
- `backend/prisma/schema.prisma` and migrations when master-data relationships change
- `docs/phase-5-inventory-requirements.md` when the requirement baseline or terminology changes

What else to check:

- item categories must belong to one active item group at creation time
- material/item cards must select an active item group, an active category under that group, and an active base unit of measure
- changing an item group in the UI should clear or revalidate the selected category
- item/service codes are backend-owned on create: omit `code` to allocate `ITM-000001` (prefix `ITM`, six zero-padded digits, one global sequence); optional explicit `code` is allowed when provided and must stay unique (used by Excel import and Market POS `MKT-*` products)
- keep Arabic labels distinct: `مجموعة الأصناف`, `فئة الصنف / التصنيف`, `بطاقة المادة`, and `وحدة القياس`
- item-card pricing fields are suggestion/default values only; they must not be treated as inventory valuation or actual stock cost
- item-card unit conversion setup must always keep the base-unit row with factor `1`, block duplicate units, and keep conversion factors visible in the owning form/UI
- unit and item barcodes must remain unique across both the item master barcode field and per-unit conversion rows
- deactivation must preserve historical item and inventory transaction references
- legacy `unitOfMeasure` and `category` item fields are compatibility/display mirrors; relational IDs own validation

Checks to run:

- Prisma generate and migration review
- backend build
- frontend typecheck

## Import Inventory Products From Excel

Where to edit:

- backend `phase-5-inventory-management/inventory/item-master/item-import.service.ts`
- backend `phase-5-inventory-management/inventory/item-master/dto/import-inventory-items.dto.ts`
- backend `phase-5-inventory-management/inventory/item-master/item-master.controller.ts` (`POST /inventory/items/import/preview`, `POST /inventory/items/import`)
- frontend `features/phase-5-inventory-management/inventory/item-import-modal.tsx`
- frontend `features/phase-5-inventory-management/inventory/inventory-page.tsx` (Items workspace **Import Products** action)
- frontend `lib/api/index.ts` and `types/api.ts`

What else to check:

- v1 parses `.xlsx`/`.xls` on the client with the `xlsx` package and sends JSON rows to the backend (no multipart upload yet)
- required template columns: `name`, `groupCode`, `categoryCode`, `unitCode`; optional `code`, `barcode`, prices, `description`, `type`
- masters resolve by **code** (case-insensitive exact match); groups, categories, and units must already exist
- category must belong to the resolved group
- duplicate existing item `code` rows use `duplicatePolicy: "skip"` (default) and appear as **Skipped** in preview
- import copies default posting accounts from the item group when the group stores them; item-level account fields otherwise remain null like manual create
- Market POS catalog filters products by `MKT-*` item codes (or market group codes); use explicit `code` values such as `MKT-001` when onboarding retail products
- opening stock is **not** part of v1 import; use goods receipts / rep loads after products exist

Checks to run:

- `item-import.service.spec.ts`
- backend build
- frontend typecheck
- manual flow: download template → preview → import → confirm items list and Market POS catalog

## Start Or Extend Phase 5 Inventory

Where to edit:

- backend `phase-5-inventory-management/inventory` once the module is introduced
- frontend `features/phase-5-inventory-management`
- route files under `frontend/app/(erp)/inventory`
- `backend/prisma/schema.prisma` and Prisma migration files when inventory, warehouse, costing, or stock-ledger structures are introduced
- `docs/phase-5-inventory-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the inventory module split by subdomain ownership such as item master, warehouses, goods receipts, issues, transfers, adjustments, costing, inquiry, posting/accounting, and validation/control
- inventory list reads (`/inventory/items`, `/inventory/goods-receipts`, `/inventory/goods-issues`, `/inventory/transfers`, `/inventory/adjustments`, `/inventory/stock-ledger`) should use `page`/`limit` and keep frontend pagination state/controls in the owning Phase 5 feature page
- the inventory items list is full-width and rendered as a compact table (matching the POS Session Review row-styling), where selecting an item from the list displays the item details in a dedicated Accountant Review-style view with separate, properly scaled cards for barcodes and QR codes, and a button to open the full-form editor modal
- item records that point to a preferred warehouse should reference the Phase 5 warehouse master slice instead of introducing parallel free-text warehouse registries
- item barcode values must remain unique across all inventory items; use the dedicated item-master workflow for manual entry, scanner entry, or internal barcode generation
- QR data for item cards should be stored as text/value only, generated dynamically from item fields, and rendered cleanly inside a dedicated max-width container without raw JSON text output
- barcode/QR additions must stay operational only and must not create Phase 1 journal entries or other accounting postings
- route files must stay thin and compose the owning Phase 5 feature page
- valuation method changes should flow through `GET/PATCH /inventory/policy`; use `INVENTORY_COSTING_METHOD` only as fallback bootstrap/default behavior
- stock movement posting must reuse Phase 1 journal-entry and posting services whenever accounting integration is enabled instead of writing ledger effects directly
- inventory receipts that depend on purchases should integrate with the existing Phase 4 purchases flow rather than duplicating purchase receipt ownership
- goods receipts should stay draft-editable until posting or cancellation and should remain the primary inbound stock slice for purchase-linked intake
- goods issues should stay draft-editable until posting or cancellation, and posting should block when the requested quantity exceeds available stock
- transfers should stay draft-editable until posting or cancellation, and posting should validate active, different source/destination warehouses plus source-warehouse availability and warehouse-balance movement history
- adjustments should stay draft-editable until posting or cancellation, and posting should support positive/negative variance while enforcing the configured prevent-negative-stock policy
- posted inventory documents should use reverse status actions instead of direct edits so audit history keeps draft/post/cancel/reverse transitions
- costing behavior should remain configurable between weighted-average and FIFO, and outbound valuation should write matching movement/value effects
- receipt/issue/adjustment posting should create and post journal entries only when inventory accounting integration is enabled
- Arabic and English terminology must stay aligned when adding inventory document labels, statuses, and movement types

Must remain compatible:

- current implemented phase boundaries
- docs must continue to distinguish between planned Phase 5 inventory scope and implemented system behavior
- stable route naming under `/inventory` once specific Phase 5 screens are introduced

Checks to run:

- backend build
- frontend typecheck
- Prisma generate and migration review when schema changes are introduced

## Start Or Extend Phase 6 Payroll

Where to edit:

- backend `phase-6-payroll-management/payroll`
- frontend `features/phase-6-payroll-management`
- route files under `frontend/app/(erp)/payroll`
- `backend/prisma/schema.prisma` and Prisma migration files when payroll, employee, payslip, payment, deduction, or payroll-period data structures are added
- `docs/phase-6-payroll-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the payroll module split by subdomain ownership such as employees, payroll setup, payroll periods, payslips, deductions, benefits/allowances, posting/accounting, payments, reporting/inquiry, and validation/control
- route files must stay thin and compose the owning Phase 6 feature page
- payroll components must link to valid posting accounts in Phase 1 instead of creating parallel accounting ledgers
- payroll posting must reuse Phase 1 journal-entry and posting services instead of writing ledger effects directly
- payroll payments that move cash must integrate with the existing Phase 2 bank/cash module rather than duplicating payment posting behavior
- posted payroll periods, payslips, and payment settlements must preserve auditable links between employee records, payroll periods, source payslips, and generated journal entries
- deactivated employees must remain historically reportable but blocked from new payroll periods, payslips, and payment selection
- Arabic and English terminology must stay aligned when adding payroll components, statuses, document labels, and reporting terminology

Must remain compatible:

- current implemented phase boundaries
- docs must distinguish between implemented payroll behavior and any remaining planned payroll extensions
- stable route naming under `/payroll`
- Phase 1 journal-entry and posting invariants
- Phase 2 bank/cash payment posting behavior when payroll settlements move through bank or cash accounts

Checks to run:

- backend build
- frontend typecheck
- Prisma generate and migration review when schema changes are introduced

## Start Or Extend Phase 7 Fixed Assets

Where to edit:

- backend `phase-7-fixed-assets-management/fixed-assets`
- frontend `features/phase-7-fixed-assets-management`
- route files under `frontend/app/(erp)/fixed-assets`
- `backend/prisma/schema.prisma` and Prisma migration files when fixed-asset register, category, acquisition, depreciation, disposal, or transfer data structures are added
- `docs/phase-7-fixed-assets-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the fixed-assets module split by subdomain ownership such as asset register, categories, acquisition, depreciation, disposal, transfer, posting/accounting, reporting/inquiry, and validation/control
- route files must stay thin and compose the owning Phase 7 feature page
- asset categories and assets must link to valid capitalization, accumulated depreciation, depreciation expense, disposal, and gain/loss accounts in Phase 1 instead of introducing parallel ledgers
- acquisition, depreciation, and disposal posting must reuse Phase 1 journal-entry and posting services instead of writing ledger effects directly
- posted asset lifecycle transactions must preserve auditable links between source fixed-asset documents, assets, generated journal entries, and audit-log history
- inactive or fully disposed assets must remain historically reportable but blocked from new draft lifecycle transactions where business rules require it
- Arabic and English terminology must stay aligned when adding fixed-asset statuses, methods, document labels, and reporting terminology

Must remain compatible:

- current implemented phase boundaries
- docs must distinguish between implemented fixed-asset behavior and any remaining planned Phase 7 extensions
- stable route naming under `/fixed-assets`
- Phase 1 journal-entry and posting invariants
- depreciation/disposal calculations must stay consistent with stored asset cost, residual value, useful life, accumulated depreciation, and net book value assumptions

Checks to run:

- backend build
- frontend typecheck
- Prisma generate and migration review when schema changes are introduced

## Start Or Extend Phase 8 Reporting

Where to edit:

- backend `phase-8-reporting-control/reporting`
- frontend `features/phase-8-reporting-control`
- route files under `frontend/app/(erp)/reporting`
- `docs/phase-8-reporting-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the reporting module split by ownership such as filters/definitions, financial statements, ledger inquiry, audit inquiry, comparison logic, and validation/control
- route files must stay thin and compose the owning Phase 8 feature page
- official financial reports must use posted data only and must not read draft journals or draft operational documents as report balances
- reporting empty states should distinguish between genuine no-data conditions and API/load failures so users are not shown an "empty" message when the report request actually failed
- trial balance, balance sheet, profit and loss, and general-ledger inquiry should stay reconcilable to the same posted ledger source for the same filters/period
- cash movement reporting should continue to derive from the linked bank/cash posting accounts rather than inventing a parallel balance store
- Arabic and English terminology must stay aligned when adding report names, column labels, filters, export labels, and drill-down actions
- the `/reporting` workspace uses a flat layout: tools row, primary filter bar (period/account/segment chips plus export), secondary filters row, and report-specific body content; general ledger is the default entry (`/reporting?tab=generalLedger`) and the first item in the sidebar `التقارير` dropdown, with a top account search (code or localized name) above the ledger table; the summary tab (`?tab=summary`) remains implemented for KPI cards and the sticky summary footer but is not linked from navigation
- KPI sparklines on the reporting dashboard are derived client-side from comparison and current metric amounts; they are illustrative, not a historical time series from the API

Must remain compatible:

- current implemented phase boundaries
- docs must distinguish between the implemented initial reporting workspace and the remaining Phase 8 roadmap
- stable route naming under `/reporting`
- Phase 1 ledger and posting invariants as the reporting source of truth

Checks to run:

- backend TypeScript build
- frontend typecheck
- frontend production build when the environment supports the current Next.js script/tooling

## Change Account Creation Behavior

Where to edit:

- `frontend/features/accounting/chart-of-accounts/create-account-form.tsx`
- chart-of-accounts frontend navigation if parent selection behavior changes
- backend chart-of-accounts service/controller if rules change

What else to check:

- required account type selection
- account subtype (class) selection is optional but must match an active `AccountSubtype` (managed under Master Data)
- header vs posting selection
- chart search must keep multiple filter tokens together when users combine `type:`, `status:`, and `is:` filters, including multiple tokens from the same filter family
- parent context passed from navigation or route params
- parent context must only come from header accounts, never from posting-account drilldown state
- next-code generation (it depends on `parentId` and whether the new account is Header vs Posting)
- account code must be generated on the backend during creation; `POST /accounts` does not accept a `code` field (extra fields are rejected by validation)
- account code remains hidden from manual editing in the create form
- posting accounts stay leaf nodes with no children
- child accounts are only attached to header accounts
- activation/manual-posting assumptions

Must remain compatible:

- chart-of-accounts API shapes
- existing account hierarchy behavior
- posting-account restrictions used by journal posting

Checks to run:

- frontend typecheck
- backend build
- account service tests
- apply the Prisma migration so the PostgreSQL leaf-node trigger is installed

If your environment already contains older numeric charts that used **6-digit** numeric codes, run the one-time migration:

- `backend`: `npm run prisma:migrate:account-codes:6-to-7`

## Add Or Change Account Deletion Behavior

Where to edit:

- `frontend/features/accounting/chart-of-accounts`
- backend `phase-1-accounting-foundation/accounting-core/chart-of-accounts`

What else to check:

- accounts referenced by journal entry lines must stay non-deletable
- accounts with posted ledger rows must stay non-deletable
- the chart table should hide the delete action when the account is not deletable, not just fail after click
- deletion errors should stay user-readable because the chart UI surfaces backend validation messages directly

Must remain compatible:

- chart-of-accounts route behavior
- auditability of posted history and journal-entry references

Checks to run:

- backend account service tests
- backend build
- frontend typecheck

## Update Posting Rules

Where to edit:

- `posting-logic`
- `validation-rules`
- `journal-entries` if the posting trigger or status rules change

What else to check:

- debit/credit balance validation
- account eligibility for posting
- header-account rejection both when saving drafts and when posting existing drafts
- fiscal period state
- account balance updates
- ledger row creation

Must remain compatible:

- posted entries stay auditable
- posting remains transactional
- ledger history remains consistent with balances
- manual posted journal entries are edited by unposting the same entry to `DRAFT` through `POST /journal-entries/:id/unpost`; do not reintroduce a reverse-plus-new-draft edit flow in the journal entries UI for those entries

Checks to run:

- backend tests
- backend build
- manual verification of a create -> post -> ledger flow

## Add Or Change A General-Ledger Filter

Where to edit:

- frontend general-ledger feature
- general-ledger controller/service
- DTOs if a new query parameter is introduced

What else to check:

- account selection behavior
- date range behavior
- opening/running balance logic
- whether the filter applies to posted history only

Must remain compatible:

- existing endpoint behavior for old clients
- ledger data meaning

Checks to run:

- frontend typecheck
- backend tests affecting general ledger

## Add A Validation Rule

Where to edit:

- `validation-rules` if the rule is cross-cutting
- otherwise the owning submodule service

What else to check:

- whether the rule belongs at:
  - request validation
  - business validation
  - posting-time validation
- whether the rule should block draft save, posting, or both

Must remain compatible:

- error semantics used by current UI
- module boundaries

Checks to run:

- backend build
- backend tests
- add a targeted test for the new rule

## Add A New API Endpoint

Where to edit:

- the owning Phase 1 module controller
- DTOs if input/output shapes are needed
- service layer in the same module
- frontend API wrapper if the UI will call it

What else to check:

- auth guard usage
- if the endpoint is under POS or affects cashier/accountant visibility, align it with the auth access snapshot (`allowedRoutes`, POS role permissions, and cashier-only backend restrictions) rather than relying on frontend hiding alone
- ownership of the endpoint
- whether it belongs to an existing controller or should stay internal
- properly scoping database queries to the user's `companyId` for multi-tenancy isolation

Must remain compatible:

- existing module boundaries
- route naming conventions already used in the project
- prefer lightweight list/query modes for selector or overview UIs when a screen does not need full nested relations or line-level details

Checks to run:

- backend build
- backend tests
- frontend typecheck if consumed by UI

## Add Or Change Journal Entry Types

Where to edit:

- backend master-data module under `accounting-core/master-data`
- `frontend/features/accounting/master-data/master-data-page.tsx` (admin UI)
- `frontend/features/accounting/journal-entries/journal-entries-page.tsx` (selecting a type during entry creation)

What else to check:

- journal entry creation/update must reject unknown or inactive types
- types are reference/master data and should be deactivated (not deleted) when no longer in use

## Before Finishing Any Phase 1 Change

Review these questions:

- does the code live in the correct frontend/backend module
- did the change preserve header vs posting semantics
- did the change preserve posting and reversal auditability
- does the change describe a current Phase 1 capability instead of a future ERP phase
- do the docs still match the code after the edit

## Add Or Extend POS Customer Selection

Where to edit:

- backend DTO: `backend/src/modules/phase-3-sales-receivables/pos/dto/pos.dto.ts` — add fields to `PosSaleBaseDto`
- backend service: `backend/src/modules/phase-3-sales-receivables/pos/pos.service.ts` — `saveDraftLikeSale` and `completeSale` resolve `customerId`; `posSaleInclude` and `mapPosSale` expose the customer relation
- frontend types: `frontend/types/api.ts` — `HoldPosSalePayload`, `SavePosDraftPayload`, `CompletePosSalePayload`, and `PosSale` all carry `customerId?`/`customer?`
- frontend feature: `frontend/features/pos/pos-page.tsx` — state, queries, mutations, selector strip JSX, and quick-create modal

What else to check:

- when no `customerId` is supplied, the backend falls back to `ensureWalkInCustomer()` — this backward-compatible default must remain in place
- if a `customerId` is supplied, the backend validates the customer is active; a `BadRequestException` is thrown if the record is missing or inactive
- `resetSale` must clear `selectedCustomerId` to `null` so new sales start as Walk-In
- `resumeHeldSale` must restore `selectedCustomerId` from the loaded `HeldSale.customerId`
- all three POS payloads (`holdSale`, `saveDraftSale`, `completeSale`) must forward `customerId: selectedCustomerId || undefined`
- `mapPosSaleToHeldSale` must copy `sale.customer?.id ?? null` into the local `HeldSale` model so drafts and held sales can be resumed with the original customer
- `Customer` and `TaxTreatment` must both be present in the `import type` block at the top of `pos-page.tsx`
- the quick-create customer modal must use `TaxTreatment.englishName` / `TaxTreatment.arabicName` — the `name` field does not exist on this type

Must remain compatible:

- Walk-In default behavior when no customer is selected
- existing `PosOperationalStatus` and `PosAccountingStatus` lifecycle invariants
- `SalesInvoice.customerId` Prisma field — no schema migration required

Checks to run:

- backend build (`npm run build` in `backend/`)
- frontend typecheck (`npx tsc --noEmit` in `frontend/`)

## Add Or Extend Restaurant POS Register Fields

Where to edit:

- backend DTO/service mapping: `backend/src/modules/phase-3-sales-receivables/pos/dto/pos.dto.ts` and `backend/src/modules/phase-3-sales-receivables/pos/pos.service.ts`
- restaurant read APIs: `backend/src/modules/phase-3-sales-receivables/pos/pos-table.controller.ts` and `pos-kitchen.controller.ts`
- frontend POS API/types/query keys: `frontend/lib/api/index.ts`, `frontend/lib/query-keys.ts`, and `frontend/types/api.ts`
- frontend register UI/state: `frontend/features/pos/pos-page.tsx`

What else to check:

- restaurant delivery and correction APIs also live in the main POS service/controller layer; keep `correctOrderType`, `correctPaymentMethod`, delivery-company/driver reads, driver assignment, and delivery-status updates aligned between `backend/src/modules/phase-3-sales-receivables/pos/pos.service.ts`, `pos.controller.ts`, `frontend/lib/api/index.ts`, and `frontend/types/api.ts`
- all three POS sale payloads (`holdSale`, `saveDraftSale`, `completeSale`) must stay aligned for restaurant fields; do not add `orderType`, `tableId`, charges, or delivery notes to only one payload
- if `orderType === "DINE_IN"`, the register should require a selected table before completion and should clear `tableId` when the user switches away from dine-in
- `mapPosSale`, `posSaleInclude`, and `mapPosSaleToHeldSale` must stay in sync so drafts/held sales resume with the original order type, table, and fee metadata
- `listDraftSales` / `listHeldSales` return `heldContext` on each sale (`DRAFT`, `HELD`, `RESERVATION_PREORDER`, `TABLE_ORDER`, plus order type/table/reservation window); the held-sales UI uses it for badges and resume links must pass `reservationId` when resuming a reservation pre-order
- `/pos/held-sales` cards should visually distinguish dine-in, takeaway, and delivery orders and show relevant type-specific details such as table/waiter/service for dine-in, customer/notes for takeaway, and address/company/driver/fee for delivery
- Resuming a held delivery sale must restore every stored delivery field. Direct-delivery orders should keep and display the saved driver name and phone from the sale when available, even while the current delivery-driver master list is still loading or no longer contains that driver.
- the register `orderType` cleanup effect in `pos-page.tsx` must only clear dine-in/delivery fields when the cashier **leaves** that order type, not on every render where the current type is not dine-in/delivery. Clearing on mount/resume races with `resumeHeldSale` and wipes restored driver/address/fee data while the cart lines remain.
- `/pos/held-sales` resume must stash the selected held-sale snapshot in `sessionStorage` before navigating to `/pos/register?resume=...` because the route change remounts `PosPage`. The register modal can call `resumeHeldSale(id, [row])` directly because the cashier is already on `/pos/register`.
- any frontend total shown to the cashier must include persisted restaurant charges such as `serviceChargeAmount` and `deliveryFeeAmount`, otherwise the pay modal and backend totals drift
- use `GET /pos/tables` and `GET /pos/waiter/orders` for live dine-in service visibility instead of hardcoded demo state
- waiter order board lives in `frontend/features/pos/pos-waiter-orders-page.tsx` at `/pos/waiter/orders`; delivery board remains in `pos-delivery-page.tsx` (`PosDeliveryWorkspace`) at `/pos/delivery`
- POS role `WAITER` adds permissions `RST_VIEW_WAITER_ORDERS` / `RST_UPDATE_WAITER_ORDER_STATUS`. Re-seed with `npx ts-node prisma/setup-pos-waiter.ts` in `backend/` after permission changes
- keep KDS / delivery kanban UI changes in those workspace modules, not duplicated in `pos-page.tsx`
- the register-side table controls, delivery panel, and cashier close-shift modal are feature-owned in `frontend/features/pos/pos-page.tsx`; if they grow further, split them into feature-local components rather than moving them into route files or generic UI
- accountant review now includes session-grouped cash, inventory, journal, and order-correction flows; when extending that area, keep the review screen tied to backend review/session/journal APIs rather than rebuilding calculations purely in the client

Must remain compatible:

- base POS sale completion, held sale resume, and accountant-review flows
- `SalesInvoice.invoiceType = POS` lifecycle invariants
- waiter floor plan reuses `frontend/app/(erp)/pos/tables/page.tsx` with waiter-only navigation targets (`/pos/waiter/order`); dedicated waiter ordering UI lives in `frontend/features/pos/pos-waiter-order-page.tsx` — order panel shows line prices, scrollable cart lines, and a fixed subtotal/tax/total + confirm footer; on mobile the order panel stacks above the product grid
- confirm-to-kitchen: `POST /pos/sales/:id/send-to-kitchen` in `pos.controller.ts` / `PosService.sendSaleToKitchen`; draft saves no longer auto-create kitchen tickets — only explicit send (waiter confirm or cashier incremental send). Sending a draft table order to the kitchen must also promote it to `HELD` and keep the table linked to that invoice so selecting the table later reopens the full submitted order.
- cart lock rule: once `waiterConfirmedAt` is set on a dine-in sale, register draft/hold edits are blocked until payment; lines with `kitchenSentAt` cannot be removed/changed even before waiter confirm
- waiter service advance: `PUT /pos/waiter/orders/:id/status` with `RECEIVED` or `DEPARTED`; `DEPARTED` sets the table to `CLEANING` while keeping `activeInvoiceId` for cashier payment; completing a dine-in sale then clears `activeInvoiceId` and keeps/sets the table on `CLEANING` until a waiter marks it `AVAILABLE` from the floor plan (`frontend/app/(erp)/pos/tables/page.tsx`)
- KOT print: `frontend/features/pos/pos-kot-print.ts` on waiter confirm; audit via `POST /pos/kitchen/orders/:id/reprint` when the kitchen order id is known
- opening a dine-in table from `/pos/tables` or the register table picker must resume the table's active draft/held sale (`tableId` + `resume` when `activeInvoice` exists); do not reset the cart before held/draft queries finish loading. The standalone tables route and register must use the shared POS table React Query key so table occupancy refreshes after kitchen/hold actions, and the register should preserve the resumed sale's table number as a display fallback while table metadata refetches.
- current route ownership under `frontend/features/pos`

Checks to run:

- backend build (`npm run build` in `backend/`)
- frontend typecheck (`npx tsc --noEmit` in `frontend/`)

## Mobile and tablet responsive layout

Where to edit:

- viewport breakpoints hook: `frontend/lib/hooks/use-viewport-breakpoints.ts` — `useNavDesktopLayout()` (≥1024px fixed sidebar), `usePosWideLayout()` (≥960px register side-by-side)
- Tailwind named screens: `frontend/tailwind.config.ts` — `pos-wide` (960px), `nav-desktop` (1024px)
- app shell + main content padding: `frontend/components/app-shell.tsx`
- sidebar / mobile drawer: `frontend/components/site-header.tsx`
- mobile top bar / floating menu on POS: `frontend/components/mobile-nav-bar.tsx`
- PWA viewport + manifest: `frontend/app/layout.tsx`, `frontend/public/manifest.webmanifest`

Behavior:

- below `1024px`: sidebar is an overlay drawer (closed by default); ERP pages show a top nav bar; `/pos/*` and `/pos-market/*` show a floating menu button; main content uses full width (`pl-0`)
- at `1024px` and above: fixed sidebar with collapse toggle (unchanged desktop behavior)
- reporting summary footer spans full width on mobile (`frontend/features/phase-8-reporting-control/reporting/components/reporting-summary-footer.tsx`)

Checks to run:

- frontend typecheck
- DevTools smoke at 390px (phone), 834px (tablet), 1024px (iPad Pro portrait)

## POS register layout, catalog, favorites, and payments

Where to edit:

- register shell and cart/payment orchestration: `frontend/features/pos/pos-page.tsx`
- payment receipt print (80mm thermal roll layout, auto-print on complete sale): `frontend/features/pos/pos-receipt-print.ts`
- session closing roll print (80mm thermal roll, auto-print on cashier shift close; same layout as accountant review): `frontend/features/pos/pos-session-roll-print.ts`, triggered from `closeSessionMutation` in `frontend/features/pos/pos-page.tsx`
- extracted register UI (keep in sync when changing layout): `frontend/features/pos/pos-product-card.tsx`, `frontend/features/pos/pos-session-bar.tsx`, `frontend/features/pos/pos-register-layout.tsx` (re-exports from `pos-shared`)
- shared register layout (both POS products): `frontend/features/pos-shared/pos-register-main-grid.tsx`, `pos-register-mobile-cart.tsx`, `pos-layout-classes.ts` — pass `mobileCartBar` and optional `theme` (`POS_REGISTER_DEFAULT_THEME` / `POS_REGISTER_MARKET_THEME`)
- shared responsive layout classes for POS screens (auto-fill product/table grids, register split breakpoint, touch targets): `frontend/features/pos-shared/pos-layout-classes.ts` (restaurant re-exports via `frontend/features/pos/pos-layout-classes.ts`); reuse these instead of hard-coded `md:grid-cols-*` when adding new POS grids
- narrow register UX (iPad portrait, phones): `pos-shared` register shell — full-screen product catalog, sticky bottom cart bar (item count + total), and slide-up order sheet with the full cart panel. From `960px` (`pos-wide`) up, catalog and order panel stay side by side. Restaurant: pass `mobileCartBar` from `pos-page.tsx`. Market: `frontend/features/pos-market/pos-market-register-layout.tsx`
- dine-in table floor plan UI: `frontend/app/(erp)/pos/tables/page.tsx` — uses the shared table grid classes and touch-friendly card actions
- mobile navigation drawer (replaces permanent sidebar offset on narrow viewports): `frontend/components/app-shell.tsx` + `frontend/components/mobile-nav-bar.tsx`

- category chips are dynamically loaded from Inventory Item Groups, helper functions defined in: `frontend/features/pos/pos-catalog-chips.ts`
- warehouse-scoped on-hand for the product grid: backend `GET /inventory/items?warehouseId=` (item master controller/service) and frontend `getInventoryItems` / `queryKeys.inventoryItems`
- cashier favorites: backend `GET`/`PUT` `/pos/favorites/items`, frontend `getPosFavoriteItemIds` / `setPosFavoriteItemIds`
- POS register demo catalog (warehouses, barcoded products, stock, customers, cashier favorites): `backend/prisma/seed-pos-register.ts`, invoked from full `npm run seed` or standalone `npm run seed:pos-demo` on an existing DB
- POS add-on demo groups (extras, cooking level, drink size) linked to sandwich/chips/drinks: `backend/prisma/seed-pos-addons.ts` (runs with register seed); refresh only add-ons on an existing DB with `npm run seed:pos-addons`
- Market POS demo catalog (`MKT-*` products, barcodes, stock, images) and destination markets (`MKT-AMMAN-01`, `MKT-IRBID-02`, `MKT-ZARQA-03`): `backend/prisma/seed-pos-market.ts`, invoked from full `npm run seed` or standalone `npm run seed:market` on an existing DB (requires foundation/`admin` user)
- Market POS cashier login (`market` / `market123`, `market_cashier` / `market123`): `backend/prisma/setup-pos-market-cashier.ts`, invoked from full `npm run seed` or standalone `npm run seed:market-cashier`

### Volume seed (enterprise demo dataset)

Where to edit:

- shared foundation (truncate, COA, masters, users): `backend/prisma/seed-foundation.ts`, `backend/prisma/seed-database.ts`
- batched journal posting helpers: `backend/prisma/seed-posting.ts`
- basic FY 2026 demo journals: `backend/prisma/seed-basic-demo.ts`
- volume entry and generators: `backend/prisma/seed-volume.ts`, `backend/prisma/seed-volume/*`

Commands:

- `npm run seed` — fast basic dataset (`prisma/seed.ts`); also used by `npx prisma db seed`
- `npm run seed:volume` — same foundation plus 3 fiscal years of bulk GL, enterprise masters, reporting audit rows, and quarterly operational samples (truncates DB; ~2–8 min)

Checks to run after volume seed changes:

- `npm run seed:volume` from `backend/`
- `/reporting` — KPIs, segment filters, activity tab, footer totals

Dashboard KPI sparklines:

- `GET /reporting/summary` returns `trendLabels` plus per-metric `trend[]` (monthly buckets within the selected primary date range, or the last 12 months when open-ended)
- UI: `frontend/features/phase-8-reporting-control/reporting/components/mini-bar-sparkline.tsx` and `reporting-kpi-cards.tsx`
- Comparison totals stay at `0` until `comparisonFrom` / `comparisonTo` are set (avoids duplicating the main period)
- `/general-ledger`, sales/purchases/inventory/bank modules have representative rows

What else to check:

- `GET /pos/settings` drives `runtime.allowCreditSale`, `runtime.negativeStockAllowed`, `runtime.allowCloseWithDrafts`, and `runtime.cashierDiscountLimitPercent` — align the register with these flags and with POS permission codes (`POS_CREDIT_SALE`, `POS_SELL_NEGATIVE_STOCK`, `POS_CHANGE_UNIT_PRICE`, `POS_HOLD_SALE`, `POS_CLOSE_OWN_SESSION`, etc.)
- bank transfer in the pay modal must resolve to `BANK_TRANSFER` bank/cash accounts via `normalizePaymentAccountMethod`
- the category chips (filters) are dynamically loaded from backend inventory item groups, and the Offers chip has been removed in favor of strict Item Group categories

### POS sell-by-weight (kilo)

Where to edit:

- inventory item master flag and minimum weight: `backend/prisma/schema.prisma` (`InventoryItem.allowFractionalQuantity`, `minSalesQuantity`), item-master DTO/service in `backend/src/modules/phase-5-inventory-management/inventory/item-master`, and admin UI in `frontend/features/phase-5-inventory-management/inventory/item-editor-modal.tsx` + `inventory-page.tsx`
- POS sale-time weight entry and cart behavior: `frontend/features/pos/pos-weight-entry-modal.tsx`, `frontend/features/pos/pos-weight-utils.ts`, and register orchestration in `frontend/features/pos/pos-page.tsx`
- product grid price suffix: `frontend/features/pos/pos-product-card.tsx`
- demo KG catalog: `backend/prisma/seed-pos-register.ts`

Rules:

- cashiers cannot enable sell-by-weight from POS settings or the register; only items flagged in `/inventory` prompt for weight at sale time
- `defaultSalesPrice` is price per base unit (for example per kg); line total = entered weight × unit price
- weight lines do not merge in the cart; each weigh-in stays a separate line
- enabling `allowFractionalQuantity` requires the item base unit `unitType` to be `WEIGHT`
- held/draft/resumed sales preserve decimal `quantity`; resume enriches cart lines from the live catalog for `sellByWeight` display controls

Checks to run:

- frontend typecheck (`npx tsc --noEmit` in `frontend/`)

## Accountant POS Review and Session Rejection

Where to edit:

- backend service: `backend/src/modules/phase-3-sales-receivables/pos/pos.service.ts` (session aggregation, pre-computed metrics, bulk rejection transaction)
- backend controller: `backend/src/modules/phase-3-sales-receivables/pos/pos.controller.ts` (session reject POST endpoint)
- frontend types & client: `frontend/types/api.ts`, `frontend/lib/api/index.ts`
- frontend review workspace: `frontend/features/pos/pos-review-workspace.tsx` (dashboard filters, summary metrics cards, table-centric sessions view, and SidePanel details drawer)

What else to check:

- session rejection transitions all pending sales in the session to `REJECTED` state within a safe database transaction.
- summary cards (Total Sales, Cash Sales, Card Sales, Delivery Sales, Tax, Discounts, Cash Difference) dynamically compute based on current filters.
- side-drawer details allow drilling down into specific invoices, cash difference analysis, inventory impact, and draft journal previews.
- when a POS session has a cash discrepancy (difference !== 0), direct approval is blocked. The approval button switches to "مراجعة فرق الكاش".
- clicking the button opens the "قبول فرق الصندوق" modal where the accountant records the discrepancy acceptance reason before any posting is allowed.
- if the difference exceeds the configured tolerance threshold (defaulting to 10 JOD), selecting "ACCEPT" requires manager/administrator privileges; otherwise, the option is blocked and a warning is shown.
- decisions of CORRECTION, REJECT, and REOPEN update the session state, log to the audit log, and return early without posting any accounting entries.
- accepting the discrepancy updates the session's `differenceStatus = 'ACCEPTED_DIFFERENCE'` and `reviewStatus = 'APPROVED'`, then returns control to the review screen. Session posting remains a separate explicit action after the discrepancy has been accepted.

## Reservation Pre-Order Flow

Added in: reservation pre-order task.

Where to edit:

- backend logic lives in `backend/src/modules/phase-3-sales-receivables/pos/pos.service.ts` — methods `openReservationPreOrder`, `parseReservationNotes`, `syncReservationPreOrder`, and `buildPreOrderSummary`
- the `POST /pos/tables/reservations/:reservationId/pre-order` endpoint is in `backend/src/modules/phase-3-sales-receivables/pos/pos-table.controller.ts`
- `GET /pos/tables` reservation enrichment (preOrder summary) is also in `pos-table.controller.ts` `listTables`
- frontend table UI: `frontend/app/(erp)/pos/tables/page.tsx` — reservation card and `handleOpenPreOrder`
- frontend POS register: `frontend/features/pos/pos-page.tsx` — `urlReservationId`, `activeReservationId` state, pre-order banner, and `reservationId` propagation through hold/save mutations
- API helper: `openPosReservationPreOrder` in `frontend/lib/api/index.ts`
- shared modal shell: `frontend/components/ui/index.tsx` — POS cancel/confirm dialogs portal to `document.body` so they are not clipped by the register layout

Key rules:

- register **Cancel** clears a local-only cart without `POS_VOID_DRAFT_SALE`; void permission is required only when cancelling a resumed draft/held invoice (`editingInvoiceId`)
- confirm cancel must await `voidPosSale` before `resetSale()` when a server-backed draft/held invoice is open
- **Hold** requires an active session id, persists the sale as `HELD` for the current shift, and only redirects back to `/pos/tables` for reservation pre-orders — not for ordinary dine-in table holds

- a pre-order HELD sale must NOT call `updateTableStatus` — the table stays `AVAILABLE` and has no `activeInvoiceId`
- pass `reservationId` in `HoldPosSaleDto` / `SavePosDraftDto` to trigger skip of table activation in `saveDraftLikeSale`
- `preOrderSaleId` is stored inside the `PosTableReservation.notes` JSON blob alongside `orderNotes`, `attendanceStatus`, etc.
- one pre-order per reservation at a time; a new pre-order replaces the link if the previous sale is no longer DRAFT/HELD
