import { Button } from "@/components/ui";
import { LuClock, LuCircleAlert, LuBuilding2, LuWallet, LuMapPin } from "react-icons/lu";
import { useTranslation } from "@/lib/i18n";

export function HelperPanels() {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Panel 1: Recent Changes */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <LuClock className="h-5 w-5 text-gray-500" />
                    <h3 className="text-base font-bold text-gray-900">{t("master.helper.recentChanges")}</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-green-100 p-2 text-green-600 mt-1">
                            <LuBuilding2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{t("master.helper.newCompanyAdded")}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span>Genius Admin</span>
                                <span>•</span>
                                <span>{t("master.helper.twoHoursAgo")}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-blue-100 p-2 text-blue-600 mt-1">
                            <LuWallet className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{t("master.helper.naturalAccountUpdated")}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span>Genius Admin</span>
                                <span>•</span>
                                <span>{t("master.helper.today1030am")}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-purple-100 p-2 text-purple-600 mt-1">
                            <LuMapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{t("master.helper.newBranchCreated")}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span>Genius Admin</span>
                                <span>•</span>
                                <span>{t("master.helper.yesterday0415pm")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel 2: Review Items */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <LuCircleAlert className="h-5 w-5 text-amber-500" />
                    <h3 className="text-base font-bold text-gray-900">{t("master.helper.itemsNeedReview")}</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <p className="text-sm font-medium text-gray-900">{t("master.helper.addMoreNaturalAccounts")}</p>
                        </div>
                        <Button variant="secondary" size="sm" className="h-7 text-xs px-3">
                            {t("master.helper.review")}
                        </Button>
                    </div>
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <p className="text-sm font-medium text-gray-900">{t("master.helper.configureTaxes")}</p>
                        </div>
                        <Button variant="secondary" size="sm" className="h-7 text-xs px-3">
                            {t("master.helper.review")}
                        </Button>
                    </div>
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <p className="text-sm font-medium text-gray-900">{t("master.helper.setupMorePaymentTerms")}</p>
                        </div>
                        <Button variant="secondary" size="sm" className="h-7 text-xs px-3">
                            {t("master.helper.review")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
