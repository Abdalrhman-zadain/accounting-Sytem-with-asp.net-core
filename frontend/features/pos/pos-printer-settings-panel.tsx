"use client";

import { useEffect, useState } from "react";
import { LuPrinter, LuRefreshCw, LuSave } from "react-icons/lu";

import {
  loadPosPrinterConfig,
  savePosPrinterConfig,
  type PosPrinterConfig,
} from "@/features/pos/pos-printer-config";
import {
  getPrinterBridgeStatus,
  testPosPrinter,
  type PosPrintTarget,
} from "@/features/pos/pos-print-service";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";

export function PosPrinterSettingsPanel() {
  const { language } = useTranslation();
  const [config, setConfig] = useState<PosPrinterConfig>(() => loadPosPrinterConfig());
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isTesting, setIsTesting] = useState<PosPrintTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const isAr = language === "ar";

  const refreshPrinters = async () => {
    setIsLoadingPrinters(true);
    setBridgeError(null);
    setMessage(null);
    try {
      const status = await getPrinterBridgeStatus();
      setPrinters(status.printers);
      if (!status.available) {
        setBridgeError(status.error ?? "QZ Tray is not available.");
      }
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  useEffect(() => {
    void refreshPrinters();
  }, []);

  const saveConfig = () => {
    setConfig(savePosPrinterConfig(config));
    setMessage(getLocalizedText("Printer settings saved / تم حفظ إعدادات الطابعات", language));
  };

  const testPrinter = async (target: PosPrintTarget) => {
    setIsTesting(target);
    setMessage(null);
    try {
      const result = await testPosPrinter(target);
      setMessage(
        result.fallback
          ? getLocalizedText("Opened browser print fallback / تم فتح طباعة المتصفح كبديل", language)
          : getLocalizedText("Test print sent / تم إرسال طباعة اختبار", language),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTesting(null);
    }
  };

  const printerOptions = Array.from(
    new Set([
      ...printers,
      config.kitchenPrinterName ?? "",
      config.receiptPrinterName ?? "",
    ].filter(Boolean)),
  );

  return (
    <div className="rounded-[28px] border border-[#d7ddd8] bg-white p-6 shadow-[0_20px_60px_-40px_rgba(35,51,41,0.45)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xl font-black text-[#233329]">
            <LuPrinter className="h-5 w-5" />
            {getLocalizedText("Printer setup / إعداد الطابعات", language)}
          </div>
          <p className="mt-2 text-sm leading-7 text-[#64736b]">
            {getLocalizedText(
              "Select the local OS printer names for this cashier computer. These settings are saved only on this browser.",
              language,
            )}
            {isAr
              ? " اختر أسماء الطابعات المحلية لهذا الجهاز. يتم الحفظ على هذا المتصفح فقط."
              : ""}
          </p>
          {bridgeError ? (
            <p className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {getLocalizedText(
                "QZ Tray is not connected; browser print fallback will be used.",
                language,
              )}
              {" "}
              {bridgeError}
            </p>
          ) : null}
          {message ? (
            <p className="mt-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
              {message}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void refreshPrinters()}
          disabled={isLoadingPrinters}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d7ddd8] px-4 py-2 text-sm font-bold text-[#42564a] transition hover:bg-[#f6f8f7] disabled:opacity-50"
        >
          <LuRefreshCw className="h-4 w-4" />
          {isLoadingPrinters
            ? getLocalizedText("Loading / جار التحميل", language)
            : getLocalizedText("Refresh printers / تحديث الطابعات", language)}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <PrinterSelect
          label={getLocalizedText("Kitchen printer / طابعة المطبخ", language)}
          value={config.kitchenPrinterName ?? ""}
          options={printerOptions}
          placeholder={getLocalizedText("Select kitchen printer / اختر طابعة المطبخ", language)}
          onChange={(value) => setConfig((prev) => ({ ...prev, kitchenPrinterName: value || null }))}
        />
        <PrinterSelect
          label={getLocalizedText("Receipt printer / طابعة الإيصال", language)}
          value={config.receiptPrinterName ?? ""}
          options={printerOptions}
          placeholder={getLocalizedText("Select receipt printer / اختر طابعة الإيصال", language)}
          onChange={(value) => setConfig((prev) => ({ ...prev, receiptPrinterName: value || null }))}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ToggleRow
          label={getLocalizedText("Auto-print KOT on send / طباعة تذكرة المطبخ عند الإرسال", language)}
          checked={config.autoPrintKotOnSend}
          onChange={(checked) => setConfig((prev) => ({ ...prev, autoPrintKotOnSend: checked }))}
        />
        <ToggleRow
          label={getLocalizedText("Auto-print receipt on payment / طباعة الإيصال عند الدفع", language)}
          checked={config.autoPrintReceiptOnPay}
          onChange={(checked) => setConfig((prev) => ({ ...prev, autoPrintReceiptOnPay: checked }))}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveConfig}
          className="inline-flex items-center gap-2 rounded-full bg-[#0f8f67] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0c7a57]"
        >
          <LuSave className="h-4 w-4" />
          {getLocalizedText("Save printer settings / حفظ إعدادات الطابعات", language)}
        </button>
        <button
          type="button"
          onClick={() => void testPrinter("kitchen")}
          disabled={isTesting !== null}
          className="rounded-full border border-[#d7ddd8] px-4 py-2 text-sm font-bold text-[#42564a] transition hover:bg-[#f6f8f7] disabled:opacity-50"
        >
          {isTesting === "kitchen"
            ? getLocalizedText("Testing / اختبار", language)
            : getLocalizedText("Test kitchen / اختبار المطبخ", language)}
        </button>
        <button
          type="button"
          onClick={() => void testPrinter("receipt")}
          disabled={isTesting !== null}
          className="rounded-full border border-[#d7ddd8] px-4 py-2 text-sm font-bold text-[#42564a] transition hover:bg-[#f6f8f7] disabled:opacity-50"
        >
          {isTesting === "receipt"
            ? getLocalizedText("Testing / اختبار", language)
            : getLocalizedText("Test receipt / اختبار الإيصال", language)}
        </button>
      </div>
    </div>
  );
}

function PrinterSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#233329]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[16px] border border-[#d7ddd8] bg-[#fbfcfb] px-3 py-3 text-sm font-semibold text-[#233329]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[18px] border border-[#e2eae4] bg-[#fbfcfb] px-4 py-3 text-sm font-semibold text-[#42564a]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-[#c8d7cc] text-[#5f8a67] focus:ring-[#5f8a67]/20"
      />
    </label>
  );
}
