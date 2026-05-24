"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronDown, LuFilter, LuStar, LuX } from "react-icons/lu";

import { formatDate } from "@/lib/utils";
import type { AccountOption, AccountType, JournalEntryType, ReportingDefinition } from "@/types/api";
import type { TranslationFn } from "../reporting-types";
import {
  buildReportingFilterFacets,
  clearReportingFilter,
  type ReportingFilterFacet,
  type ReportingFilterId,
  type ReportingFilterState,
} from "./reporting-search-utils";

export type ReportingSearchBarProps = {
  t: TranslationFn;
  filters: ReportingFilterState;
  segment3Options: string[];
  segment4Options: string[];
  segment5Options: string[];
  currencyOptions: string[];
  accounts: AccountOption[];
  journalEntryTypes: JournalEntryType[];
  definitions: ReportingDefinition[];
  selectedDefinitionId?: string;
  showAccountFilter: boolean;
  onFiltersChange: (filters: ReportingFilterState) => void;
  onClearAll: () => void;
  onApplyDefinition: (definition: ReportingDefinition) => void;
};

type OpenMenu = "filters" | "favorites" | null;
type ExpandedSubmenu = ReportingFilterId | null;

const facetClassName =
  "inline-flex max-w-full items-center gap-1 rounded border border-[#017e84]/30 bg-[#017e84]/10 px-2 py-0.5 text-xs font-medium text-[#01585c]";

