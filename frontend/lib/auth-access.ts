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

export function hasPermission(user: AuthUser | null | undefined, permission: PosPermissionCode) {
  return Boolean(user?.permissions?.includes(permission));
}

export function canAccessRoute(user: AuthUser | null | undefined, pathname: string) {
  if (!user) {
    return false;
  }

  const normalizedPath = normalizePath(pathname);
  const allowedRoutes = user.allowedRoutes ?? [];

  if (allowedRoutes.includes(normalizedPath)) {
    return true;
  }

  if (normalizedPath === "/pos") {
    return allowedRoutes.some((route) => route === POS_ROUTE_PREFIX || route.startsWith(`${POS_ROUTE_PREFIX}/`));
  }

  if (normalizedPath === "/pos/tables") {
    return allowedRoutes.includes("/pos/tables") && hasPermission(user, "RST_VIEW_TABLE_SCREEN" as any);
  }

  return allowedRoutes.some((route) => route !== POS_ROUTE_PREFIX && normalizedPath.startsWith(`${route}/`));
}

export function getDefaultRoute(user: AuthUser | null | undefined) {
  return user?.defaultRoute || "/login";
}
