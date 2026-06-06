import type { AuthUser, PosPermissionCode } from "@/types/api";

const POS_ROUTE_PREFIX = "/pos";

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
  return normalizedPath === allowedRoute || normalizedPath.startsWith(`${allowedRoute}/`);
}

export function hasPermission(user: AuthUser | null | undefined, permission: PosPermissionCode) {
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

export function canAccessRoute(user: AuthUser | null | undefined, pathname: string) {
  if (!user) {
    return false;
  }

  const normalizedPath = normalizePath(pathname);
  const allowedRoutes = user.allowedRoutes ?? [];

  if (normalizedPath === "/pos/returns" || normalizedPath.startsWith("/pos/returns/")) {
    return isCashierPosUser(user) && hasPermission(user, "POS_VIEW_COMPLETED_SALES");
  }

  if (normalizedPath === "/pos/kitchen" || normalizedPath.startsWith("/pos/kitchen/")) {
    return (
      (isCashierPosUser(user) || isKitchenOnlyUser(user)) &&
      hasPermission(user, "RST_VIEW_KITCHEN_SCREEN")
    );
  }

  if (allowedRoutes.some((route) => routeMatches(route, normalizedPath))) {
    return true;
  }

  if (
    normalizedPath === "/pos/waiter/tables" ||
    normalizedPath.startsWith("/pos/waiter/tables/") ||
    normalizedPath === "/pos/waiter/order" ||
    normalizedPath.startsWith("/pos/waiter/order/")
  ) {
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

  return false;
}

export function getDefaultRoute(user: AuthUser | null | undefined) {
  return user?.defaultRoute || "/login";
}
