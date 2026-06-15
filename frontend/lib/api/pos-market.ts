import { getApiBaseUrl } from "@/lib/config/api";
import { clearSession } from "@/lib/storage";
import type { ApiErrorShape } from "@/types/api";

type RequestOptions = RequestInit & {
  token?: string | null;
};

class MarketApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearSession();
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.assign("/login");
      }
    }
    if (typeof body === "string") {
      throw new MarketApiError(body || "Unexpected API error", response.status, body);
    }
    const payload = (body ?? {}) as ApiErrorShape;
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : payload.message || payload.error || "Unexpected API error";
    throw new MarketApiError(message, response.status, payload);
  }

  return body as T;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new MarketApiError(
        `Unable to reach the API at ${getApiBaseUrl()}. Check that the backend is running and the API base URL is correct.`,
        0,
        error instanceof Error ? error.message : error,
      );
    }
    throw error;
  }

  return parseResponse<T>(response);
}
import type {
  CompletePosSalePayload,
  CreateRepCarLoadPayload,
  CreateRepCarStocktakePayload,
  CreateRepCarTransferPayload,
  CreateRepCarUnloadPayload,
  CreatePosReturnPayload,
  HoldPosSalePayload,
  InventoryItem,
  MarketStockOverview,
  PaginatedMeta,
  PosCompleteSaleResponse,
  PosInventoryImpactRow,
  PosReportsOverview,
  PosReturn,
  PosSale,
  PosSalesByItemRow,
  PosSession,
  PosSessionAccountingApprovalResponse,
  PosSessionReport,
  PosSettings,
  PosTaxSummaryRow,
  RepCarLoad,
  RepCarTransfer,
  RepCarUnload,
  RepCarStockBalance,
  RepCarStockMovement,
  RepCarStocktake,
  SavePosDraftPayload,
} from "@/types/api";

export type PosMarketHealth = {
  product: "market";
  status: "ok";
  username: string;
  message: string;
};

export async function getPosMarketHealth(token?: string | null) {
  return apiRequest<PosMarketHealth>("/pos-market/health", { token });
}

export async function getActivePosMarketSession(token?: string | null) {
  return apiRequest<PosSession | null>("/pos-market/sessions/active", { token });
}

export type PosMarketDestinationMarket = {
  id: string;
  code: string;
  name: string;
  contactInfo?: string | null;
};

export async function getPosMarketDestinationMarkets(token?: string | null) {
  return apiRequest<PosMarketDestinationMarket[]>("/pos-market/destination-markets", { token });
}

export async function getPosMarketSettings(token?: string | null) {
  return apiRequest<PosSettings>("/pos-market/settings", { token });
}

export async function updatePosMarketSettings(
  payload: {
    postingMode?: "BY_INVOICE" | "BY_SESSION";
    cogsPostingEnabled?: boolean;
    taxFreeEnabled?: boolean;
    cashAccountId?: string;
    cardAccountId?: string;
    cliqAccountId?: string;
    walletAccountId?: string;
    bankTransferAccountId?: string;
    salesRevenueAccountId?: string;
    outputVatAccountId?: string;
    salesDiscountAccountId?: string;
    salesReturnsAccountId?: string;
  },
  token?: string | null,
) {
  return apiRequest<PosSettings>("/pos-market/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
    token,
  });
}

export async function getPosMarketFavoriteItemIds(token?: string | null) {
  return apiRequest<{ itemIds: string[] }>("/pos-market/favorites/items", { token });
}

export async function setPosMarketFavoriteItemIds(
  itemIds: string[],
  token?: string | null,
) {
  return apiRequest<{ itemIds: string[] }>("/pos-market/favorites/items", {
    method: "PUT",
    body: JSON.stringify({ itemIds }),
    token,
  });
}

export async function getPosMarketSessions(token?: string | null) {
  return apiRequest<PosSession[]>("/pos-market/sessions", { token });
}

