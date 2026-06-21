import type { AuthUser } from "@/types/api";
import type { TranslationKey } from "@/lib/i18n";
import { translateKey } from "@/lib/i18n";
import {
  canAccessRoute,
  isAdminUser,
  isKitchenOnlyUser,
  isMarketRepUser,
  isWaiterOnlyUser,
  userHasPosProduct,
} from "@/lib/auth-access";
import {
  ERP_NAV_GROUPS,
  HIDDEN_NAV_HREFS,
  WAITER_NAV_GROUPS,
  type ErpNavGroup,
  type ErpNavItem,
} from "@/lib/nav/erp-nav-config";
import type { IconType } from "react-icons";

export type NavDestination = {
  href: string;
  labelKey: TranslationKey;
  groupLabelKey: TranslationKey;
  parentLabelKey?: TranslationKey;
  icon: IconType;
};

export function getVisibleNavGroups(user: AuthUser | null | undefined): ErpNavGroup[] {
  const kitchenOnly = isKitchenOnlyUser(user);
  const waiterOnly = isWaiterOnlyUser(user);

  const sourceGroups = waiterOnly
    ? WAITER_NAV_GROUPS
    : kitchenOnly
      ? []
      : ERP_NAV_GROUPS;

  return sourceGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (HIDDEN_NAV_HREFS.has(item.href)) {
            return null;
          }

          if (item.adminOnly && !isAdminUser(user)) {
            return null;
          }

          if (item.href === "/pos" && !userHasPosProduct(user, "restaurant")) {
            return null;
          }

          const visibleChildren = item.children?.filter((child) => canAccessRoute(user, child.href)) ?? [];
          const isVisible = canAccessRoute(user, item.href) || visibleChildren.length > 0;

          if (!isVisible) {
            return null;
          }

          const effectiveHref =
            item.href === "/pos" && visibleChildren.length > 0
              ? visibleChildren[0].href
              : item.href;

          return {
            ...item,
            href: effectiveHref,
            children: visibleChildren.map((child) => ({
              ...child,
              labelKey:
                child.href === "/pos-market/receivables" && isMarketRepUser(user)
                  ? ("posMarket.workspace.accountStatements" as TranslationKey)
                  : child.labelKey,
            })),
          } satisfies ErpNavItem;
        })
        .filter(Boolean) as ErpNavItem[],
    }))
    .filter((group) => group.items.length > 0);
}

export function flattenNavDestinations(groups: ErpNavGroup[]): NavDestination[] {
  const destinations: NavDestination[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          destinations.push({
            href: child.href,
            labelKey: child.labelKey,
            groupLabelKey: group.labelKey,
            parentLabelKey: item.labelKey,
            icon: child.icon ?? item.icon,
          });
        }
      } else {
        destinations.push({
          href: item.href,
          labelKey: item.labelKey,
          groupLabelKey: group.labelKey,
          icon: item.icon,
        });
      }
    }
  }

  return destinations;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getDestinationLabel(
  destination: NavDestination,
  t: (key: TranslationKey) => string,
) {
  return t(destination.labelKey);
}

export function getDestinationBreadcrumb(
  destination: NavDestination,
  t: (key: TranslationKey) => string,
) {
  const parts: string[] = [];
  if (destination.parentLabelKey) {
    parts.push(t(destination.parentLabelKey));
  }
  parts.push(t(destination.labelKey));
  return parts.join(" · ");
}

export function searchNavDestinations(
  destinations: NavDestination[],
  query: string,
): NavDestination[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return destinations;
  }

  return destinations.filter((destination) => {
    const labels = [
      translateKey(destination.labelKey, "ar"),
      translateKey(destination.labelKey, "en"),
      destination.parentLabelKey ? translateKey(destination.parentLabelKey, "ar") : "",
      destination.parentLabelKey ? translateKey(destination.parentLabelKey, "en") : "",
      translateKey(destination.groupLabelKey, "ar"),
      translateKey(destination.groupLabelKey, "en"),
    ];

    const haystack = normalizeSearchText(labels.join(" "));
    return haystack.includes(normalizedQuery);
  });
}

export function findNavDestination(
  destinations: NavDestination[],
  href: string,
): NavDestination | undefined {
  return destinations.find((destination) => destination.href === href);
}
