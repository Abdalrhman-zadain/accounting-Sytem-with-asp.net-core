"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, Modal } from "@/components/ui";
import { Input, Field } from "@/components/ui/forms";
import { DetailTile } from "@/features/pos/pos-detail-cards";
import { cn, getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useTranslation } from "@/lib/i18n";
import type {
  BankCashAccount,
  DeliveryCompany,
  DeliveryDriver,
  DeliveryStatus,
  JournalEntry,
  JournalEntryLine,
  PosOrderType,
  PosPaymentMethod,
  PosSale,
  PosSettings,
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
  LuChevronDown,
} from "react-icons/lu";
import { printSessionRollReport, type SessionRollPrintType } from "@/features/pos/pos-session-roll-print";
import { printPosSessionRollReport } from "@/lib/api";

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
  correctionPaymentDeliveryCompanyId: string;
  correctionPaymentMethod: PosPaymentMethod;
  correctionPaymentReason: string;
  correctionPaymentReference: string;
  correctionReason: string;
  correctionServiceCharge: string;
  correctionTableId: string;
  deliveryCompanies: DeliveryCompany[];
  deliveryDrivers: DeliveryDriver[];
  isCorrectOrderTypeOpen: boolean;
  isCorrectPaymentMethodOpen: boolean;
  journalEntries: JournalEntry[];
  paymentAccounts: BankCashAccount[];
  onApproveReview: (saleId: string) => void;
  onApproveSessionReview: (sessionId: string, decision?: string, reason?: string) => void;
  onAssignDriver: (saleId: string, driverId: string | null) => void;
  onCloseCorrectionModal: () => void;
  onClosePaymentCorrectionModal: () => void;
  onCorrectionDeliveryCompanyIdChange: (value: string) => void;
  onCorrectionDeliveryFeeChange: (value: string) => void;
  onCorrectionDriverIdChange: (value: string) => void;
  onCorrectionOrderTypeChange: (value: PosOrderType) => void;
  onCorrectionPaymentDeliveryCompanyIdChange: (value: string) => void;
  onCorrectionPaymentMethodChange: (value: PosPaymentMethod) => void;
  onCorrectionPaymentReasonChange: (value: string) => void;
  onCorrectionPaymentReferenceChange: (value: string) => void;
  onCorrectionReasonChange: (value: string) => void;
  onCorrectionServiceChargeChange: (value: string) => void;
  onCorrectionTableIdChange: (value: string) => void;
  onOpenCorrectionModal: (sale: PosSale) => void;
  onOpenPaymentCorrectionModal: (sale: PosSale) => void;
  onRejectReview: (saleId: string) => void;
  onReprintReceipt: (saleId: string) => void;
  onReverseReview: (saleId: string) => void;
  onReviewSessionChange: (sessionId: string) => void;
  onReviewTabChange: (tab: "overview" | "cash" | "inventory" | "journal") => void;
  onSaveCorrection: () => void;
  onSavePaymentCorrection: () => void;
  onUpdateDeliveryStatus: (saleId: string, status: DeliveryStatus) => void;
  report: PosSessionReport | null;
  posSettings: PosSettings | null;
  restaurantTables: PosTable[];
  reviewQueryDataLength: number;
  reviewSessionGroups: ReviewSessionGroup[];
  reviewTab: "overview" | "cash" | "inventory" | "journal";
  selectedCorrectionSale: PosSale | null;
  selectedPaymentCorrectionSale: PosSale | null;
  selectedReviewGroup: ReviewSessionGroup | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  savingCorrection: boolean;
  savingPaymentCorrection: boolean;
};

