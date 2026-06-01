"use client";

import { useState, useMemo } from "react";
import { Card, Modal, SidePanel } from "@/components/ui";
import { Input } from "@/components/ui/forms";
import { DetailTile } from "@/features/pos/pos-detail-cards";
import { cn } from "@/lib/utils";
import type {
  DeliveryCompany,
  DeliveryDriver,
  DeliveryStatus,
  JournalEntry,
  PosOrderType,
  PosSale,
  PosSessionReport,
  PosTable,
  PosSession,
} from "@/types/api";
import {
  LuSearch,
  LuCalendar,
  LuBuilding,
  LuUser,
  LuCreditCard,
  LuCheck,
  LuX,
  LuCircleAlert,
  LuCalculator,
  LuFileText,
  LuChevronLeft,
  LuChevronRight,
  LuPrinter,
  LuRefreshCw,
  LuEye,
  LuTruck,
  LuPercent,
  LuTag,
  LuFilterX,
  LuDollarSign,
} from "react-icons/lu";

type ReviewTab = "overview" | "invoices" | "cash" | "inventory" | "journal";

type ReviewSessionGroup = {
  sales: PosSale[];
  sessionId: string | null;
  sessionNumber: string;
  warehouseName: string;
};

type PosReviewWorkspaceProps = {
  sessions?: PosSession[];
  onRejectSessionReview?: (sessionId: string) => void;
  correctionDeliveryCompanyId: string;
  correctionDeliveryFee: string;
  correctionDriverId: string;
  correctionOrderType: PosOrderType;
  correctionReason: string;
  correctionServiceCharge: string;
  correctionTableId: string;
  deliveryCompanies: DeliveryCompany[];
  deliveryDrivers: DeliveryDriver[];
  isCorrectOrderTypeOpen: boolean;
  journalEntries: JournalEntry[];
  onApproveReview: (saleId: string) => void;
  onApproveSessionReview: (sessionId: string) => void;
  onAssignDriver: (saleId: string, driverId: string | null) => void;
  onCloseCorrectionModal: () => void;
  onCorrectionDeliveryCompanyIdChange: (value: string) => void;
  onCorrectionDeliveryFeeChange: (value: string) => void;
  onCorrectionDriverIdChange: (value: string) => void;
  onCorrectionOrderTypeChange: (value: PosOrderType) => void;
  onCorrectionReasonChange: (value: string) => void;
  onCorrectionServiceChargeChange: (value: string) => void;
  onCorrectionTableIdChange: (value: string) => void;
  onOpenCorrectionModal: (sale: PosSale) => void;
  onRejectReview: (saleId: string) => void;
  onReprintReceipt: (saleId: string) => void;
  onReverseReview: (saleId: string) => void;
  onReviewSessionChange: (sessionId: string) => void;
  onReviewTabChange: (tab: "overview" | "cash" | "inventory" | "journal") => void;
  onSaveCorrection: () => void;
  onUpdateDeliveryStatus: (saleId: string, status: DeliveryStatus) => void;
  report: PosSessionReport | null;
  restaurantTables: PosTable[];
  reviewQueryDataLength: number;
  reviewSessionGroups: ReviewSessionGroup[];
  reviewTab: "overview" | "cash" | "inventory" | "journal";
  selectedCorrectionSale: PosSale | null;
  selectedReviewGroup: ReviewSessionGroup | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  savingCorrection: boolean;
};

