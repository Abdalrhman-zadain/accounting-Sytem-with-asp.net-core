"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LuLogOut as LogOut,
  LuUser as User,
  LuChevronRight as ChevronRight,
  LuPanelLeftClose as PanelLeftClose,
  LuPanelLeftOpen as PanelLeftOpen,
  LuMaximize2 as Maximize2,
  LuMinimize2 as Minimize2,
  LuX as X,
} from "react-icons/lu";

import { AppLogo } from "@/components/app-logo";
import { NavFavoriteToggle, NavSidebarQuickAccess } from "@/components/nav-sidebar-quick-access";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/providers/settings-provider";
import { useKdsMode } from "@/providers/kds-mode-provider";
import { queryKeys } from "@/lib/query-keys";
import { canAccessRoute } from "@/lib/auth-access";
import { getVisibleNavGroups } from "@/lib/nav/erp-nav-utils";
import {
  getAgingReport,
  getAccountOptions,
  getAccounts,
  getAccountSubtypes,
  getBankCashAccounts,
  getBankReconciliations,
  getBankCashTransactions,
  getCreditNotes,
  getCustomers,
  getFiscalYears,
  getInventoryGoodsReceipts,
  getInventoryGoodsIssues,
  getInventoryItems,
  getInventoryAdjustments,
  getInventoryStockLedger,
  getInventoryTransfers,
  getInventoryWarehouses,
  getJournalEntryTypes,
  getSalesInvoices,
  getSuppliers,
  getSegmentDefinitions,
} from "@/lib/api";