export function PosReviewWorkspace({
  sessions = [],
  onRejectSessionReview,
  correctionDeliveryCompanyId,
  correctionDeliveryFee,
  correctionDriverId,
  correctionOrderType,
  correctionPaymentDeliveryCompanyId,
  correctionPaymentMethod,
  correctionPaymentReason,
  correctionPaymentReference,
  correctionReason,
  correctionServiceCharge,
  correctionTableId,
  deliveryCompanies,
  deliveryDrivers,
  isCorrectOrderTypeOpen,
  isCorrectPaymentMethodOpen,
  journalEntries,
  paymentAccounts,
  onApproveReview,
  onApproveSessionReview,
  onAssignDriver,
  onCloseCorrectionModal,
  onClosePaymentCorrectionModal,
  onCorrectionDeliveryCompanyIdChange,
  onCorrectionDeliveryFeeChange,
  onCorrectionDriverIdChange,
  onCorrectionOrderTypeChange,
  onCorrectionPaymentDeliveryCompanyIdChange,
  onCorrectionPaymentMethodChange,
  onCorrectionPaymentReasonChange,
  onCorrectionPaymentReferenceChange,
  onCorrectionReasonChange,
  onCorrectionServiceChargeChange,
  onCorrectionTableIdChange,
  onOpenCorrectionModal,
  onOpenPaymentCorrectionModal,
  onRejectReview,
  onReprintReceipt,
  onReverseReview,
  onReviewSessionChange,
  onReviewTabChange,
  onSaveCorrection,
  onSavePaymentCorrection,
  onUpdateDeliveryStatus,
  report,
  posSettings,
  restaurantTables,
  reviewQueryDataLength,
  reviewSessionGroups,
  reviewTab,
  selectedCorrectionSale,
  selectedPaymentCorrectionSale,
  selectedReviewGroup,
  t,
  savingCorrection,
  savingPaymentCorrection,
}: PosReviewWorkspaceProps) {
  // Local filter states
  const { user, token } = useAuth();
  const { language } = useTranslation();
  const isArabic = language === "ar";
  const isSessionPosting = posSettings?.runtime.postingMode === "BY_SESSION";
  const pageDir = isArabic ? "rtl" : "ltr";
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [diffDecision, setDiffDecision] = useState("ACCEPT");
  const [diffReason, setDiffReason] = useState("");
  // Print dropdown
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState(false);
  const printDropdownRef = useRef<HTMLDivElement>(null);

  // Close print dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setIsPrintDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handlePrintRollReport = async (printType: SessionRollPrintType) => {
    if (!selectedSession) return;
    setIsPrintDropdownOpen(false);
    // Log audit trail (fire-and-forget; don't block UI)
    try {
      await printPosSessionRollReport(selectedSession.id, printType, token);
    } catch {
      // Non-critical – proceed with client-side print even if audit call fails
    }
    printSessionRollReport({
      session: selectedSession,
      report,
      printedBy: user?.name || user?.username || "—",
      printType,
    });
  };

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Current session selected for inline detail review
  const [selectedSession, setSelectedSession] = useState<PosSession | null>(null);
  const [activeTab, setActiveTab] = useState<ReviewTab>("overview");
  const [activeInvoiceDetail, setActiveInvoiceDetail] = useState<PosSale | null>(null);
  const [isJournalDetailOpen, setIsJournalDetailOpen] = useState(false);

  useEffect(() => {
    if (!activeInvoiceDetail) {
      return;
    }

    const refreshedSale =
      reviewSessionGroups
        .flatMap((group) => group.sales)
        .find((sale) => sale.id === activeInvoiceDetail.id) ?? null;

    if (!refreshedSale) {
      setActiveInvoiceDetail(null);
      return;
    }

    if (refreshedSale !== activeInvoiceDetail) {
      setActiveInvoiceDetail(refreshedSale);
    }
  }, [activeInvoiceDetail, reviewSessionGroups]);

  const activeJournalEntry = useMemo(() => {
    if (!activeInvoiceDetail) {
      return null;
    }

    if (isSessionPosting) {
      const findAccountDetails = (accountId: string) => {
        for (const entry of journalEntries) {
          const line = entry.lines.find((l) => l.accountId === accountId);
          if (line) {
            return {
              code: line.accountCode,
              name: line.accountName,
              nameAr: line.accountNameAr || line.accountName,
            };
          }
        }
        const pAcc = paymentAccounts.find((a) => a.account.id === accountId);
        if (pAcc) {
          return {
            code: pAcc.account.code,
            name: pAcc.account.name,
            nameAr: pAcc.account.nameAr || pAcc.account.name,
          };
        }
        return null;
      };

      const lines: JournalEntryLine[] = [];
      let lineIndex = 0;

      // 1. Debits: Payments
      activeInvoiceDetail.payments.forEach((payment) => {
        let accountId = "";
        if (payment.paymentMethod === "DELIVERY") {
          const companyId = payment.deliveryCompanyId || activeInvoiceDetail.deliveryCompanyId;
          const company = deliveryCompanies.find((c) => c.id === companyId);
          accountId = company?.receivableAccountId || "";
        } else {
          accountId = payment.bankCashAccount?.account?.id || payment.bankCashAccount?.id || "";
        }

        if (accountId) {
          const accDetails = findAccountDetails(accountId);
          lines.push({
            id: `payment-${payment.id}`,
            accountId,
            accountCode: accDetails?.code || "—",
            accountName: accDetails?.name || "—",
            accountNameAr: accDetails?.nameAr || accDetails?.name || "—",
            debitAmount: Number(payment.amount).toFixed(2),
            creditAmount: "0.00",
            lineNumber: ++lineIndex,
            description: `POS sale ${activeInvoiceDetail.reference} payment`,
          });
        }
      });

      // 2. Debits: Outstanding balance
      const totalApplied = activeInvoiceDetail.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const outstandingAmount = Math.max(0, Number(activeInvoiceDetail.totalAmount) - totalApplied);
      if (outstandingAmount > 0.005) {
        let receivableAccountId = "";
        if (activeInvoiceDetail.deliveryCompanyId) {
          const company = deliveryCompanies.find((c) => c.id === activeInvoiceDetail.deliveryCompanyId);
          receivableAccountId = company?.receivableAccountId || "";
        } else {
          for (const entry of journalEntries) {
            const line = entry.lines.find((l) => l.accountCode === "1121001" || l.accountCode?.startsWith("112"));
            if (line) {
              receivableAccountId = line.accountId;
              break;
            }
          }
        }

        if (receivableAccountId) {
          const accDetails = findAccountDetails(receivableAccountId);
          lines.push({
            id: `outstanding-${activeInvoiceDetail.id}`,
            accountId: receivableAccountId,
            accountCode: accDetails?.code || "—",
            accountName: accDetails?.name || "—",
            accountNameAr: accDetails?.nameAr || accDetails?.name || "—",
            debitAmount: outstandingAmount.toFixed(2),
            creditAmount: "0.00",
            lineNumber: ++lineIndex,
            description: `POS sale ${activeInvoiceDetail.reference} outstanding balance`,
          });
        }
      }

      // 3. Debits: Sales Discount
      const discountAmount = Number(activeInvoiceDetail.discountAmount || 0);
      if (discountAmount > 0.005) {
        let salesDiscountAccountId = posSettings?.accounts?.salesDiscountAccountId || "";
        if (!salesDiscountAccountId) {
          for (const entry of journalEntries) {
            const line = entry.lines.find((l) => l.accountCode?.startsWith("412") || l.accountCode === "4110002");
            if (line) {
              salesDiscountAccountId = line.accountId;
              break;
            }
          }
        }
        if (salesDiscountAccountId) {
          const accDetails = findAccountDetails(salesDiscountAccountId);
          lines.push({
            id: `discount-${activeInvoiceDetail.id}`,
            accountId: salesDiscountAccountId,
            accountCode: accDetails?.code || "—",
            accountName: accDetails?.name || "—",
            accountNameAr: accDetails?.nameAr || accDetails?.name || "—",
            debitAmount: discountAmount.toFixed(2),
            creditAmount: "0.00",
            lineNumber: ++lineIndex,
            description: `POS sale ${activeInvoiceDetail.reference} discount`,
          });
        }
      }

      // 4. Credits: Sales Revenue
      let salesRevenueAccountId = posSettings?.accounts?.salesRevenueAccountId || "";
      if (!salesRevenueAccountId) {
        for (const entry of journalEntries) {
          const line = entry.lines.find((l) => l.accountCode === "4110001");
          if (line) {
            salesRevenueAccountId = line.accountId;
            break;
          }
        }
      }
      if (salesRevenueAccountId) {
        const accDetails = findAccountDetails(salesRevenueAccountId);
        const revenueAmount = Number(activeInvoiceDetail.subtotalAmount) +
          Number(activeInvoiceDetail.discountAmount || 0) +
          Number(activeInvoiceDetail.serviceChargeAmount || 0) +
          Number(activeInvoiceDetail.deliveryFeeAmount || 0);
        lines.push({
          id: `revenue-${activeInvoiceDetail.id}`,
          accountId: salesRevenueAccountId,
          accountCode: accDetails?.code || "—",
          accountName: accDetails?.name || "—",
          accountNameAr: accDetails?.nameAr || accDetails?.name || "—",
          debitAmount: "0.00",
          creditAmount: revenueAmount.toFixed(2),
          lineNumber: ++lineIndex,
          description: `POS sale ${activeInvoiceDetail.reference} revenue`,
        });
      }

      // 5. Credits: Tax/VAT
      const taxAmount = Number(activeInvoiceDetail.taxAmount || 0);
      if (taxAmount > 0.005) {
        let outputVatAccountId = posSettings?.accounts?.outputVatAccountId || "";
        if (!outputVatAccountId) {
          for (const entry of journalEntries) {
            const line = entry.lines.find((l) => l.accountCode === "2121001" || l.accountCode?.startsWith("212"));
            if (line) {
              outputVatAccountId = line.accountId;
              break;
            }
          }
        }
        if (outputVatAccountId) {
          const accDetails = findAccountDetails(outputVatAccountId);
          lines.push({
            id: `tax-${activeInvoiceDetail.id}`,
            accountId: outputVatAccountId,
            accountCode: accDetails?.code || "—",
            accountName: accDetails?.name || "—",
            accountNameAr: accDetails?.nameAr || accDetails?.name || "—",
            debitAmount: "0.00",
            creditAmount: taxAmount.toFixed(2),
            lineNumber: ++lineIndex,
            description: `POS sale ${activeInvoiceDetail.reference} tax`,
          });
        }
      }

      return {
        id: activeInvoiceDetail.id + "-virtual",
        reference: activeInvoiceDetail.reference,
        entryDate: activeInvoiceDetail.invoiceDate,
        status: activeInvoiceDetail.posAccountingStatus === "POSTED" ? "POSTED" : "DRAFT",
        description: `POS sale ${activeInvoiceDetail.reference} accounting preview`,
        lines,
      } as JournalEntry;
    }

    const journalId = activeInvoiceDetail.journalEntry?.id ?? null;
    if (!journalId) {
      return null;
    }
    return journalEntries.find((entry) => entry.id === journalId) ?? null;
  }, [
    activeInvoiceDetail,
    isSessionPosting,
    journalEntries,
    paymentAccounts,
    deliveryCompanies,
    posSettings,
  ]);

  const isDifferenceAccepted = (session: PosSession) =>
    Number(session.difference || 0) === 0 || session.differenceStatus === "ACCEPTED_DIFFERENCE";

  const getAccountingStatusLabel = (status?: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return getTranslation("pos.review.accountingStatusPendingReview", "بانتظار المراجعة");
      case "POSTED":
        return getTranslation("pos.review.accountingStatusPosted", "مرحلة");
      case "REJECTED":
        return getTranslation("pos.review.accountingStatusRejected", "مرفوضة");
      case "OPEN":
        return getTranslation("pos.review.accountingStatusOpen", "مفتوحة");
      default:
        return getTranslation("pos.review.accountingStatusClosed", "مغلقة");
    }
  };

  const getInvoiceReviewStatusLabel = (status?: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return getTranslation("pos.review.accountingStatusPendingReview", "بانتظار المراجعة");
      case "POSTED":
        return getTranslation("pos.review.accountingStatusPosted", "مرحلة");
      default:
        return getTranslation("pos.review.accountingStatusRejected", "مرفوضة");
    }
  };

  // Translation helpers
  const getTranslation = (key: string, fallback: string) => {
    try {
      const val = t(key);
      return val && val !== key ? val : fallback;
    } catch {
      return fallback;
    }
  };

  const activeJournalEntryLabel = getTranslation("pos.review.headerReference", "مرجع الفاتورة");

  const localizeDisplayText = (value?: string | null, emptyFallback = "—") => {
    if (!value) return emptyFallback;
    return getLocalizedText(value, language);
  };

  const localizePaymentMethod = (method?: string | null) => {
    switch (method) {
      case "CASH":
      case "CARD":
      case "CLIQ":
      case "BANK_TRANSFER":
      case "WALLET":
      case "STORE_CREDIT":
        return t(`pos.returns.method.${method}`);
      case "DELIVERY":
        return t("pos.review.paymentMethodDelivery");
      default:
        return localizeDisplayText(method, "—");
    }
  };

  const getPaymentDisplayLabel = (payment?: {
    paymentMethod?: string | null;
    deliveryCompanyId?: string | null;
    deliveryCompany?: Pick<DeliveryCompany, "id" | "name" | "arabicName"> | null;
  } | null) => {
    if (payment?.deliveryCompanyId && payment.deliveryCompany) {
      return localizeDisplayText(
        isArabic
          ? payment.deliveryCompany.arabicName || payment.deliveryCompany.name
          : payment.deliveryCompany.name,
      );
    }
    return localizePaymentMethod(payment?.paymentMethod);
  };

  const paymentRequiresReference = (method: PosPaymentMethod) =>
    ["CARD", "CLIQ", "BANK_TRANSFER", "WALLET"].includes(method);

  const availablePaymentMethods = useMemo(() => {
    const methods = new Set<PosPaymentMethod>();
    paymentAccounts.forEach((account) => {
      const normalized = String(account.type || "").toUpperCase();
      if (normalized.includes("CARD")) {
        methods.add("CARD");
      } else if (normalized.includes("CLIQ")) {
        methods.add("CLIQ");
      } else if (normalized.includes("WALLET")) {
        methods.add("WALLET");
      } else if (normalized.includes("BANK")) {
        methods.add("BANK_TRANSFER");
      } else {
        methods.add("CASH");
      }
    });
    methods.add("CASH");
    return Array.from(methods);
  }, [paymentAccounts]);

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

  // Handle Review action click (transitions inline)
  const handleReviewClick = (session: PosSession) => {
    setSelectedSession(session);
    onReviewSessionChange(session.id);
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

  // Compile individual invoices inside the detail view
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
        customer: s.customer?.name || getTranslation("pos.review.walkInCustomer", "عميل عام"),
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
        customer: getTranslation("pos.review.walkInCustomer", "عميل عام"),
        orderType: "TAKEAWAY",
        total: `-${r.totalAmount}`,
        status: r.accountingStatus || "PENDING_REVIEW",
        type: "return",
        raw: r,
      });
    });

    return list;
  }, [report, language]);

  // Compute inventory rows
  const inventoryRows = useMemo(() => {
    if (!report) return [];
    return (report.sales || []).flatMap((sale) =>
      sale.lines
        .filter((line) => line.item?.trackInventory)
        .map((line) => ({
          itemName: localizeDisplayText(
            line.itemName ?? line.description ?? `Line ${line.lineNumber}`,
            `Line ${line.lineNumber}`,
          ),
          quantity: line.quantity,
          saleReference: sale.reference,
          warehouse: localizeDisplayText(line.warehouse?.name),
        })),
    );
  }, [report]);

  // Compute payment method breakdown
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

  const orderedJournalEntries = useMemo(() => {
    const journalById = new Map(journalEntries.map((entry) => [entry.id, entry]));
    const entries: Array<{
      entry: JournalEntry;
      sourceReference: string;
      sourceType: string;
    }> = [];

    if (isSessionPosting && report?.sessionJournalEntry?.id) {
      const sessionEntry = journalById.get(report.sessionJournalEntry.id);
      if (sessionEntry) {
        entries.push({
          entry: sessionEntry,
          sourceReference: report.sessionJournalEntry.sourceNumber || report.sessionNumber,
          sourceType: getTranslation("pos.review.sessionGroupedEntry", "قيد مجمع للوردية"),
        });
      }
    }

    entries.push(
      ...invoiceList
      .map((invoice) => {
        if (isSessionPosting && invoice.type === "sale") {
          return null;
        }
        const journalId = invoice.raw?.journalEntry?.id;
        if (!journalId) return null;
        const entry = journalById.get(journalId);
        if (!entry) return null;
        return {
          entry,
          sourceReference: invoice.reference,
          sourceType:
            invoice.type === "return"
              ? getTranslation("pos.review.returnBadge", "مرتجع")
              : getTranslation("pos.sessions.invoices", "الفواتير"),
        };
      })
      .filter(
        (
          item,
        ): item is {
          entry: JournalEntry;
          sourceReference: string;
          sourceType: string;
        } => Boolean(item),
      ),
    );

    return entries;
  }, [invoiceList, isSessionPosting, journalEntries, language, report]);

  // INLINE SUB-PAGE RENDER
  if (selectedSession) {
    return (
      <div className="space-y-6 text-start" dir={pageDir}>
        {/* Back Button and status bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedSession(null)}
            className="flex items-center gap-1.5 rounded-full border border-[#d6e0d8] bg-white px-4 py-2 text-xs font-bold text-[#46644b] hover:bg-gray-50 transition shadow-sm"
          >
            {isArabic ? <LuChevronRight size={14} className="ml-1" /> : <LuChevronLeft size={14} className="mr-1" />}
            <span>{getTranslation("pos.review.backToSessions", "العودة إلى قائمة الورديات")}</span>
          </button>
          
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border",
              selectedSession.accountingStatus === "PENDING_REVIEW"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : selectedSession.accountingStatus === "POSTED"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : selectedSession.accountingStatus === "REJECTED"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : selectedSession.accountingStatus === "OPEN"
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : "bg-slate-50 text-slate-800 border-slate-200",
            )}
          >
            {getAccountingStatusLabel(selectedSession.accountingStatus)}
          </span>
        </div>

        {/* Header card with actions */}
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#233329] arabic-heading">
                {getTranslation("pos.review.sessionReview", "مراجعة الوردية")}: {selectedSession.sessionNumber}
              </h1>
              <p className="mt-2 text-sm text-[#64736b] arabic-auto">
                {getTranslation(
                  "pos.review.subtitle",
                  "مراجعة الورديات المسلمة، المدفوعات، فرق الصندوق، وأثر المخزون قبل الترحيل",
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* ── Print dropdown ── */}
              <div className="relative" ref={printDropdownRef}>
                <button
                  type="button"
                  id="pos-print-roll-btn"
                  onClick={() => setIsPrintDropdownOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full border border-[#d6e1d9] bg-white px-4 py-2 text-xs font-bold text-[#46644b] hover:bg-[#eff4f0] transition shadow-sm"
                >
                  <LuPrinter size={14} />
                  <span>طباعة</span>
                  <LuChevronDown size={12} className={cn("transition-transform", isPrintDropdownOpen ? "rotate-180" : "")} />
                </button>

                {isPrintDropdownOpen && (
                  <div
                    className="absolute z-50 mt-1 w-52 rounded-2xl border border-[#d6e1d9] bg-white shadow-xl overflow-hidden"
                    style={{ insetInlineEnd: 0 }}
                  >
                    <button
                      type="button"
                      id="pos-print-session-roll"
                      onClick={() => handlePrintRollReport("SESSION_ROLL_REPORT")}
                      className="flex w-full items-center gap-2 px-4 py-3 text-right text-xs font-bold text-[#233329] hover:bg-[#eff4f0] transition border-b border-[#f0f3f0]"
                    >
                      <LuPrinter size={13} className="text-[#46644b] flex-shrink-0" />
                      طباعة رول الوردية
                    </button>
                    <button
                      type="button"
                      id="pos-print-invoice-list-roll"
                      onClick={() => handlePrintRollReport("INVOICE_LIST_ROLL")}
                      className="flex w-full items-center gap-2 px-4 py-3 text-right text-xs font-bold text-[#233329] hover:bg-[#eff4f0] transition border-b border-[#f0f3f0]"
                    >
                      <LuFileText size={13} className="text-[#46644b] flex-shrink-0" />
                      طباعة قائمة الفواتير رول
                    </button>
                    <button
                      type="button"
                      id="pos-print-all-receipts-roll"
                      onClick={() => handlePrintRollReport("ALL_RECEIPTS_ROLL")}
                      className="flex w-full items-center gap-2 px-4 py-3 text-right text-xs font-bold text-[#233329] hover:bg-[#eff4f0] transition"
                    >
                      <LuFileText size={13} className="text-[#46644b] flex-shrink-0" />
                      طباعة كل الإيصالات
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk approve/reject triggers */}
              {selectedSession.accountingStatus === "PENDING_REVIEW" && (
                <>
                  {isDifferenceAccepted(selectedSession) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onApproveSessionReview(selectedSession.id);
                          setSelectedSession(null);
                        }}
                        className="rounded-full bg-[#46644b] px-5 py-2 text-xs font-bold text-white hover:bg-[#39523d] transition shadow-md"
                      >
                        {getTranslation("pos.review.approveSession", "اعتماد وترحيل الوردية")}
                      </button>
                      {onRejectSessionReview && (
                        <button
                          type="button"
                          onClick={() => {
                            onRejectSessionReview(selectedSession.id);
                            setSelectedSession(null);
                          }}
                          className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                        >
                          {getTranslation("pos.review.reject", "رفض الوردية")}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDiffDecision("ACCEPT");
                          setDiffReason("");
                          setIsDiffModalOpen(true);
                        }}
                        className="rounded-full bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition shadow-md"
                      >
                        {getTranslation("pos.review.reviewCashDifference", "مراجعة فرق الكاش")}
                      </button>
                      {onRejectSessionReview && (
                        <button
                          type="button"
                          onClick={() => {
                            onRejectSessionReview(selectedSession.id);
                            setSelectedSession(null);
                          }}
                          className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                        >
                          {getTranslation("pos.review.reject", "رفض الوردية")}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Metadata summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="block text-xs font-semibold text-gray-500 mb-1">{getTranslation("pos.sessions.cashierLabel", "الكاشير")}</span>
            <span className="text-lg font-bold text-[#233329]">
              {localizeDisplayText(selectedSession.cashierUser?.name || selectedSession.cashierUser?.email)}
            </span>
          </Card>
          <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="block text-xs font-semibold text-gray-500 mb-1">{getTranslation("pos.sessions.branch", "الفرع")}</span>
            <span className="text-lg font-bold text-[#233329]">
              {localizeDisplayText(selectedSession.branchName)}
            </span>
          </Card>
          <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="block text-xs font-semibold text-gray-500 mb-1">{getTranslation("pos.sessions.warehouse", "المستودع")}</span>
            <span className="text-lg font-bold text-[#233329]">
              {localizeDisplayText(selectedSession.warehouse?.name)}
            </span>
          </Card>
          <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="block text-xs font-semibold text-gray-500 mb-1">{getTranslation("pos.review.openCloseTime", "وقت الفتح / الإغلاق")}</span>
            <span className="text-lg font-bold text-[#233329]">
              {formatDate(selectedSession.openedAt)}
            </span>
          </Card>
        </div>

        {/* Tab selection */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {[
            { id: "overview" as const, label: getTranslation("pos.review.tabOverview", "نظرة عامة"), icon: LuEye },
            { id: "invoices" as const, label: getTranslation("pos.sessions.invoices", "الفواتير"), icon: LuFileText },
            { id: "cash" as const, label: getTranslation("pos.review.tabCash", "جرد الكاش"), icon: LuDollarSign },
            { id: "inventory" as const, label: getTranslation("pos.review.tabInventory", "أثر المخزون"), icon: LuBuilding },
            { id: "journal" as const, label: getTranslation("pos.review.tabJournal", "معاينة القيد"), icon: LuRefreshCw },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200",
                activeTab === id
                  ? "bg-[#46644b] text-white shadow-md shadow-[#46644b]/10 scale-105"
                  : "border border-[#d6e1d9] bg-white text-[#46644b] hover:bg-[#eff4f0]",
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab contents rendered inside main page */}
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Detailed metrics tiles */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {/* 1. الرصيد الافتتاحي */}
                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                  <div className="space-y-1 text-right">
                    <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.openingCash", "الرصيد الافتتاحي")}</span>
                    <span className="block text-xl font-bold text-gray-900">{selectedSession.openingCash}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
                    <LuCalculator size={20} />
                  </div>
                </div>

                {/* 2. الكاش المتوقع */}
                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                  <div className="space-y-1 text-right">
                    <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.expectedCash", "الكاش المتوقع")}</span>
                    <span className="block text-xl font-bold text-gray-900">{selectedSession.expectedCash}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                    <LuDollarSign size={20} />
                  </div>
                </div>

                {/* 3. الكاش الفعلي */}
                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                  <div className="space-y-1 text-right">
                    <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.actualCash", "الكاش الفعلي")}</span>
                    <span className="block text-xl font-bold text-gray-900">{selectedSession.actualCash || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                    <LuCreditCard size={20} />
                  </div>
                </div>

                {/* 4. فارق الكاش */}
                {(() => {
                  const diffVal = Number(selectedSession.difference || 0);
                  const hasDifference = diffVal !== 0;
                  return (
                    <div className={cn(
                      "flex items-center justify-between rounded-2xl border p-5 shadow-sm transition hover:shadow-md",
                      hasDifference
                        ? "border-red-100 bg-red-50/20 hover:border-red-200"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    )}>
                      <div className="space-y-1 text-right">
                        <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.cashDifference", "فارق الكاش")}</span>
                        <span className={cn(
                          "block text-xl font-bold",
                          hasDifference ? "text-red-600" : "text-[#233329]"
                        )}>
                          {selectedSession.difference || "—"}
                        </span>
                      </div>
                      <div className={cn(
                        "p-3 rounded-xl",
                        hasDifference ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                      )}>
                        <LuCircleAlert size={20} />
                      </div>
                    </div>
                  );
                })()}

                {/* 5. صافي المبيعات */}
                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                  <div className="space-y-1 text-right">
                    <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.sessions.totalSales", "صافي المبيعات")}</span>
                    <span className="block text-xl font-bold text-gray-900">{selectedSession.totalSales || "0.00"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                    <LuTag size={20} />
                  </div>
                </div>

                {/* 6. عدد الفواتير */}
                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                  <div className="space-y-1 text-right">
                    <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.sessions.invoices", "عدد الفواتير")}</span>
                    <span className="block text-xl font-bold text-gray-900">{selectedSession.invoiceCount ?? 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                    <LuFileText size={20} />
                  </div>
                </div>
              </div>

              {/* Note / Notes if present */}
              {selectedSession.notes && (
                <div className="rounded-[18px] border border-amber-100 bg-amber-50/30 p-4 text-sm text-[#233329]">
                  <span className="font-bold block text-xs text-amber-800 uppercase mb-1">{getTranslation("pos.review.sessionNotes", "ملاحظات الوردية")}</span>
                  {selectedSession.notes}
                </div>
              )}
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#233329] mb-2">{getTranslation("pos.review.invoicesListTitle", "قائمة الفواتير المكتملة والمرتجع للوردية")}</div>

              {invoiceList.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-8 text-center text-sm text-[#64736b]">
                  {getTranslation("pos.review.noInvoices", "لا توجد فواتير مسجلة في هذه الوردية.")}
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-100 rounded-2xl bg-white">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#e1e7e2] bg-gray-50 text-[#6d7b73] font-bold">
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerReference", "المرجع")}</th>
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerDate", "التاريخ")}</th>
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerCustomer", "العميل")}</th>
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerOrderType", "نوع الطلب")}</th>
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerPaymentMethod", "طريقة الدفع")}</th>
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerTotal", "الإجمالي")}</th>
                        <th className="px-3 py-3 text-center">{getTranslation("pos.review.headerReviewStatus", "حالة المراجعة")}</th>
                        <th className="px-3 py-3 text-center">{getTranslation("payroll.column.action", "الإجراءات")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f0]">
                      {invoiceList.map((inv) => {
                        const isSale = inv.type === "sale";
                        const salePayments = isSale
                          ? (inv.raw.payments || [])
                              .map((p: any) => localizePaymentMethod(p.paymentMethod))
                              .join(", ")
                          : getTranslation("pos.review.cashPaymentMethod", "كاش");

                        return (
                          <tr key={inv.id} className="hover:bg-gray-50/50 transition text-xs">
                            <td className="px-3 py-3 font-bold text-gray-900">
                              {inv.reference}
                              {!isSale && <span className="mr-1.5 text-[10px] text-red-600 font-extrabold">({getTranslation("pos.review.returnBadge", "مرتجع")})</span>}
                            </td>
                            <td className="px-3 py-3 text-gray-500">{formatDate(inv.date)}</td>
                            <td className="px-3 py-3 text-gray-700 font-semibold">{localizeDisplayText(inv.customer)}</td>
                            <td className="px-3 py-3 text-gray-700 font-semibold">
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
                                {getInvoiceReviewStatusLabel(inv.status)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => isSale && setActiveInvoiceDetail(inv.raw)}
                                disabled={!isSale}
                                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition"
                              >
                                {getTranslation("pos.review.viewDetails", "عرض التفاصيل")}
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
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {/* 1. الرصيد الافتتاحي */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                      <div className="space-y-1 text-right">
                        <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.openingCash", "الرصيد الافتتاحي")}</span>
                        <span className="block text-xl font-bold text-gray-900">{report.openingCash}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
                        <LuCalculator size={20} />
                      </div>
                    </div>

                    {/* 2. مبيعات الكاش */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                      <div className="space-y-1 text-right">
                        <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.cashSales", "مبيعات الكاش")}</span>
                        <span className="block text-xl font-bold text-gray-900">{report.cashSales}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                        <LuDollarSign size={20} />
                      </div>
                    </div>

                    {/* 3. مرتجعات الكاش */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                      <div className="space-y-1 text-right">
                        <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.cashRefunds", "مرتجعات الكاش")}</span>
                        <span className="block text-xl font-bold text-gray-900">{report.cashRefunds}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                        <LuX size={20} />
                      </div>
                    </div>

                    {/* 4. الكاش المتوقع */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                      <div className="space-y-1 text-right">
                        <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.expectedCash", "الكاش المتوقع")}</span>
                        <span className="block text-xl font-bold text-gray-900">{report.expectedCash}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                        <LuCreditCard size={20} />
                      </div>
                    </div>

                    {/* 5. الكاش الفعلي المعدود */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200">
                      <div className="space-y-1 text-right">
                        <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.actualCash", "الكاش الفعلي المعدود")}</span>
                        <span className="block text-xl font-bold text-gray-900">{report.actualCash ?? "—"}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                        <LuCheck size={20} />
                      </div>
                    </div>

                    {/* 6. فارق الكاش */}
                    {(() => {
                      const diffVal = Number(report.difference || 0);
                      const hasDifference = diffVal !== 0;
                      return (
                        <div className={cn(
                          "flex items-center justify-between rounded-2xl border p-5 shadow-sm transition hover:shadow-md",
                          hasDifference
                            ? "border-red-100 bg-red-50/20 hover:border-red-200"
                            : "border-gray-100 bg-white hover:border-gray-200"
                        )}>
                          <div className="space-y-1 text-right">
                            <span className="block text-xs font-semibold text-gray-500">{getTranslation("pos.review.cashDifference", "فارق الكاش")}</span>
                            <span className={cn(
                              "block text-xl font-bold",
                              hasDifference ? "text-red-600" : "text-[#233329]"
                            )}>
                              {report.difference ?? "—"}
                            </span>
                          </div>
                          <div className={cn(
                            "p-3 rounded-xl",
                            hasDifference ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                          )}>
                            <LuCircleAlert size={20} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Payments mix breakdown */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden mt-4">
                    <div className="bg-gray-50 p-3 font-bold text-xs uppercase text-gray-600">{getTranslation("pos.review.paymentBreakdownTitle", "تفاصيل وسائل الدفع المستلمة")}</div>
                    {paymentsBreakdown.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">{getTranslation("pos.review.noPaymentDetails", "لا توجد تفاصيل مدفوعات.")}</div>
                    ) : (
                      <div className="divide-y divide-gray-100 bg-white">
                        {paymentsBreakdown.map(([method, data]) => (
                          <div key={method} className="p-3 flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-900">{localizePaymentMethod(method)}</span>
                            <span className="font-bold text-[#46644b]">
                              {data.total.toFixed(2)} ({t("pos.sessions.invoices")} {data.count})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-gray-500">{getTranslation("pos.review.loadingCashDetails", "جار جلب تفاصيل الجرد...")}</div>
              )}
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#233329] mb-2">{getTranslation("pos.review.inventoryImpact", "أثر المخزون")}</div>
              {inventoryRows.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-8 text-center text-sm text-[#64736b]">
                  {getTranslation("pos.review.noInventoryImpact", "لا يوجد أثر مخزني للوردية الحالية.")}
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-100 rounded-2xl bg-white">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#e1e7e2] bg-gray-50 text-[#6d7b73] font-bold">
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerSale", "البيع")}</th>
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerItem", "الصنف")}</th>
                        <th className="px-3 py-3 text-center">{getTranslation("pos.review.headerQuantity", "الكمية")}</th>
                        <th className="px-3 py-3 text-start">{getTranslation("pos.review.headerWarehouse", "المستودع")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f0]">
                      {inventoryRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition text-xs">
                          <td className="px-3 py-3.5 font-bold text-gray-900">{row.saleReference}</td>
                          <td className="px-3 py-3.5 text-gray-700 font-semibold">{row.itemName}</td>
                          <td className="px-3 py-3.5 text-center font-bold text-gray-900">{row.quantity}</td>
                          <td className="px-3 py-3.5 text-gray-600 font-semibold">{row.warehouse}</td>
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
              <div className="text-sm font-bold text-[#233329] mb-2">{getTranslation("pos.review.tabJournal", "معاينة القيد المحاسبي")}</div>
              <div className="space-y-4">
                {orderedJournalEntries.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-8 text-center text-sm text-[#64736b]">
                    {getTranslation("pos.review.noJournals", "لا توجد قيود محاسبية مسودة مرتبطة بالوردية المختارة.")}
                  </div>
                ) : (
                  orderedJournalEntries.map(({ entry, sourceReference, sourceType }) => (
                    <div
                      key={`${entry.id}-${sourceReference}`}
                      className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2 mb-2">
                        <div className="space-y-1">
                          <div className="font-bold text-[#233329]">{entry.reference}</div>
                          <div className="text-[11px] font-semibold text-[#5f6d66]">
                            {getTranslation("pos.review.headerReference", "المرجع")}: {sourceReference}
                            {" · "}
                            {sourceType}
                          </div>
                        </div>
                        <div className="font-bold text-[#5f6d66]">{entry.status}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_120px_120px] font-bold text-gray-500 border-b border-gray-100 pb-1">
                          <span>{getTranslation("pos.review.journalHeaderAccount", "الحساب")}</span>
                          <span className="text-left">{getTranslation("pos.review.journalHeaderDebit", "مدين")}</span>
                          <span className="text-left">{getTranslation("pos.review.journalHeaderCredit", "دائن")}</span>
                        </div>
                        {entry.lines.map((line) => (
                          <div
                            key={line.id}
                            className="grid grid-cols-[1fr_120px_120px] text-gray-700"
                          >
                            <span className="font-semibold">
                              {line.accountCode} · {isArabic ? line.accountNameAr || line.accountName : line.accountName}
                            </span>
                            <span className="text-left font-bold text-emerald-700">{line.debitAmount !== "0.00" ? line.debitAmount : "—"}</span>
                            <span className="text-left font-bold text-rose-700">{line.creditAmount !== "0.00" ? line.creditAmount : "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Cash Discrepancy Resolution Modal */}
        <Modal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          title={getTranslation("pos.review.differenceModalTitle", "قبول فرق الصندوق")}
          size="md"
        >
          {selectedSession && (
            <div className="space-y-4 text-start" dir={pageDir}>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                <div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">{getTranslation("pos.review.expectedAmount", "المبلغ المتوقع (الكاش)")}</span>
                  <span className="text-base font-bold text-[#233329]">
                    {Number(selectedSession.expectedCash || 0).toFixed(2)} JOD
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">{getTranslation("pos.review.actualAmount", "المبلغ الفعلي (الفعلي)")}</span>
                  <span className="text-base font-bold text-[#233329]">
                    {Number(selectedSession.actualCash || 0).toFixed(2)} JOD
                  </span>
                </div>
                <div className="col-span-2 border-t border-gray-200 pt-3">
                  <span className="block text-xs font-semibold text-gray-500 mb-1">{getTranslation("pos.sessions.difference", "الفارق")}</span>
                  <span className={cn(
                    "text-lg font-black",
                    Number(selectedSession.difference || 0) < 0 ? "text-red-600" : "text-emerald-600"
                  )}>
                    {Number(selectedSession.difference || 0).toFixed(2)} JOD
                    <span className="text-xs font-bold mr-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {Number(selectedSession.difference || 0) < 0
                        ? getTranslation("pos.review.shortage", "عجز")
                        : getTranslation("pos.review.overage", "زيادة")}
                    </span>
                  </span>
                </div>
              </div>

              {/* Resolution Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{getTranslation("pos.review.decision", "اتخاذ القرار")}</label>
                  <div className="w-full rounded-xl border border-[#dbe2dd] bg-[#f8faf8] px-3 py-2 text-sm font-semibold text-[#233329]">
                    {getTranslation("pos.review.acceptDifference", "قبول الفرق")}
                  </div>
                </div>

                {/* Warning message if above tolerance and not a manager */}
                {(() => {
                  const diffVal = Math.abs(Number(selectedSession.difference || 0));
                  const tolerance = Number(process.env.NEXT_PUBLIC_POS_CASH_TOLERANCE) || 10.0;
                  const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
                  if (diffDecision === "ACCEPT" && diffVal > tolerance && !isManagerOrAdmin) {
                    return (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
                        <LuCircleAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{getTranslation("pos.review.differenceToleranceWarning", `فرق الصندوق أعلى من الحد المسموح (${tolerance} JOD) ويتطلب موافقة مدير.`).replace("{tolerance}", String(tolerance))}</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {getTranslation("pos.review.reasonNotes", "السبب / الملاحظات")} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={diffReason}
                    onChange={(e) => setDiffReason(e.target.value)}
                    rows={3}
                    placeholder={getTranslation("pos.review.reasonPlaceholder", "يرجى إدخال تفاصيل القرار المتخذ وسبب القبول أو الرفض...")}
                    className="w-full rounded-xl border border-gray-200 p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#46644b]"
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDiffModalOpen(false)}
                    className="rounded-full border border-gray-200 bg-white px-5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    {getTranslation("common.cancel", "إلغاء")}
                  </button>
                  <button
                    type="button"
                    disabled={(() => {
                      if (!diffReason.trim()) return true;
                      const diffVal = Math.abs(Number(selectedSession.difference || 0));
                      const tolerance = Number(process.env.NEXT_PUBLIC_POS_CASH_TOLERANCE) || 10.0;
                      const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
                      if (diffDecision === "ACCEPT" && diffVal > tolerance && !isManagerOrAdmin) {
                        return true;
                      }
                      return false;
                    })()}
                    onClick={() => {
                      onApproveSessionReview(selectedSession.id, diffDecision, diffReason);
                      setIsDiffModalOpen(false);
                      setSelectedSession(null);
                    }}
                    className={cn(
                      "rounded-full px-5 py-2 text-xs font-bold text-white transition shadow-md",
                      diffDecision === "ACCEPT" ? "bg-[#46644b] hover:bg-[#39523d]" :
                      diffDecision === "CORRECTION" ? "bg-amber-600 hover:bg-amber-700" :
                      diffDecision === "REJECT" ? "bg-red-600 hover:bg-red-700" :
                      "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    {getTranslation("pos.review.confirmDecision", "تأكيد القرار")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Compact Read-only Invoice Details Modal */}
        <Modal
          isOpen={activeInvoiceDetail !== null}
          onClose={() => setActiveInvoiceDetail(null)}
          title={`${getTranslation("pos.review.receipt", "تفاصيل الفاتورة")}: ${
            activeInvoiceDetail?.reference ?? ""
          }`}
          size="3xl"
        >
          {activeInvoiceDetail && (
            <div className="space-y-6 text-start" dir={pageDir}>
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                <div>
                  <span className="font-bold block text-[10px] text-gray-400 uppercase mb-0.5">{getTranslation("pos.sessions.branch", "الفرع")}</span>
                  <span className="text-gray-900 font-bold">{localizeDisplayText(activeInvoiceDetail.session?.branchName || selectedSession?.branchName)}</span>
                </div>
                <div>
                  <span className="font-bold block text-[10px] text-gray-400 uppercase mb-0.5">{getTranslation("pos.review.headerDate", "التاريخ")}</span>
                  <span className="text-gray-900 font-bold">{formatDate(activeInvoiceDetail.invoiceDate)}</span>
                </div>
                <div>
                  <span className="font-bold block text-[10px] text-gray-400 uppercase mb-0.5">{getTranslation("pos.sessions.warehouse", "المستودع")}</span>
                  <span className="text-gray-900 font-bold">{localizeDisplayText(activeInvoiceDetail.session?.warehouse?.name || selectedSession?.warehouse?.name)}</span>
                </div>
                <div>
                  <span className="font-bold block text-[10px] text-gray-400 uppercase mb-0.5">{getTranslation("pos.review.headerOrderType", "نوع الطلب")}</span>
                  <span className="text-gray-900 font-bold">{t(`pos.orderType.${activeInvoiceDetail.orderType}`)}</span>
                </div>
              </div>

              {/* Invoice Lines */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 font-bold text-xs uppercase text-gray-600 border-b border-gray-100">{getTranslation("pos.review.soldItems", "الأصناف المباعة")}</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 font-semibold">
                        <th className="px-4 py-2 text-start">{getTranslation("pos.review.headerItem", "الصنف")}</th>
                        <th className="px-4 py-2 text-center">{getTranslation("pos.review.headerQuantity", "الكمية")}</th>
                        <th className="px-4 py-2 text-start">{getTranslation("pos.review.unitPrice", "سعر الوحدة")}</th>
                        <th className="px-4 py-2 text-left">{getTranslation("pos.review.headerTotal", "الإجمالي")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {activeInvoiceDetail.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{localizeDisplayText(line.itemName || line.description)}</td>
                          <td className="px-4 py-3 text-center text-gray-700 font-bold">{line.quantity}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {line.unitPrice} {activeInvoiceDetail.currencyCode}
                          </td>
                          <td className="px-4 py-3 text-left font-bold text-gray-900">
                            {line.lineAmount} {activeInvoiceDetail.currencyCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 font-bold text-xs uppercase text-gray-600 border-b border-gray-100">{getTranslation("pos.review.paymentDetails", "تفاصيل الدفع")}</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 font-semibold">
                        <th className="px-4 py-2 text-start">{getTranslation("pos.review.headerPaymentMethod", "طريقة الدفع")}</th>
                        <th className="px-4 py-2 text-start">{getTranslation("pos.review.headerReference", "المرجع")}</th>
                        <th className="px-4 py-2 text-left">{getTranslation("pos.review.amount", "المبلغ")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {activeInvoiceDetail.payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{getPaymentDisplayLabel(payment)}</td>
                          <td className="px-4 py-3 text-gray-500">{payment.reference || "—"}</td>
                          <td className="px-4 py-3 text-left font-bold text-gray-900">
                            {payment.amount} {activeInvoiceDetail.currencyCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">{getTranslation("pos.review.subtotal", "الإجمالي قبل الضريبة")}</span>
                  <span className="font-semibold text-gray-900">{activeInvoiceDetail.subtotalAmount} {activeInvoiceDetail.currencyCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{getTranslation("pos.review.discount", "الخصم")}</span>
                  <span className="font-semibold text-red-600">-{activeInvoiceDetail.discountAmount} {activeInvoiceDetail.currencyCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{getTranslation("pos.review.tax", "الضريبة")}</span>
                  <span className="font-semibold text-gray-900">{activeInvoiceDetail.taxAmount} {activeInvoiceDetail.currencyCode}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3 font-bold text-base text-gray-900">
                  <span>{getTranslation("pos.review.finalTotal", "الإجمالي النهائي")}</span>
                  <span>{activeInvoiceDetail.totalAmount} {activeInvoiceDetail.currencyCode}</span>
                </div>
              </div>

              {/* Individual Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                {activeJournalEntry ? (
                  <button
                    type="button"
                    onClick={() => setIsJournalDetailOpen(true)}
                    className="me-auto rounded-full border border-[#d9e4db] bg-[#f7fbf8] px-5 py-2.5 text-sm font-bold text-[#355240] hover:bg-[#edf6ef] transition"
                  >
                    {getTranslation("pos.review.viewJournalEntry", "عرض القيد المحاسبي")}
                  </button>
                ) : null}
                {isSessionPosting ? (
                  <>
                    <div className={cn("text-xs font-semibold text-[#5f6d66]", activeJournalEntry ? "" : "me-auto")}>
                      {getTranslation(
                        "pos.review.sessionPostingOnly",
                        "يتم ترحيل محاسبة نقاط البيع على مستوى الوردية فقط.",
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCorrectionModal(activeInvoiceDetail);
                      }}
                      className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                    >
                      {t("pos.review.correctOrderType")}
                    </button>
                    <button
                      type="button"
                      disabled={activeInvoiceDetail.payments.length !== 1}
                      onClick={() => {
                        onOpenPaymentCorrectionModal(activeInvoiceDetail);
                      }}
                      className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("pos.review.correctPaymentMethod")}
                    </button>
                  </>
                ) : activeInvoiceDetail.posAccountingStatus === "POSTED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      onReverseReview(activeInvoiceDetail.id);
                      setActiveInvoiceDetail(null);
                    }}
                    className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition"
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
                      className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                    >
                      {t("pos.review.correctOrderType")}
                    </button>
                    <button
                      type="button"
                      disabled={activeInvoiceDetail.payments.length !== 1}
                      onClick={() => {
                        onOpenPaymentCorrectionModal(activeInvoiceDetail);
                      }}
                      className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("pos.review.correctPaymentMethod")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onApproveReview(activeInvoiceDetail.id);
                        setActiveInvoiceDetail(null);
                      }}
                      className="rounded-full bg-[#46644b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#39523d] transition"
                    >
                      {t("pos.review.approve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRejectReview(activeInvoiceDetail.id);
                        setActiveInvoiceDetail(null);
                      }}
                      className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition"
                    >
                      {t("pos.review.reject")}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={isJournalDetailOpen && activeJournalEntry !== null}
          onClose={() => setIsJournalDetailOpen(false)}
          title={`${getTranslation("pos.review.viewJournalEntry", "عرض القيد المحاسبي")}: ${
            activeJournalEntry?.reference ?? ""
          }`}
          size="3xl"
        >
          {activeJournalEntry ? (
            <div className="space-y-5 text-start" dir={pageDir}>
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm md:grid-cols-4">
                <div>
                  <span className="mb-0.5 block text-[10px] font-bold uppercase text-gray-400">
                    {getTranslation("pos.review.headerReference", "المرجع")}
                  </span>
                  <span className="font-bold text-gray-900">{activeJournalEntry.reference}</span>
                </div>
                <div>
                  <span className="mb-0.5 block text-[10px] font-bold uppercase text-gray-400">
                    {getTranslation("pos.review.headerDate", "التاريخ")}
                  </span>
                  <span className="font-bold text-gray-900">{formatDate(activeJournalEntry.entryDate)}</span>
                </div>
                <div>
                  <span className="mb-0.5 block text-[10px] font-bold uppercase text-gray-400">
                    {getTranslation("pos.review.status", "الحالة")}
                  </span>
                  <span className="font-bold text-gray-900">{activeJournalEntry.status}</span>
                </div>
                <div>
                  <span className="mb-0.5 block text-[10px] font-bold uppercase text-gray-400">
                    {activeJournalEntryLabel}
                  </span>
                  <span className="font-bold text-gray-900">
                    {activeInvoiceDetail?.reference || "—"}
                  </span>
                </div>
              </div>

              {activeJournalEntry.description ? (
                <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700">
                  {activeJournalEntry.description}
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-gray-500">
                      <th className="px-4 py-3 text-start font-bold">
                        {getTranslation("pos.review.account", "الحساب")}
                      </th>
                      <th className="px-4 py-3 text-start font-bold">
                        {getTranslation("pos.review.description", "الوصف")}
                      </th>
                      <th className="px-4 py-3 text-end font-bold">
                        {getTranslation("pos.review.debit", "مدين")}
                      </th>
                      <th className="px-4 py-3 text-end font-bold">
                        {getTranslation("pos.review.credit", "دائن")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {activeJournalEntry.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {localizeDisplayText(
                            isArabic ? line.accountNameAr || line.accountName : line.accountName,
                            line.accountCode || "—",
                          )}
                          {line.accountCode ? (
                            <div className="mt-1 text-xs font-medium text-gray-500">{line.accountCode}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{line.description || "—"}</td>
                        <td className="px-4 py-3 text-end font-bold text-[#0f8f67]">{line.debitAmount}</td>
                        <td className="px-4 py-3 text-end font-bold text-[#b42318]">{line.creditAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsJournalDetailOpen(false)}
                  className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  {getTranslation("common.close", "إغلاق")}
                </button>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Correct Order Type Modal (unchanged business logic) */}
        <Modal
          isOpen={isCorrectOrderTypeOpen}
          onClose={onCloseCorrectionModal}
          title={t("pos.review.correctOrderTypeModal")}
          size="3xl"
        >
          <div className="space-y-4 text-start" dir={pageDir}>
            <Field label={getTranslation("pos.review.orderType", "نوع الطلب")} required labelAlign="start">
              <select
                value={correctionOrderType}
                onChange={(event) => onCorrectionOrderTypeChange(event.target.value as PosOrderType)}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
              >
                <option value="DINE_IN">{getTranslation("pos.orderType.DINE_IN", "صالة")}</option>
                <option value="TAKEAWAY">{getTranslation("pos.orderType.TAKEAWAY", "سفري")}</option>
                <option value="DELIVERY">{getTranslation("pos.orderType.DELIVERY", "توصيل")}</option>
                <option value="PICKUP">{getTranslation("pos.orderType.PICKUP", "استلام")}</option>
              </select>
            </Field>
            {correctionOrderType === "DINE_IN" ? (
              <Field label={getTranslation("pos.review.selectTable", "اختر الطاولة")} required labelAlign="start">
                <select
                  value={correctionTableId}
                  onChange={(event) => onCorrectionTableIdChange(event.target.value)}
                  className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                >
                  <option value="">{getTranslation("pos.review.selectTable", "اختر الطاولة")}</option>
                  {restaurantTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.tableNumber}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            {correctionOrderType === "DELIVERY" ? (
              <>
                <Field label={getTranslation("pos.review.selectDeliveryCompany", "شركة التوصيل")} required labelAlign="start">
                  <select
                    value={correctionDeliveryCompanyId}
                    onChange={(event) => onCorrectionDeliveryCompanyIdChange(event.target.value)}
                    className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                  >
                    <option value="">{getTranslation("pos.review.selectDeliveryCompany", "اختر شركة التوصيل")}</option>
                    {deliveryCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={getTranslation("pos.review.selectDriver", "السائق")} labelAlign="start">
                  <select
                    value={correctionDriverId}
                    onChange={(event) => onCorrectionDriverIdChange(event.target.value)}
                    className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                  >
                    <option value="">{getTranslation("pos.review.selectDriver", "اختر السائق")}</option>
                    {deliveryDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}
            <Field label={getTranslation("pos.review.serviceCharge", "رسوم الخدمة")} labelAlign="start">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={correctionServiceCharge}
                onChange={(event) => onCorrectionServiceChargeChange(event.target.value)}
                placeholder={getTranslation("pos.review.serviceCharge", "رسوم الخدمة")}
                className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
              />
            </Field>
            <Field label={getTranslation("pos.review.deliveryFee", "رسوم التوصيل")} labelAlign="start">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={correctionDeliveryFee}
                onChange={(event) => onCorrectionDeliveryFeeChange(event.target.value)}
                placeholder={getTranslation("pos.review.deliveryFee", "رسوم التوصيل")}
                className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
              />
            </Field>
            <Field label={getTranslation("pos.review.correctionReason", "سبب التصحيح")} required labelAlign="start">
              <Input
                value={correctionReason}
                onChange={(event) => onCorrectionReasonChange(event.target.value)}
                placeholder={getTranslation("pos.review.correctionReason", "سبب التصحيح")}
                className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
              />
            </Field>
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

        <Modal
          isOpen={isCorrectPaymentMethodOpen}
          onClose={onClosePaymentCorrectionModal}
          title={t("pos.review.correctPaymentMethodModal")}
          size="3xl"
        >
          <div className="space-y-4 text-start" dir={pageDir}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#d6e1d9] bg-[#f8fbf8] px-4 py-3">
                <div className="text-xs font-semibold text-[#6c7b73]">
                  {getTranslation("pos.review.invoiceNumber", "رقم الفاتورة")}
                </div>
                <div className="mt-1 text-sm font-bold text-[#233329]">
                  {selectedPaymentCorrectionSale?.reference || "—"}
                </div>
              </div>
              <div className="rounded-[18px] border border-[#d6e1d9] bg-[#f8fbf8] px-4 py-3">
                <div className="text-xs font-semibold text-[#6c7b73]">
                  {getTranslation("pos.review.invoiceTotal", "إجمالي الفاتورة")}
                </div>
                <div className="mt-1 text-sm font-bold text-[#233329]">
                  {selectedPaymentCorrectionSale?.totalAmount || "0.00"} {selectedPaymentCorrectionSale?.currencyCode || ""}
                </div>
              </div>
              <div className="rounded-[18px] border border-[#d6e1d9] bg-[#f8fbf8] px-4 py-3 sm:col-span-2">
                <div className="text-xs font-semibold text-[#6c7b73]">
                  {getTranslation("pos.review.currentPaymentMethod", "طريقة الدفع الحالية")}
                </div>
                <div className="mt-1 text-sm font-bold text-[#233329]">
                  {getPaymentDisplayLabel(selectedPaymentCorrectionSale?.payments?.[0])}
                </div>
              </div>
            </div>

            <Field label={getTranslation("pos.review.newPaymentMethod", "طريقة الدفع الجديدة")} required labelAlign="start">
              <select
                value={
                  correctionPaymentMethod === "DELIVERY" && correctionPaymentDeliveryCompanyId
                    ? `DELIVERY:${correctionPaymentDeliveryCompanyId}`
                    : correctionPaymentMethod
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.startsWith("DELIVERY:")) {
                    onCorrectionPaymentMethodChange("DELIVERY");
                    onCorrectionPaymentDeliveryCompanyIdChange(value.slice("DELIVERY:".length));
                    return;
                  }
                  onCorrectionPaymentMethodChange(value as PosPaymentMethod);
                  onCorrectionPaymentDeliveryCompanyIdChange("");
                }}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
              >
                {availablePaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {localizePaymentMethod(method)}
                  </option>
                ))}
                {deliveryCompanies.map((company) => (
                  <option key={company.id} value={`DELIVERY:${company.id}`}>
                    {getTranslation("pos.review.paymentMethodDeliveryCompany", "شركة توصيل")}:{" "}
                    {localizeDisplayText(isArabic ? company.arabicName || company.name : company.name)}
                  </option>
                ))}
              </select>
            </Field>

            {paymentRequiresReference(correctionPaymentMethod) ? (
              <Field label={getTranslation("pos.review.paymentReference", "رقم المرجع")} required labelAlign="start">
                <Input
                  value={correctionPaymentReference}
                  onChange={(event) => onCorrectionPaymentReferenceChange(event.target.value)}
                  placeholder={getTranslation("pos.review.paymentReference", "رقم المرجع")}
                  className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
                />
              </Field>
            ) : null}

            <Field label={getTranslation("pos.review.correctionReason", "سبب التصحيح")} required labelAlign="start">
              <textarea
                value={correctionPaymentReason}
                onChange={(event) => onCorrectionPaymentReasonChange(event.target.value)}
                placeholder={getTranslation("pos.review.correctionReason", "سبب التصحيح")}
                className="min-h-[110px] w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329] outline-none ring-0"
              />
            </Field>

            <button
              type="button"
              disabled={
                !selectedPaymentCorrectionSale ||
                !correctionPaymentReason.trim() ||
                (correctionPaymentMethod === "DELIVERY" && !correctionPaymentDeliveryCompanyId) ||
                (paymentRequiresReference(correctionPaymentMethod) && !correctionPaymentReference.trim()) ||
                savingPaymentCorrection
              }
              onClick={onSavePaymentCorrection}
              className="w-full rounded-[18px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {t("pos.review.saveCorrection")}
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  // MAIN SESSIONS LIST DASHBOARD RENDER
  return (
    <div className="space-y-6 text-start" dir={pageDir}>
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
              <span className="text-[#64736b] text-xs">{getTranslation("common.to", "إلى")}</span>
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
              <option value="">{getTranslation("pos.review.allBranches", "كل الفروع")}</option>
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
              <option value="">{getTranslation("pos.review.allCashiers", "كل الكاشيرز")}</option>
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
              <option value="">{getTranslation("pos.review.allStatuses", "كل الحالات")}</option>
              <option value="PENDING_REVIEW">{getAccountingStatusLabel("PENDING_REVIEW")}</option>
              <option value="POSTED">{getAccountingStatusLabel("POSTED")}</option>
              <option value="REJECTED">{getAccountingStatusLabel("REJECTED")}</option>
              <option value="OPEN">{getAccountingStatusLabel("OPEN")}</option>
              <option value="CLOSED">{getAccountingStatusLabel("CLOSED")}</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="rounded-[16px] border border-[#d6e1d9] bg-white px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none"
            >
              <option value="">{getTranslation("pos.sales.paymentLabel", "طريقة الدفع")}</option>
              <option value="CASH">{getTranslation("pos.review.paymentMethodCash", "نقدي (Cash)")}</option>
              <option value="CARD">{getTranslation("pos.review.paymentMethodCard", "بطاقة (Card)")}</option>
              <option value="DELIVERY">{getTranslation("pos.review.paymentMethodDelivery", "شركات التوصيل")}</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              <LuFilterX size={14} className="ml-1" />
              <span>{getTranslation("common.reset", "إعادة تعيين")}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{getTranslation("pos.sessions.totalSales", "إجمالي المبيعات")}</span>
            <LuDollarSign className="text-emerald-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.totalSales}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{getTranslation("pos.sessions.cashSales", "المبيعات النقدية")}</span>
            <LuCreditCard className="text-blue-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.cashSales}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{getTranslation("pos.sessions.cardSales", "مبيعات الشبكة")}</span>
            <LuCreditCard className="text-[#5f8a67]" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.cardSales}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{getTranslation("pos.review.paymentMethodDelivery", "شركات التوصيل")}</span>
            <LuTruck className="text-orange-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.deliverySales}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{getTranslation("pos.sessions.tax", "الضريبة")}</span>
            <LuPercent className="text-purple-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.tax}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{getTranslation("pos.sessions.discounts", "الخصومات")}</span>
            <LuTag className="text-red-500" size={16} />
          </div>
          <div className="mt-2 text-lg font-bold text-[#233329]">{summary.discounts}</div>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{getTranslation("pos.review.cashDifference", "فرق الصندوق")}</span>
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
                          {getAccountingStatusLabel(session.accountingStatus)}
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
                            <span>{getTranslation("pos.review.reviewAction", "مراجعة")}</span>
                          </button>

                          {isPending && (
                            <>
                              {isDifferenceAccepted(session) ? (
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
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSession(session);
                                      setDiffDecision("ACCEPT");
                                      setDiffReason("");
                                      setIsDiffModalOpen(true);
                                    }}
                                    className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
                                  >
                                    {getTranslation("pos.review.reviewDifference", "مراجعة الفرق")}
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
    </div>
  );
}