export async function openPosMarketSession(
  payload: {
    warehouseId: string;
    cashAccountId: string;
    terminalName?: string;
    branchName?: string;
    openingCash: number;
    notes?: string;
    salesRepId?: string;
  },
  token?: string | null,
) {
  return apiRequest<PosSession>("/pos-market/sessions/open", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function closePosMarketSession(
  id: string,
  payload: { actualCash: number; notes?: string },
  token?: string | null,
) {
  return apiRequest<{ session: PosSession; report: PosSessionReport }>(
    `/pos-market/sessions/${id}/close`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function getPosMarketSessionReport(id: string, token?: string | null) {
  return apiRequest<PosSessionReport>(`/pos-market/sessions/${id}/report`, { token });
}

export async function getHeldPosMarketSales(
  sessionId: string,
  token?: string | null,
) {
  return apiRequest<PosSale[]>(
    `/pos-market/sales/held?sessionId=${encodeURIComponent(sessionId)}`,
    { token },
  );
}

export async function getDraftPosMarketSales(
  sessionId: string,
  token?: string | null,
) {
  return apiRequest<PosSale[]>(
    `/pos-market/sales/drafts?sessionId=${encodeURIComponent(sessionId)}`,
    { token },
  );
}

export async function getCompletedPosMarketSales(
  token?: string | null,
  sessionId?: string | null,
) {
  const searchParams = sessionId
    ? `?sessionId=${encodeURIComponent(sessionId)}`
    : "";
  return apiRequest<PosSale[]>(`/pos-market/sales/completed${searchParams}`, { token });
}

export async function getPendingPosMarketReview(token?: string | null) {
  return apiRequest<PosSale[]>("/pos-market/sales/review", { token });
}

export async function holdPosMarketSale(
  payload: HoldPosSalePayload,
  token?: string | null,
) {
  return apiRequest<PosSale>("/pos-market/sales/hold", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function savePosMarketDraft(
  payload: SavePosDraftPayload,
  token?: string | null,
) {
  return apiRequest<PosSale>("/pos-market/sales/draft", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function completePosMarketSale(
  payload: CompletePosSalePayload,
  token?: string | null,
) {
  return apiRequest<PosCompleteSaleResponse>("/pos-market/sales/complete", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function amendPosMarketSale(
  id: string,
  payload: CompletePosSalePayload,
  token?: string | null,
) {
  return apiRequest<PosCompleteSaleResponse>(`/pos-market/sales/${id}/amend`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function voidPosMarketSale(
  id: string,
  payload: { reason?: string } = {},
  token?: string | null,
) {
  return apiRequest<PosSale>(`/pos-market/sales/${id}/void`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function approvePosMarketAccounting(
  id: string,
  payload: { notes?: string } = {},
  token?: string | null,
) {
  return apiRequest<PosSale>(`/pos-market/sales/${id}/accounting-approve`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function approvePosMarketSessionAccounting(
  id: string,
  payload: { notes?: string; decision?: string; reason?: string } = {},
  token?: string | null,
) {
  return apiRequest<PosSessionAccountingApprovalResponse>(
    `/pos-market/sessions/${id}/accounting-approve`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function rejectPosMarketSessionAccounting(
  id: string,
  payload: { notes?: string } = {},
  token?: string | null,
) {
  return apiRequest<unknown>(`/pos-market/sessions/${id}/accounting-reject`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function rejectPosMarketAccounting(
  id: string,
  payload: { notes?: string } = {},
  token?: string | null,
) {
  return apiRequest<PosSale>(`/pos-market/sales/${id}/accounting-reject`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function reversePosMarketAccounting(
  id: string,
  payload: { reversalDate?: string; description?: string } = {},
  token?: string | null,
) {
  return apiRequest<PosSale>(`/pos-market/sales/${id}/accounting-reverse`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function getPosMarketReturns(token?: string | null) {
  return apiRequest<PosReturn[]>("/pos-market/returns", { token });
}

export async function createPosMarketReturn(
  payload: CreatePosReturnPayload,
  token?: string | null,
) {
  return apiRequest<PosReturn>("/pos-market/returns", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function approvePosMarketReturnAccounting(
  id: string,
  payload: { notes?: string } = {},
  token?: string | null,
) {
  return apiRequest<PosReturn>(`/pos-market/returns/${id}/accounting-approve`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function rejectPosMarketReturnAccounting(
  id: string,
  payload: { notes?: string } = {},
  token?: string | null,
) {
  return apiRequest<PosReturn>(`/pos-market/returns/${id}/accounting-reject`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function reversePosMarketReturnAccounting(
  id: string,
  payload: { reversalDate?: string; description?: string } = {},
  token?: string | null,
) {
  return apiRequest<PosReturn>(`/pos-market/returns/${id}/accounting-reverse`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function getPosMarketReportsOverview(token?: string | null) {
  return apiRequest<PosReportsOverview>("/pos-market/reports/overview", { token });
}

export async function getPosMarketSalesByPaymentMethodReport(token?: string | null) {
  return apiRequest<PosReportsOverview["salesByPaymentMethod"]>(
    "/pos-market/reports/sales-by-payment-method",
    { token },
  );
}

export async function getPosMarketSalesByCashierReport(token?: string | null) {
  return apiRequest<PosReportsOverview["salesByCashier"]>(
    "/pos-market/reports/sales-by-cashier",
    { token },
  );
}

export async function getPosMarketSalesByBranchReport(token?: string | null) {
  return apiRequest<PosReportsOverview["salesByBranch"]>(
    "/pos-market/reports/sales-by-branch",
    { token },
  );
}

export async function getPosMarketSalesByItemReport(token?: string | null) {
  return apiRequest<PosSalesByItemRow[]>("/pos-market/reports/sales-by-item", { token });
}

export async function getPosMarketInventoryImpactReport(token?: string | null) {
  return apiRequest<PosInventoryImpactRow[]>("/pos-market/reports/inventory-impact", { token });
}

export async function getPosMarketTaxSummaryReport(token?: string | null) {
  return apiRequest<PosTaxSummaryRow[]>("/pos-market/reports/tax-summary", { token });
}

export async function getPosMarketTimeWindowReport(
  params: { from: string; to: string },
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  searchParams.set("from", params.from);
  searchParams.set("to", params.to);
  return apiRequest<import("@/types/api").PosTimeWindowReport>(
    `/pos-market/reports/time-window?${searchParams}`,
    { token },
  );
}

export async function reprintPosMarketReceipt(id: string, token?: string | null) {
  return apiRequest<PosCompleteSaleResponse>(`/pos-market/sales/${id}/reprint`, {
    method: "POST",
    token,
  });
}

export async function printPosMarketSessionRollReport(
  sessionId: string,
  printType: "SESSION_ROLL_REPORT" | "INVOICE_LIST_ROLL" | "ALL_RECEIPTS_ROLL",
  token?: string | null,
) {
  return apiRequest<{
    sessionId: string;
    sessionNumber: string;
    printType: string;
    printedBy: string | null;
    printedAt: string;
  }>(`/pos-market/sessions/${sessionId}/print-roll-report`, {
    method: "POST",
    body: JSON.stringify({ printType }),
    token,
  });
}

export async function correctPosMarketPaymentMethod(
  id: string,
  payload: {
    paymentMethod: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET";
    bankCashAccountId: string;
    reason?: string;
    reference?: string;
  },
  token?: string | null,
) {
  return apiRequest<{ success: boolean }>(`/pos-market/sales/${id}/correct-payment-method`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export type PosMarketReceivableCustomer = {
  customerId: string;
  customerCode: string;
  customerName: string;
  contactInfo: string | null;
  salesRepId: string | null;
  salesRepCode: string | null;
  salesRepName: string | null;
  totalDelivered: string;
  totalPaid: string;
  outstandingBalance: string;
  openInvoiceCount: number;
};

export type PosMarketReceivablesSummary = {
  totals: {
    customerCount: number;
    totalDelivered: string;
    totalPaid: string;
    totalOutstanding: string;
  };
  customers: PosMarketReceivableCustomer[];
};

export type PosMarketReceivableInvoice = {
  id: string;
  reference: string;
  invoiceDate: string;
  totalAmount: string;
  allocatedAmount: string;
  outstandingAmount: string;
  status: string;
  posReceiptNumber: string | null;
  posCompletedAt: string | null;
};

export type PosMarketReceivableDeliveryLine = {
  id: string;
  lineNumber: number;
  itemCode: string | null;
  itemName: string;
  quantity: string;
  unitOfMeasure: string | null;
  unitPrice: string;
  lineAmount: string;
};

export type PosMarketReceivableDelivery = {
  id: string;
  reference: string;
  receiptNumber: string | null;
  deliveredAt: string;
  totalAmount: string;
  allocatedAmount: string;
  outstandingAmount: string;
  amendedFromInvoiceId?: string | null;
  amendedFromReference?: string | null;
  amendedFromReceiptNumber?: string | null;
  lines: PosMarketReceivableDeliveryLine[];
};

export type PosMarketReceivablePayment = {
  id: string;
  reference: string;
  receiptDate: string;
  amount: string;
  description: string | null;
  bankCashAccountName: string | null;
};

export type PosMarketReceivableDetail = {
  customer: PosMarketReceivableCustomer & {
    creditLimit: string;
    currentBalance: string;
  };
  summary: {
    totalDelivered: string;
    totalPaid: string;
    outstandingBalance: string;
    deliveryCount: number;
    paymentCount: number;
  };
  deliveries: PosMarketReceivableDelivery[];
  payments: PosMarketReceivablePayment[];
};

export type PosMarketAccountStatementLine = {
  documentType: string;
  documentNumber: string;
  documentDate: string;
  details: string;
  debit: string;
  credit: string;
  balance: string;
};

export type PosMarketAccountStatementReport = {
  companyName: string;
  currencyLabel: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  customer: {
    customerId: string;
    customerCode: string;
    customerName: string;
    contactInfo: string | null;
    salesRepId: string | null;
    salesRepCode: string | null;
    salesRepName: string | null;
  };
  openingBalance: string;
  lines: PosMarketAccountStatementLine[];
  totals: {
    debit: string;
    credit: string;
    closingBalance: string;
    transactionCount: number;
  };
};

export type PosMarketRepStatementLine = {
  documentType: string;
  documentNumber: string;
  documentDate: string;
  paymentMode: string;
  customerCode: string;
  customerName: string;
  salesRepName: string;
  documentValue: string;
};

export type PosMarketRepStatementDocumentTypes = "sales" | "returns" | "both";
export type PosMarketRepStatementPaymentTypes = "cash" | "credit" | "both";

export type PosMarketRepStatementReport = {
  companyName: string;
  currencyLabel: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  salesRep: {
    salesRepId: string;
    salesRepCode: string;
    salesRepName: string;
  };
  customerFilter: {
    customerId: string;
    customerCode: string;
    customerName: string;
  } | null;
  documentTypes: PosMarketRepStatementDocumentTypes;
  paymentTypes: PosMarketRepStatementPaymentTypes;
  lines: PosMarketRepStatementLine[];
  totals: {
    documentCount: number;
    totalAmount: string;
  };
};

export type PosMarketCollectReceivablesResponse = {
  id: string;
  reference: string;
  receiptDate: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  amountPaid: string;
  balanceBefore: string;
  balanceAfter: string;
  bankCashAccountName: string | null;
};

export type PosMarketReceivableSalesRep = {
  id: string;
  code: string;
  name: string;
};

export async function getPosMarketReceivables(
  params: { salesRepId?: string; search?: string; balanceOnly?: boolean } = {},
  token?: string | null,
) {
  const query = new URLSearchParams();
  if (params.salesRepId) query.set("salesRepId", params.salesRepId);
  if (params.search) query.set("search", params.search);
  if (params.balanceOnly) query.set("balanceOnly", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PosMarketReceivablesSummary>(`/pos-market/receivables${suffix}`, { token });
}

export async function getPosMarketReceivableInvoices(
  customerId: string,
  token?: string | null,
) {
  return apiRequest<PosMarketReceivableInvoice[]>(
    `/pos-market/receivables/${customerId}/invoices`,
    { token },
  );
}

export async function getPosMarketReceivableDetail(
  customerId: string,
  token?: string | null,
) {
  return apiRequest<PosMarketReceivableDetail>(
    `/pos-market/receivables/${customerId}/detail`,
    { token },
  );
}

export async function getPosMarketAccountStatement(
  customerId: string,
  params: { fromDate: string; toDate: string },
  token?: string | null,
) {
  const query = new URLSearchParams({
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  return apiRequest<PosMarketAccountStatementReport>(
    `/pos-market/receivables/${customerId}/statement?${query.toString()}`,
    { token },
  );
}

export async function getPosMarketRepStatement(
  params: {
    salesRepId: string;
    fromDate: string;
    toDate: string;
    customerId?: string;
    documentTypes?: PosMarketRepStatementDocumentTypes;
    paymentTypes?: PosMarketRepStatementPaymentTypes;
  },
  token?: string | null,
) {
  const query = new URLSearchParams({
    salesRepId: params.salesRepId,
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  if (params.customerId) {
    query.set("customerId", params.customerId);
  }
  if (params.documentTypes) {
    query.set("documentTypes", params.documentTypes);
  }
  if (params.paymentTypes) {
    query.set("paymentTypes", params.paymentTypes);
  }
  return apiRequest<PosMarketRepStatementReport>(
    `/pos-market/rep-statements?${query.toString()}`,
    { token },
  );
}

export async function getPosMarketReceivableSalesReps(token?: string | null) {
  return apiRequest<PosMarketReceivableSalesRep[]>("/pos-market/receivables/sales-reps", {
    token,
  });
}

export async function getPosMarketSalesReps(token?: string | null) {
  return apiRequest<Array<{ id: string; code: string; name: string }>>(
    "/pos-market/sales-reps",
    { token },
  );
}

export async function getPosMarketCatalog(salesRepId: string, token?: string | null) {
  return apiRequest<InventoryItem[]>(
    `/pos-market/catalog?salesRepId=${encodeURIComponent(salesRepId)}`,
    { token },
  );
}

export async function getRepCarLoads(
  params: {
    status?: string;
    salesRepId?: string;
    warehouseId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.salesRepId) searchParams.set("salesRepId", params.salesRepId);
  if (params.warehouseId) searchParams.set("warehouseId", params.warehouseId);
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiRequest<{ data: RepCarLoad[]; meta: PaginatedMeta }>(
    `/pos-market/rep-car-loads${suffix}`,
    { token },
  );
}

export async function getRepCarLoad(id: string, token?: string | null) {
  return apiRequest<RepCarLoad>(`/pos-market/rep-car-loads/${id}`, { token });
}

export async function createRepCarLoad(
  payload: CreateRepCarLoadPayload,
  token?: string | null,
) {
  return apiRequest<RepCarLoad>("/pos-market/rep-car-loads", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateRepCarLoad(
  id: string,
  payload: Partial<CreateRepCarLoadPayload>,
  token?: string | null,
) {
  return apiRequest<RepCarLoad>(`/pos-market/rep-car-loads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postRepCarLoad(id: string, token?: string | null) {
  return apiRequest<RepCarLoad>(`/pos-market/rep-car-loads/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function cancelRepCarLoad(id: string, token?: string | null) {
  return apiRequest<RepCarLoad>(`/pos-market/rep-car-loads/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export async function reverseRepCarLoad(id: string, token?: string | null) {
  return apiRequest<RepCarLoad>(`/pos-market/rep-car-loads/${id}/reverse`, {
    method: "POST",
    token,
  });
}

export async function getMarketStockOverview(
  params: { search?: string; itemId?: string; hideZero?: boolean } = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.itemId) searchParams.set("itemId", params.itemId);
  if (params.hideZero === false) searchParams.set("hideZero", "false");
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiRequest<MarketStockOverview>(`/pos-market/stock-overview${suffix}`, { token });
}

export async function getRepCarUnloads(
  params: {
    status?: string;
    salesRepId?: string;
    warehouseId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.salesRepId) searchParams.set("salesRepId", params.salesRepId);
  if (params.warehouseId) searchParams.set("warehouseId", params.warehouseId);
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiRequest<{ data: RepCarUnload[]; meta: PaginatedMeta }>(
    `/pos-market/rep-car-unloads${suffix}`,
    { token },
  );
}

export async function createRepCarUnload(
  payload: CreateRepCarUnloadPayload,
  token?: string | null,
) {
  return apiRequest<RepCarUnload>("/pos-market/rep-car-unloads", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postRepCarUnload(id: string, token?: string | null) {
  return apiRequest<RepCarUnload>(`/pos-market/rep-car-unloads/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function getRepCarTransfers(
  params: {
    status?: string;
    fromSalesRepId?: string;
    toSalesRepId?: string;
    salesRepId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.fromSalesRepId) searchParams.set("fromSalesRepId", params.fromSalesRepId);
  if (params.toSalesRepId) searchParams.set("toSalesRepId", params.toSalesRepId);
  if (params.salesRepId) searchParams.set("salesRepId", params.salesRepId);
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiRequest<{ data: RepCarTransfer[]; meta: PaginatedMeta }>(
    `/pos-market/rep-car-transfers${suffix}`,
    { token },
  );
}

export async function getRepCarTransfer(id: string, token?: string | null) {
  return apiRequest<RepCarTransfer>(`/pos-market/rep-car-transfers/${id}`, { token });
}

export async function createRepCarTransfer(
  payload: CreateRepCarTransferPayload,
  token?: string | null,
) {
  return apiRequest<RepCarTransfer>("/pos-market/rep-car-transfers", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateRepCarTransfer(
  id: string,
  payload: Partial<CreateRepCarTransferPayload>,
  token?: string | null,
) {
  return apiRequest<RepCarTransfer>(`/pos-market/rep-car-transfers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postRepCarTransfer(id: string, token?: string | null) {
  return apiRequest<RepCarTransfer>(`/pos-market/rep-car-transfers/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function cancelRepCarTransfer(id: string, token?: string | null) {
  return apiRequest<RepCarTransfer>(`/pos-market/rep-car-transfers/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export async function reverseRepCarTransfer(id: string, token?: string | null) {
  return apiRequest<RepCarTransfer>(`/pos-market/rep-car-transfers/${id}/reverse`, {
    method: "POST",
    token,
  });
}

export async function getRepCarStock(salesRepId: string, token?: string | null) {
  return apiRequest<RepCarStockBalance[]>(
    `/pos-market/rep-car-stock?salesRepId=${encodeURIComponent(salesRepId)}`,
    { token },
  );
}

export async function getRepCarStockMovements(
  params: {
    salesRepId?: string;
    itemId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.salesRepId) searchParams.set("salesRepId", params.salesRepId);
  if (params.itemId) searchParams.set("itemId", params.itemId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiRequest<{ data: RepCarStockMovement[]; meta: PaginatedMeta }>(
    `/pos-market/rep-car-stock/movements${suffix}`,
    { token },
  );
}

export async function getRepCarStocktakes(
  params: {
    status?: string;
    salesRepId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.salesRepId) searchParams.set("salesRepId", params.salesRepId);
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiRequest<{ data: RepCarStocktake[]; meta: PaginatedMeta }>(
    `/pos-market/rep-car-stocktakes${suffix}`,
    { token },
  );
}

export async function getRepCarStocktake(id: string, token?: string | null) {
  return apiRequest<RepCarStocktake>(`/pos-market/rep-car-stocktakes/${id}`, { token });
}

export async function createRepCarStocktake(
  payload: CreateRepCarStocktakePayload,
  token?: string | null,
) {
  return apiRequest<RepCarStocktake>("/pos-market/rep-car-stocktakes", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postRepCarStocktake(id: string, token?: string | null) {
  return apiRequest<RepCarStocktake>(`/pos-market/rep-car-stocktakes/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function collectPosMarketReceivables(
  payload: {
    customerId: string;
    receiptDate: string;
    amount: number;
    bankCashAccountId: string;
    description?: string;
    allocations?: Array<{ salesInvoiceId: string; amount: number }>;
  },
  token?: string | null,
) {
  return apiRequest<PosMarketCollectReceivablesResponse>("/pos-market/receivables/collect", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}
