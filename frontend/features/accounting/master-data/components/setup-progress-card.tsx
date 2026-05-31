import { Button } from "@/components/ui";
import { LuChartColumn } from "react-icons/lu";

export function SetupProgressCard() {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                <div className="flex-1 space-y-4 w-full">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">جاهزية الإعدادات الأساسية 65%</h2>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: "65%" }} />
                    </div>
                    <p className="text-sm text-gray-500">
                        أكمل إعداد الشركات، الفروع، الحسابات، والضرائب قبل البدء بالقيود والفواتير.
                    </p>
                </div>
                <div className="pt-1">
                    <Button variant="secondary" size="sm" className="whitespace-nowrap">
                        <LuChartColumn className="ml-2 h-4 w-4" />
                        عرض التفاصيل
                    </Button>
                </div>
            </div>
        </div>
    );
}
