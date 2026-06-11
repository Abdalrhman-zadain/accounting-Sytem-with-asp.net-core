"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, PageShell, SectionHeading } from "@/components/ui";
import { GeneralLedgerAccountSearch } from "./components/general-ledger-account-search";
import { ReportingSearchBar } from "./components/reporting-search-bar";
import type { ReportingFilterState } from "./components/reporting-search-utils";
import { ReportingKpiCards } from "./components/reporting-kpi-cards";
import { ReportingSummaryFooter } from "./components/reporting-summary-footer";
import { ReportingTable } from "./components/reporting-table";
import { ReportingToolbar } from "./components/reporting-toolbar";
import { ReportingActionBadge } from "./components/reporting-action-badge";
import type { ReportTab, TranslationFn } from "./reporting-types";
import {
  createReportingSnapshotVersion,
  createReportingDefinition,
  createReportingSnapshot,
  deactivateReportingDefinition,
  exportReporting,
  getAccountOptions,
  getJournalEntryTypes,
  getReportingActivity,
  getReportingAudit,
  getReportingBalanceSheet,
  getReportingCashMovement,
  getReportingCatalog,
  getReportingDefinitions,
  getReportingGeneralLedger,
  getReportingProfitLoss,
  getReportingSnapshots,
  getReportingSummary,
  getReportingTrialBalance,
  getReportingWarnings,
  lockReportingSnapshot,
  updateReportingDefinition,
  unlockReportingSnapshot,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  AccountOption,
  AccountType,
  JournalEntryType,
  ReportingActivityEntry,
  ReportingAuditReport,
  ReportingBalanceSheetReport,
  ReportingCatalogItem,
  ReportingCashMovementReport,
  ReportingDefinition,
  ReportingExportFormat,
  ReportingGeneralLedgerReport,
  ReportingProfitLossReport,
  ReportingQuery,
  ReportingSnapshot,
  ReportingTrialBalanceReport,
  ReportingWarning,
} from "@/types/api";

const tabs: Array<{ id: ReportTab; labelKey: string }> = [
  { id: "summary", labelKey: "reporting.tab.summary" },
  { id: "activity", labelKey: "reporting.tab.activity" },
  { id: "trialBalance", labelKey: "reporting.tab.trialBalance" },
  { id: "balanceSheet", labelKey: "reporting.tab.balanceSheet" },
  { id: "profitLoss", labelKey: "reporting.tab.profitLoss" },
  { id: "cashMovement", labelKey: "reporting.tab.cashMovement" },
  { id: "generalLedger", labelKey: "reporting.tab.generalLedger" },
  { id: "audit", labelKey: "reporting.tab.audit" },
];

const reportTypes = new Set<ReportTab>(tabs.map((tab) => tab.id));

