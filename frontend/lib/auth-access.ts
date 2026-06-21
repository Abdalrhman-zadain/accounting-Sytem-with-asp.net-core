import type { AuthUser, PosPermissionCode } from "@/types/api";

const POS_ROUTE_PREFIX = "/pos";
const POS_MARKET_ROUTE_PREFIX = "/pos-market";

function normalizePath(pathname: string) {
  if (!pathname) {
    return "/";
  }
  const withoutHash = pathname.split("#")[0] ?? pathname;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  return withoutQuery.endsWith("/") && withoutQuery !== "/" ? withoutQuery.slice(0, -1) : withoutQuery;
}

function routeMatches(allowedRoute: string, normalizedPath: string) {
  if (allowedRoute === POS_ROUTE_PREFIX) {
    return normalizedPath === POS_ROUTE_PREFIX;
  }
  if (allowedRoute === POS_MARKET_ROUTE_PREFIX) {
    return normalizedPath === POS_MARKET_ROUTE_PREFIX;
  }
  return normalizedPath === allowedRoute || normalizedPath.startsWith(`${allowedRoute}/`);
}

export function hasPermission(user: AuthUser | null | undefined, permission: PosPermissionCode) {
  if (permission === "POS_VIEW_POS_SCREEN") {
    const hasDirect = Boolean(user?.permissions?.includes(permission));
    if (hasDirect) return true;
    return Boolean(
      user?.permissions?.includes("RST_VIEW_TABLE_SCREEN") ||
      user?.permissions?.includes("RST_OPEN_TABLE_ORDER") ||
      user?.permissions?.includes("RST_VIEW_WAITER_ORDERS")
    );
  }
  return Boolean(user?.permissions?.includes(permission));
}

export function isKitchenOnlyUser(user: AuthUser | null | undefined) {
  if (!user) {
    return false;
  }
  return (
    user.posRoles.includes("KITCHEN") &&
    !user.posRoles.includes("CASHIER") &&
    !user.posRoles.includes("ACCOUNTANT") &&
    !user.posRoles.includes("WAITER")
  );
}

export function isWaiterOnlyUser(user: AuthUser | null | undefined) {
  if (!user) {
    return false;
  }
  return (
    user.posRoles.includes("WAITER") &&
    !user.posRoles.includes("CASHIER") &&
    !user.posRoles.includes("ACCOUNTANT") &&
    !user.posRoles.includes("KITCHEN")
  );
}

export function isCashierPosUser(user: AuthUser | null | undefined) {
  return Boolean(user?.posRoles?.includes("CASHIER"));
}

export function isMarketCashierUser(user: AuthUser | null | undefined) {
  return Boolean(user?.posRoles?.includes("MARKET_CASHIER"));
}

export function isMarketRepUser(user: AuthUser | null | undefined) {
  return Boolean(user?.posRoles?.includes("MARKET_REP"));
}

export type PosProduct = "restaurant" | "market";

export function getUserPosProducts(user: AuthUser | null | undefined): PosProduct[] {
  if (!user) {
    return [];
  }

  const products = new Set<PosProduct>();

  if (
    user.posRoles.includes("CASHIER") ||
    user.posRoles.includes("WAITER") ||
    user.posRoles.includes("KITCHEN")
  ) {
    products.add("restaurant");
  }

  if (user.posRoles.includes("MARKET_CASHIER") || user.posRoles.includes("MARKET_REP")) {
    products.add("market");
  }

  if (user.posRoles.includes("ACCOUNTANT")) {
    products.add("restaurant");
    products.add("market");
  }

  return Array.from(products);
}

export function userHasPosProduct(
  user: AuthUser | null | undefined,
  product: PosProduct,
) {
  return getUserPosProducts(user).includes(product);
}

function isRestaurantPosPath(normalizedPath: string) {
  return normalizedPath === "/pos" || normalizedPath.startsWith("/pos/");
}

