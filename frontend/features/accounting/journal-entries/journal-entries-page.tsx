"use client";

import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { LuPlus as Plus, LuRefreshCw as RefreshCw, LuSend as Send, LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuCircleAlert as AlertCircle, LuPencil as Pencil } from "react-icons/lu";
import { AccountAutocomplete } from "@/features/accounting/chart-of-accounts/components/account-autocomplete";
import {
    getJournalEntries,
    createJournalEntry,
    updateJournalEntry,
    unpostJournalEntry,
    postJournalEntry,
    getAccountOptions,
    getJournalEntryById,
    getJournalEntryTypes,
    createJournalEntryType,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { JournalEntry, JournalEntryLine, AccountOption, JournalEntryType } from "@/types/api";
import { SectionHeading, StatusPill, Card, Button, TableSkeleton, PageShell } from "@/components/ui";
import { ExportActions } from "@/components/ui/export-actions";
import { exportOrPrint, formatExportDate, type ExportMode } from "@/lib/export-print";
import { getLocalizedJournalEntryTypeName } from "@/lib/master-data-localization";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

function JournalStatusPill({ status }: { status: string }) {
    const { t } = useTranslation();

    return (
        <StatusPill
            label={t(`journal.status.${status}`)}
            tone={status === "POSTED" ? "positive" : status === "DRAFT" ? "warning" : "neutral"}
        />
    );
}

type LineForm = { accountId: string; description: string; debitAmount: string; creditAmount: string };
const EMPTY_LINE: LineForm = { accountId: "", description: "", debitAmount: "", creditAmount: "" };

export function JournalEntriesPage() {
    const { token, user } = useAuth();
    const queryClient = useQueryClient();
    const { t, language } = useTranslation();
    const isArabic = language === "ar";
    const [showCreate, setShowCreate] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

    // Create form state
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
    const [journalEntryTypeId, setJournalEntryTypeId] = useState<string>("");
    const [description, setDescription] = useState("");
    const [lines, setLines] = useState<LineForm[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
    const [showAddType, setShowAddType] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");

    // List filters
    const [search, setSearch] = useState("");
    const [filterTypeId, setFilterTypeId] = useState<string>("");

    const journalParams = useMemo(
        () => ({
            search: search.trim() || undefined,
            journalEntryTypeId: filterTypeId || undefined,
            includeLines: false,
        }),
        [search, filterTypeId],
    );

    const entriesQuery = useQuery({
        queryKey: queryKeys.journalEntries(token, journalParams),
        queryFn: () => getJournalEntries(journalParams, token),
    });

    const accountsQuery = useQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
        staleTime: 5 * 60 * 1000,
    });

    const typesQuery = useQuery({
        queryKey: queryKeys.journalEntryTypes(token),
        queryFn: () => getJournalEntryTypes(token),
        staleTime: 10 * 60 * 1000,
    });

    const postingAccounts = accountsQuery.data ?? [];

    const expandedEntryQuery = useQuery({
        queryKey: queryKeys.journalEntryById(token, expandedId),
        queryFn: () => getJournalEntryById(expandedId!, token),
        enabled: !!expandedId,
        staleTime: 30_000,
    });

    const createTypeMutation = useMutation({
        mutationFn: (name: string) => createJournalEntryType({ name }, token),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ["journal-entry-types"] });
            setJournalEntryTypeId(created.id);
            setNewTypeName("");
            setShowAddType(false);
        },
    });

    const buildEditorPayload = () => ({
        entryDate,
        description,
        journalEntryTypeId: journalEntryTypeId || null,
        lines: lines
            .filter((line) => line.accountId)
            .map((line) => ({
                accountId: line.accountId,
                description: line.description || undefined,
                debitAmount: Number((parseFloat(line.debitAmount) || 0).toFixed(2)),
                creditAmount: Number((parseFloat(line.creditAmount) || 0).toFixed(2)),
            })),
    });

    const resetEditorForm = () => {
        setEditingEntryId(null);
        setShowCreate(false);
        setEntryDate(new Date().toISOString().split("T")[0]);
        setJournalEntryTypeId("");
        setDescription("");
        setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
        setShowAddType(false);
        setNewTypeName("");
    };

    const populateEditorForm = (entry: JournalEntry) => {
        setEditingEntryId(entry.id);
        setEntryDate(entry.entryDate.split("T")[0] ?? "");
        setJournalEntryTypeId(entry.journalEntryTypeId ?? "");
        setDescription(entry.description ?? "");
        setLines(
            entry.lines.length
                ? entry.lines.map((line) => ({
                    accountId: line.accountId,
                    description: line.description ?? "",
                    debitAmount: parseFloat(line.debitAmount) > 0 ? Number(line.debitAmount).toFixed(2) : "",
                    creditAmount: parseFloat(line.creditAmount) > 0 ? Number(line.creditAmount).toFixed(2) : "",
                }))
                : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
        );
        setShowCreate(true);
    };

    const createMutation = useMutation({
        mutationFn: () => createJournalEntry({
            entryDate,
            description,
            journalEntryTypeId: journalEntryTypeId || undefined,
            lines: lines
                .filter(l => l.accountId)
                .map(l => ({
                    accountId: l.accountId,
                    description: l.description || undefined,
                    debitAmount: Number((parseFloat(l.debitAmount) || 0).toFixed(2)),
                    creditAmount: Number((parseFloat(l.creditAmount) || 0).toFixed(2)),
                })),
        }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            resetEditorForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (id: string) => updateJournalEntry(id, buildEditorPayload(), token),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: queryKeys.journalEntryById(token, updated.id) });
            resetEditorForm();
        },
    });

    const postMutation = useMutation({
        mutationFn: (id: string) => postJournalEntry(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal-entries"] }),
    });

    const debitTotal = lines.reduce((s, l) => s + Number((parseFloat(l.debitAmount) || 0).toFixed(2)), 0);
    const creditTotal = lines.reduce((s, l) => s + Number((parseFloat(l.creditAmount) || 0).toFixed(2)), 0);
    const isBalanced = Math.abs(debitTotal - creditTotal) < 0.001 && debitTotal > 0;
    const exportPermissions = { canPrint: true, canExportPdf: true, canExportExcel: true };
    const entries = entriesQuery.data ?? [];
    const activeTypes = (typesQuery.data ?? []).filter((type: JournalEntryType) => type.isActive);
    const draftCount = entries.filter((entry) => entry.status === "DRAFT").length;
    const postedCount = entries.filter((entry) => entry.status === "POSTED").length;

    const handleExport = (mode: ExportMode) => {
        exportOrPrint({
            mode,
            entityType: "table",
            title: "القيود اليومية",
            fileName: "journal-entries",
            currency: "JOD",
            generatedBy: user?.name || user?.email,
            permissions: exportPermissions,
            filters: [
                { label: "البحث", value: search.trim() || "كل القيود" },
                {
                    label: "نوع القيد",
                    value: filterTypeId
                        ? getLocalizedJournalEntryTypeName(
                            (typesQuery.data ?? []).find((type: JournalEntryType) => type.id === filterTypeId)?.name ?? "",
                            language,
                        )
                        : "كل الأنواع",
                },
            ],
            columns: [
                { key: "reference", label: "رقم القيد", value: (row) => row.reference },
                { key: "date", label: "تاريخ القيد", value: (row) => formatExportDate(row.entryDate) },
                {
                    key: "type",
                    label: "نوع القيد",
                    value: (row) =>
                        row.journalEntryType?.name
                            ? getLocalizedJournalEntryTypeName(row.journalEntryType.name, language)
                            : "غير محدد",
                },
                { key: "description", label: "الوصف", value: (row) => row.description || "بدون وصف" },
                { key: "status", label: "الحالة", value: (row) => t(`journal.status.${row.status}`) },
            ],
            rows: entriesQuery.data ?? [],
            totals: [{ label: "عدد القيود", value: String(entriesQuery.data?.length ?? 0) }],
        });
    };

    const updateLine = (i: number, field: keyof LineForm, value: string) => {
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
    };

    const openCreateForm = () => {
        resetEditorForm();
        setShowCreate(true);
    };

    const openEditForm = async (id: string) => {
        let entry = await queryClient.fetchQuery({
            queryKey: queryKeys.journalEntryById(token, id),
            queryFn: () => getJournalEntryById(id, token),
            staleTime: 0,
        });

        if (entry.status === "POSTED") {
            if (!confirm(t("journal.confirm.unpostForEdit"))) {
                return;
            }

            entry = await unpostJournalEntry(id, token);
            await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.setQueryData(queryKeys.journalEntryById(token, entry.id), entry);
        }

        populateEditorForm(entry);
    };

    return (
        <PageShell>
            <div dir={isArabic ? "rtl" : "ltr"} className={cn("space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none", isArabic && "arabic-ui")}>
                <SectionHeading
                    title={t("journal.title")}
                    description={t("journal.description")}
                />

                <div className="grid gap-4 md:grid-cols-3">
                    <SummaryCard label={t("journal.list.title")} value={entries.length} hint={t("journal.list.subtitle")} />
                    <SummaryCard label={t("journal.status.DRAFT")} value={draftCount} hint={t("journal.button.saveDraft")} />
                    <SummaryCard label={t("journal.status.POSTED")} value={postedCount} hint={t("journal.action.post")} />
                </div>

                <Card className="p-5">
                    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_auto_auto]">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("journal.list.searchPlaceholder")}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                        <select
                            value={filterTypeId}
                            onChange={(e) => setFilterTypeId(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        >
                            <option value="">{t("journal.list.allTypes")}</option>
                            {activeTypes.map((type: JournalEntryType) => (
                                <option key={type.id} value={type.id}>
                                    {getLocalizedJournalEntryTypeName(type.name, language)}
                                </option>
                            ))}
                        </select>
                        <Button className="gap-2" onClick={openCreateForm}>
                            <Plus className="h-4 w-4 shrink-0" />
                            {t("journal.button.newEntry")}
                        </Button>
                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => entriesQuery.refetch()}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-teal-500"
                            >
                                <RefreshCw className={cn("h-4 w-4", entriesQuery.isFetching && "animate-spin")} />
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <ExportActions onAction={handleExport} permissions={exportPermissions} disabled={entriesQuery.isLoading} />
                    </div>
                </Card>

                {showCreate && (
                    <Card className="space-y-6 border border-teal-200 bg-teal-50/40 p-6">
                        <div>
                            <div className="text-base font-bold text-gray-900">
                                {editingEntryId ? t("journal.edit.title") : t("journal.create.title")}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">{t("journal.description")}</div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{t("journal.field.date")}</label>
                                <input
                                    type="date"
                                    value={entryDate}
                                    onChange={e => setEntryDate(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{t("journal.field.description")}</label>
                                <input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder={t("journal.field.descriptionPlaceholder")}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{t("journal.field.type")}</label>
                                <select
                                    value={journalEntryTypeId}
                                    onChange={(e) => setJournalEntryTypeId(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                >
                                    <option value="">{t("journal.none")}</option>
                                    {(typesQuery.data ?? [])
                                        .filter((t: JournalEntryType) => t.isActive || t.id === journalEntryTypeId)
                                        .map((type: JournalEntryType) => (
                                            <option key={type.id} value={type.id}>
                                                {getLocalizedJournalEntryTypeName(type.name, language)}{type.isActive ? "" : ` ${t("common.inactiveSuffix")}`}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button type="button" variant="secondary" className="w-full" onClick={() => setShowAddType((v) => !v)}>
                                    {t("journal.button.addType")}
                                </Button>
                            </div>
                        </div>

                        {showAddType && (
                            <div className="rounded-2xl border border-teal-200 bg-white p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <input
                                        value={newTypeName}
                                        onChange={(e) => setNewTypeName(e.target.value)}
                                        placeholder={t("journal.type.placeholder")}
                                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            disabled={!newTypeName.trim() || createTypeMutation.isPending}
                                            onClick={() => createTypeMutation.mutate(newTypeName)}
                                        >
                                            {createTypeMutation.isPending ? t("journal.type.saving") : t("journal.type.save")}
                                        </Button>
                                        <Button type="button" variant="ghost" onClick={() => setShowAddType(false)}>
                                            {t("journal.button.cancel")}
                                        </Button>
                                    </div>
                                </div>
                                {createTypeMutation.isError && (
                                    <div className="mt-2 text-xs text-red-500">
                                        {(createTypeMutation.error as Error).message || t("journal.type.createError")}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                            <table className="w-full min-w-[860px] table-fixed text-sm">
                                <colgroup>
                                    <col className="w-[28%]" />
                                    <col className="w-[34%]" />
                                    <col className="w-[19%]" />
                                    <col className="w-[19%]" />
                                </colgroup>
                                <thead className="bg-gray-50">
                                    <tr>
                                        <TableHead>{t("journal.lines.account")}</TableHead>
                                        <TableHead>{t("journal.lines.description")}</TableHead>
                                        <TableHead className="text-end">{t("journal.lines.debit")}</TableHead>
                                        <TableHead className="text-end">{t("journal.lines.credit")}</TableHead>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, i) => (
                                        <tr key={i} className="border-t border-gray-100">
                                            <td className="px-4 py-3 align-top">
                                                <AccountAutocomplete
                                                    accounts={postingAccounts}
                                                    value={line.accountId}
                                                    onChange={(id) => updateLine(i, "accountId", id)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    value={line.description}
                                                    onChange={e => updateLine(i, "description", e.target.value)}
                                                    placeholder={t("common.optional")}
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={line.debitAmount}
                                                    onChange={e => updateLine(i, "debitAmount", e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={line.creditAmount}
                                                    onChange={e => updateLine(i, "creditAmount", e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t border-gray-200 bg-gray-50">
                                    <tr>
                                        <td colSpan={2} className="px-4 py-3">
                                            <button onClick={() => setLines(p => [...p, { ...EMPTY_LINE }])} className="text-xs font-bold text-teal-600 hover:text-teal-700">
                                                {t("journal.lines.addLine")}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-end text-sm font-black tabular-nums text-teal-600">{debitTotal.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-end text-sm font-black tabular-nums text-teal-600">{creditTotal.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {!isBalanced && debitTotal > 0 && (
                            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {t("journal.balance.notBalanced", { debit: debitTotal.toFixed(2), credit: creditTotal.toFixed(2) })}
                            </div>
                        )}
                        {isBalanced && (
                            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                                {t("journal.balance.balanced")}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                onClick={() => (editingEntryId ? updateMutation.mutate(editingEntryId) : createMutation.mutate())}
                                disabled={!isBalanced || createMutation.isPending || updateMutation.isPending}
                            >
                                {editingEntryId ? t("journal.button.updateDraft") : t("journal.button.saveDraft")}
                            </Button>
                            <Button variant="secondary" onClick={resetEditorForm}>{t("journal.button.cancel")}</Button>
                            {createMutation.isError && <p className="text-sm text-red-500">{(createMutation.error as Error).message}</p>}
                            {updateMutation.isError && <p className="text-sm text-red-500">{(updateMutation.error as Error).message}</p>}
                        </div>
                    </Card>
                )}

                <Card className="overflow-hidden p-0">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{t("journal.list.title")}</div>
                        <div className="text-xs text-gray-500">{t("journal.list.subtitle")}</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {entriesQuery.isLoading ? (
                            <TableSkeleton rows={8} />
                        ) : !entries.length ? (
                            <div className="py-16 text-center text-sm text-gray-600">{t("journal.list.empty")}</div>
                        ) : entries.map((entry: JournalEntry) => (
                            <div key={entry.id}>
                                <div
                                    className="flex cursor-pointer items-start justify-between px-6 py-5 transition-colors hover:bg-gray-50"
                                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                >
                                    <div className="flex min-w-0 items-start gap-4">
                                        <button type="button" className="mt-1 text-gray-600 hover:text-gray-900">
                                            {expandedId === entry.id ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className={cn("h-4 w-4", isArabic && "rotate-180")} />
                                            )}
                                        </button>
                                        <div className="min-w-0">
                                            <span className="font-mono text-sm font-bold text-teal-500">{entry.reference}</span>
                                            <p className="mt-1 text-xs text-gray-500">{entry.description || t("journal.entry.noDescription")}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-xs text-gray-500">{formatDate(entry.entryDate)}</span>
                                        {entry.journalEntryType?.name && (
                                            <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-900">
                                                {getLocalizedJournalEntryTypeName(entry.journalEntryType.name, language)}
                                            </span>
                                        )}
                                        <JournalStatusPill status={entry.status} />
                                        <div className="flex items-center gap-2">
                                            {entry.status === "DRAFT" && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await openEditForm(entry.id);
                                                    }}
                                                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Pencil className="h-3 w-3" />
                                                        {t("journal.button.editEntry")}
                                                    </span>
                                                </button>
                                            )}
                                            {entry.status === "DRAFT" && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); if (confirm(t("journal.confirm.post"))) postMutation.mutate(entry.id); }}
                                                    className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Send className="h-3 w-3" />
                                                        {t("journal.action.post")}
                                                    </span>
                                                </button>
                                            )}
                                        {entry.status === "POSTED" && !entry.reversalOfId && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await openEditForm(entry.id);
                                                }}
                                                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Pencil className="h-3 w-3" />
                                                    {t("journal.button.editEntry")}
                                                </span>
                                            </button>
                                        )}
                                        </div>
                                    </div>
                                </div>

                                {expandedId === entry.id && (
                                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
                                        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                                            <table className="w-full min-w-[760px] table-fixed text-sm">
                                                <colgroup>
                                                    <col className="w-[30%]" />
                                                    <col className="w-[34%]" />
                                                    <col className="w-36" />
                                                    <col className="w-36" />
                                                </colgroup>
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <TableHead className={isArabic ? "text-right" : "text-left"}>{t("journal.lines.account")}</TableHead>
                                                        <TableHead className={isArabic ? "text-right" : "text-left"}>{t("journal.lines.description")}</TableHead>
                                                        <TableHead className="text-end">{t("journal.lines.debit")}</TableHead>
                                                        <TableHead className="text-end">{t("journal.lines.credit")}</TableHead>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {expandedEntryQuery.isLoading ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-6 text-center text-sm text-gray-600">
                                                                {t("journal.list.loading")}
                                                            </td>
                                                        </tr>
                                                    ) : (expandedEntryQuery.data?.lines ?? []).map((line: JournalEntryLine) => (
                                                        <tr key={line.id} className="border-t border-gray-100">
                                                            <td className={cn("px-6 py-4 align-top text-slate-900", isArabic ? "text-right" : "text-left")}>
                                                                <div className={cn("inline-flex flex-col", isArabic ? "ml-auto items-end text-right" : "mr-auto items-start text-left")}>
                                                                    <span className="block font-semibold">
                                                                        {isArabic ? line.accountNameAr || line.accountName : line.accountName}
                                                                    </span>
                                                                <span dir="ltr" className="block self-start text-left font-mono text-xs text-slate-500">
                                                                    {line.accountCode}
                                                                </span>
                                                                </div>
                                                            </td>
                                                            <td className={cn("px-6 py-4 align-top text-gray-700", isArabic ? "text-right" : "text-left")}>{line.description || t("common.emptyDash")}</td>
                                                            <td className="px-6 py-4 text-end align-top font-mono font-bold tabular-nums text-teal-600">
                                                                {parseFloat(line.debitAmount) > 0 ? formatCurrency(line.debitAmount) : t("common.emptyDash")}
                                                            </td>
                                                            <td className="px-6 py-4 text-end align-top font-mono font-bold tabular-nums text-amber-600">
                                                                {parseFloat(line.creditAmount) > 0 ? formatCurrency(line.creditAmount) : t("common.emptyDash")}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </PageShell>
    );
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
    return (
        <Card className="p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{hint}</div>
        </Card>
    );
}

function TableHead({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <th className={cn("px-6 py-3 text-start text-[10px] font-bold uppercase tracking-widest text-gray-600", className)}>{children}</th>;
}
