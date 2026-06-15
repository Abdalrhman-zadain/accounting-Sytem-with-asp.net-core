import type { IconType } from "react-icons";
import {
  LuBookOpen as BookOpen,
  LuFileText as FileText,
  LuChartColumn as BarChart2,
  LuSettings2 as Settings2,
  LuCalendar as Calendar,
  LuShieldCheck as ShieldCheck,
  LuWalletMinimal as WalletMinimal,
  LuBadgeCheck as BadgeCheck,
  LuShoppingCart as ShoppingCart,
  LuPackage as Package,
  LuMonitor as Monitor,
  LuChartPie as ChartPie,
  LuUsers as Users,
  LuStore as Store,
  LuShoppingBasket as ShoppingBasket,
  LuPrinter as Printer,
  LuClock3 as Clock3,
  LuFileClock as FileClock,
  LuPenLine as PenLine,
  LuClipboardCheck as ClipboardCheck,
  LuArrowLeftRight as ArrowLeftRight,
  LuLayoutGrid as LayoutGrid,
  LuUndo2 as Undo2,
  LuChartNoAxesColumn as ChartNoAxesColumn,
  LuUtensils as Utensils,
  LuChefHat as ChefHat,
  LuTruck as Truck,
} from "react-icons/lu";

import type { TranslationKey } from "@/lib/i18n";

export type ErpNavChild = {
  href: string;
  labelKey: TranslationKey;
  icon?: IconType;
};

export type ErpNavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: IconType;
  children?: ErpNavChild[];
};

export type ErpNavGroup = {
  labelKey: TranslationKey;
  items: ErpNavItem[];
};

export const HIDDEN_NAV_HREFS = new Set(["/bank-reconciliations"]);

export const ERP_NAV_GROUPS: ErpNavGroup[] = [
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
          { href: "/sales-receivables?tab=rep-statement", labelKey: "salesReceivables.tab.repStatement" },
          { href: "/sales-receivables?tab=market-statement", labelKey: "salesReceivables.tab.marketStatement" },
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
          { href: "/pos-market/amend-sales", labelKey: "posMarket.workspace.amend", icon: PenLine },
          { href: "/pos-market/sessions", labelKey: "posMarket.workspace.sessions", icon: Clock3 },
          { href: "/pos-market/held-sales", labelKey: "posMarket.workspace.held", icon: FileClock },
          { href: "/pos-market/receivables", labelKey: "posMarket.workspace.receivables", icon: WalletMinimal },
          { href: "/pos-market/rep-statement", labelKey: "posMarket.workspace.repStatement", icon: FileText },
          { href: "/pos-market/my-stock", labelKey: "posMarket.workspace.myStock", icon: Package },
          { href: "/pos-market/stock-hub", labelKey: "posMarket.workspace.stockHub", icon: LayoutGrid },
          { href: "/pos-market/rep-loads", labelKey: "posMarket.workspace.repLoads", icon: Package },
          { href: "/pos-market/rep-transfers", labelKey: "posMarket.workspace.repTransfers", icon: ArrowLeftRight },
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

export const WAITER_NAV_GROUPS: ErpNavGroup[] = [
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
];
