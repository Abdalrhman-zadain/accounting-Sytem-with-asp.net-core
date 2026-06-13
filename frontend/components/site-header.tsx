"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LuBookOpen as BookOpen,
  LuFileText as FileText,
  LuChartColumn as BarChart2,
  LuSettings2 as Settings2,
  LuCalendar as Calendar,
  LuShieldCheck as ShieldCheck,
  LuLogOut as LogOut,
  LuUser as User,
  LuChevronRight as ChevronRight,
  LuPanelLeftClose as PanelLeftClose,
  LuPanelLeftOpen as PanelLeftOpen,
  LuWalletMinimal as WalletMinimal,
  LuBadgeCheck as BadgeCheck,
  LuShoppingCart as ShoppingCart,
  LuPackage as Package,
  LuMonitor as Monitor,
  // LuBadgeDollarSign as BadgeDollarSign,
  // LuBuilding2 as Building2,
  LuChartPie as ChartPie,
  LuUsers as Users,
  LuStore as Store,
  LuShoppingBasket as ShoppingBasket,
  LuPrinter as Printer,
  LuClock3 as Clock3,
  LuFileClock as FileClock,
  LuClipboardCheck as ClipboardCheck,
  LuUndo2 as Undo2,
  LuChartNoAxesColumn as ChartNoAxesColumn,
  LuUtensils as Utensils,
  LuChefHat as ChefHat,
  LuTruck as Truck,
  LuMaximize2 as Maximize2,
  LuMinimize2 as Minimize2,
  LuX as X,
} from "react-icons/lu";

import { AppLogo } from "@/components/app-logo";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useTranslation, TranslationKey } from "@/lib/i18n";
import { useSettings } from "@/providers/settings-provider";
import { useKdsMode } from "@/providers/kds-mode-provider";
import { queryKeys } from "@/lib/query-keys";
import {
  canAccessRoute,
  isKitchenOnlyUser,
  isMarketRepUser,
  isWaiterOnlyUser,
  userHasPosProduct,
} from "@/lib/auth-access";
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

type NavGroup = {
  labelKey: TranslationKey;
  items: Array<{
    href: string;
    labelKey: TranslationKey;
    icon: any;
    children?: Array<{
      href: string;
      labelKey: TranslationKey;
      icon?: any;
    }>;
  }>;
};

