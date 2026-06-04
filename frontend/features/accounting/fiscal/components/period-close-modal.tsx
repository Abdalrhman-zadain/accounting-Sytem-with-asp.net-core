import { Button } from "@/components/ui";
import {
    LuX as X,
    LuLock as Lock,
    LuCircleCheck as CheckCircle,
    LuCircle as Circle,
    LuCircleAlert as AlertCircle,
    LuTriangleAlert as TriangleAlert,
} from "react-icons/lu";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PeriodCloseModalProps {
    periodName: string;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isPending: boolean;
}

export function PeriodCloseModal({
    periodName,
    isOpen,
    onClose,
    onConfirm,
    isPending,
}: PeriodCloseModalProps) {
    const { t, language } = useTranslation();
    const isArabic = language === "ar";

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir={isArabic ? "rtl" : "ltr"}>
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className={cn("flex items-center gap-3", !isArabic && "flex-row-reverse")}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div className={isArabic ? "text-right" : "text-left"}>
                            <h2 className="text-lg font-bold text-gray-900">{isArabic ? "إغلاق الفترة" : "Close Period"}</h2>
                            <p className="text-xs text-gray-500">{periodName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                    <p className={cn("mb-6 text-sm text-gray-600 text-center")}>
                        {isArabic
                            ? "يرجى التأكد من مراجعة العناصر التالية قبل إغلاق الفترة:"
                            : "Please make sure to review the following items before closing the period:"}
                    </p>

                    <div className="space-y-4">
                        <div className={cn("flex items-center justify-between border-b border-dashed border-gray-200 pb-3", !isArabic && "flex-row-reverse")}>
                            <span className="text-sm font-medium text-gray-700">{isArabic ? "تم ترحيل جميع القيود" : "All entries posted"}</span>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <div className={cn("flex items-center justify-between border-b border-dashed border-gray-200 pb-3", !isArabic && "flex-row-reverse")}>
                            <span className="text-sm font-medium text-gray-700">{isArabic ? "لا توجد فواتير Draft" : "No draft invoices"}</span>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <div className={cn("flex items-center justify-between border-b border-dashed border-gray-200 pb-3", !isArabic && "flex-row-reverse")}>
                            <span className="text-sm font-medium text-gray-700">{isArabic ? "تمت مراجعة البنك" : "Bank entries reconciled"}</span>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <div className={cn("flex items-center justify-between border-b border-dashed border-gray-200 pb-3", !isArabic && "flex-row-reverse")}>
                            <span className="text-sm font-medium text-gray-700">{isArabic ? "تم احتساب الضريبة" : "Tax calculated"}</span>
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className={cn("flex items-center justify-between pb-3", !isArabic && "flex-row-reverse")}>
                            <span className="text-sm font-medium text-gray-700">{isArabic ? "لا توجد حركات مخزون معلقة" : "No pending inventory movements"}</span>
                            <Circle className="h-5 w-5 text-gray-300" />
                        </div>
                    </div>

                    <div className={cn("mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 border border-amber-100", !isArabic && "flex-row-reverse")}>
                        <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className={cn("text-sm font-medium text-amber-800", isArabic ? "text-right" : "text-left")}>
                            {isArabic
                                ? "بعد الإغلاق، لن يمكن الترحيل أو التعديل على هذه الفترة إلا بصلاحيات خاصة."
                                : "After closing, posting or editing entries in this period will not be allowed without special permissions."}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className={cn("flex items-center gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-2xl", !isArabic && "flex-row-reverse")}>
                    <Button
                        onClick={onConfirm}
                        disabled={isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                    >
                        {isPending 
                            ? (isArabic ? "جاري الإغلاق..." : "Closing...") 
                            : (isArabic ? "تأكيد الإغلاق" : "Confirm Close")}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isPending}
                        className="flex-1 bg-white hover:bg-gray-50 h-11"
                    >
                        {isArabic ? "إلغاء" : "Cancel"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