export function canAccessRoute(user: AuthUser | null | undefined, pathname: string) {
  if (!user) {
    return false;
  }

  const normalizedPath = normalizePath(pathname);
  const allowedRoutes = user.allowedRoutes ?? [];

  if (isRestaurantPosPath(normalizedPath) && !userHasPosProduct(user, "restaurant")) {
    return false;
  }

  if (normalizedPath === "/pos/returns" || normalizedPath.startsWith("/pos/returns/")) {
    return isCashierPosUser(user) && hasPermission(user, "POS_VIEW_COMPLETED_SALES");
  }

  if (allowedRoutes.some((route) => routeMatches(route, normalizedPath))) {
    return true;
  }

  if (
    normalizedPath === "/pos/waiter/tables" ||
    normalizedPath.startsWith("/pos/waiter/tables/") ||
    normalizedPath === "/pos/waiter/order" ||
    normalizedPath.startsWith("/pos/waiter/order/") ||
    normalizedPath === "/pos/waiter/orders" ||
    normalizedPath.startsWith("/pos/waiter/orders/")
  ) {
    if (
      normalizedPath === "/pos/waiter/orders" ||
      normalizedPath.startsWith("/pos/waiter/orders/")
    ) {
      return hasPermission(user, "RST_VIEW_WAITER_ORDERS");
    }
    return (
      hasPermission(user, "RST_VIEW_TABLE_SCREEN") ||
      hasPermission(user, "RST_OPEN_TABLE_ORDER")
    );
  }

  if (normalizedPath === "/pos/tables" || normalizedPath.startsWith("/pos/tables/")) {
    return hasPermission(user, "RST_VIEW_TABLE_SCREEN");
  }

  if (normalizedPath === "/pos/delivery" || normalizedPath.startsWith("/pos/delivery/")) {
    return (
      hasPermission(user, "POS_VIEW_POS_SCREEN") ||
      hasPermission(user, "RST_CREATE_DELIVERY_ORDER") ||
      hasPermission(user, "RST_ASSIGN_DRIVER")
    );
  }

  if (normalizedPath === "/pos/printers" || normalizedPath.startsWith("/pos/printers/")) {
    return (
      hasPermission(user, "POS_VIEW_POS_SCREEN") ||
      hasPermission(user, "POS_PRINT_RECEIPT")
    );
  }

  if (
    normalizedPath === "/pos/register" ||
    normalizedPath.startsWith("/pos/register/") ||
    normalizedPath === "/pos/receipt" ||
    normalizedPath.startsWith("/pos/receipt/")
  ) {
    return hasPermission(user, "POS_VIEW_POS_SCREEN");
  }

  if (
    normalizedPath === "/pos/held-sales" ||
    normalizedPath.startsWith("/pos/held-sales/")
  ) {
    return hasPermission(user, "POS_RESUME_OWN_HELD_SALE");
  }

  if (
    normalizedPath === "/pos/session" ||
    normalizedPath.startsWith("/pos/session/") ||
    normalizedPath === "/pos/sessions" ||
    normalizedPath.startsWith("/pos/sessions/")
  ) {
    return (
      hasPermission(user, "POS_VIEW_OWN_SESSION_REPORT") ||
      hasPermission(user, "POS_VIEW_SESSION_REPORT")
    );
  }

  if (
    normalizedPath === "/pos/accounting-review" ||
    normalizedPath.startsWith("/pos/accounting-review/") ||
    normalizedPath === "/pos/completed-sales" ||
    normalizedPath.startsWith("/pos/completed-sales/")
  ) {
    return hasPermission(user, "POS_VIEW_PENDING_ACCOUNTING");
  }

  if (
    normalizedPath === "/pos/reports" ||
    normalizedPath.startsWith("/pos/reports/")
  ) {
    return hasPermission(user, "POS_VIEW_POS_REPORTS");
  }

  if (
    normalizedPath === "/pos/settings" ||
    normalizedPath.startsWith("/pos/settings/")
  ) {
    return hasPermission(user, "POS_VIEW_POS_REPORTS");
  }

  if (normalizedPath === "/pos") {
    return allowedRoutes.some((route) => routeMatches(route, normalizedPath));
  }

  if (
    normalizedPath === "/pos-market/register" ||
    normalizedPath.startsWith("/pos-market/register/")
  ) {
    return hasPermission(user, "POS_VIEW_POS_SCREEN");
  }

  if (
    normalizedPath === "/pos-market/held-sales" ||
    normalizedPath.startsWith("/pos-market/held-sales/")
  ) {
    return hasPermission(user, "POS_RESUME_OWN_HELD_SALE");
  }

  if (
    normalizedPath === "/pos-market/amend-sales" ||
    normalizedPath.startsWith("/pos-market/amend-sales/")
  ) {
    return hasPermission(user, "POS_MARKET_AMEND_SALE");
  }

  if (
    normalizedPath === "/pos-market/sessions" ||
    normalizedPath.startsWith("/pos-market/sessions/")
  ) {
    return (
      hasPermission(user, "POS_VIEW_OWN_SESSION_REPORT") ||
      hasPermission(user, "POS_VIEW_SESSION_REPORT")
    );
  }

  if (
    normalizedPath === "/pos-market/printers" ||
    normalizedPath.startsWith("/pos-market/printers/")
  ) {
    return (
      hasPermission(user, "POS_VIEW_POS_SCREEN") ||
      hasPermission(user, "POS_PRINT_RECEIPT")
    );
  }

  if (
    normalizedPath === "/pos-market/accounting-review" ||
    normalizedPath.startsWith("/pos-market/accounting-review/") ||
    normalizedPath === "/pos-market/completed-sales" ||
    normalizedPath.startsWith("/pos-market/completed-sales/")
  ) {
    return hasPermission(user, "POS_VIEW_PENDING_ACCOUNTING");
  }

  if (
    normalizedPath === "/pos-market/reports" ||
    normalizedPath.startsWith("/pos-market/reports/")
  ) {
    return hasPermission(user, "POS_VIEW_POS_REPORTS");
  }

  if (
    normalizedPath === "/pos-market/settings" ||
    normalizedPath.startsWith("/pos-market/settings/")
  ) {
    return hasPermission(user, "POS_VIEW_POS_REPORTS");
  }

  if (
    normalizedPath === "/pos-market/receivables" ||
    normalizedPath.startsWith("/pos-market/receivables/")
  ) {
    return hasPermission(user, "POS_MARKET_VIEW_RECEIVABLES");
  }

  if (
    normalizedPath === "/pos-market/rep-statement" ||
    normalizedPath.startsWith("/pos-market/rep-statement/")
  ) {
    if (user?.role === "ADMIN" || user?.role === "MANAGER") {
      return true;
    }
    return hasPermission(user, "POS_MARKET_VIEW_RECEIVABLES");
  }

  if (
    normalizedPath === "/pos-market/stock-hub" ||
    normalizedPath.startsWith("/pos-market/stock-hub/")
  ) {
    return hasPermission(user, "POS_MARKET_MANAGE_REP_LOADS");
  }

  if (
    normalizedPath === "/pos-market/rep-loads" ||
    normalizedPath.startsWith("/pos-market/rep-loads/")
  ) {
    return hasPermission(user, "POS_MARKET_MANAGE_REP_LOADS");
  }

  if (
    normalizedPath === "/pos-market/rep-transfers" ||
    normalizedPath.startsWith("/pos-market/rep-transfers/")
  ) {
    return user?.role === "ADMIN" || user?.role === "MANAGER";
  }

  if (
    normalizedPath === "/pos-market/rep-stocktakes" ||
    normalizedPath.startsWith("/pos-market/rep-stocktakes/")
  ) {
    return hasPermission(user, "POS_MARKET_REP_STOCKTAKE");
  }

  if (
    normalizedPath === "/pos-market/my-stock" ||
    normalizedPath.startsWith("/pos-market/my-stock/")
  ) {
    return isMarketRepUser(user);
  }

  if (normalizedPath === "/pos-market") {
    return allowedRoutes.some((route) => routeMatches(route, normalizedPath));
  }

  return false;
}

export function getDefaultRoute(user: AuthUser | null | undefined) {
  return user?.defaultRoute || "/login";
}

export function isSameRoute(pathA: string, pathB: string) {
  return normalizePath(pathA) === normalizePath(pathB);
}
