import type { PosAccessRoleCode, PosPermissionCode } from "./auth.types";

export const CASHIER_PERMISSION_CODES: PosPermissionCode[] = [
  "POS_OPEN_SESSION",
  "POS_CLOSE_OWN_SESSION",
  "POS_VIEW_POS_SCREEN",
  "POS_SCAN_BARCODE",
  "POS_SEARCH_ITEM",
  "POS_ADD_ITEM_TO_CART",
  "POS_UPDATE_ITEM_QUANTITY",
  "POS_REMOVE_ITEM_FROM_CART",
  "POS_HOLD_SALE",
  "POS_RESUME_OWN_HELD_SALE",
  "POS_VOID_DRAFT_SALE",
  "POS_COMPLETE_SALE",
  "POS_SELECT_PAYMENT_METHOD",
  "POS_PRINT_RECEIPT",
  "POS_VIEW_OWN_SESSION_REPORT",
];

export const ACCOUNTANT_PERMISSION_CODES: PosPermissionCode[] = [
  "POS_VIEW_COMPLETED_SALES",
  "POS_VIEW_PENDING_ACCOUNTING",
  "POS_VIEW_POS_INVOICE_DETAILS",
  "POS_VIEW_POS_PAYMENTS",
  "POS_VIEW_POS_INVENTORY_MOVEMENTS",
  "POS_VIEW_SESSIONS",
  "POS_VIEW_SESSION_REPORT",
  "POS_APPROVE_ACCOUNTING",
  "POS_REJECT_ACCOUNTING",
  "POS_POST_BY_INVOICE",
  "POS_POST_BY_SESSION",
  "POS_VIEW_POS_REPORTS",
  "POS_EXPORT_POS_REPORTS",
  "VIEW_JOURNAL_ENTRIES",
  "VIEW_GENERAL_LEDGER",
  "VIEW_INVENTORY_MOVEMENTS",
];

export const POS_ROLE_ROUTE_ACCESS: Record<PosAccessRoleCode, string[]> = {
  CASHIER: ["/pos", "/pos/register", "/pos/session", "/pos/held-sales", "/pos/receipt"],
  ACCOUNTANT: [
    "/dashboard",
    "/accounts",
    "/sales-receivables",
    "/journal-entries",
    "/general-ledger",
    "/inventory",
    "/pos",
    "/pos/accounting-review",
    "/pos/sessions",
    "/pos/completed-sales",
    "/pos/reports",
    "/pos/settings",
  ],
};

export const POS_ROLE_PERMISSIONS: Record<PosAccessRoleCode, PosPermissionCode[]> = {
  CASHIER: CASHIER_PERMISSION_CODES,
  ACCOUNTANT: ACCOUNTANT_PERMISSION_CODES,
};

export const ALL_POS_PERMISSION_CODES: PosPermissionCode[] = Array.from(
  new Set([...CASHIER_PERMISSION_CODES, ...ACCOUNTANT_PERMISSION_CODES]),
);

export function uniqueRoutes(routes: string[]) {
  return Array.from(new Set(routes));
}
