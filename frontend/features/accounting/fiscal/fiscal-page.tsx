"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getFiscalYears, createFiscalYear, closeFiscalPeriod, openFiscalPeriod } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { FiscalYear, FiscalPeriod, PeriodStatus } from "@/types/api";
import { SectionHeading, Card, StatusPill, Button } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import {
    LuCalendarDays as CalendarDays,
    LuCalendar as Calendar,
    LuLockOpen as Unlock,
    LuLock as Lock,
    LuClock as Clock,
    LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuPlus as Plus
} from "react-icons/lu";
import { useTranslation } from "@/lib/i18n";
import { PeriodCloseModal } from "./components/period-close-modal";

const PeriodStatusBadge = ({ status }: { status: PeriodStatus }) => {
    switch (status) {
        case "OPEN":
            return <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200/50"><span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>مفتوحة</div>;
        case "CLOSED":
            return <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200"><span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>مغلقة</div>;
        case "LOCKED":
            return <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200/50"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>قيد المراجعة</div>;
        default:
            return null;
    }
};

export function FiscalPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [expandedYear, setExpandedYear] = useState<string | null>(null);
    const [newYear, setNewYear] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [closingPeriod, setClosingPeriod] = useState<FiscalPeriod | null>(null);

    const yearsQuery = useQuery({
        queryKey: ["fiscal-years", token],
        queryFn: () => getFiscalYears(token),
    });

    const createYearMutation = useMutation({
        mutationFn: () => createFiscalYear(parseInt(newYear, 10), token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fiscal-years"] });
            setNewYear(""); setShowAdd(false);
        },
    });

    const closeMutation = useMutation({
        mutationFn: (id: string) => closeFiscalPeriod(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fiscal-years"] }),
    });

    const openMutation = useMutation({
        mutationFn: (id: string) => openFiscalPeriod(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fiscal-years"] }),
    });

    const handleConfirmClose = () => {
        if (closingPeriod) {
            closeMutation.mutate(closingPeriod.id, {
                onSuccess: () => setClosingPeriod(null)
            });
        }
    };

    const years: FiscalYear[] = yearsQuery.data ?? [];

    return (
        <div className="space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none">
            <SectionHeading
                title={t("fiscal.title")}
                description={t("fiscal.description")}
                action={
                    <Button onClick={() => setShowAdd(!showAdd)} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                        <Plus className="h-4 w-4 ml-2" /> سنة مالية جديدة
                    </Button>
                }
            />

            {/* Summary Cards */}
            {years.length > 0 && (() => {
                const currentYear = years.find((y: FiscalYear) => y.status === "OPEN") || years[0];
                const totalPeriods = currentYear.periods.length;
                const openPeriods = currentYear.periods.filter((p: FiscalPeriod) => p.status === "OPEN").length;
                const closedPeriods = currentYear.periods.filter((p: FiscalPeriod) => p.status === "CLOSED").length;
                
                return (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm col-span-1 md:col-span-1">
                            <div className="flex items-center gap-3 mb-2 text-gray-500">
                                <h3 className="text-sm font-medium">السنة المالية</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-black text-gray-900">{currentYear.year}</span>
                                <PeriodStatusBadge status={currentYear.status} />
                            </div>
                            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
                                <CalendarDays className="h-3.5 w-3.5 text-green-500" />
                                <span>{formatDate(currentYear.startDate)} - {formatDate(currentYear.endDate)}</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-0.5">عدد الفترات</h3>
                                <p className="text-2xl font-bold text-gray-900">{totalPeriods}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-500">
                                <Unlock className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-0.5">الفترات المفتوحة</h3>
                                <p className="text-2xl font-bold text-gray-900">{openPeriods}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                                <Lock className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-0.5">الفترات المغلقة</h3>
                                <p className="text-2xl font-bold text-gray-900">{closedPeriods}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-500">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-0.5">آخر إغلاق</h3>
                                <p className="text-lg font-bold text-gray-900 mt-1">لا يوجد</p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {showAdd && (
                <Card className="border border-teal-500/20 bg-teal-500/5 p-5">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">{t("fiscal.add.year")}</label>
                            <input
                                type="number"
                                value={newYear}
                                onChange={e => setNewYear(e.target.value)}
                                placeholder={t("fiscal.add.placeholderYear")}
                                className="w-32 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                            />
                        </div>
                        <div className="pt-6">
                            <Button
                                onClick={() => createYearMutation.mutate()}
                                disabled={!newYear || createYearMutation.isPending}
                            >
                                {t("fiscal.add.create")}
                            </Button>
                        </div>
                        <div className="pt-6">
                            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("fiscal.add.cancel")}</Button>
                        </div>
                    </div>
                    {createYearMutation.isError && (
                        <p className="text-sm text-red-400 mt-3">{(createYearMutation.error as Error).message}</p>
                    )}
                </Card>
            )}

            <div className="space-y-4">
                {yearsQuery.isLoading ? (
                    <div className="py-20 text-center text-sm text-gray-600">{t("fiscal.loadingYears")}</div>
                ) : years.length === 0 ? (
                    <div className="py-20 text-center text-sm text-gray-600">{t("fiscal.emptyYears")}</div>
                ) : years.map((year: FiscalYear) => {
                    const isExpanded = expandedYear === year.id;
                    const openPeriods = year.periods.filter(p => p.status === "OPEN").length;
                    return (
                        <Card key={year.id} className="p-0 border border-gray-200 bg-panel/40  overflow-hidden">
                            <div
                                className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedYear(isExpanded ? null : year.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <button className="text-gray-600">
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{t("fiscal.year.title", { year: year.year })}</h3>
                                        <p className="text-xs text-gray-500">{formatDate(year.startDate)} → {formatDate(year.endDate)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-600">{t("fiscal.year.openPeriods", { open: openPeriods, total: year.periods.length })}</span>
                                    <PeriodStatusBadge status={year.status} />
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-gray-100">
                                    <table className="w-full text-sm text-right" dir="rtl">
                                        <thead className="bg-white border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 w-16 text-center">#</th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500">الفترة</th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500">من تاريخ</th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500">إلى تاريخ</th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500">الحالة</th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 text-center">القيود المعلقة</th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 text-left">الإجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50/50">
                                            {year.periods.map((period: FiscalPeriod, index: number) => {
                                                // Mock pending entries for demo purposes
                                                const pendingEntries = period.status === "OPEN" ? [0, 1, 3, 0, 1, 2][index % 6] || 0 : 0;
                                                return (
                                                    <tr key={period.id} className="hover:bg-gray-50/50 transition-colors group bg-white">
                                                        <td className="px-6 py-4 text-xs font-mono text-gray-400 text-center">{String(period.periodNumber).padStart(2, "0")}</td>
                                                        <td className="px-6 py-4 text-sm font-bold text-gray-700">{period.name}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                            {formatDate(period.startDate)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                            {formatDate(period.endDate)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <PeriodStatusBadge status={period.status} />
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-sm font-medium text-gray-600">{pendingEntries}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-left">
                                                            {period.status === "OPEN" && (
                                                                <button
                                                                    onClick={() => setClosingPeriod(period)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-green-600 hover:border-green-600/30 hover:bg-green-50 transition-all shadow-sm group-hover:border-green-600/20"
                                                                >
                                                                    مراجعة وإغلاق <Lock className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            {period.status === "CLOSED" && (
                                                                <button
                                                                    onClick={() => { if (confirm(t("fiscal.confirm.reopen", { name: period.name }))) openMutation.mutate(period.id); }}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-all shadow-sm"
                                                                >
                                                                    فتح الفترة <Unlock className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
            <PeriodCloseModal
                periodName={closingPeriod?.name ?? ""}
                isOpen={!!closingPeriod}
                onClose={() => setClosingPeriod(null)}
                onConfirm={handleConfirmClose}
                isPending={closeMutation.isPending}
            />
        </div>
    );
}
