"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { LuPlus as Plus, LuPencil as Pencil, LuX as X, LuCheck as Check } from "react-icons/lu";
import {
    createCurrency,
    getCurrencies,
    updateCurrency,
    deactivateCurrency,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Currency, CreateCurrencyPayload, UpdateCurrencyPayload } from "@/types/api";
import { StatusPill, Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

type CurrencyEditorState = {
    id?: string;
    code: string;
    name: string;
    nameAr: string;
    symbol: string;
    decimalPlaces: string;
    isBase: boolean;
    isActive: boolean;
};

const emptyCurrencyEditor: CurrencyEditorState = {
    code: "",
    name: "",
    nameAr: "",
    symbol: "",
    decimalPlaces: "3",
    isBase: false,
    isActive: true,
};

export function CurrenciesTab() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [currencyEditor, setCurrencyEditor] = useState<CurrencyEditorState | null>(null);

    const { data: currencies = [], isLoading } = useQuery({
        queryKey: ["currencies", token],
        queryFn: () => getCurrencies(token),
    });

    const saveCurrencyMutation = useMutation({
        mutationFn: (editor: CurrencyEditorState) => {
            const payload: CreateCurrencyPayload = {
                code: editor.code.trim().toUpperCase(),
                name: editor.name.trim(),
                nameAr: editor.nameAr.trim(),
                symbol: editor.symbol.trim(),
                decimalPlaces: Number(editor.decimalPlaces),
                isBase: editor.isBase,
                isActive: editor.isActive,
            };
            return editor.id 
                ? updateCurrency(editor.id, payload, token) 
                : createCurrency(payload, token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currencies"] });
            setCurrencyEditor(null);
        },
    });

    const deactivateCurrencyMutation = useMutation({
        mutationFn: (id: string) => deactivateCurrency(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["currencies"] }),
    });

    const openCurrencyEditor = (currency?: Currency) => {
        setCurrencyEditor(currency ? {
            id: currency.id,
            code: currency.code,
            name: currency.name || "",
            nameAr: currency.nameAr || "",
            symbol: currency.symbol || "",
            decimalPlaces: currency.decimalPlaces.toString(),
            isBase: currency.isBase,
            isActive: currency.isActive,
        } : emptyCurrencyEditor);
    };

    const canSaveCurrency = Boolean(
        currencyEditor?.code.trim() &&
        currencyEditor?.decimalPlaces !== "" &&
        Number.isFinite(Number(currencyEditor?.decimalPlaces))
    );

    if (isLoading) return <div className="flex items-center justify-center py-40 text-gray-500">{t("master.loading")}</div>;

    return (
        <div className="space-y-6">
            <Card className="p-0 border border-gray-200 bg-panel/40 overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{t("master.section.currencies.title")}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{t("master.section.currencies.description")}</p>
                    </div>
                    <Button onClick={() => openCurrencyEditor()}>
                        <Plus className="h-4 w-4 mr-2" /> {t("master.currencies.add")}
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.currencies.code")}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.currencies.name")}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.currencies.symbol")}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.currencies.decimalPlaces")}</th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.currencies.isBase")}</th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {currencies.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-600">{t("master.currencies.empty")}</td></tr>
                            ) : currencies.map((curr) => (
                                <tr key={curr.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-sm font-bold text-gray-900">{curr.code}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{curr.name || "-"}</div>
                                        <div className="text-xs text-gray-500">{curr.nameAr || ""}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{curr.symbol || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{curr.decimalPlaces}</td>
                                    <td className="px-6 py-4 text-center">
                                        {curr.isBase && <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">{t("master.currencies.baseCurrency")}</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={curr.isActive ? t("common.status.active") : t("common.status.inactive")} tone={curr.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openCurrencyEditor(curr)}
                                                className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-400/10 transition-all"
                                                title={t("common.action.edit")}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            {curr.isActive && !curr.isBase && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(t("common.confirm.deactivate", { name: curr.code }))) {
                                                            deactivateCurrencyMutation.mutate(curr.id);
                                                        }
                                                    }}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-400/10 transition-all"
                                                    title={t("common.action.deactivate")}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {currencyEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">
                                {currencyEditor.id ? t("master.currencies.modal.editTitle") : t("master.currencies.modal.createTitle")}
                            </h3>
                            <button onClick={() => setCurrencyEditor(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                            <Field label={t("master.currencies.code")} required>
                                <input
                                    value={currencyEditor.code}
                                    onChange={(event) => setCurrencyEditor((current) => current && ({ ...current, code: event.target.value.toUpperCase() }))}
                                    placeholder={t("master.currencies.codePlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.currencies.symbol")}>
                                <input
                                    value={currencyEditor.symbol}
                                    onChange={(event) => setCurrencyEditor((current) => current && ({ ...current, symbol: event.target.value }))}
                                    placeholder={t("master.currencies.symbolPlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.currencies.name")}>
                                <input
                                    value={currencyEditor.name}
                                    onChange={(event) => setCurrencyEditor((current) => current && ({ ...current, name: event.target.value }))}
                                    placeholder={t("master.currencies.namePlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.currencies.nameAr")}>
                                <input
                                    value={currencyEditor.nameAr}
                                    onChange={(event) => setCurrencyEditor((current) => current && ({ ...current, nameAr: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                    dir="rtl"
                                />
                            </Field>
                            <Field label={t("master.currencies.decimalPlaces")} required>
                                <input
                                    type="number"
                                    min={0}
                                    max={5}
                                    value={currencyEditor.decimalPlaces}
                                    onChange={(event) => setCurrencyEditor((current) => current && ({ ...current, decimalPlaces: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <div className="flex flex-col gap-4">
                                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={currencyEditor.isBase}
                                        onChange={(event) => setCurrencyEditor((current) => current && ({ ...current, isBase: event.target.checked }))}
                                    />
                                    {t("master.currencies.isBase")}
                                </label>
                                <Field label={t("common.table.status")}>
                                    <select
                                        value={currencyEditor.isActive ? "true" : "false"}
                                        onChange={(event) => setCurrencyEditor((current) => current && ({ ...current, isActive: event.target.value === "true" }))}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                    >
                                        <option value="true">{t("common.status.active")}</option>
                                        <option value="false">{t("common.status.inactive")}</option>
                                    </select>
                                </Field>
                            </div>
                        </div>
                        {saveCurrencyMutation.isError && (
                            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {(saveCurrencyMutation.error as Error).message || t("master.currencies.saveError")}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <Button variant="secondary" onClick={() => setCurrencyEditor(null)}>{t("common.action.cancel")}</Button>
                            <Button onClick={() => saveCurrencyMutation.mutate(currencyEditor)} disabled={!canSaveCurrency || saveCurrencyMutation.isPending}>
                                <Check className="h-4 w-4 mr-2" /> {t("common.action.save")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
    return (
        <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {label} {required && <span className="text-red-500">*</span>}
            </span>
            {children}
        </label>
    );
}
