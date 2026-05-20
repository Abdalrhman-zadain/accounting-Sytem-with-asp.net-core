export type PosAccessRoleCode = "CASHIER" | "ACCOUNTANT";

export type PosPermissionCode =
  | "POS_OPEN_SESSION"
  | "POS_CLOSE_OWN_SESSION"
  | "POS_VIEW_POS_SCREEN"
  | "POS_SCAN_BARCODE"
  | "POS_SEARCH_ITEM"
  | "POS_ADD_ITEM_TO_CART"
  | "POS_UPDATE_ITEM_QUANTITY"
  | "POS_REMOVE_ITEM_FROM_CART"
  | "POS_HOLD_SALE"
  | "POS_RESUME_OWN_HELD_SALE"
  | "POS_VOID_DRAFT_SALE"
  | "POS_COMPLETE_SALE"
  | "POS_SELECT_PAYMENT_METHOD"
  | "POS_PRINT_RECEIPT"
  | "POS_VIEW_OWN_SESSION_REPORT"
  | "POS_VIEW_COMPLETED_SALES"
  | "POS_VIEW_PENDING_ACCOUNTING"
  | "POS_VIEW_POS_INVOICE_DETAILS"
  | "POS_VIEW_POS_PAYMENTS"
  | "POS_VIEW_POS_INVENTORY_MOVEMENTS"
  | "POS_VIEW_SESSIONS"
  | "POS_VIEW_SESSION_REPORT"
  | "POS_APPROVE_ACCOUNTING"
  | "POS_REJECT_ACCOUNTING"
  | "POS_POST_BY_INVOICE"
  | "POS_POST_BY_SESSION"
  | "POS_VIEW_POS_REPORTS"
  | "POS_EXPORT_POS_REPORTS"
  | "VIEW_JOURNAL_ENTRIES"
  | "VIEW_GENERAL_LEDGER"
  | "VIEW_INVENTORY_MOVEMENTS"
  | "POS_CREDIT_SALE"
  | "POS_SELL_NEGATIVE_STOCK"
  | "POS_CHANGE_UNIT_PRICE";

export type AuthorizedUser = {
  userId: string;
  username: string;
  email: string;
  name?: string | null;
  role: string;
  isActive: boolean;
  posRoles: PosAccessRoleCode[];
  permissions: PosPermissionCode[];
  allowedRoutes: string[];
  defaultRoute: string;
  isCashierOnly: boolean;
};
