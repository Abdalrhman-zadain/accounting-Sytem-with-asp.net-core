import type { AccountOption, AccountType, JournalEntryType } from "@/types/api";
import type { TranslationFn } from "../reporting-types";

export type ReportingFilterId =
  | "dateFrom"
  | "dateTo"
  | "comparisonFrom"
  | "comparisonTo"
  | "basis"
  | "accountType"
  | "segment3"
  | "segment4"
  | "segment5"
  | "currencyCode"
  | "journalEntryTypeId"
  | "accountId"
  | "includeZeroBalance";

export type ReportingFilterState = {
  dateFrom: string;
  dateTo: string;
  comparisonFrom: string;
  comparisonTo: string;
  basis: "" | "ACCRUAL" | "CASH";
  accountType: AccountType | "";
  segment3: string;
  segment4: string;
  segment5: string;
  currencyCode: string;
  journalEntryTypeId: string;
  accountId: string;
  includeZeroBalance: boolean;
};

export type ReportingFilterFacet = {
  id: ReportingFilterId;
  label: string;
  value?: string;
};

function accountTypeLabel(t: TranslationFn, value: AccountType): string {
  return t(`reporting.accountType.${value}`);
}

function basisLabel(t: TranslationFn, value: "ACCRUAL" | "CASH"): string {
  return t(`reporting.basis.${value}`);
}

export function buildReportingFilterFacets(
  filters: ReportingFilterState,
  t: TranslationFn,
  accounts: AccountOption[],
  journalEntryTypes: JournalEntryType[],
): ReportingFilterFacet[] {
  const facets: ReportingFilterFacet[] = [];

  if (filters.dateFrom) {
    facets.push({ id: "dateFrom", label: t("reporting.filter.dateFrom"), value: filters.dateFrom });
  }
  if (filters.dateTo) {
    facets.push({ id: "dateTo", label: t("reporting.filter.dateTo"), value: filters.dateTo });
  }
  if (filters.comparisonFrom) {
    facets.push({ id: "comparisonFrom", label: t("reporting.filter.comparisonFrom"), value: filters.comparisonFrom });
  }
  if (filters.comparisonTo) {
    facets.push({ id: "comparisonTo", label: t("reporting.filter.comparisonTo"), value: filters.comparisonTo });
  }
  if (filters.basis) {
    facets.push({ id: "basis", label: t("reporting.filter.basis"), value: basisLabel(t, filters.basis) });
  }
  if (filters.accountType) {
    facets.push({
      id: "accountType",
      label: t("reporting.filter.accountType"),
      value: accountTypeLabel(t, filters.accountType),
    });
  }
  if (filters.segment3) {
    facets.push({ id: "segment3", label: t("reporting.filter.segment3"), value: filters.segment3 });
  }
  if (filters.segment4) {
    facets.push({ id: "segment4", label: t("reporting.filter.segment4"), value: filters.segment4 });
  }
  if (filters.segment5) {
    facets.push({ id: "segment5", label: t("reporting.filter.segment5"), value: filters.segment5 });
  }
  if (filters.currencyCode) {
    facets.push({ id: "currencyCode", label: t("reporting.filter.currencyCode"), value: filters.currencyCode });
  }
  if (filters.journalEntryTypeId) {
    const entryType = journalEntryTypes.find((item) => item.id === filters.journalEntryTypeId);
    facets.push({
      id: "journalEntryTypeId",
      label: t("reporting.filter.journalEntryType"),
      value: entryType?.name ?? filters.journalEntryTypeId,
    });
  }
  if (filters.accountId) {
    const account = accounts.find((item) => item.id === filters.accountId);
    facets.push({
      id: "accountId",
      label: t("reporting.filter.generalLedgerAccount"),
      value: account ? `${account.code} - ${account.name}` : filters.accountId,
    });
  }
  if (filters.includeZeroBalance) {
    facets.push({ id: "includeZeroBalance", label: t("reporting.filter.includeZeroBalance") });
  }

  return facets;
}

export function clearReportingFilter(filters: ReportingFilterState, id: ReportingFilterId): ReportingFilterState {
  switch (id) {
    case "dateFrom":
      return { ...filters, dateFrom: "" };
    case "dateTo":
      return { ...filters, dateTo: "" };
    case "comparisonFrom":
      return { ...filters, comparisonFrom: "" };
    case "comparisonTo":
      return { ...filters, comparisonTo: "" };
    case "basis":
      return { ...filters, basis: "" };
    case "accountType":
      return { ...filters, accountType: "" };
    case "segment3":
      return { ...filters, segment3: "" };
    case "segment4":
      return { ...filters, segment4: "" };
    case "segment5":
      return { ...filters, segment5: "" };
    case "currencyCode":
      return { ...filters, currencyCode: "" };
    case "journalEntryTypeId":
      return { ...filters, journalEntryTypeId: "" };
    case "accountId":
      return { ...filters, accountId: "" };
    case "includeZeroBalance":
      return { ...filters, includeZeroBalance: false };
    default:
      return filters;
  }
}
