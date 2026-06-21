import type {
  AccountsQuery,
  InventoryGoodsIssuesQuery,
  InventoryItemsQuery,
  InventoryItemCategoriesQuery,
  InventoryMasterDataQuery,
  InventoryGoodsReceiptsQuery,
  InventoryStockLedgerQuery,
  InventoryTransfersQuery,
  InventoryAdjustmentsQuery,
  InventoryWarehousesQuery,
  BankCashAccountsQuery,
  BankCashTransactionsQuery,
  BankReconciliationsQuery,
  CustomersQuery,
  DebitNotesQuery,
  PurchaseOrdersQuery,
  PurchaseInvoicesQuery,
  SupplierPaymentsQuery,
  JournalEntriesQuery,
  PurchaseRequestsQuery,
  SalesDocumentsQuery,
  SuppliersQuery,
} from "@/types/api";

type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown>;

function normalizeObject(value: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(value).sort();
  for (const key of keys) {
    const v = value[key];
    if (v === undefined) continue;
    out[key] = v;
  }
  return out;
}

export const queryKeys = {
  accounts(token: string | null, params: AccountsQuery = {}) {
    return ["accounts", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryItems(token: string | null, params: InventoryItemsQuery = {}) {
    return ["inventory-items", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryItemGroups(token: string | null, params: InventoryMasterDataQuery = {}) {
    return ["inventory-item-groups", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryItemCategories(token: string | null, params: InventoryItemCategoriesQuery = {}) {
    return ["inventory-item-categories", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryUnitsOfMeasure(token: string | null, params: InventoryMasterDataQuery = {}) {
    return ["inventory-units-of-measure", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryWarehouses(token: string | null, params: InventoryWarehousesQuery = {}) {
    return ["inventory-warehouses", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryWarehouseById(token: string | null, id: string | null) {
    return ["inventory-warehouse", token, id] as const;
  },
  inventoryGoodsReceipts(token: string | null, params: InventoryGoodsReceiptsQuery = {}) {
    return ["inventory-goods-receipts", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryGoodsReceiptById(token: string | null, id: string | null) {
    return ["inventory-goods-receipt", token, id] as const;
  },
  inventoryGoodsIssues(token: string | null, params: InventoryGoodsIssuesQuery = {}) {
    return ["inventory-goods-issues", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryGoodsIssueById(token: string | null, id: string | null) {
    return ["inventory-goods-issue", token, id] as const;
  },
  inventoryTransfers(token: string | null, params: InventoryTransfersQuery = {}) {
    return ["inventory-transfers", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryTransferById(token: string | null, id: string | null) {
    return ["inventory-transfer", token, id] as const;
  },
  inventoryAdjustments(token: string | null, params: InventoryAdjustmentsQuery = {}) {
    return ["inventory-adjustments", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryAdjustmentById(token: string | null, id: string | null) {
    return ["inventory-adjustment", token, id] as const;
  },
  inventoryStockLedger(token: string | null, params: InventoryStockLedgerQuery = {}) {
    return ["inventory-stock-ledger", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryPolicy(token: string | null) {
    return ["inventory-policy", token] as const;
  },
  inventoryItemById(token: string | null, id: string | null) {
    return ["inventory-item", token, id] as const;
  },
  accountById(token: string | null, id: string | null) {
    return ["account", token, id] as const;
  },
  bankCashAccounts(token: string | null, params: BankCashAccountsQuery = {}) {
    return ["bank-cash-accounts", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  bankCashAccountTransactions(token: string | null, id: string | null, params: { dateFrom?: string; dateTo?: string } = {}) {
    return ["bank-cash-account-transactions", token, id, normalizeObject(params as Record<string, unknown>)] as const;
  },
  bankCashTransactions(token: string | null, params: BankCashTransactionsQuery = {}) {
    return ["bank-cash-transactions", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  bankReconciliations(token: string | null, params: BankReconciliationsQuery = {}) {
    return ["bank-reconciliations", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  bankReconciliationById(token: string | null, id: string | null) {
    return ["bank-reconciliation", token, id] as const;
  },
  salesCustomers(token: string | null, params: CustomersQuery = {}) {
    return ["sales-customers", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesRepresentatives(token: string | null, params: { status?: string; search?: string } = {}) {
    return ["sales-representatives", token, normalizeObject(params as Record<string, unknown>)] as const;
  },
  purchaseSuppliers(token: string | null, params: SuppliersQuery = {}) {
    return ["purchase-suppliers", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseSupplierById(token: string | null, id: string | null) {
    return ["purchase-supplier", token, id] as const;
  },
  purchaseRequests(token: string | null, params: PurchaseRequestsQuery = {}) {
    return ["purchase-requests", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseRequestById(token: string | null, id: string | null) {
    return ["purchase-request", token, id] as const;
  },
  purchaseOrders(token: string | null, params: PurchaseOrdersQuery = {}) {
    return ["purchase-orders", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseOrderById(token: string | null, id: string | null) {
    return ["purchase-order", token, id] as const;
  },
  purchaseInvoices(token: string | null, params: PurchaseInvoicesQuery = {}) {
    return ["purchase-invoices", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseInvoiceById(token: string | null, id: string | null) {
    return ["purchase-invoice", token, id] as const;
  },
  supplierPayments(token: string | null, params: SupplierPaymentsQuery = {}) {
    return ["supplier-payments", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  supplierPaymentById(token: string | null, id: string | null) {
    return ["supplier-payment", token, id] as const;
  },
  debitNotes(token: string | null, params: DebitNotesQuery = {}) {
    return ["debit-notes", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  debitNoteById(token: string | null, id: string | null) {
    return ["debit-note", token, id] as const;
  },
  purchaseSupplierBalance(token: string | null, supplierId: string | null) {
    return ["purchase-supplier-balance", token, supplierId] as const;
  },
  purchaseSupplierTransactions(token: string | null, supplierId: string | null) {
    return ["purchase-supplier-transactions", token, supplierId] as const;
  },
  salesCustomerBalance(token: string | null, customerId: string | null) {
    return ["sales-customer-balance", token, customerId] as const;
  },
  salesCustomerTransactions(token: string | null, customerId: string | null) {
    return ["sales-customer-transactions", token, customerId] as const;
  },
  salesQuotations(token: string | null, params: SalesDocumentsQuery = {}) {
    return ["sales-quotations", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesOrders(token: string | null, params: SalesDocumentsQuery = {}) {
    return ["sales-orders", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesInvoices(token: string | null, params: SalesDocumentsQuery = {}) {
    return ["sales-invoices", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesCreditNotes(token: string | null, params: SalesDocumentsQuery = {}) {
    return ["sales-credit-notes", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesReceipts(token: string | null, params: { customerId?: string; search?: string } = {}) {
    return ["sales-receipts", token, normalizeObject(params as Record<string, unknown>)] as const;
  },
  salesAging(token: string | null, asOfDate?: string) {
    return ["sales-aging", token, asOfDate ?? null] as const;
  },
  posActiveSession(token: string | null) {
    return ["pos-active-session", token] as const;
  },
  posSettings(token: string | null) {
    return ["pos-settings", token] as const;
  },
  posFavoriteItems(token: string | null) {
    return ["pos-favorite-items", token] as const;
  },
  posMarketHealth: ["pos-market", "health"] as const,
  posMarketDestinationMarkets(token: string | null) {
    return ["pos-market", "destination-markets", token] as const;
  },
  posMarketActiveSession(token: string | null) {
    return ["pos-market-active-session", token] as const;
  },
  posMarketSettings(token: string | null) {
    return ["pos-market-settings", token] as const;
  },
  posMarketFavoriteItems(token: string | null) {
    return ["pos-market-favorite-items", token] as const;
  },
  posMarketSessions(token: string | null) {
    return ["pos-market-sessions", token] as const;
  },
  posMarketHeldSales(token: string | null, sessionId: string | null) {
    return ["pos-market-held-sales", token, sessionId] as const;
  },
  posMarketDraftSales(token: string | null, sessionId: string | null) {
    return ["pos-market-draft-sales", token, sessionId] as const;
  },
  posMarketCompletedSales(token: string | null) {
    return ["pos-market-completed-sales", token] as const;
  },
  posMarketReview(token: string | null) {
    return ["pos-market-review", token] as const;
  },
  posMarketReturns(token: string | null) {
    return ["pos-market-returns", token] as const;
  },
  posMarketReceivables(
    token: string | null,
    filters?: { salesRepId?: string; search?: string; balanceOnly?: boolean },
  ) {
    return ["pos-market-receivables", token, filters ?? {}] as const;
  },
  posMarketReceivableInvoices(token: string | null, customerId: string | null) {
    return ["pos-market-receivable-invoices", token, customerId] as const;
  },
  posMarketReceivableDetail(token: string | null, customerId: string | null) {
    return ["pos-market-receivable-detail", token, customerId] as const;
  },
  posMarketAccountStatement(
    token: string | null,
    customerId: string | null,
    range: { fromDate: string; toDate: string } | null,
  ) {
    return ["pos-market-account-statement", token, customerId, range] as const;
  },
  posMarketRepStatement(
    token: string | null,
    filters: {
      salesRepId: string | null;
      customerId: string | null;
      fromDate: string;
      toDate: string;
    } | null,
  ) {
    return ["pos-market-rep-statement", token, filters] as const;
  },
  posMarketReceivableSalesReps(token: string | null) {
    return ["pos-market-receivable-sales-reps", token] as const;
  },
  posMarketSalesReps(token: string | null) {
    return ["pos-market-sales-reps", token] as const;
  },
  posMarketCatalog(token: string | null, salesRepId: string | null) {
    return ["pos-market-catalog", token, salesRepId] as const;
  },
  posMarketInventoryItems(token: string | null) {
    return ["pos-market-inventory-items", token] as const;
  },
  posMarketWarehouseInventoryItems(token: string | null, warehouseId: string | null) {
    return ["pos-market-warehouse-inventory-items", token, warehouseId] as const;
  },
  posMarketRepCarStock(token: string | null, salesRepId: string | null) {
    return ["pos-market-rep-car-stock", token, salesRepId] as const;
  },
  posMarketRepCarStockMovements(token: string | null, salesRepId: string | null) {
    return ["pos-market-rep-car-stock-movements", token, salesRepId] as const;
  },
  posMarketRepCarStocktake(token: string | null, id: string | null) {
    return ["pos-market-rep-car-stocktake", token, id] as const;
  },
  posMarketRepCarLoads(token: string | null) {
    return ["pos-market-rep-car-loads", token] as const;
  },
  posMarketRepCarLoad(token: string | null, id: string | null) {
    return ["pos-market-rep-car-load", token, id] as const;
  },
  posMarketStockOverview(token: string | null, search: string, hideZero: boolean) {
    return ["pos-market-stock-overview", token, search, hideZero] as const;
  },
  posMarketRepCarTransfers(token: string | null) {
    return ["pos-market-rep-car-transfers", token] as const;
  },
  posMarketRepCarTransfer(token: string | null, id: string | null) {
    return ["pos-market-rep-car-transfer", token, id] as const;
  },
  posMarketRepCarStocktakes(token: string | null) {
    return ["pos-market-rep-car-stocktakes", token] as const;
  },
  posMarketReportsOverview(token: string | null) {
    return ["pos-market-reports-overview", token] as const;
  },
  posMarketSessionReport(token: string | null, sessionId: string | null) {
    return ["pos-market-session-report", token, sessionId] as const;
  },
  posMarketSalesByPaymentMethod(token: string | null) {
    return ["pos-market-sales-by-payment-method", token] as const;
  },
  posMarketSalesByCashier(token: string | null) {
    return ["pos-market-sales-by-cashier", token] as const;
  },
  posMarketSalesByBranch(token: string | null) {
    return ["pos-market-sales-by-branch", token] as const;
  },
  posMarketSalesByItem(token: string | null) {
    return ["pos-market-sales-by-item", token] as const;
  },
  posMarketInventoryImpact(token: string | null) {
    return ["pos-market-inventory-impact", token] as const;
  },
  posMarketTaxSummary(token: string | null) {
    return ["pos-market-tax-summary", token] as const;
  },
  posSessions(token: string | null) {
    return ["pos-sessions", token] as const;
  },
  posTables(token: string | null) {
    return ["pos-tables", token] as const;
  },
  posKitchenOrders(token: string | null) {
    return ["pos-kitchen-orders", token] as const;
  },
  posWaiterOrders(token: string | null) {
    return ["pos-waiter-orders", token] as const;
  },
  posAddonGroups(token: string | null) {
    return ["pos-addon-groups", token] as const;
  },
  posItemAddons(token: string | null, itemId: string | null) {
    return ["pos-item-addons", token, itemId] as const;
  },
  posAddonCatalog(token: string | null, itemIdsKey: string) {
    return ["pos-addon-catalog", token, itemIdsKey] as const;
  },
  posHeldSales(token: string | null, sessionId: string | null) {
    return ["pos-held-sales", token, sessionId] as const;
  },
  posDraftSales(token: string | null, sessionId: string | null) {
    return ["pos-draft-sales", token, sessionId] as const;
  },
  posCompletedSales(token: string | null) {
    return ["pos-completed-sales", token] as const;
  },
  posReview(token: string | null) {
    return ["pos-review", token] as const;
  },
  posReturns(token: string | null) {
    return ["pos-returns", token] as const;
  },
  posReportsOverview(token: string | null) {
    return ["pos-reports-overview", token] as const;
  },
  posSessionReport(token: string | null, sessionId: string | null) {
    return ["pos-session-report", token, sessionId] as const;
  },
  posSalesByPaymentMethod(token: string | null) {
    return ["pos-sales-by-payment-method", token] as const;
  },
  posSalesByCashier(token: string | null) {
    return ["pos-sales-by-cashier", token] as const;
  },
  posSalesByBranch(token: string | null) {
    return ["pos-sales-by-branch", token] as const;
  },
  posSalesByItem(token: string | null) {
    return ["pos-sales-by-item", token] as const;
  },
  posInventoryImpact(token: string | null) {
    return ["pos-inventory-impact", token] as const;
  },
  posTaxSummary(token: string | null) {
    return ["pos-tax-summary", token] as const;
  },
  journalEntries(token: string | null, params: JournalEntriesQuery = {}) {
    return ["journal-entries", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  journalEntryById(token: string | null, id: string | null) {
    return ["journal-entry", token, id] as const;
  },
  journalEntryTypes(token: string | null) {
    return ["journal-entry-types", token] as const;
  },
  accountSubtypes(token: string | null) {
    return ["account-subtypes", token] as const;
  },
  currencies(token: string | null) {
    return ["currencies", token] as const;
  },
  paymentMethodTypes(token: string | null) {
    return ["payment-method-types", token] as const;
  },
  segmentDefinitions(token: string | null) {
    return ["segment-definitions", token] as const;
  },
  fiscalYears(token: string | null) {
    return ["fiscal-years", token] as const;
  },
  auditLog(token: string | null, params: { entity?: string; entityId?: string; limit?: number } = {}) {
    return ["audit-log", token, normalizeObject(params as Record<string, unknown>)] as const;
  },
  adminUsers: ["admin-users"] as const,
  permissionCatalog: ["permission-catalog"] as const,
};
