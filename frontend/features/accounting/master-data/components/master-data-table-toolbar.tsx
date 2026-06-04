import { Button } from "@/components/ui";
import { LuSearch, LuFilter, LuSettings2, LuDownload } from "react-icons/lu";
import { useTranslation } from "@/lib/i18n";

interface MasterDataTableToolbarProps {
    searchPlaceholder?: string;
    showExport?: boolean;
}

export function MasterDataTableToolbar({ searchPlaceholder, showExport = true }: MasterDataTableToolbarProps) {
    const { t } = useTranslation();
    const resolvedPlaceholder = searchPlaceholder || t("master.toolbar.search");

    return (
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 md:flex-row md:items-center md:justify-between bg-white">
            <div className="flex flex-1 items-center gap-3">
                <div className="relative w-full md:max-w-xs">
                    <LuSearch className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={resolvedPlaceholder}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                </div>
                <Button variant="secondary" size="sm" className="hidden shrink-0 md:flex">
                    <LuFilter className="ml-2 h-4 w-4" /> {t("master.toolbar.allStatuses")}
                </Button>
            </div>
            
            <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="hidden shrink-0 lg:flex">
                    <LuSettings2 className="ml-2 h-4 w-4" /> {t("master.toolbar.columns")}
                </Button>
                {showExport && (
                    <Button variant="secondary" size="sm" className="shrink-0">
                        <LuDownload className="ml-2 h-4 w-4" /> {t("master.toolbar.export")}
                    </Button>
                )}
            </div>
        </div>
    );
}