export function SiteHeader({
  isCollapsed = false,
  onToggleCollapsed,
  isMobileNav = false,
  isDrawerOpen = false,
  onCloseDrawer,
}: {
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  isMobileNav?: boolean;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrated, logout, user, token } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useSettings();
  const { kitchenMode, toggleKitchenMode } = useKdsMode();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const isKitchenRoute = pathname?.startsWith("/pos/kitchen");

  const isItemExpanded = (href: string, isActive: boolean) => {
    if (expandedItems[href] !== undefined) {
      return expandedItems[href];
    }
    return isActive;
  };

  const toggleExpand = (href: string, isActive: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    if (isCollapsed && onToggleCollapsed) {
      onToggleCollapsed();
      setExpandedItems((prev) => ({
        ...prev,
        [href]: true,
      }));
      return;
    }
    setExpandedItems((prev) => ({
      ...prev,
      [href]: prev[href] !== undefined ? !prev[href] : !isActive,
    }));
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginPage = pathname === "/login" || pathname === "/register";
  const currentLocation = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const effectiveCollapsed = isMobileNav ? false : isCollapsed;

  const handleNavClick = () => {
    if (isMobileNav) {
      onCloseDrawer?.();
    }
  };

  if (!mounted) {
    if (isLoginPage) {
      return (
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-gray-900">
              <AppLogo height={28} priority />
              {t("app.title")}
            </div>
          </div>
        </header>
      );
    }
    return (
      <aside
        className={cn(
          "fixed ltr:left-0 rtl:right-0 top-0 z-40 flex h-screen min-h-full flex-col ltr:border-r rtl:border-l border-slate-200 bg-white",
          effectiveCollapsed ? "w-20 min-w-[5rem]" : isMobileNav ? "w-72 max-w-[85vw]" : "w-[340px] min-w-[340px]",
        )}
      >
        <div className={cn("flex items-center border-b border-slate-200 px-5 py-3", effectiveCollapsed ? "justify-center" : "gap-3")}>
          <AppLogo height={effectiveCollapsed ? 36 : 40} priority className="shrink-0" />
          <div className={cn(effectiveCollapsed && "sr-only")}>
            <div className="text-base font-black tracking-tight text-gray-900">{t("app.title")}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{t("app.subtitle")}</div>
          </div>
        </div>
        <div className="flex-1 bg-white" />
      </aside>
    );
  }

  if (isLoginPage) {
    return (
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-gray-900">
            <AppLogo height={28} priority />
            {t("app.title")}
          </Link>
        </div>
      </header>
    );
  }

  const prefetchForHref = (href: string) => {
    if (!token) return;

    const prefetchPostingAccounts = () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
        staleTime: 5 * 60 * 1000,
      });

    if (href.startsWith("/accounts")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.accounts(token, { parentAccountId: null }),
        queryFn: () => getAccounts({ parentAccountId: null }, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/journal-entries")) {
      void prefetchPostingAccounts();
      void queryClient.prefetchQuery({
        queryKey: queryKeys.journalEntryTypes(token),
        queryFn: () => getJournalEntryTypes(token),
        staleTime: 10 * 60 * 1000,
      });
      return;
    }

    if (href.startsWith("/bank-cash-accounts")) {
      void prefetchPostingAccounts();
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashAccounts(token),
        queryFn: () => getBankCashAccounts({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
        queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashTransactions(token, { kind: "RECEIPT" }),
        queryFn: () => getBankCashTransactions({ kind: "RECEIPT" }, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/bank-reconciliations")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
        queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankReconciliations(token),
        queryFn: () => getBankReconciliations({}, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/sales-receivables")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.salesCustomers(token, {}),
        queryFn: () => getCustomers({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.salesInvoices(token, {}),
        queryFn: () => getSalesInvoices({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.salesCreditNotes(token, {}),
        queryFn: () => getCreditNotes({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashTransactions(token, { kind: "RECEIPT", status: "POSTED" }),
        queryFn: () => getBankCashTransactions({ kind: "RECEIPT", status: "POSTED" }, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.salesAging(token),
        queryFn: () => getAgingReport(undefined, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/pos")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryItems(token, {
          isActive: "true",
          page: 1,
          limit: 100,
        }),
        queryFn: () =>
          getInventoryItems({ isActive: "true", page: 1, limit: 100 }, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryWarehouses(token, { isActive: "true" }),
        queryFn: () => getInventoryWarehouses({ isActive: "true" }, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
        queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/purchases")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.purchaseSuppliers(token, {}),
        queryFn: () => getSuppliers({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "LIABILITY", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "LIABILITY" }, token),
        staleTime: 5 * 60 * 1000,
      });
      return;
    }

    if (href.startsWith("/inventory")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryItems(token, {}),
        queryFn: () => getInventoryItems({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryWarehouses(token, {}),
        queryFn: () => getInventoryWarehouses({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryGoodsReceipts(token, {}),
        queryFn: () => getInventoryGoodsReceipts({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryGoodsIssues(token, {}),
        queryFn: () => getInventoryGoodsIssues({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryTransfers(token, {}),
        queryFn: () => getInventoryTransfers({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryAdjustments(token, {}),
        queryFn: () => getInventoryAdjustments({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryStockLedger(token, {}),
        queryFn: () => getInventoryStockLedger({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "ASSET", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "ASSET" }, token),
        staleTime: 5 * 60 * 1000,
      });
      return;
    }

    if (href.startsWith("/general-ledger")) {
      void prefetchPostingAccounts();
      return;
    }

    if (href.startsWith("/master-data")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.segmentDefinitions(token),
        queryFn: () => getSegmentDefinitions(token),
        staleTime: 10 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.accountSubtypes(token),
        queryFn: () => getAccountSubtypes(token),
        staleTime: 10 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.journalEntryTypes(token),
        queryFn: () => getJournalEntryTypes(token),
        staleTime: 10 * 60 * 1000,
      });
      return;
    }

    if (href.startsWith("/fiscal")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.fiscalYears(token),
        queryFn: () => getFiscalYears(token),
        staleTime: 30_000,
      });
      return;
    }
  };

  const visibleNavGroups = getVisibleNavGroups(user);

  const matchesHref = (targetHref: string) => {
    const target = new URL(targetHref, "http://localhost");
    const current = new URL(currentLocation || "/", "http://localhost");

    if (target.pathname !== current.pathname) {
      return false;
    }

    for (const [key, value] of target.searchParams.entries()) {
      if (current.searchParams.get(key) !== value) {
        return false;
      }
    }

    return true;
  };

  return (
    <>
      {isMobileNav && isDrawerOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] nav-desktop:hidden"
          onClick={() => onCloseDrawer?.()}
          aria-label="Close navigation menu"
        />
      ) : null}

      <aside
        className={cn(
          "fixed ltr:left-0 rtl:right-0 top-0 z-40 flex h-screen min-h-full flex-col ltr:border-r rtl:border-l border-slate-200 bg-white shadow-sm transition-[width,transform] duration-300 motion-reduce:transition-none",
          effectiveCollapsed ? "w-20 min-w-[5rem]" : isMobileNav ? "w-72 max-w-[85vw]" : "w-[340px] min-w-[340px]",
          isMobileNav && !isDrawerOpen && "ltr:-translate-x-full rtl:translate-x-full",
          isMobileNav && isDrawerOpen && "translate-x-0",
        )}
      >
      <div className={cn("flex items-center border-b border-slate-200 px-5 py-3", effectiveCollapsed ? "justify-center" : "justify-between gap-3")}>
        <div className={cn("flex min-w-0 items-center", effectiveCollapsed ? "justify-center" : "gap-3")}>
          <AppLogo height={effectiveCollapsed ? 36 : 40} priority className="shrink-0" />
          <div className={cn(effectiveCollapsed && "sr-only")}>
          <div className="text-base font-black tracking-tight text-gray-900">{t("app.title")}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{t("app.subtitle")}</div>
        </div>
        </div>
        {isMobileNav ? (
          <button
            type="button"
            onClick={() => onCloseDrawer?.()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <NavSidebarQuickAccess
        effectiveCollapsed={effectiveCollapsed}
        isActiveHref={(href) => matchesHref(href)}
        onNavigate={handleNavClick}
      />

      <div className="space-y-2 px-3">
        <button
          type="button"
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className={cn(
            "flex h-10 w-full items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700",
            effectiveCollapsed ? "justify-center" : "justify-between",
          )}
          aria-label={t("language.toggle.aria")}
          title={t("language.toggle.aria")}
        >
          <span className={cn(effectiveCollapsed && "sr-only")}>
            {language === "ar" ? t("language.arabicShort") : t("language.englishShort")}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-black tracking-widest text-gray-600",
              effectiveCollapsed && "sr-only",
            )}
          >
            {language === "ar" ? "RTL" : "LTR"}
          </span>
          <span className={cn("font-black tracking-widest text-gray-600", !effectiveCollapsed && "sr-only")}>
            {language === "ar" ? "AR" : "EN"}
          </span>
        </button>

        {!isMobileNav ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "flex h-10 w-full items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700",
            effectiveCollapsed ? "justify-center" : "justify-between",
          )}
          aria-label={effectiveCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          {effectiveCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span className={cn(effectiveCollapsed && "sr-only")}>{effectiveCollapsed ? "Open" : "Close"}</span>
        </button>
        ) : null}

        {isKitchenRoute && canAccessRoute(user, "/pos/kitchen") ? (
          <button
            type="button"
            onClick={toggleKitchenMode}
            className={cn(
              "flex w-full items-center rounded-lg border px-3 py-2.5 text-xs font-bold transition-all",
              effectiveCollapsed ? "justify-center" : "justify-between gap-2",
              kitchenMode
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
            )}
            title={kitchenMode ? t("pos.kitchen.exitKitchenMode") : t("pos.kitchen.kitchenMode")}
          >
            {kitchenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className={cn(effectiveCollapsed && "sr-only")}>
              {kitchenMode ? t("pos.kitchen.exitKitchenMode") : t("pos.kitchen.kitchenMode")}
            </span>
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleNavGroups.map((group, groupIndex) => (
          <div key={group.labelKey}>
            <span
              className={cn(
                "mb-2 block px-4 text-xs font-bold text-slate-500",
                groupIndex > 0 ? "mt-6" : "mt-0",
                effectiveCollapsed && "sr-only",
              )}
            >
              {t(group.labelKey)}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  matchesHref(item.href) ||
                  pathname === item.href.split("?")[0] ||
                  pathname.startsWith(item.href.split("?")[0] + "/") ||
                  (item.labelKey === "nav.item.pos" && pathname.startsWith("/pos"));
                return (
                  <div key={item.href}>
                    {item.children && item.children.length > 0 ? (
                      <button
                        onClick={(e) => toggleExpand(item.href, isActive, e)}
                        title={!effectiveCollapsed ? undefined : (t(item.labelKey) as string)}
                        className={cn(
                          "group flex h-11 w-full items-center gap-3 rounded-xl px-4 text-[14px] font-medium transition-colors duration-200",
                          effectiveCollapsed && "justify-center px-0",
                          isActive
                            ? "border border-emerald-100 bg-emerald-50 text-emerald-700 ltr:border-l-[3px] ltr:border-l-emerald-500 rtl:border-r-[3px] rtl:border-r-emerald-500"
                            : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        <Icon className={cn("h-5 w-5 shrink-0 transition-colors duration-200", isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600")} />
                        <span className={cn("flex-1 truncate text-start", effectiveCollapsed && "sr-only")}>{t(item.labelKey)}</span>
                        {!effectiveCollapsed && (
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200",
                              isActive ? "text-emerald-500" : "text-slate-400",
                              isItemExpanded(item.href, isActive) ? "rotate-90" : "ltr:rotate-0 rtl:rotate-180"
                            )} 
                          />
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={handleNavClick}
                        title={!effectiveCollapsed ? undefined : (t(item.labelKey) as string)}
                        className={cn(
                          "group flex h-11 items-center gap-3 rounded-xl px-4 text-[14px] font-medium transition-colors duration-200",
                          effectiveCollapsed && "justify-center px-0",
                          isActive
                            ? "border border-emerald-100 bg-emerald-50 text-emerald-700 ltr:border-l-[3px] ltr:border-l-emerald-500 rtl:border-r-[3px] rtl:border-r-emerald-500"
                            : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        <Icon className={cn("h-5 w-5 shrink-0 transition-colors duration-200", isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600")} />
                        <span className={cn("flex-1 truncate text-start", effectiveCollapsed && "sr-only")}>{t(item.labelKey)}</span>
                        <NavFavoriteToggle href={item.href} effectiveCollapsed={effectiveCollapsed} />
                      </Link>
                    )}

                    {item.children && item.children.length > 0 && isItemExpanded(item.href, isActive) && !effectiveCollapsed && (
                      <div className="mt-1 space-y-0.5 pe-2 ps-8">
                        {item.children.map((child) => {
                          const childPath = child.href.split("?")[0];
                          const isChildActive = child.href.includes("?")
                            ? matchesHref(child.href)
                            : pathname === childPath || pathname.startsWith(childPath + "/");
                          const ChildIcon = child.icon;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={handleNavClick}
                              onMouseEnter={() => prefetchForHref(child.href)}
                              className={cn(
                                "group flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-200",
                                isChildActive
                                  ? "border border-emerald-100 bg-emerald-50 text-emerald-700 ltr:border-l-[3px] ltr:border-l-emerald-500 rtl:border-r-[3px] rtl:border-r-emerald-500"
                                  : "border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                              )}
                            >
                              {ChildIcon ? <ChildIcon className={cn("h-4 w-4 shrink-0", isChildActive ? "text-emerald-600" : "text-slate-400")} /> : null}
                              <span className="flex-1 truncate">{t(child.labelKey)}</span>
                              <NavFavoriteToggle href={child.href} effectiveCollapsed={effectiveCollapsed} />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isHydrated && isAuthenticated && (
        <div className="border-t border-slate-200 p-3">
          <div className={cn("group flex items-center gap-3 rounded-xl p-2.5 transition-colors duration-200 hover:bg-slate-50", effectiveCollapsed && "justify-center")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              <User size={18} />
            </div>
            <div className={cn("min-w-0 flex-1", effectiveCollapsed && "sr-only")}>
              <div className="truncate text-sm font-semibold text-slate-900">{user?.name || user?.username || "User"}</div>
              <div className="truncate text-xs text-slate-500">{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className={cn(
                "shrink-0 rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 ltr:rotate-0 rtl:rotate-180",
                effectiveCollapsed && "sr-only",
              )}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
