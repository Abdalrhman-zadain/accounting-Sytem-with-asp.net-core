import { cn } from "@/lib/utils";
import { IconType } from "react-icons/lib";
import { LuArrowLeft } from "react-icons/lu";

interface MasterDataCardProps {
    title: string;
    count: number;
    icon: IconType;
    isActive?: boolean;
    needsReview?: boolean;
    onClick: () => void;
    iconColorClass?: string;
    iconBgClass?: string;
}

export function MasterDataCard({
    title,
    count,
    icon: Icon,
    isActive,
    needsReview,
    onClick,
    iconColorClass = "text-gray-500",
    iconBgClass = "bg-gray-100",
}: MasterDataCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 text-right transition-all",
                isActive
                    ? "border-green-500 bg-green-50 shadow-md ring-1 ring-green-500/20"
                    : "border-gray-200 bg-white hover:border-green-200 hover:shadow-sm"
            )}
        >
            <div className="flex w-full items-start justify-between">
                <div className="flex flex-col gap-1 items-start">
                    <span className="text-sm font-bold text-gray-900">{title}</span>
                    <span className="text-2xl font-black text-gray-900 mt-1">{count}</span>
                </div>
                <div className={cn("rounded-xl p-3", iconBgClass, iconColorClass)}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            <div className="mt-6 flex w-full items-center justify-between">
                <div className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                    needsReview
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                )}>
                    {needsReview ? "تحتاج مراجعة" : "جميعها نشطة"}
                </div>
                
                <span className={cn(
                    "flex items-center text-xs font-bold transition-colors",
                    isActive ? "text-green-700" : "text-gray-500 group-hover:text-green-600"
                )}>
                    إدارة {title.split(" ")[0]}
                    <LuArrowLeft className="ml-1 h-3 w-3" />
                </span>
            </div>
        </button>
    );
}