export function PosReviewWorkspace({
  sessions = [],
  onRejectSessionReview,
  correctionDeliveryCompanyId,
  correctionDeliveryFee,
  correctionDriverId,
  correctionOrderType,
  correctionReason,
  correctionServiceCharge,
  correctionTableId,
  deliveryCompanies,
  deliveryDrivers,
  isCorrectOrderTypeOpen,
  journalEntries,
  onApproveReview,
  onApproveSessionReview,
  onAssignDriver,
  onCloseCorrectionModal,
  onCorrectionDeliveryCompanyIdChange,
  onCorrectionDeliveryFeeChange,
  onCorrectionDriverIdChange,
  onCorrectionOrderTypeChange,
  onCorrectionReasonChange,
  onCorrectionServiceChargeChange,
  onCorrectionTableIdChange,
  onOpenCorrectionModal,
  onRejectReview,
  onReprintReceipt,
  onReverseReview,
  onReviewSessionChange,
  onReviewTabChange,
  onSaveCorrection,
  onUpdateDeliveryStatus,
  report,
  restaurantTables,
  reviewQueryDataLength,
  reviewSessionGroups,
  reviewTab,
  selectedCorrectionSale,
  selectedReviewGroup,
  t,
  savingCorrection,
}: PosReviewWorkspaceProps) {
  // Local filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Side Panel States
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PosSession | null>(null);
  const [activeTab, setActiveTab] = useState<ReviewTab>("overview");
  const [activeInvoiceDetail, setActiveInvoiceDetail] = useState<PosSale | null>(null);

  // Translation helpers
  const getTranslation = (key: string, fallback: string) => {
    try {
      const val = t(key);
      return val && val !== key ? val : fallback;
    } catch {
      return fallback;
    }
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Populate dynamic filter options from the session dataset
  const branchesList = useMemo(() => {
    const list = new Set<string>();
    sessions.forEach((s) => {
      if (s.branchName) list.add(s.branchName);
    });
    return Array.from(list);
  }, [sessions]);

  const cashiersList = useMemo(() => {
    const list = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.cashierUser) {
        list.set(s.cashierUser.id, s.cashierUser.name || s.cashierUser.email);
      }
    });
    return Array.from(list.entries());
  }, [sessions]);

  // Apply filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Date range filter
      if (startDate) {
        const opened = new Date(s.openedAt).getTime();
        const start = new Date(startDate).getTime();
        if (opened < start) return false;
      }
      if (endDate) {
        const opened = new Date(s.openedAt).getTime();
        const end = new Date(endDate + "T23:59:59").getTime();
        if (opened > end) return false;
      }

      // Branch filter
      if (selectedBranch && s.branchName !== selectedBranch) return false;

      // Cashier filter
      if (selectedCashier && s.cashierUser?.id !== selectedCashier) return false;

      // Status filter
      if (selectedStatus && s.accountingStatus !== selectedStatus) return false;

      // Payment method filter
      if (selectedPaymentMethod) {
        if (selectedPaymentMethod === "CASH" && Number(s.cashSales || 0) === 0) return false;
        if (selectedPaymentMethod === "CARD" && Number(s.cardSales || 0) === 0) return false;
        if (selectedPaymentMethod === "DELIVERY" && Number(s.deliveryCompanySales || 0) === 0) return false;
      }

      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const num = s.sessionNumber.toLowerCase();
        const branch = (s.branchName || "").toLowerCase();
        const cashier = (s.cashierUser?.name || s.cashierUser?.email || "").toLowerCase();
        const terminal = (s.terminalName || "").toLowerCase();
        if (
          !num.includes(query) &&
          !branch.includes(query) &&
          !cashier.includes(query) &&
          !terminal.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    sessions,
    startDate,
    endDate,
    selectedBranch,
    selectedCashier,
    selectedStatus,
    selectedPaymentMethod,
    searchQuery,
  ]);

  // Compute live KPIs from current filtered set
  const summary = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let deliverySales = 0;
    let tax = 0;
    let discounts = 0;
    let cashDifference = 0;

    filteredSessions.forEach((s) => {
      totalSales += Number(s.totalSales || 0);
      cashSales += Number(s.cashSales || 0);
      cardSales += Number(s.cardSales || 0);
      deliverySales += Number(s.deliveryCompanySales || 0);
      tax += Number(s.taxAmount || 0);
      discounts += Number(s.discountAmount || 0);
      cashDifference += Number(s.difference || 0);
    });

    return {
      totalSales: totalSales.toFixed(2),
      cashSales: cashSales.toFixed(2),
      cardSales: cardSales.toFixed(2),
      deliverySales: deliverySales.toFixed(2),
      tax: tax.toFixed(2),
      discounts: discounts.toFixed(2),
      cashDifference: cashDifference.toFixed(2),
    };
  }, [filteredSessions]);

  // Handle Review action click (opens drawer)
  const handleReviewClick = (session: PosSession) => {
    setSelectedSession(session);
    onReviewSessionChange(session.id);
    setIsDetailDrawerOpen(true);
    setActiveTab("overview");
  };

  // Reset all filters
  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedBranch("");
    setSelectedCashier("");
    setSelectedStatus("");
    setSelectedPaymentMethod("");
    setSearchQuery("");
  };

  // Compile individual invoices inside the drawer
  const invoiceList = useMemo(() => {
    if (!report) return [];

    const list: Array<{
      id: string;
      reference: string;
      date: string;
      customer: string;
      orderType: PosOrderType;
      total: string;
      status: string;
      type: "sale" | "return";
      raw: any;
    }> = [];

    (report.sales || []).forEach((s) => {
      list.push({
        id: s.id,
        reference: s.reference,
        date: s.invoiceDate,
        customer: s.customer?.name || "عميل عام",
        orderType: s.orderType || "TAKEAWAY",
        total: s.totalAmount,
        status: s.posAccountingStatus || "PENDING_REVIEW",
        type: "sale",
        raw: s,
      });
    });

    (report.returns || []).forEach((r) => {
      list.push({
        id: r.id,
        reference: r.reference,
        date: r.returnDate || r.createdAt,
        customer: "عميل عام",
        orderType: "TAKEAWAY",
        total: `-${r.totalAmount}`,
        status: r.accountingStatus || "PENDING_REVIEW",
        type: "return",
        raw: r,
      });
    });

    return list;
  }, [report]);

  // Compute inventory rows for drawer inventory tab
  const inventoryRows = useMemo(() => {
    if (!report) return [];
    return (report.sales || []).flatMap((sale) =>
      sale.lines
        .filter((line) => line.item?.trackInventory)
        .map((line) => ({
          itemName: line.itemName ?? line.description ?? `Line ${line.lineNumber}`,
          quantity: line.quantity,
          saleReference: sale.reference,
          warehouse: line.warehouse?.name ?? "—",
        })),
    );
  }, [report]);

  // Compute payment method breakdown for cash analysis tab
  const paymentsBreakdown = useMemo(() => {
    if (!report) return [];
    const breakdown: Record<string, { count: number; total: number }> = {};
    (report.sales || []).forEach((sale) => {
      (sale.payments || []).forEach((pay) => {
        const method = pay.paymentMethod || "UNKNOWN";
        if (!breakdown[method]) {
          breakdown[method] = { count: 0, total: 0 };
        }
        breakdown[method].count += 1;
        breakdown[method].total += Number(pay.amount || 0);
      });
    });
    return Object.entries(breakdown);
  }, [report]);

  return (
    <div className="space-y-6 text-start" dir="rtl">
      {/* Title block */}
      <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
        <h1 className="text-2xl font-black text-[#233329] arabic-heading">
          {getTranslation("pos.workspace.review", "مراجعة المحاسب")}
        </h1>
        <p className="mt-2 text-sm text-[#64736b] arabic-auto">
          {getTranslation(
            "pos.review.subtitle",
            "مراجعة الورديات المسلمة، المدفوعات، فرق الصندوق، وأثر المخزون قبل الترحيل",
          )}
        </p>
      </Card>

      {/* Filter Bar */}
      <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <span className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                <LuSearch size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation("pos.sales.searchPlaceholder", "البحث...")}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white pr-9 pl-3 py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
              />
            </div>

            {/* Date range picker */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-[16px] border border-[#d6e1d9] bg-white px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none"
              />
              <span className="text-[#64736b] text-xs">إلى</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-[16px] border border-[#d6e1d9] bg-white px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none"
              />
            </div>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="rounded-[16px] border border-[#d6e1d9] bg-white px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none"
            >
              <option value="">{getTranslation("pos.sessions.branch", "كل الفروع")}</option>
              {branchesList.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>

            {/* Cashier Filter */}
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="rounded-[16px] border border-[#d6e1d9] bg-white px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none"
            >
              <option value="">{getTranslation("pos.sessions.cashierLabel", "كل الكاشيرز")}</option>
              {cashiersList.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-[16px] border border-[#d6e1d9] bg-white px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none"
            >
              <option value="">{getTranslation("payroll.column.status", "كل الحالات")}</option>
              <option value="PENDING_REVIEW">بانتظار المراجعة</option>
              <option value="POSTED">مرحلة</option>
              <option value="REJECTED">مرفوضة</option>
              <option value="OPEN">مفتوحة</option>
              <option value="CLOSED">مغلقة</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="rounded-[16px] border border-[#d6e1d9] bg-white px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none"
            >
              <option value="">{getTranslation("pos.sales.paymentLabel", "طريقة الدفع")}</option>
              <option value="CASH">نقدي (Cash)</option>
              <option value="CARD">بطاقة (Card)</option>
              <option value="DELIVERY">شركات التوصيل</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              <LuFilterX size={14} />
              <span>إعادة تعيين</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>إجمالي المبيعات</span>
            <LuDollarSign className="text-emerald-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.totalSales}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>المبيعات النقدية</span>
            <LuCreditCard className="text-blue-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.cashSales}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>مبيعات الشبكة</span>
            <LuCreditCard className="text-[#5f8a67]" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.cardSales}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>شركات التوصيل</span>
            <LuTruck className="text-orange-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.deliverySales}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>الضريبة</span>
            <LuPercent className="text-purple-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.tax}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>الخصومات</span>
            <LuTag className="text-red-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.discounts}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>فرق الصندوق</span>
            <LuCircleAlert
              className={cn(
                Number(summary.cashDifference) !== 0 ? "text-red-500 animate-pulse" : "text-gray-400",
              )}
              size={16}
            />
          </div>
          <div
            className={cn(
              "mt-2 text-lg font-bold",
              Number(summary.cashDifference) < 0
                ? "text-red-600"
                : Number(summary.cashDifference) > 0
                ? "text-emerald-600"
                : "text-gray-900",
            )}
          >
            {summary.cashDifference}
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 overflow-hidden">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-[#64736b] text-sm">
            {getTranslation("pos.review.empty", "لا توجد ورديات POS بانتظار مراجعة المحاسب حالياً.")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#e1e7e2] text-[#6d7b73]">
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.recent", "الوردية")}</th>
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.branch", "الفرع")}</th>
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.cashierLabel", "الكاشير")}</th>
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.openedAt", "وقت الفتح")}</th>
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.closedAt", "وقت الإغلاق")}</th>
                  <th className="px-4 py-3 text-center font-black">{getTranslation("pos.sessions.invoices", "الفواتير")}</th>
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.totalSales", "المبيعات")}</th>
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.expected", "الكاش المتوقع")}</th>
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.actual", "الكاش الفعلي")}</th>
                  <th className="px-4 py-3 text-start font-black">{getTranslation("pos.sessions.difference", "الفارق")}</th>
                  <th className="px-4 py-3 text-center font-black">{getTranslation("payroll.column.status", "الحالة")}</th>
                  <th className="px-4 py-3 text-center font-black">{getTranslation("payroll.column.action", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3f0]">
                {filteredSessions.map((session) => {
                  const isPending = session.accountingStatus === "PENDING_REVIEW";
                  const diff = Number(session.difference || 0);

                  return (
                    <tr key={session.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3.5 font-bold text-[#233329]">
                        <div>{session.sessionNumber}</div>
                        <div className="text-[10px] text-gray-500 font-semibold">{session.terminalName}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{session.branchName || "—"}</td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {session.cashierUser?.name || session.cashierUser?.email || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">
                        {formatDate(session.openedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">
                        {formatDate(session.closedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-gray-700">
                        {session.invoiceCount ?? 0}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        {session.totalSales || "0.00"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {session.expectedCash}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {session.actualCash || "—"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3.5 font-bold",
                          diff < 0 ? "text-red-600" : diff > 0 ? "text-emerald-600" : "text-gray-500",
                        )}
                      >
                        {session.difference || "0.00"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border",
                            session.accountingStatus === "PENDING_REVIEW"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : session.accountingStatus === "POSTED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : session.accountingStatus === "REJECTED"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : session.accountingStatus === "OPEN"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-slate-50 text-slate-800 border-slate-200",
                          )}
                        >
                          {session.accountingStatus === "PENDING_REVIEW"
                            ? "بانتظار المراجعة"
                            : session.accountingStatus === "POSTED"
                            ? "مرحلة"
                            : session.accountingStatus === "REJECTED"
                            ? "مرفوضة"
                            : session.accountingStatus === "OPEN"
                            ? "مفتوحة"
                            : "مغلقة"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleReviewClick(session)}
                            className="flex items-center gap-1 rounded-full border border-[#d6e0d8] px-3 py-1.5 text-xs font-bold text-[#46644b] hover:bg-gray-50 transition"
                          >
                            <LuEye size={12} />
                            <span>مراجعة</span>
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => onApproveSessionReview(session.id)}
                                className="rounded-full bg-[#46644b] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#39523d] transition"
                              >
                                {getTranslation("pos.review.approve", "اعتماد")}
                              </button>
                              {onRejectSessionReview && (
                                <button
                                  type="button"
                                  onClick={() => onRejectSessionReview(session.id)}
                                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                                >
                                  {getTranslation("pos.review.reject", "رفض")}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Drill-down Drawer Panel */}
      <SidePanel
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedSession(null);
        }}
        title={`${getTranslation("pos.review.sessionReview", "مراجعة الوردية")}: ${
          selectedSession?.sessionNumber ?? ""
        }`}
        panelClassName="max-w-4xl sm:max-w-4xl"
      >
        <div className="space-y-6" dir="rtl">
          {/* Top Session Stats summary */}
          {selectedSession && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-semibold text-gray-600">
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">الكاشير</span>
                <span className="text-gray-900 font-bold">
                  {selectedSession.cashierUser?.name || selectedSession.cashierUser?.email || "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">الفرع / المستودع</span>
                <span className="text-gray-900 font-bold">
                  {selectedSession.branchName || "—"} / {selectedSession.warehouse?.name || "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">وقت الفتح / الإغلاق</span>
                <span className="text-gray-900 font-bold">
                  {formatDate(selectedSession.openedAt)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">المستودع</span>
                <span className="text-gray-900 font-bold">
                  {selectedSession.warehouse?.name || "—"}
                </span>
              </div>
            </div>
          )}

          {/* Drawer tab selector */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {([
              ["overview", getTranslation("pos.review.tabOverview", "نظرة عامة")],
              ["invoices", "الفواتير"],
              ["cash", getTranslation("pos.review.tabCash", "جرد الكاش")],
              ["inventory", getTranslation("pos.review.tabInventory", "أثر المخزون")],
              ["journal", getTranslation("pos.review.tabJournal", "معاينة القيد")],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold transition",
                  activeTab === id
                    ? "bg-[#46644b] text-white"
                    : "border border-[#d6e1d9] bg-[#f7faf8] text-[#46644b] hover:bg-[#eff4f0]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && selectedSession && (
            <div className="space-y-6">
              {/* Detailed metrics tiles */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                <DetailTile
                  label={getTranslation("pos.review.openingCash", "الرصيد الافتتاحي")}
                  value={selectedSession.openingCash}
                />
                <DetailTile
                  label={getTranslation("pos.review.expectedCash", "الكاش المتوقع")}
                  value={selectedSession.expectedCash}
                />
                <DetailTile
                  label={getTranslation("pos.review.actualCash", "الكاش الفعلي")}
                  value={selectedSession.actualCash || "—"}
                />
                <DetailTile
                  label={getTranslation("pos.review.cashDifference", "فارق الكاش")}
                  value={selectedSession.difference || "—"}
                />
                <DetailTile
                  label={getTranslation("pos.sessions.totalSales", "صافي المبيعات")}
                  value={selectedSession.totalSales || "0.00"}
                />
                <DetailTile
                  label={getTranslation("pos.sessions.invoices", "عدد الفواتير")}
                  value={String(selectedSession.invoiceCount ?? 0)}
                />
              </div>

              {/* Note / Notes if present */}
              {selectedSession.notes && (
                <div className="rounded-[18px] border border-amber-100 bg-amber-50/30 p-4 text-sm text-[#233329]">
                  <span className="font-bold block text-xs text-amber-800 uppercase mb-1">ملاحظات الوردية</span>
                  {selectedSession.notes}
                </div>
              )}

              {/* Bulk approval / Rejection trigger inside drawer overview */}
              {selectedSession.accountingStatus === "PENDING_REVIEW" && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      onApproveSessionReview(selectedSession.id);
                      setIsDetailDrawerOpen(false);
                    }}
                    className="rounded-full bg-[#5f8a67] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#4d7153] transition"
                  >
                    {getTranslation("pos.review.approveSession", "اعتماد وترحيل الوردية بالكامل")}
                  </button>
                  {onRejectSessionReview && (
                    <button
                      type="button"
                      onClick={() => {
                        onRejectSessionReview(selectedSession.id);
                        setIsDetailDrawerOpen(false);
                      }}
                      className="rounded-full border border-red-200 bg-red-50 px-6 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                    >
                      {getTranslation("pos.review.reject", "رفض الوردية بالكامل")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#233329]">قائمة الفواتير المكتملة والمرتجع للوردية</div>

              {invoiceList.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-8 text-center text-sm text-[#64736b]">
                  لا توجد فواتير مسجلة في هذه الوردية.
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-100 rounded-2xl bg-white">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#e1e7e2] bg-gray-50 text-[#6d7b73]">
                        <th className="px-3 py-3 text-start font-bold">المرجع</th>
                        <th className="px-3 py-3 text-start font-bold">التاريخ</th>
                        <th className="px-3 py-3 text-start font-bold">العميل</th>
                        <th className="px-3 py-3 text-start font-bold">نوع الطلب</th>
                        <th className="px-3 py-3 text-start font-bold">طريقة الدفع</th>
                        <th className="px-3 py-3 text-start font-bold">الإجمالي</th>
                        <th className="px-3 py-3 text-center font-bold">حالة المراجعة</th>
                        <th className="px-3 py-3 text-center font-bold">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f0]">
                      {invoiceList.map((inv) => {
                        const isSale = inv.type === "sale";
                        const salePayments = isSale ? (inv.raw.payments || []).map((p: any) => p.paymentMethod).join("، ") : "كاش";

                        return (
                          <tr key={inv.id} className="hover:bg-gray-50/50 transition">
                            <td className="px-3 py-3 font-bold text-gray-900">
                              {inv.reference}
                              {!isSale && <span className="mr-1.5 text-[10px] text-red-600 font-semibold">(مرتجع)</span>}
                            </td>
                            <td className="px-3 py-3 text-gray-500">{formatDate(inv.date)}</td>
                            <td className="px-3 py-3 text-gray-700">{inv.customer}</td>
                            <td className="px-3 py-3 text-gray-700">
                              {t(`pos.orderType.${inv.orderType}`)}
                            </td>
                            <td className="px-3 py-3 text-gray-500">{salePayments || "—"}</td>
                            <td className={cn("px-3 py-3 font-bold", isSale ? "text-gray-900" : "text-red-600")}>
                              {inv.total}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                                  inv.status === "PENDING_REVIEW"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : inv.status === "POSTED"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-rose-50 text-rose-800 border-rose-200",
                                )}
                              >
                                {inv.status === "PENDING_REVIEW" ? "بانتظار المراجعة" : inv.status === "POSTED" ? "مرحلة" : "مرفوضة"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => isSale && setActiveInvoiceDetail(inv.raw)}
                                disabled={!isSale}
                                className="rounded-full border border-gray-200 px-2.5 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition"
                              >
                                عرض التفاصيل
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "cash" && (
            <div className="space-y-6">
              {report ? (
                <>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                    <DetailTile label={getTranslation("pos.review.openingCash", "الرصيد الافتتاحي")} value={report.openingCash} />
                    <DetailTile label={getTranslation("pos.review.cashSales", "مبيعات الكاش")} value={report.cashSales} />
                    <DetailTile label={getTranslation("pos.review.cashRefunds", "مرتجعات الكاش")} value={report.cashRefunds} />
                    <DetailTile label={getTranslation("pos.review.expectedCash", "الكاش المتوقع")} value={report.expectedCash} />
                    <DetailTile label={getTranslation("pos.review.actualCash", "الكاش الفعلي المعدود")} value={report.actualCash ?? "—"} />
                    <DetailTile label={getTranslation("pos.review.cashDifference", "فارق الكاش")} value={report.difference ?? "—"} />
                  </div>

                  {/* Payments mix breakdown */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden mt-4">
                    <div className="bg-gray-50 p-3 font-bold text-xs uppercase text-gray-600">تفاصيل وسائل الدفع المستلمة</div>
                    {paymentsBreakdown.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">لا توجد تفاصيل مدفوعات.</div>
                    ) : (
                      <div className="divide-y divide-gray-100 bg-white">
                        {paymentsBreakdown.map(([method, data]) => (
                          <div key={method} className="p-3 flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-900">{method}</span>
                            <span className="font-bold text-gray-700">
                              {data.total.toFixed(2)} ({data.count} فواتير)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-gray-500">جار جلب تفاصيل الجرد...</div>
              )}
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#233329]">{getTranslation("pos.review.inventoryImpact", "أثر المخزون")}</div>
              {inventoryRows.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-8 text-center text-sm text-[#64736b]">
                  لا يوجد أثر مخزني للوردية الحالية.
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-100 rounded-2xl bg-white">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#e1e7e2] bg-gray-50 text-[#6d7b73]">
                        <th className="px-3 py-3 text-start font-bold">{getTranslation("pos.review.headerSale", "البيع")}</th>
                        <th className="px-3 py-3 text-start font-bold">{getTranslation("pos.review.headerItem", "الصنف")}</th>
                        <th className="px-3 py-3 text-center font-bold">{getTranslation("pos.review.headerQuantity", "الكمية")}</th>
                        <th className="px-3 py-3 text-start font-bold">{getTranslation("pos.review.headerWarehouse", "المستودع")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f0]">
                      {inventoryRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="px-3 py-3 font-semibold text-gray-900">{row.saleReference}</td>
                          <td className="px-3 py-3 text-gray-700">{row.itemName}</td>
                          <td className="px-3 py-3 text-center font-bold text-gray-900">{row.quantity}</td>
                          <td className="px-3 py-3 text-gray-600">{row.warehouse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "journal" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#233329]">{getTranslation("pos.review.tabJournal", "معاينة القيد المحاسبي")}</div>
              <div className="space-y-4">
                {journalEntries.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-8 text-center text-sm text-[#64736b]">
                    {getTranslation("pos.review.noJournals", "لا توجد قيود محاسبية مسودة مرتبطة بالوردية المختارة.")}
                  </div>
                ) : (
                  journalEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2 mb-2">
                        <div className="font-bold text-[#233329]">{entry.reference}</div>
                        <div className="font-bold text-[#5f6d66]">{entry.status}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_120px_120px] font-bold text-gray-500 border-b border-gray-100 pb-1">
                          <span>الحساب</span>
                          <span className="text-left">مدين</span>
                          <span className="text-left">دائن</span>
                        </div>
                        {entry.lines.map((line) => (
                          <div
                            key={line.id}
                            className="grid grid-cols-[1fr_120px_120px] text-gray-700"
                          >
                            <span>
                              {line.accountCode} · {line.accountName}
                            </span>
                            <span className="text-left font-semibold text-emerald-700">{line.debitAmount !== "0.00" ? line.debitAmount : "—"}</span>
                            <span className="text-left font-semibold text-rose-700">{line.creditAmount !== "0.00" ? line.creditAmount : "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </SidePanel>

      {/* Compact Read-only Invoice Details Modal */}
      <Modal
        isOpen={activeInvoiceDetail !== null}
        onClose={() => setActiveInvoiceDetail(null)}
        title={`${getTranslation("pos.review.receipt", "تفاصيل الفاتورة")}: ${
          activeInvoiceDetail?.reference ?? ""
        }`}
      >
        {activeInvoiceDetail && (
          <div className="space-y-6 text-start" dir="rtl">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold block text-gray-400 uppercase">الفرع</span>
                <span className="text-gray-900 font-bold">{activeInvoiceDetail.session?.branchName || selectedSession?.branchName || "—"}</span>
              </div>
              <div>
                <span className="font-bold block text-gray-400 uppercase">التاريخ</span>
                <span className="text-gray-900 font-bold">{formatDate(activeInvoiceDetail.invoiceDate)}</span>
              </div>
              <div>
                <span className="font-bold block text-gray-400 uppercase">المستودع</span>
                <span className="text-gray-900 font-bold">{activeInvoiceDetail.session?.warehouse?.name || selectedSession?.warehouse?.name || "—"}</span>
              </div>
              <div>
                <span className="font-bold block text-gray-400 uppercase">نوع الطلب</span>
                <span className="text-gray-900 font-bold">{t(`pos.orderType.${activeInvoiceDetail.orderType}`)}</span>
              </div>
            </div>

            {/* Invoice Lines */}
            <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
              <div className="bg-gray-50 p-2.5 font-bold uppercase text-gray-600">الأصناف المباعة</div>
              <div className="divide-y divide-gray-100 bg-white">
                {activeInvoiceDetail.lines.map((line) => (
                  <div key={line.id} className="p-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">{line.itemName || line.description}</div>
                      <div className="text-[10px] text-gray-500">
                        {line.quantity} x {line.unitPrice} {activeInvoiceDetail.currencyCode}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">
                      {line.lineAmount} {activeInvoiceDetail.currencyCode}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
              <div className="bg-gray-50 p-2.5 font-bold uppercase text-gray-600">تفاصيل الدفع</div>
              <div className="divide-y divide-gray-100 bg-white">
                {activeInvoiceDetail.payments.map((payment) => (
                  <div key={payment.id} className="p-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">{payment.paymentMethod}</div>
                      {payment.reference && <div className="text-[10px] text-gray-500">مرجع: {payment.reference}</div>}
                    </div>
                    <div className="font-bold text-gray-900">
                      {payment.amount} {activeInvoiceDetail.currencyCode}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 p-3.5 rounded-xl space-y-1.5 text-xs border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500">الإجمالي قبل الضريبة</span>
                <span>{activeInvoiceDetail.subtotalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الخصم</span>
                <span>{activeInvoiceDetail.discountAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الضريبة</span>
                <span>{activeInvoiceDetail.taxAmount}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
                <span>الإجمالي النهائي</span>
                <span>{activeInvoiceDetail.totalAmount}</span>
              </div>
            </div>

            {/* Individual Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              {activeInvoiceDetail.posAccountingStatus === "POSTED" ? (
                <button
                  type="button"
                  onClick={() => {
                    onReverseReview(activeInvoiceDetail.id);
                    setActiveInvoiceDetail(null);
                  }}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  {t("pos.review.reverse")}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCorrectionModal(activeInvoiceDetail);
                    }}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    {t("pos.review.correctOrderType")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onApproveReview(activeInvoiceDetail.id);
                      setActiveInvoiceDetail(null);
                    }}
                    className="rounded-full bg-[#5f8a67] px-4 py-2 text-xs font-bold text-white hover:bg-[#4d7153] transition"
                  >
                    {t("pos.review.approve")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRejectReview(activeInvoiceDetail.id);
                      setActiveInvoiceDetail(null);
                    }}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                  >
                    {t("pos.review.reject")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Correct Order Type Modal (unchanged business logic) */}
      <Modal
        isOpen={isCorrectOrderTypeOpen}
        onClose={onCloseCorrectionModal}
        title={t("pos.review.correctOrderTypeModal")}
      >
        <div className="space-y-4 text-start" dir="rtl">
          <select
            value={correctionOrderType}
            onChange={(event) => onCorrectionOrderTypeChange(event.target.value as PosOrderType)}
            className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
          >
            <option value="DINE_IN">{t("pos.orderType.DINE_IN")}</option>
            <option value="TAKEAWAY">{t("pos.orderType.TAKEAWAY")}</option>
            <option value="DELIVERY">{t("pos.orderType.DELIVERY")}</option>
            <option value="PICKUP">{t("pos.orderType.PICKUP")}</option>
          </select>
          {correctionOrderType === "DINE_IN" ? (
            <select
              value={correctionTableId}
              onChange={(event) => onCorrectionTableIdChange(event.target.value)}
              className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
            >
              <option value="">{t("pos.review.selectTable")}</option>
              {restaurantTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.tableNumber}
                </option>
              ))}
            </select>
          ) : null}
          {correctionOrderType === "DELIVERY" ? (
            <>
              <select
                value={correctionDeliveryCompanyId}
                onChange={(event) => onCorrectionDeliveryCompanyIdChange(event.target.value)}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
              >
                <option value="">{t("pos.review.selectDeliveryCompany")}</option>
                {deliveryCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <select
                value={correctionDriverId}
                onChange={(event) => onCorrectionDriverIdChange(event.target.value)}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
              >
                <option value="">{t("pos.review.selectDriver")}</option>
                {deliveryDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <Input
            type="number"
            min="0"
            step="0.01"
            value={correctionServiceCharge}
            onChange={(event) => onCorrectionServiceChargeChange(event.target.value)}
            placeholder={t("pos.review.serviceCharge")}
            className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={correctionDeliveryFee}
            onChange={(event) => onCorrectionDeliveryFeeChange(event.target.value)}
            placeholder={t("pos.review.deliveryFee")}
            className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
          />
          <Input
            value={correctionReason}
            onChange={(event) => onCorrectionReasonChange(event.target.value)}
            placeholder={t("pos.review.correctionReason")}
            className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
          />
          <button
            type="button"
            disabled={!selectedCorrectionSale || !correctionReason.trim() || savingCorrection}
            onClick={onSaveCorrection}
            className="w-full rounded-[18px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {t("pos.review.saveCorrection")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