const HIDDEN_NAV_HREFS = new Set(["/bank-reconciliations"]);

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.group.ledger",
    items: [
      { href: "/accounts", labelKey: "nav.item.chartOfAccounts", icon: BookOpen },
      { href: "/bank-cash-accounts", labelKey: "nav.item.bankCashAccounts", icon: WalletMinimal },
      { href: "/bank-reconciliations", labelKey: "nav.item.bankReconciliations", icon: BadgeCheck },
      {
        href: "/sales-receivables",
        labelKey: "nav.item.salesReceivables",
        icon: Users,
        children: [
          { href: "/sales-receivables?tab=customers", labelKey: "salesReceivables.tab.customers" },
          { href: "/sales-receivables?tab=sales-reps", labelKey: "salesReceivables.tab.salesReps" },
          { href: "/sales-receivables?tab=quotations", labelKey: "salesReceivables.tab.quotations" },
          { href: "/sales-receivables?tab=orders", labelKey: "salesReceivables.tab.orders" },
          { href: "/sales-receivables?tab=invoices", labelKey: "salesReceivables.tab.invoices" },
          { href: "/sales-receivables?tab=receipts", labelKey: "salesReceivables.tab.receipts" },
          { href: "/sales-receivables?tab=credit-notes", labelKey: "salesReceivables.tab.creditNotes" },
          { href: "/sales-receivables?tab=aging", labelKey: "salesReceivables.tab.aging" },
        ],
      },
      {
        href: "/pos",
        labelKey: "nav.item.pos",
        icon: Store,
        children: [
          { href: "/pos/register", labelKey: "pos.workspace.sales", icon: Monitor },
          { href: "/pos/tables", labelKey: "pos.workspace.tables", icon: Utensils },
          { href: "/pos/delivery", labelKey: "pos.workspace.delivery", icon: Truck },
          { href: "/pos/sessions", labelKey: "pos.workspace.sessions", icon: Clock3 },
          { href: "/pos/held-sales", labelKey: "pos.workspace.held", icon: FileClock },
          { href: "/pos/accounting-review", labelKey: "pos.workspace.review", icon: ClipboardCheck },
          { href: "/pos/returns", labelKey: "pos.workspace.returns", icon: Undo2 },
          { href: "/pos/printers", labelKey: "pos.workspace.printers", icon: Printer },
          { href: "/pos/reports", labelKey: "pos.workspace.reports", icon: ChartNoAxesColumn },
          { href: "/pos/settings", labelKey: "pos.workspace.settings", icon: Settings2 },
        ],
      },
      {
        href: "/pos-market",
        labelKey: "nav.item.posMarket",
        icon: ShoppingBasket,
        children: [
          { href: "/pos-market/register", labelKey: "posMarket.workspace.register", icon: Monitor },
          { href: "/pos-market/sessions", labelKey: "posMarket.workspace.sessions", icon: Clock3 },
          { href: "/pos-market/held-sales", labelKey: "posMarket.workspace.held", icon: FileClock },
          { href: "/pos-market/receivables", labelKey: "posMarket.workspace.receivables", icon: WalletMinimal },
          { href: "/pos-market/my-stock", labelKey: "posMarket.workspace.myStock", icon: Package },
          { href: "/pos-market/rep-loads", labelKey: "posMarket.workspace.repLoads", icon: Package },
          { href: "/pos-market/rep-stocktakes", labelKey: "posMarket.workspace.repStocktakes", icon: ClipboardCheck },
          { href: "/pos-market/accounting-review", labelKey: "posMarket.workspace.review", icon: ClipboardCheck },
          { href: "/pos-market/returns", labelKey: "posMarket.workspace.returns", icon: Undo2 },
          { href: "/pos-market/printers", labelKey: "posMarket.workspace.printers", icon: Printer },
          { href: "/pos-market/reports", labelKey: "posMarket.workspace.reports", icon: ChartNoAxesColumn },
          { href: "/pos-market/settings", labelKey: "posMarket.workspace.settings", icon: Settings2 },
        ],
      },
      {
        href: "/purchases",
        labelKey: "nav.item.purchases",
        icon: ShoppingCart,
        children: [
          { href: "/purchases?tab=suppliers", labelKey: "purchases.workspace.suppliers" },
          { href: "/purchases?tab=requests", labelKey: "purchases.workspace.requests" },
          { href: "/purchases?tab=orders", labelKey: "purchases.workspace.orders" },
          { href: "/purchases?tab=invoices", labelKey: "purchases.workspace.invoices" },
          { href: "/purchases?tab=payments", labelKey: "purchases.workspace.payments" },
          { href: "/purchases?tab=notes", labelKey: "purchases.workspace.debitNotes" },
        ],
      },
      { href: "/inventory", labelKey: "nav.item.inventory", icon: Package },
      // { href: "/payroll", labelKey: "nav.item.payroll", icon: BadgeDollarSign },
      // { href: "/fixed-assets", labelKey: "nav.item.fixedAssets", icon: Building2 },
      {
        href: "/reporting?tab=generalLedger",
        labelKey: "nav.item.reporting",
        icon: ChartPie,
        children: [
          { href: "/reporting?tab=generalLedger", labelKey: "reporting.tab.generalLedger" },
          { href: "/reporting?tab=activity", labelKey: "reporting.tab.activity" },
          { href: "/reporting?tab=trialBalance", labelKey: "reporting.tab.trialBalance" },
          { href: "/reporting?tab=balanceSheet", labelKey: "reporting.tab.balanceSheet" },
          { href: "/reporting?tab=profitLoss", labelKey: "reporting.tab.profitLoss" },
          { href: "/reporting?tab=cashMovement", labelKey: "reporting.tab.cashMovement" },
          { href: "/reporting?tab=audit", labelKey: "reporting.tab.audit" },
        ],
      },
      { href: "/journal-entries", labelKey: "nav.item.journalEntries", icon: FileText },
      { href: "/general-ledger", labelKey: "nav.item.generalLedger", icon: BarChart2 },
    ],
  },
  {
    labelKey: "nav.group.setup",
    items: [
      { href: "/master-data", labelKey: "nav.item.masterData", icon: Settings2 },
      { href: "/fiscal", labelKey: "nav.item.fiscalPeriods", icon: Calendar },
    ],
  },
  {
    labelKey: "nav.group.control",
    items: [{ href: "/audit", labelKey: "nav.item.auditTrail", icon: ShieldCheck }],
  },
  {
    labelKey: "nav.group.system",
    items: [{ href: "/settings", labelKey: "nav.item.settings", icon: Settings2 }],
  },
];

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
          "fixed ltr:left-0 rtl:right-0 top-0 z-40 flex h-full flex-col ltr:border-r rtl:border-l border-gray-200 bg-white",
          effectiveCollapsed ? "w-20" : isMobileNav ? "w-72 max-w-[85vw]" : "w-60",
        )}
      >
        <div className={cn("flex items-center border-b border-gray-200 px-6 py-2.5", effectiveCollapsed ? "justify-center" : "gap-3")}>
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

  const kitchenOnly = isKitchenOnlyUser(user);
  const waiterOnly = isWaiterOnlyUser(user);

  const visibleNavGroups = (waiterOnly
    ? [
        {
          labelKey: "nav.item.pos",
          items: [
            {
              href: "/pos/waiter/tables",
              labelKey: "pos.workspace.tables",
              icon: Utensils,
            },
            {
              href: "/pos/waiter/orders",
              labelKey: "pos.workspace.waiterOrders",
              icon: ChefHat,
            },
          ],
        },
      ]
    : kitchenOnly
      ? []
      : navGroups
  )
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (HIDDEN_NAV_HREFS.has(item.href)) {
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
                  ? "posMarket.workspace.accountStatements"
                  : child.labelKey,
            })),
          };
        })
        .filter(Boolean) as NavGroup["items"],
    }))
    .filter((group) => group.items.length > 0);

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
          "fixed ltr:left-0 rtl:right-0 top-0 z-40 flex h-full flex-col ltr:border-r rtl:border-l border-gray-200 bg-white transition-transform duration-300 motion-reduce:transition-none",
          effectiveCollapsed ? "w-20" : isMobileNav ? "w-72 max-w-[85vw]" : "w-60",
          isMobileNav && !isDrawerOpen && "ltr:-translate-x-full rtl:translate-x-full",
          isMobileNav && isDrawerOpen && "translate-x-0",
        )}
      >
      <div className={cn("flex items-center border-b border-gray-200 px-6 py-2.5", effectiveCollapsed ? "justify-center" : "justify-between gap-3")}>
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

      <div className="space-y-2 px-3 pt-3">
        <button
          type="button"
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className={cn(
            "flex w-full items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700",
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
            "flex w-full items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700",
            effectiveCollapsed ? "justify-center" : "justify-between",
          )}
          aria-label={effectiveCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          {effectiveCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
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

      <nav className="flex-1 overflow-y-auto space-y-10 px-4 py-8">
        {visibleNavGroups.map((group) => (
          <div key={group.labelKey}>
            <span className={cn("mb-4 block px-3 text-[10px] font-black uppercase tracking-[0.25em] text-gray-400", effectiveCollapsed && "sr-only")}>
              {t(group.labelKey)}
            </span>
            <div className="space-y-1">
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
                          "w-full group flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                          effectiveCollapsed && "justify-center",
                          isActive
                            ? "border border-gray-200 bg-gray-100 text-gray-900 shadow-sm"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600")} />
                        <span className={cn("flex-1 truncate text-left rtl:text-right", effectiveCollapsed && "sr-only")}>{t(item.labelKey)}</span>
                        {!effectiveCollapsed && (
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 text-gray-400 transition-transform", 
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
                          "group flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                          effectiveCollapsed && "justify-center",
                          isActive
                            ? "border border-gray-200 bg-gray-100 text-gray-900 shadow-sm"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600")} />
                        <span className={cn("flex-1 truncate text-left rtl:text-right", effectiveCollapsed && "sr-only")}>{t(item.labelKey)}</span>
                      </Link>
                    )}

                    {item.children && item.children.length > 0 && isItemExpanded(item.href, isActive) && !effectiveCollapsed && (
                      <div className="mt-2 space-y-1 pe-3 ps-9">
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
                                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                                isChildActive
                                  ? "bg-gray-900 text-white shadow-sm"
                                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                              )}
                            >
                              {ChildIcon ? <ChildIcon className="h-3.5 w-3.5 shrink-0" /> : null}
                              {t(child.labelKey)}
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
        <div className="border-t border-gray-200 p-3">
          <div className={cn("group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-gray-50", effectiveCollapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-500">
              <User size={16} />
            </div>
            <div className={cn("min-w-0 flex-1", effectiveCollapsed && "sr-only")}>
              <div className="truncate text-xs font-bold text-gray-900">{user?.name || user?.username || "User"}</div>
              <div className="truncate text-[10px] text-gray-500">{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className={cn(
                "shrink-0 rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 ltr:rotate-0 rtl:rotate-180",
                effectiveCollapsed && "sr-only",
              )}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