export function ReportingSearchBar({
  t,
  filters,
  segment3Options,
  segment4Options,
  segment5Options,
  currencyOptions,
  accounts,
  journalEntryTypes,
  definitions,
  selectedDefinitionId,
  showAccountFilter,
  onFiltersChange,
  onClearAll,
  onApplyDefinition,
}: ReportingSearchBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [expandedSubmenu, setExpandedSubmenu] = useState<ExpandedSubmenu>(null);
  const [editingFacet, setEditingFacet] = useState<ReportingFilterId | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const activeFacets = useMemo(
    () => buildReportingFilterFacets(filters, t, accounts, journalEntryTypes),
    [accounts, filters, journalEntryTypes, t],
  );

  useEffect(() => {
    if (editingFacet && dateInputRef.current) {
      dateInputRef.current.focus();
      if (typeof dateInputRef.current.showPicker === "function") {
        dateInputRef.current.showPicker();
      }
    }
  }, [editingFacet]);

  const patchFilters = (patch: Partial<ReportingFilterState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const removeFacet = (id: ReportingFilterId) => {
    onFiltersChange(clearReportingFilter(filters, id));
    if (editingFacet === id) {
      setEditingFacet(null);
    }
  };

  const isDateFilter = (id: ReportingFilterId) =>
    id === "dateFrom" || id === "dateTo" || id === "comparisonFrom" || id === "comparisonTo";

  const renderDateEditor = (id: ReportingFilterId) => {
    const value =
      id === "dateFrom"
        ? filters.dateFrom
        : id === "dateTo"
          ? filters.dateTo
          : id === "comparisonFrom"
            ? filters.comparisonFrom
            : filters.comparisonTo;

    return (
      <input
        ref={dateInputRef}
        type="date"
        value={value}
        onChange={(event) => patchFilters({ [id]: event.target.value })}
        onBlur={() => setEditingFacet(null)}
        className="h-7 rounded border border-[#017e84]/40 bg-white px-2 text-xs text-gray-900 outline-none"
        aria-label={t(`reporting.filter.${id}`)}
      />
    );
  };

  return (
    <div className="flex items-stretch border border-gray-200 border-t-0 bg-white">
      <div className="flex min-h-11 flex-1 flex-wrap items-center gap-1.5 px-3 py-2">
        {activeFacets.map((facet) => (
          <FacetPill
            key={facet.id}
            facet={facet}
            isEditing={editingFacet === facet.id}
            onEdit={() => {
              if (isDateFilter(facet.id)) {
                setEditingFacet(facet.id);
              }
            }}
            onRemove={() => removeFacet(facet.id)}
            editor={editingFacet === facet.id && isDateFilter(facet.id) ? renderDateEditor(facet.id) : null}
          />
        ))}

        {editingFacet && isDateFilter(editingFacet) && !activeFacets.some((facet) => facet.id === editingFacet) ? (
          <div className={facetClassName}>
            <span>{t(`reporting.filter.${editingFacet}`)}</span>
            {renderDateEditor(editingFacet)}
          </div>
        ) : null}

        {activeFacets.length === 0 && !editingFacet ? (
          <span className="text-sm text-gray-400">{t("reporting.search.placeholder")}</span>
        ) : null}

        {activeFacets.length > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="ms-1 text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
          >
            {t("reporting.action.clearFilters")}
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 items-stretch border-s border-gray-200">
        <SearchMenuButton
          label={t("reporting.search.filters")}
          icon={<LuFilter className="h-3.5 w-3.5" />}
          isOpen={openMenu === "filters"}
          onToggle={() => {
            setOpenMenu(openMenu === "filters" ? null : "filters");
            setExpandedSubmenu(null);
          }}
          onClose={() => setOpenMenu(null)}
        >
          <FilterMenu
            t={t}
            filters={filters}
            expandedSubmenu={expandedSubmenu}
            showAccountFilter={showAccountFilter}
            segment3Options={segment3Options}
            segment4Options={segment4Options}
            segment5Options={segment5Options}
            currencyOptions={currencyOptions}
            accounts={accounts}
            journalEntryTypes={journalEntryTypes}
            onToggleSubmenu={(id) => setExpandedSubmenu(expandedSubmenu === id ? null : id)}
            onPatch={patchFilters}
            onClearPeriod={() => patchFilters({ dateFrom: "", dateTo: "" })}
            onStartDateEdit={(id) => {
              setEditingFacet(id);
              setOpenMenu(null);
            }}
            onClose={() => setOpenMenu(null)}
          />
        </SearchMenuButton>

        <SearchMenuButton
          label={t("reporting.search.favorites")}
          icon={<LuStar className="h-3.5 w-3.5" />}
          isOpen={openMenu === "favorites"}
          onToggle={() => setOpenMenu(openMenu === "favorites" ? null : "favorites")}
          onClose={() => setOpenMenu(null)}
          bordered={false}
        >
          <div className="max-h-[320px] overflow-y-auto p-1">
            {definitions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-500">{t("reporting.control.emptyDefinitions")}</div>
            ) : (
              definitions.map((definition) => (
                <button
                  key={definition.id}
                  type="button"
                  onClick={() => {
                    onApplyDefinition(definition);
                    setOpenMenu(null);
                  }}
                  className={`flex w-full flex-col items-start rounded-md px-3 py-2 text-start text-sm transition hover:bg-gray-50 ${
                    selectedDefinitionId === definition.id ? "bg-[#017e84]/10 text-[#01585c]" : "text-gray-700"
                  }`}
                >
                  <span className="font-medium">{definition.name}</span>
                  <span className="text-[10px] text-gray-400">{formatDate(definition.updatedAt)}</span>
                </button>
              ))
            )}
          </div>
        </SearchMenuButton>
      </div>
    </div>
  );
}

function FacetPill({
  facet,
  isEditing,
  onEdit,
  onRemove,
  editor,
}: {
  facet: ReportingFilterFacet;
  isEditing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  editor: ReactNode;
}) {
  return (
    <div className={facetClassName}>
      <button type="button" onClick={onEdit} className="inline-flex max-w-full items-center gap-1 truncate">
        <span className="truncate">{facet.label}</span>
        {facet.value && !isEditing ? <span className="truncate font-semibold">: {facet.value}</span> : null}
      </button>
      {editor}
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 text-[#017e84]/70 transition hover:bg-[#017e84]/15 hover:text-[#01585c]"
        aria-label={`Remove ${facet.label}`}
      >
        <LuX className="h-3 w-3" />
      </button>
    </div>
  );
}

function SearchMenuButton({
  label,
  icon,
  isOpen,
  onToggle,
  onClose,
  bordered = true,
  children,
}: {
  label: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  bordered?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className={`relative ${bordered ? "border-s border-gray-200" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-full min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        {icon}
        <span>{label}</span>
        <LuChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? (
        <div className="absolute end-0 top-full z-50 mt-0.5 min-w-[280px] border border-gray-200 bg-white shadow-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function FilterMenu({
  t,
  filters,
  expandedSubmenu,
  showAccountFilter,
  segment3Options,
  segment4Options,
  segment5Options,
  currencyOptions,
  accounts,
  journalEntryTypes,
  onToggleSubmenu,
  onPatch,
  onClearPeriod,
  onStartDateEdit,
  onClose,
}: {
  t: TranslationFn;
  filters: ReportingFilterState;
  expandedSubmenu: ExpandedSubmenu;
  showAccountFilter: boolean;
  segment3Options: string[];
  segment4Options: string[];
  segment5Options: string[];
  currencyOptions: string[];
  accounts: AccountOption[];
  journalEntryTypes: JournalEntryType[];
  onToggleSubmenu: (id: ReportingFilterId) => void;
  onPatch: (patch: Partial<ReportingFilterState>) => void;
  onClearPeriod: () => void;
  onStartDateEdit: (id: ReportingFilterId) => void;
  onClose: () => void;
}) {
  return (
    <div className="max-h-[420px] overflow-y-auto p-1">
      <FilterSection label={t("reporting.filter.section.period")}>
        <FilterActionItem
          label={t("reporting.filter.allPeriods")}
          active={!filters.dateFrom && !filters.dateTo}
          onClick={() => {
            onClearPeriod();
            onClose();
          }}
        />
        <FilterActionItem
          label={t("reporting.filter.dateFrom")}
          active={Boolean(filters.dateFrom)}
          onClick={() => onStartDateEdit("dateFrom")}
        />
        <FilterActionItem
          label={t("reporting.filter.dateTo")}
          active={Boolean(filters.dateTo)}
          onClick={() => onStartDateEdit("dateTo")}
        />
      </FilterSection>

      <FilterSection label={t("reporting.filter.section.comparison")}>
        <FilterActionItem
          label={t("reporting.filter.comparisonFrom")}
          active={Boolean(filters.comparisonFrom)}
          onClick={() => onStartDateEdit("comparisonFrom")}
        />
        <FilterActionItem
          label={t("reporting.filter.comparisonTo")}
          active={Boolean(filters.comparisonTo)}
          onClick={() => onStartDateEdit("comparisonTo")}
        />
      </FilterSection>

      <FilterSection label={t("reporting.filter.section.dimensions")}>
        <FilterSelectItem
          label={t("reporting.filter.basis")}
          value={filters.basis}
          expanded={expandedSubmenu === "basis"}
          onToggle={() => onToggleSubmenu("basis")}
          options={[
            { value: "ACCRUAL", label: t("reporting.basis.ACCRUAL") },
            { value: "CASH", label: t("reporting.basis.CASH") },
          ]}
          onSelect={(value) => onPatch({ basis: value as "ACCRUAL" | "CASH" })}
        />
        <FilterSelectItem
          label={t("reporting.filter.accountType")}
          value={filters.accountType}
          expanded={expandedSubmenu === "accountType"}
          onToggle={() => onToggleSubmenu("accountType")}
          options={[
            { value: "ASSET", label: t("reporting.accountType.ASSET") },
            { value: "LIABILITY", label: t("reporting.accountType.LIABILITY") },
            { value: "EQUITY", label: t("reporting.accountType.EQUITY") },
            { value: "REVENUE", label: t("reporting.accountType.REVENUE") },
            { value: "EXPENSE", label: t("reporting.accountType.EXPENSE") },
          ]}
          onSelect={(value) => onPatch({ accountType: value as AccountType })}
        />
        <FilterSelectItem
          label={t("reporting.filter.segment3")}
          value={filters.segment3}
          expanded={expandedSubmenu === "segment3"}
          onToggle={() => onToggleSubmenu("segment3")}
          options={segment3Options.map((value) => ({ value, label: value }))}
          onSelect={(value) => onPatch({ segment3: value })}
        />
        <FilterSelectItem
          label={t("reporting.filter.segment4")}
          value={filters.segment4}
          expanded={expandedSubmenu === "segment4"}
          onToggle={() => onToggleSubmenu("segment4")}
          options={segment4Options.map((value) => ({ value, label: value }))}
          onSelect={(value) => onPatch({ segment4: value })}
        />
        <FilterSelectItem
          label={t("reporting.filter.segment5")}
          value={filters.segment5}
          expanded={expandedSubmenu === "segment5"}
          onToggle={() => onToggleSubmenu("segment5")}
          options={segment5Options.map((value) => ({ value, label: value }))}
          onSelect={(value) => onPatch({ segment5: value })}
        />
        <FilterSelectItem
          label={t("reporting.filter.currencyCode")}
          value={filters.currencyCode}
          expanded={expandedSubmenu === "currencyCode"}
          onToggle={() => onToggleSubmenu("currencyCode")}
          options={currencyOptions.map((value) => ({ value, label: value }))}
          onSelect={(value) => onPatch({ currencyCode: value })}
        />
        <FilterSelectItem
          label={t("reporting.filter.journalEntryType")}
          value={filters.journalEntryTypeId}
          expanded={expandedSubmenu === "journalEntryTypeId"}
          onToggle={() => onToggleSubmenu("journalEntryTypeId")}
          options={journalEntryTypes.map((entryType) => ({ value: entryType.id, label: entryType.name }))}
          onSelect={(value) => onPatch({ journalEntryTypeId: value })}
        />
        {showAccountFilter ? (
          <FilterSelectItem
            label={t("reporting.filter.generalLedgerAccount")}
            value={filters.accountId}
            expanded={expandedSubmenu === "accountId"}
            onToggle={() => onToggleSubmenu("accountId")}
            options={accounts.map((account) => ({
              value: account.id,
              label: `${account.code} - ${account.name}`,
            }))}
            onSelect={(value) => onPatch({ accountId: value })}
          />
        ) : null}
      </FilterSection>

      <FilterSection label={t("reporting.filter.section.options")}>
        <FilterActionItem
          label={t("reporting.filter.includeZeroBalance")}
          active={filters.includeZeroBalance}
          onClick={() => onPatch({ includeZeroBalance: !filters.includeZeroBalance })}
        />
      </FilterSection>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterActionItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-start text-sm transition hover:bg-gray-50 ${
        active ? "bg-[#017e84]/10 font-medium text-[#01585c]" : "text-gray-700"
      }`}
    >
      <span>{label}</span>
      {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#017e84]" /> : null}
    </button>
  );
}

function FilterSelectItem({
  label,
  value,
  expanded,
  onToggle,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  expanded: boolean;
  onToggle: () => void;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-start text-sm transition hover:bg-gray-50 ${
          value ? "bg-[#017e84]/10 font-medium text-[#01585c]" : "text-gray-700"
        }`}
      >
        <span>{label}</span>
        <LuChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded ? (
        <div className="ms-2 space-y-0.5 border-s border-gray-100 py-1 ps-2">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">{label}</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`flex w-full rounded-md px-3 py-1.5 text-start text-xs transition hover:bg-gray-50 ${
                  value === option.value ? "font-semibold text-[#01585c]" : "text-gray-600"
                }`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