export function ReportingPage() {
  const { token, user } = useAuth();
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<ReportTab>("generalLedger");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [comparisonFrom, setComparisonFrom] = useState("");
  const [comparisonTo, setComparisonTo] = useState("");
  const [basis, setBasis] = useState<"" | "ACCRUAL" | "CASH">("");
  const [includeZeroBalance, setIncludeZeroBalance] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accountType, setAccountType] = useState<AccountType | "">("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [segment3, setSegment3] = useState("");
  const [segment4, setSegment4] = useState("");
  const [segment5, setSegment5] = useState("");
  const [journalEntryTypeId, setJournalEntryTypeId] = useState("");
  const [definitionName, setDefinitionName] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [exportTitle, setExportTitle] = useState("");
  const [exportFormat, setExportFormat] = useState<ReportingExportFormat>("PRINT");
  const [shareDefinition, setShareDefinition] = useState(false);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

  const reportingFilters = useMemo<ReportingFilterState>(
    () => ({
      dateFrom,
      dateTo,
      comparisonFrom,
      comparisonTo,
      basis,
      includeZeroBalance,
      accountId,
      accountType,
      currencyCode,
      segment3,
      segment4,
      segment5,
      journalEntryTypeId,
    }),
    [
      accountId,
      accountType,
      basis,
      comparisonFrom,
      comparisonTo,
      currencyCode,
      dateFrom,
      dateTo,
      includeZeroBalance,
      journalEntryTypeId,
      segment3,
      segment4,
      segment5,
    ],
  );

  const applyReportingFilters = (filters: ReportingFilterState) => {
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
    setComparisonFrom(filters.comparisonFrom);
    setComparisonTo(filters.comparisonTo);
    setBasis(filters.basis);
    setIncludeZeroBalance(filters.includeZeroBalance);
    setAccountId(filters.accountId);
    setAccountType(filters.accountType);
    setCurrencyCode(filters.currencyCode);
    setSegment3(filters.segment3);
    setSegment4(filters.segment4);
    setSegment5(filters.segment5);
    setJournalEntryTypeId(filters.journalEntryTypeId);
  };

  const baseFilters = useMemo<ReportingQuery>(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      comparisonFrom: comparisonFrom || undefined,
      comparisonTo: comparisonTo || undefined,
      basis: basis || "ACCRUAL",
      includeZeroBalance,
      accountType: accountType || undefined,
      currencyCode: currencyCode || undefined,
      segment3: segment3 || undefined,
      segment4: segment4 || undefined,
      segment5: segment5 || undefined,
      journalEntryTypeId: journalEntryTypeId || undefined,
    }),
    [accountType, basis, comparisonFrom, comparisonTo, currencyCode, dateFrom, dateTo, includeZeroBalance, journalEntryTypeId, segment3, segment4, segment5],
  );

  const generalLedgerFilters = useMemo<ReportingQuery>(
    () => ({
      ...baseFilters,
      accountId: accountId || undefined,
    }),
    [accountId, baseFilters],
  );

  const reportParameters = useMemo<Record<string, unknown>>(
    () => ({
      dateFrom: baseFilters.dateFrom,
      dateTo: baseFilters.dateTo,
      comparisonFrom: baseFilters.comparisonFrom,
      comparisonTo: baseFilters.comparisonTo,
      basis: baseFilters.basis,
      includeZeroBalance: baseFilters.includeZeroBalance,
      accountId: activeTab === "generalLedger" ? accountId || undefined : undefined,
      accountType: baseFilters.accountType,
      currencyCode: baseFilters.currencyCode,
      segment3: baseFilters.segment3,
      segment4: baseFilters.segment4,
      segment5: baseFilters.segment5,
      journalEntryTypeId: baseFilters.journalEntryTypeId,
    }),
    [accountId, activeTab, baseFilters],
  );

  const accountsQuery = useQuery({
    queryKey: ["reporting-accounts", token],
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(token),
  });

  const definitionsQuery = useQuery({
    queryKey: ["reporting-definitions", token],
    queryFn: () => getReportingDefinitions(token),
    enabled: Boolean(token),
  });

  const catalogQuery = useQuery({
    queryKey: ["reporting-catalog", token],
    queryFn: () => getReportingCatalog(token),
    enabled: Boolean(token),
  });

  const warningsQuery = useQuery({
    queryKey: ["reporting-warnings", token],
    queryFn: () => getReportingWarnings(token),
    enabled: Boolean(token),
  });

  const journalEntryTypesQuery = useQuery({
    queryKey: ["reporting-journal-entry-types", token],
    queryFn: () => getJournalEntryTypes(token),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const snapshotsQuery = useQuery({
    queryKey: ["reporting-snapshots", token],
    queryFn: () => getReportingSnapshots(token),
    enabled: Boolean(token),
  });

  const canSeeActivity = user?.role !== "USER";
  const isSummaryView = activeTab === "summary";

  const activityQuery = useQuery({
    queryKey: ["reporting-activity", token],
    queryFn: () => getReportingActivity(25, token),
    enabled: Boolean(token) && canSeeActivity && activeTab === "activity",
  });

  const summaryQuery = useQuery({
    queryKey: ["reporting-summary", token, baseFilters],
    queryFn: () => getReportingSummary(baseFilters, token),
    enabled: Boolean(token) && isSummaryView,
  });

  const trialBalanceQuery = useQuery({
    queryKey: ["reporting-trial-balance", token, baseFilters],
    queryFn: () => getReportingTrialBalance(baseFilters, token),
    enabled: Boolean(token) && activeTab === "trialBalance",
  });

  const balanceSheetQuery = useQuery({
    queryKey: ["reporting-balance-sheet", token, baseFilters],
    queryFn: () => getReportingBalanceSheet(baseFilters, token),
    enabled: Boolean(token) && activeTab === "balanceSheet",
  });

  const profitLossQuery = useQuery({
    queryKey: ["reporting-profit-loss", token, baseFilters],
    queryFn: () => getReportingProfitLoss(baseFilters, token),
    enabled: Boolean(token) && activeTab === "profitLoss",
  });

  const cashMovementQuery = useQuery({
    queryKey: ["reporting-cash-movement", token, baseFilters],
    queryFn: () => getReportingCashMovement(baseFilters, token),
    enabled: Boolean(token) && activeTab === "cashMovement",
  });

  const generalLedgerQuery = useQuery({
    queryKey: ["reporting-general-ledger", token, generalLedgerFilters],
    queryFn: () => getReportingGeneralLedger(generalLedgerFilters, token),
    enabled: Boolean(token) && activeTab === "generalLedger",
  });

  const auditQuery = useQuery({
    queryKey: ["reporting-audit", token, baseFilters],
    queryFn: () => getReportingAudit(baseFilters, token),
    enabled: Boolean(token) && activeTab === "audit",
  });

  const selectedDefinition = (definitionsQuery.data ?? []).find((row) => row.id === selectedDefinitionId) ?? null;
  const accounts = accountsQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];
  const visibleTabs = tabs.filter((tab) => catalog.some((item) => item.reportType === tab.id && item.canView));
  const selectedAccount = accounts.find((row) => row.id === accountId) ?? null;
  const journalEntryTypes = journalEntryTypesQuery.data ?? [];
  const reportingWarnings = warningsQuery.data ?? [];
  const currencyOptions = useMemo(() => Array.from(new Set(accounts.map((row) => row.currencyCode))).sort(), [accounts]);
  const segment3Options = useMemo(() => Array.from(new Set(accounts.map((row) => row.segment3).filter(Boolean) as string[])).sort(), [accounts]);
  const segment4Options = useMemo(() => Array.from(new Set(accounts.map((row) => row.segment4).filter(Boolean) as string[])).sort(), [accounts]);
  const segment5Options = useMemo(() => Array.from(new Set(accounts.map((row) => row.segment5).filter(Boolean) as string[])).sort(), [accounts]);
  const activePermissions = catalog.find((item) => item.reportType === activeTab);

  useEffect(() => {
    const tabFromQuery = searchParams.get("tab");
    if (tabFromQuery && reportTypes.has(tabFromQuery as ReportTab)) {
      setActiveTab(tabFromQuery as ReportTab);
    }

    setDateFrom(searchParams.get("dateFrom") || "");
    setDateTo(searchParams.get("dateTo") || "");
    setComparisonFrom(searchParams.get("comparisonFrom") || "");
    setComparisonTo(searchParams.get("comparisonTo") || "");
    setBasis(searchParams.get("basis") === "CASH" ? "CASH" : searchParams.get("basis") === "ACCRUAL" ? "ACCRUAL" : "");
    setIncludeZeroBalance(searchParams.get("includeZeroBalance") === "true");
    setAccountId(searchParams.get("accountId") || "");
    setAccountType((searchParams.get("accountType") as AccountType | null) || "");
    setCurrencyCode(searchParams.get("currencyCode") || "");
    setSegment3(searchParams.get("segment3") || "");
    setSegment4(searchParams.get("segment4") || "");
    setSegment5(searchParams.get("segment5") || "");
    setJournalEntryTypeId(searchParams.get("journalEntryTypeId") || "");
  }, [searchParams]);

  useEffect(() => {
    if (catalog.length > 0 && !catalog.some((item) => item.reportType === activeTab && item.canView)) {
      const fallbackTab = visibleTabs[0]?.id ?? "generalLedger";
      setActiveTab(fallbackTab);
    }
  }, [activeTab, catalog, visibleTabs]);

  const refreshControls = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["reporting-definitions"] }),
      queryClient.invalidateQueries({ queryKey: ["reporting-snapshots"] }),
      queryClient.invalidateQueries({ queryKey: ["reporting-activity"] }),
    ]);
  };

  const saveDefinitionMutation = useMutation({
    mutationFn: async () => {
      const name = definitionName.trim() || `${getReportLabel(activeTab, t)} ${new Date().toISOString().slice(0, 10)}`;
      return createReportingDefinition(
        {
          name,
          reportType: activeTab,
          parameters: reportParameters,
          isShared: shareDefinition,
        },
        token,
      );
    },
    onSuccess: async (definition) => {
      setDefinitionName(definition.name);
      setSelectedDefinitionId(definition.id);
      setStatusTone("success");
      setStatusMessage(t("reporting.status.definitionSaved"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const updateDefinitionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDefinitionId) {
        throw new Error(t("reporting.status.selectDefinition"));
      }

      return updateReportingDefinition(
        selectedDefinitionId,
        {
          name: definitionName.trim() || selectedDefinition?.name,
          reportType: activeTab,
          parameters: reportParameters,
          isShared: shareDefinition,
        },
        token,
      );
    },
    onSuccess: async (definition) => {
      setDefinitionName(definition.name);
      setStatusTone("success");
      setStatusMessage(t("reporting.status.definitionUpdated"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const deactivateDefinitionMutation = useMutation({
    mutationFn: async (definitionId: string) => deactivateReportingDefinition(definitionId, token),
    onSuccess: async (_, definitionId) => {
      if (selectedDefinitionId === definitionId) {
        setSelectedDefinitionId("");
        setDefinitionName("");
        setShareDefinition(false);
      }
      setStatusTone("success");
      setStatusMessage(t("reporting.status.definitionArchived"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      const name = snapshotName.trim() || `${getReportLabel(activeTab, t)} ${new Date().toISOString().slice(0, 10)}`;
      return createReportingSnapshot(
        {
          name,
          reportType: activeTab,
          parameters: reportParameters,
        },
        token,
      );
    },
    onSuccess: async (snapshot) => {
      setSnapshotName(snapshot.name);
      setStatusTone("success");
      setStatusMessage(t("reporting.status.snapshotSaved"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const lockSnapshotMutation = useMutation({
    mutationFn: async (id: string) => lockReportingSnapshot(id, token),
    onSuccess: async () => {
      setStatusTone("success");
      setStatusMessage(t("reporting.status.snapshotLocked"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const unlockSnapshotMutation = useMutation({
    mutationFn: async (id: string) => unlockReportingSnapshot(id, token),
    onSuccess: async () => {
      setStatusTone("success");
      setStatusMessage(t("reporting.status.snapshotUnlocked"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const versionSnapshotMutation = useMutation({
    mutationFn: async (snapshot: ReportingSnapshot) =>
      createReportingSnapshotVersion(snapshot.id, { name: `${snapshot.name} v${snapshot.version + 1}` }, token),
    onSuccess: async (snapshot) => {
      setStatusTone("success");
      setStatusMessage(t("reporting.status.snapshotVersioned", { version: snapshot.version }));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (overrideFormat?: ReportingExportFormat) => {
      return exportReporting(
        {
          reportType: activeTab,
          format: overrideFormat || exportFormat,
          title: exportTitle.trim() || undefined,
          parameters: {
            ...reportParameters,
            accountId: activeTab === "generalLedger" ? accountId || undefined : undefined,
          },
        },
        token,
      );
    },
    onSuccess: async (result) => {
      const blob =
        result.encoding === "base64"
          ? new Blob([Uint8Array.from(atob(result.content), (char) => char.charCodeAt(0))], { type: result.mimeType })
          : new Blob([result.content], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);

      if (result.format === "EXCEL") {
        const link = document.createElement("a");
        link.href = url;
        link.download = result.fileName;
        link.click();
      } else {
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (result.format === "PRINT" && popup) {
          popup.onload = () => popup.print();
        }
      }

      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      setStatusMessage(
        result.format === "EXCEL" ? t("reporting.status.exportDownloaded") : t("reporting.status.exportOpened"),
      );
      await queryClient.invalidateQueries({ queryKey: ["reporting-activity"] });
    },
  });

  const applyDefinition = (definition: ReportingDefinition) => {
    applyStoredParameters(definition.reportType, definition.parameters, {
      setActiveTab,
      setDateFrom,
      setDateTo,
      setComparisonFrom,
      setComparisonTo,
      setBasis,
      setIncludeZeroBalance,
      setAccountId,
      setAccountType,
      setCurrencyCode,
      setSegment3,
      setSegment4,
      setSegment5,
      setJournalEntryTypeId,
    });
    setDefinitionName(definition.name);
    setShareDefinition(definition.isShared);
    setSelectedDefinitionId(definition.id);
    setStatusMessage(t("reporting.status.definitionApplied"));
  };

  const applySnapshot = (snapshot: ReportingSnapshot) => {
    applyStoredParameters(snapshot.reportType, snapshot.parameters, {
      setActiveTab,
      setDateFrom,
      setDateTo,
      setComparisonFrom,
      setComparisonTo,
      setBasis,
      setIncludeZeroBalance,
      setAccountId,
      setAccountType,
      setCurrencyCode,
      setSegment3,
      setSegment4,
      setSegment5,
      setJournalEntryTypeId,
    });
    setSnapshotName(snapshot.name);
    setStatusMessage(t("reporting.status.snapshotApplied"));
  };

  const isBusy =
    saveDefinitionMutation.isPending ||
    updateDefinitionMutation.isPending ||
    deactivateDefinitionMutation.isPending ||
    snapshotMutation.isPending ||
    lockSnapshotMutation.isPending ||
    unlockSnapshotMutation.isPending ||
    versionSnapshotMutation.isPending ||
    exportMutation.isPending;

  const clearAllFilters = () => {
    applyReportingFilters({
      dateFrom: "",
      dateTo: "",
      comparisonFrom: "",
      comparisonTo: "",
      basis: "",
      includeZeroBalance: false,
      accountId: "",
      accountType: "",
      currencyCode: "",
      segment3: "",
      segment4: "",
      segment5: "",
      journalEntryTypeId: "",
    });
    setStatusTone("success");
    setStatusMessage("");
  };

  return (
    <PageShell className={isSummaryView && summaryQuery.data ? "pb-24" : undefined}>
      <SectionHeading title={t("reporting.title")} description={t("reporting.description")} />

      {statusMessage ? (
        <Card
          className={`mb-4 border p-4 text-sm ${
            statusTone === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {statusMessage}
        </Card>
      ) : null}

      <div className="mb-4 space-y-0">
        <ReportingToolbar
          t={t}
          isBusy={!token || isBusy}
          definitions={definitionsQuery.data ?? []}
          snapshots={snapshotsQuery.data ?? []}
          onSaveDefinition={() => saveDefinitionMutation.mutate()}
          onUpdateDefinition={() => updateDefinitionMutation.mutate()}
          onDeactivateDefinition={(id) => deactivateDefinitionMutation.mutate(id)}
          onApplyDefinition={applyDefinition}
          onSaveSnapshot={() => snapshotMutation.mutate()}
          onApplySnapshot={applySnapshot}
          onLockSnapshot={(id) => lockSnapshotMutation.mutate(id)}
          onUnlockSnapshot={(id) => unlockSnapshotMutation.mutate(id)}
          onVersionSnapshot={(snap) => versionSnapshotMutation.mutate(snap)}
          onPrint={() => exportMutation.mutate("PRINT")}
          onExport={(format) => exportMutation.mutate(format)}
          selectedDefinitionId={selectedDefinitionId}
          permissions={activePermissions}
        />

        <ReportingSearchBar
          t={t}
          filters={reportingFilters}
          segment3Options={segment3Options}
          segment4Options={segment4Options}
          segment5Options={segment5Options}
          currencyOptions={currencyOptions}
          accounts={accounts}
          journalEntryTypes={journalEntryTypes}
          definitions={definitionsQuery.data ?? []}
          selectedDefinitionId={selectedDefinitionId}
          showAccountFilter={false}
          onFiltersChange={applyReportingFilters}
          onClearAll={clearAllFilters}
          onApplyDefinition={applyDefinition}
        />
      </div>

      {reportingWarnings.length ? <WarningsCard warnings={reportingWarnings} activeTab={activeTab} t={t} /> : null}

      {isSummaryView && summaryQuery.isLoading ? <LoadingCard label={t("reporting.loading")} /> : null}
      {isSummaryView && summaryQuery.error ? <ErrorCard error={summaryQuery.error} t={t} /> : null}
      {isSummaryView && summaryQuery.data ? (
        <div className="mb-6">
          <ReportingKpiCards summary={summaryQuery.data} t={t} />
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {activeTab === "activity" ? (
          canSeeActivity ? (
            <div className="space-y-3 border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">{t("reporting.control.activityDescription")}</p>
                <Button variant="secondary" onClick={() => activityQuery.refetch()} disabled={!token || activityQuery.isFetching}>
                  {t("reporting.action.refreshActivity")}
                </Button>
              </div>
              <ActivityList entries={activityQuery.data ?? []} loading={activityQuery.isLoading} t={t} />
            </div>
          ) : (
            <EmptyCard label={t("reporting.control.emptyActivity")} />
          )
        ) : null}
        {activeTab === "trialBalance" ? (
          <TrialBalanceSection
            data={trialBalanceQuery.data}
            error={trialBalanceQuery.error}
            loading={trialBalanceQuery.isLoading}
            t={t}
            onSelectAccount={(id) => {
              setAccountId(id);
              setActiveTab("generalLedger");
            }}
          />
        ) : null}
        {activeTab === "balanceSheet" ? (
          <BalanceSheetSection data={balanceSheetQuery.data} error={balanceSheetQuery.error} loading={balanceSheetQuery.isLoading} t={t} />
        ) : null}
        {activeTab === "profitLoss" ? (
          <ProfitLossSection data={profitLossQuery.data} error={profitLossQuery.error} loading={profitLossQuery.isLoading} t={t} />
        ) : null}
        {activeTab === "cashMovement" ? (
          <CashMovementSection data={cashMovementQuery.data} error={cashMovementQuery.error} loading={cashMovementQuery.isLoading} t={t} />
        ) : null}
        {activeTab === "generalLedger" ? (
          <>
            <Card className="border border-gray-200 bg-white p-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("reporting.filter.generalLedgerAccount")}
              </label>
              <GeneralLedgerAccountSearch
                accounts={accounts}
                value={accountId}
                language={language}
                t={t}
                onSelect={setAccountId}
              />
            </Card>
            <GeneralLedgerSection
              data={generalLedgerQuery.data}
              error={generalLedgerQuery.error}
              loading={generalLedgerQuery.isLoading}
              selectedAccount={selectedAccount}
              t={t}
            />
          </>
        ) : null}
        {activeTab === "audit" ? <AuditSection data={auditQuery.data} error={auditQuery.error} loading={auditQuery.isLoading} t={t} /> : null}
      </div>

      {isSummaryView && summaryQuery.data ? <ReportingSummaryFooter summary={summaryQuery.data} t={t} /> : null}
    </PageShell>
  );
}

function TrialBalanceSection({
  data,
  error,
  loading,
  onSelectAccount,
  t,
  compact = false,
}: {
  data?: ReportingTrialBalanceReport;
  error?: unknown;
  loading: boolean;
  onSelectAccount: (id: string) => void;
  t: TranslationFn;
  compact?: boolean;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

  return (
    <>
      {!compact ? (
        <Card className="mb-4 grid gap-3 p-5 md:grid-cols-5">
          <MiniStat label={t("reporting.summary.period")} value={data.period} />
          <MiniStat label={t("reporting.trialBalance.total.debit")} value={formatCurrency(data.totals.debit)} />
          <MiniStat label={t("reporting.trialBalance.total.credit")} value={formatCurrency(data.totals.credit)} />
          <MiniStat label={t("reporting.trialBalance.total.closingDebit")} value={formatCurrency(data.totals.closingDebit)} />
          <MiniStat label={t("reporting.trialBalance.total.closingCredit")} value={formatCurrency(data.totals.closingCredit)} />
        </Card>
      ) : null}
      <div className={compact ? "overflow-hidden" : undefined}>
        <ReportingTable
          headers={[
            t("reporting.column.code"),
            t("reporting.column.name"),
            t("reporting.column.openingBalance"),
            t("reporting.column.debit"),
            t("reporting.column.credit"),
            t("reporting.column.closingBalance"),
            t("reporting.column.side"),
            t("reporting.column.action"),
          ]}
          columnTypes={["code", "name", "amount", "amount", "amount", "amount", "side", "action"]}
          rows={data.rows.map((row) => [
            row.accountCode,
            row.accountName,
            formatCurrency(row.openingBalance),
            formatCurrency(row.debitTotal),
            formatCurrency(row.creditTotal),
            formatCurrency(row.closingBalance),
            t(`reporting.side.${row.closingSide}`),
            <button key={`${row.accountId}-action`} className="text-sm font-semibold text-primary hover:underline" onClick={() => onSelectAccount(row.accountId)}>
              {t("reporting.action.openLedger")}
            </button>,
          ])}
          emptyLabel={t("reporting.value.noRows")}
        />
      </div>
    </>
  );
}

function BalanceSheetSection({
  data,
  error,
  loading,
  t,
}: {
  data?: ReportingBalanceSheetReport;
  error?: unknown;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <SectionCard title={t("reporting.balanceSheet.assets")}>
        <AmountTable rows={data.assets} t={t} />
      </SectionCard>
      <SectionCard title={t("reporting.balanceSheet.liabilities")}>
        <AmountTable rows={data.liabilities} t={t} />
      </SectionCard>
      <SectionCard title={t("reporting.balanceSheet.equity")}>
        <AmountTable rows={data.equity} t={t} />
      </SectionCard>
    </div>
  );
}

function ProfitLossSection({
  data,
  error,
  loading,
  t,
}: {
  data?: ReportingProfitLossReport;
  error?: unknown;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title={t("reporting.profitLoss.revenue")}>
        <AmountTable rows={data.revenue} t={t} />
      </SectionCard>
      <SectionCard title={t("reporting.profitLoss.expenses")}>
        <AmountTable rows={data.expenses} t={t} />
      </SectionCard>
      <Card className="grid gap-3 p-5 md:grid-cols-3 xl:col-span-2">
        <MiniStat label={t("reporting.profitLoss.totalRevenue")} value={formatCurrency(data.totals.revenue.amount)} />
        <MiniStat label={t("reporting.profitLoss.totalExpenses")} value={formatCurrency(data.totals.expenses.amount)} />
        <MiniStat label={t("reporting.profitLoss.netIncome")} value={formatCurrency(data.totals.netIncome.amount)} />
      </Card>
    </div>
  );
}

function CashMovementSection({
  data,
  error,
  loading,
  t,
}: {
  data?: ReportingCashMovementReport;
  error?: unknown;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

  return (
    <>
      <Card className="grid gap-3 p-5 md:grid-cols-4">
        <MiniStat label={t("reporting.cashMovement.openingBalance")} value={formatCurrency(data.totals.openingBalance.amount)} />
        <MiniStat label={t("reporting.cashMovement.netMovement")} value={formatCurrency(data.totals.netMovement.amount)} />
        <MiniStat label={t("reporting.cashMovement.closingBalance")} value={formatCurrency(data.totals.closingBalance.amount)} />
        <MiniStat label={t("reporting.summary.comparisonPeriod")} value={data.comparisonPeriod || t("reporting.value.none")} />
      </Card>
      <Card className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(data.classified).map(([key, metric]) => (
          <Card key={key} className="space-y-2 border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{t(`reporting.cashMovement.classified.${key}`)}</div>
            <div className="text-lg font-black text-gray-900">{formatCurrency(metric.amount)}</div>
            <div className="text-sm text-gray-500">
              {t("reporting.metric.comparison")}: {formatCurrency(metric.comparisonAmount)}
            </div>
            <div className="text-sm text-gray-500">
              {t("reporting.metric.variance")}: {formatCurrency(metric.varianceAmount)}
            </div>
          </Card>
        ))}
      </Card>
      <Card className="overflow-hidden p-0">
        <ReportingTable
          headers={[
            t("reporting.column.code"),
            t("reporting.column.name"),
            t("reporting.column.type"),
            t("reporting.column.openingBalance"),
            t("reporting.column.debit"),
            t("reporting.column.credit"),
            t("reporting.column.netMovement"),
            t("reporting.column.closingBalance"),
            t("reporting.column.action"),
          ]}
          rows={data.rows.map((row) => [
            row.code,
            row.name,
            row.type,
            formatCurrency(row.openingBalance),
            formatCurrency(row.debitTotal),
            formatCurrency(row.creditTotal),
            formatCurrency(row.netMovement),
            formatCurrency(row.closingBalance),
            row.drillDownPath ? (
              <Link key={`${row.accountId}-ledger`} href={row.drillDownPath} className="text-sm font-semibold text-primary hover:underline">
                {t("reporting.action.openLedger")}
              </Link>
            ) : (
              t("reporting.value.none")
            ),
          ])}
          emptyLabel={t("reporting.value.noRows")}
        />
      </Card>
    </>
  );
}

function GeneralLedgerSection({
  data,
  error,
  loading,
  selectedAccount,
  t,
  compact = false,
}: {
  data?: ReportingGeneralLedgerReport;
  error?: unknown;
  loading: boolean;
  selectedAccount: AccountOption | null;
  t: TranslationFn;
  compact?: boolean;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!selectedAccount) return <EmptyCard label={t("reporting.generalLedger.selectAccount")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

  return (
    <>
      {!compact ? (
        <Card className="mb-4 grid gap-3 p-5 md:grid-cols-4">
          <MiniStat label={t("reporting.column.account")} value={`${selectedAccount.code} - ${selectedAccount.name}`} />
          <MiniStat label={t("reporting.column.openingBalance")} value={formatCurrency(data.openingBalance)} />
          <MiniStat label={t("reporting.column.debit")} value={formatCurrency(data.totalDebit)} />
          <MiniStat label={t("reporting.column.credit")} value={formatCurrency(data.totalCredit)} />
        </Card>
      ) : (
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700">
          {selectedAccount.code} - {selectedAccount.name}
        </div>
      )}
      <div className={compact ? "overflow-hidden" : undefined}>
        <ReportingTable
          headers={[
            t("reporting.column.date"),
            t("reporting.column.voucherName"),
            t("reporting.column.descriptionStatement"),
            t("reporting.column.debit"),
            t("reporting.column.credit"),
            t("reporting.column.runningBalance"),
            t("reporting.column.reference"),
          ]}
          rows={data.transactions.map((row) => [
            formatDate(row.entryDate),
            row.journalReference,
            row.description || row.journalDescription || t("reporting.value.none"),
            formatCurrency(row.debitAmount),
            formatCurrency(row.creditAmount),
            formatCurrency(row.runningBalance),
            row.reference || t("reporting.value.none"),
          ])}
          emptyLabel={t("reporting.value.noRows")}
        />
      </div>
    </>
  );
}

function AuditSection({
  data,
  error,
  loading,
  t,
}: {
  data?: ReportingAuditReport;
  error?: unknown;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

  return (
    <>
      <Card className="grid gap-3 p-5 md:grid-cols-3">
        <MiniStat label={t("reporting.audit.totalEvents")} value={String(data.totalEvents)} />
        <MiniStat label={t("reporting.summary.generatedAt")} value={formatDate(data.generatedAt)} />
        <MiniStat label={t("reporting.audit.actionCount")} value={String(data.actionTotals.length)} />
      </Card>
      <Card className="grid gap-3 p-5 md:grid-cols-3">
        <MiniStat label={t("reporting.audit.highRisk")} value={String(data.compliancePackage.highRiskCount)} />
        <MiniStat label={t("reporting.audit.systemEvents")} value={String(data.compliancePackage.systemEventCount)} />
        <MiniStat label={t("reporting.audit.exceptions")} value={String(data.exceptions.length)} />
      </Card>
      <Card className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label={t("reporting.audit.complianceGenerated")} value={formatDate(data.compliancePackage.generatedAt)} />
        <MiniStat label={t("reporting.audit.complianceEntries")} value={String(data.compliancePackage.entryCount)} />
        <MiniStat label={t("reporting.audit.highRisk")} value={String(data.compliancePackage.highRiskCount)} />
        <MiniStat label={t("reporting.audit.systemEvents")} value={String(data.compliancePackage.systemEventCount)} />
      </Card>
      <Card className="overflow-hidden p-0">
        <ReportingTable
          headers={[t("reporting.column.code"), t("reporting.column.description"), t("reporting.column.amount")]}
          rows={data.exceptions.map((row) => [row.code, row.description, String(row.count)])}
          emptyLabel={t("reporting.audit.noExceptions")}
        />
      </Card>
      <Card className="overflow-hidden p-0">
        <ReportingTable
          headers={[
            t("reporting.column.date"),
            t("reporting.column.entity"),
            t("reporting.column.action"),
            t("reporting.column.user"),
            t("reporting.column.details"),
            t("reporting.column.source"),
          ]}
          rows={data.entries.map((row) => [
            formatDate(row.createdAt),
            row.entity,
            row.action,
            row.user?.name || row.user?.email || t("reporting.value.system"),
            row.entityId || t("reporting.value.none"),
            getAuditSourcePath(row) ? (
              <Link key={`${row.id}-audit-source`} href={getAuditSourcePath(row)!} className="text-sm font-semibold text-primary hover:underline">
                {t("reporting.action.openSource")}
              </Link>
            ) : (
              t("reporting.value.none")
            ),
          ])}
          emptyLabel={t("reporting.value.noRows")}
        />
      </Card>
    </>
  );
}

function DefinitionList({
  definitions,
  onApply,
  onDeactivate,
  selectedId,
  t,
}: {
  definitions: ReportingDefinition[];
  onApply: (definition: ReportingDefinition) => void;
  onDeactivate: (id: string) => void;
  selectedId: string;
  t: TranslationFn;
}) {
  if (!definitions.length) {
    return <EmptyCard label={t("reporting.control.emptyDefinitions")} />;
  }

  return (
    <div className="space-y-3">
      {definitions.slice(0, 6).map((definition) => (
        <div
          key={definition.id}
          className={`rounded-2xl border p-4 ${selectedId === definition.id ? "border-primary/40 bg-primary/5" : "border-gray-200 bg-white"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-gray-900">{definition.name}</div>
              <div className="text-xs text-gray-500">
                {getReportLabel(definition.reportType, t)} · {definition.isShared ? t("reporting.value.shared") : t("reporting.value.private")}
              </div>
              <div className="text-xs text-gray-500">
                {t("reporting.summary.generatedAt")}: {formatDate(definition.updatedAt)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onApply(definition)}>
                {t("reporting.action.applyDefinition")}
              </Button>
              <Button variant="secondary" onClick={() => onDeactivate(definition.id)}>
                {t("reporting.action.archiveDefinition")}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SnapshotList({
  snapshots,
  onApply,
  onLock,
  onUnlock,
  onCreateVersion,
  t,
}: {
  snapshots: ReportingSnapshot[];
  onApply: (snapshot: ReportingSnapshot) => void;
  onLock: (snapshotId: string) => void;
  onUnlock: (snapshotId: string) => void;
  onCreateVersion: (snapshot: ReportingSnapshot) => void;
  t: TranslationFn;
}) {
  if (!snapshots.length) {
    return <EmptyCard label={t("reporting.control.emptySnapshots")} />;
  }

  return (
    <div className="space-y-3">
      {snapshots.slice(0, 6).map((snapshot) => (
        <div key={snapshot.id} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-gray-900">{snapshot.name}</div>
              <div className="text-xs text-gray-500">{getReportLabel(snapshot.reportType, t)}</div>
              <div className="text-xs text-gray-500">
                {t("reporting.snapshot.version")}: {snapshot.version} · {snapshot.isLocked ? t("reporting.snapshot.locked") : t("reporting.snapshot.unlocked")}
              </div>
              <div className="text-xs text-gray-500">
                {snapshot.periodLabel || t("reporting.value.none")}
                {snapshot.comparisonPeriodLabel ? ` / ${snapshot.comparisonPeriodLabel}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onApply(snapshot)}>
                {t("reporting.action.applySnapshot")}
              </Button>
              <Button variant="secondary" onClick={() => onCreateVersion(snapshot)}>
                {t("reporting.action.versionSnapshot")}
              </Button>
              <Button variant="secondary" onClick={() => (snapshot.isLocked ? onUnlock(snapshot.id) : onLock(snapshot.id))}>
                {snapshot.isLocked ? t("reporting.action.unlockSnapshot") : t("reporting.action.lockSnapshot")}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityList({
  entries,
  loading,
  t,
}: {
  entries: ReportingActivityEntry[];
  loading?: boolean;
  t: TranslationFn;
}) {
  if (loading) {
    return <LoadingCard label={t("reporting.loading")} />;
  }

  return (
    <ReportingTable
      headers={[
        t("reporting.column.date"),
        t("reporting.column.statement"),
        t("reporting.column.action"),
        t("reporting.column.user"),
      ]}
      rows={entries.map((entry) => [
        formatDate(entry.createdAt),
        entry.entity,
        <ReportingActionBadge key={`${entry.id}-action`} action={entry.action} />,
        entry.user?.name || entry.user?.email || t("reporting.value.system"),
      ])}
      emptyLabel={t("reporting.control.emptyActivity")}
    />
  );
}

function WarningsCard({ warnings, activeTab, t }: { warnings: ReportingWarning[]; activeTab: ReportTab; t: TranslationFn }) {
  const visibleWarnings = warnings.filter((warning) => warning.reportTypes.includes(activeTab) || warning.reportTypes.includes("summary"));

  if (!visibleWarnings.length) return null;

  return (
    <Card className="mt-6 space-y-3 border border-amber-200 bg-amber-50 p-5">
      <div className="text-base font-bold text-amber-900">{t("reporting.warning.title")}</div>
      {visibleWarnings.map((warning) => (
        <div key={warning.code} className="rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm text-amber-900">
          <div className="font-semibold">{warning.code}</div>
          <div>{warning.message}</div>
        </div>
      ))}
    </Card>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-4 p-5">
      <div className="text-base font-bold text-gray-900">{title}</div>
      {children}
    </Card>
  );
}

function AmountTable({
  rows,
  t,
}: {
  rows: Array<{ accountCode: string; accountName: string; amount: string; comparisonAmount: string; varianceAmount: string; drillDownPath?: string }>;
  t: TranslationFn;
}) {
  return (
    <ReportingTable
      headers={[
        t("reporting.column.code"),
        t("reporting.column.name"),
        t("reporting.column.amount"),
        t("reporting.column.comparison"),
        t("reporting.column.variance"),
        t("reporting.column.action"),
      ]}
      rows={rows.map((row) => [
        row.accountCode,
        row.accountName,
        formatCurrency(row.amount),
        formatCurrency(row.comparisonAmount),
        formatCurrency(row.varianceAmount),
        row.drillDownPath ? (
          <Link key={`${row.accountCode}-drilldown`} href={row.drillDownPath} className="text-sm font-semibold text-primary hover:underline">
            {t("reporting.action.openLedger")}
          </Link>
        ) : (
          t("reporting.value.none")
        ),
      ])}
      emptyLabel={t("reporting.value.noRows")}
    />
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return <Card className="p-6 text-sm text-gray-600">{label}</Card>;
}

function EmptyCard({ label, detail }: { label: string; detail?: string }) {
  return (
    <Card className="space-y-2 p-6 text-sm text-gray-500">
      <div>{label}</div>
      {detail ? <div className="text-xs text-gray-400">{detail}</div> : null}
    </Card>
  );
}

function ErrorCard({ error, t }: { error: unknown; t: TranslationFn }) {
  return (
    <Card className="space-y-2 border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
      <div className="font-semibold">{t("reporting.error")}</div>
      <div>{readErrorMessage(error)}</div>
      <div className="text-xs text-rose-700">{t("reporting.errorHint")}</div>
    </Card>
  );
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unexpected reporting error.";
}


function getReportLabel(reportType: string, t: TranslationFn) {
  if (reportTypes.has(reportType as ReportTab)) {
    return t(`reporting.tab.${reportType}`);
  }

  return reportType;
}

function getAuditSourcePath(entry: ReportingActivityEntry) {
  const entityId = entry.entityId;
  if (!entityId) return null;

  switch (entry.entity) {
    case "JournalEntry":
      return `/journal-entries?reference=${encodeURIComponent(entityId)}`;
    case "BankCashTransaction":
      return `/bank-cash-accounts?tab=receipts&sourceId=${encodeURIComponent(entityId)}`;
    case "SalesInvoice":
    case "CreditNote":
      return `/sales-receivables?sourceId=${encodeURIComponent(entityId)}`;
    case "PurchaseInvoice":
    case "DebitNote":
      return `/purchases?sourceId=${encodeURIComponent(entityId)}`;
    case "InventoryGoodsReceipt":
    case "InventoryGoodsIssue":
    case "InventoryAdjustment":
      return `/inventory?sourceId=${encodeURIComponent(entityId)}`;
    case "PayrollPeriod":
    case "PayrollAdjustment":
      return `/payroll?sourceId=${encodeURIComponent(entityId)}`;
    case "FixedAssetAcquisition":
    case "FixedAssetDepreciationRun":
    case "FixedAssetDisposal":
      return `/fixed-assets?sourceId=${encodeURIComponent(entityId)}`;
    default:
      return null;
  }
}

function applyStoredParameters(
  reportType: string,
  parameters: Record<string, unknown>,
  setters: {
    setActiveTab: (value: ReportTab) => void;
    setDateFrom: (value: string) => void;
    setDateTo: (value: string) => void;
    setComparisonFrom: (value: string) => void;
    setComparisonTo: (value: string) => void;
    setBasis: (value: "ACCRUAL" | "CASH") => void;
    setIncludeZeroBalance: (value: boolean) => void;
    setAccountId: (value: string) => void;
    setAccountType: (value: AccountType | "") => void;
    setCurrencyCode: (value: string) => void;
    setSegment3: (value: string) => void;
    setSegment4: (value: string) => void;
    setSegment5: (value: string) => void;
    setJournalEntryTypeId: (value: string) => void;
  },
) {
  if (reportTypes.has(reportType as ReportTab)) {
    setters.setActiveTab(reportType as ReportTab);
  }

  setters.setDateFrom(readString(parameters.dateFrom));
  setters.setDateTo(readString(parameters.dateTo));
  setters.setComparisonFrom(readString(parameters.comparisonFrom));
  setters.setComparisonTo(readString(parameters.comparisonTo));
  setters.setBasis(parameters.basis === "CASH" ? "CASH" : "ACCRUAL");
  setters.setIncludeZeroBalance(parameters.includeZeroBalance === true || parameters.includeZeroBalance === "true");
  setters.setAccountId(readString(parameters.accountId));
  setters.setAccountType((readString(parameters.accountType) as AccountType | "") || "");
  setters.setCurrencyCode(readString(parameters.currencyCode));
  setters.setSegment3(readString(parameters.segment3));
  setters.setSegment4(readString(parameters.segment4));
  setters.setSegment5(readString(parameters.segment5));
  setters.setJournalEntryTypeId(readString(parameters.journalEntryTypeId));
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

