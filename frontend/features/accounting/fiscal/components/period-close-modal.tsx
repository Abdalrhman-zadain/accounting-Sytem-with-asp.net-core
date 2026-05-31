import { Button } from "@/components/ui";
import {
    LuX as X,
    LuLock as Lock,
    LuCircleCheck as CheckCircle,
    LuCircle as Circle,
    LuCircleAlert as AlertCircle,
    LuTriangleAlert as TriangleAlert,
} from "react-icons/lu";

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
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">إغلاق الفترة</h2>
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
                    <p className="mb-6 text-sm text-gray-600 text-center">
                        يرجى التأكد من مراجعة العناصر التالية قبل إغلاق الفترة:
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-3">
                            <span className="text-sm font-medium text-gray-700">تم ترحيل جميع القيود</span>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-3">
                            <span className="text-sm font-medium text-gray-700">لا توجد فواتير Draft</span>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-3">
                            <span className="text-sm font-medium text-gray-700">تمت مراجعة البنك</span>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-3">
                            <span className="text-sm font-medium text-gray-700">تم احتساب الضريبة</span>
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex items-center justify-between pb-3">
                            <span className="text-sm font-medium text-gray-700">لا توجد حركات مخزون معلقة</span>
                            <Circle className="h-5 w-5 text-gray-300" />
                        </div>
                    </div>

                    <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 border border-amber-100">
                        <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-amber-800">
                            بعد الإغلاق، لن يمكن الترحيل أو التعديل على هذه الفترة إلا بصلاحيات خاصة.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-2xl">
                    <Button
                        onClick={onConfirm}
                        disabled={isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                    >
                        {isPending ? "جاري الإغلاق..." : "تأكيد الإغلاق"}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isPending}
                        className="flex-1 bg-white hover:bg-gray-50 h-11"
                    >
                        إلغاء
                    </Button>
                </div>
            </div>
        </div>
    );
}
