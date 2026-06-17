"use client";

import { useEffect, useState } from "react";
import { LuDownload, LuPrinter, LuRefreshCw, LuSave } from "react-icons/lu";

import {
  loadPosPrinterConfig,
  savePosPrinterConfig,
  type PosPrintBridgeMode,
  type PosPrinterConfig,
} from "@/features/pos/pos-printer-config";
import {
  getPrinterBridgeStatus,
  testPosPrinter,
  type PosPrintTarget,
} from "@/features/pos/pos-print-service";
import { downloadQzCertificate } from "@/lib/api/qz-tray";
import { useTranslation } from "@/lib/i18n";
import { loadStoredToken } from "@/lib/storage";
import { getLocalizedText } from "@/lib/utils";

const PRINT_AGENT_DOWNLOAD = "/downloads/simple-account-print-agent.zip";

const BRIDGE_OPTIONS: Array<{
  value: PosPrintBridgeMode;
  labelEn: string;
  labelAr: string;
  hintEn: string;
  hintAr: string;
}> = [
  {
    value: "agent",
    labelEn: "Local agent (production)",
    labelAr: "الوكيل المحلي (تشغيلي)",
    hintEn: "Silent named-printer routing through the Simple Account Print Agent.",
    hintAr: "طباعة صامتة للطابعات المحددة عبر وكيل Simple Account المحلي.",
  },
  {
    value: "browser",
    labelEn: "Browser print (manual emergency)",
    labelAr: "طباعة المتصفح (يدوي للطوارئ)",
    hintEn: "Opens the browser print dialog. Choose the printer manually each time.",
    hintAr: "يفتح نافذة طباعة المتصفح. اختر الطابعة يدوياً في كل مرة.",
  },
];

function getBridgeOptions(selectedMode: PosPrintBridgeMode) {
  if (selectedMode === "qz") {
    return [
      ...BRIDGE_OPTIONS,
      {
        value: "qz" as const,
        labelEn: "QZ Tray (legacy)",
        labelAr: "QZ Tray (قديم)",
        hintEn: "Legacy bridge kept only for existing cashier PCs already configured for QZ.",
        hintAr: "جسر قديم يبقى فقط للأجهزة المضبوطة مسبقاً على QZ.",
      },
    ];
  }
  return BRIDGE_OPTIONS;
}

function bridgeModeLabel(mode: PosPrintBridgeMode, language: string): string {
  const option = BRIDGE_OPTIONS.find((entry) => entry.value === mode);
  if (!option) {
    return mode;
  }
  return language === "ar" ? option.labelAr : option.labelEn;
}

export function PosPrinterSettingsPanel() {
  const { language } = useTranslation();
  const [config, setConfig] = useState<PosPrinterConfig>(() => loadPosPrinterConfig());
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isTesting, setIsTesting] = useState<PosPrintTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState(false);

  const isAr = language === "ar";
  const bridgeOptions = getBridgeOptions(config.printBridge);

  const refreshPrinters = async () => {
    setIsLoadingPrinters(true);
    setBridgeError(null);
    setMessage(null);
    setMessageTone("success");
    try {
      const status = await getPrinterBridgeStatus();
      setPrinters(status.printers);
      setBridgeConnected(status.available);
      if (!status.available && config.printBridge !== "browser") {
        setBridgeError(status.error ?? "Print bridge is not available.");
      }
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  useEffect(() => {
    void refreshPrinters();
  }, [config.printBridge]);

  const saveConfig = () => {
    setConfig(savePosPrinterConfig(config));
    setMessageTone("success");
    setMessage(getLocalizedText("Printer settings saved / تم حفظ إعدادات الطابعات", language));
  };

  const testPrinter = async (target: PosPrintTarget) => {
    setIsTesting(target);
    setMessage(null);
    setMessageTone("success");
    try {
      const result = await testPosPrinter(target);
      const modeLabel = bridgeModeLabel(result.mode, language);
      setMessageTone("success");
      setMessage(
        getLocalizedText(
          `Test print sent via ${modeLabel} / تم إرسال طباعة اختبار عبر ${modeLabel}`,
          language,
        ),
      );
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTesting(null);
    }
  };

  const downloadCertificate = async () => {
    const token = loadStoredToken();
    if (!token) {
      setMessageTone("error");
      setMessage(getLocalizedText("Please log in first / سجّل الدخول أولاً", language));
      return;
    }

    try {
      await downloadQzCertificate(token);
      setMessageTone("success");
      setMessage(
        getLocalizedText(
          "Certificate downloaded. On this PC run: cd \"C:\\Program Files\\QZ Tray\" then java -jar qz-tray.jar --allow \"path\\to\\digital-certificate.txt\" / تم تنزيل الشهادة. على هذا الجهاز نفّذ أمر QZ Tray --allow",
          language,
        ),
      );
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : String(error));
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
          {config.printBridge === "agent" ? (
            <p
              className={`mt-2 rounded-[14px] border px-3 py-2 text-xs font-semibold ${
                bridgeConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {bridgeConnected
                ? getLocalizedText(
                    "Print Agent connected on this PC. / الوكيل المحلي متصل على هذا الجهاز.",
                    language,
                  )
                : getLocalizedText(
                    "Print Agent is not running. Download, install, and start it, then refresh printers. / الوكيل المحلي غير متصل. نزّله وشغّله ثم حدّث الطابعات.",
                    language,
              )}
              {bridgeError ? ` ${bridgeError}` : null}
            </p>
          ) : bridgeError ? (
            <p className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {config.printBridge === "qz"
                ? getLocalizedText(
                    "QZ Tray is not connected. QZ mode is legacy and does not fall back automatically.",
                    language,
                  )
                : null}
              {" "}
              {bridgeError}
            </p>
          ) : null}
          {message ? (
            <p
              className={`mt-2 rounded-[14px] border px-3 py-2 text-xs font-semibold ${
                messageTone === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900"
              }`}
            >
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

      <div className="mt-6">
        <label className="block">
          <span className="text-sm font-bold text-[#233329]">
            {getLocalizedText("Print bridge / جسر الطباعة", language)}
          </span>
          <select
            value={config.printBridge}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                printBridge: event.target.value as PosPrintBridgeMode,
              }))
            }
            className="mt-2 w-full rounded-[16px] border border-[#d7ddd8] bg-[#fbfcfb] px-3 py-3 text-sm font-semibold text-[#233329] md:max-w-md"
          >
            {bridgeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {language === "ar" ? option.labelAr : option.labelEn}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs font-semibold leading-6 text-[#64736b]">
            {(() => {
              const option = bridgeOptions.find((entry) => entry.value === config.printBridge);
              if (!option) return null;
              return language === "ar" ? option.hintAr : option.hintEn;
            })()}
          </span>
        </label>
      </div>

      {config.printBridge === "agent" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={PRINT_AGENT_DOWNLOAD}
            download
            className="inline-flex items-center gap-2 rounded-full bg-[#233329] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1a2620]"
          >
            <LuDownload className="h-4 w-4" />
            {getLocalizedText("Download Print Agent / تنزيل وكيل الطباعة", language)}
          </a>
          <p className="text-xs leading-6 text-[#64736b]">
            {getLocalizedText(
              "Install on this Windows PC, pick kitchen and receipt printers in the agent tray menu, then refresh printers here.",
              language,
            )}
            {isAr
              ? " ثبّت على جهاز Windows، اختر الطابعات من قائمة الوكيل، ثم حدّث الطابعات هنا."
              : ""}
          </p>
        </div>
      ) : null}

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

      {config.printBridge === "browser" ? (
        <p className="mt-3 rounded-[14px] border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-6 text-sky-950">
          {getLocalizedText(
            "Browser mode: Windows will ask you to pick a printer each time. Set the kitchen printer as default before sending KOT, and the receipt printer before payment.",
            language,
          )}
          {isAr
            ? " في هذا الوضع يختار Windows الطابعة يدوياً في كل مرة. اجعل طابعة المطبخ افتراضية قبل الإرسال، وطابعة الإيصال قبل الدفع."
            : ""}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveConfig}
          className="inline-flex items-center gap-2 rounded-full bg-[#0f8f67] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0c7a57]"
        >
          <LuSave className="h-4 w-4" />
          {getLocalizedText("Save printer settings / حفظ إعدادات الطابعات", language)}
        </button>
        {config.printBridge === "qz" ? (
          <button
            type="button"
            onClick={() => void downloadCertificate()}
            className="rounded-full border border-[#d7ddd8] px-4 py-2 text-sm font-bold text-[#42564a] transition hover:bg-[#f6f8f7]"
          >
            {getLocalizedText("Download QZ certificate / تنزيل شهادة QZ", language)}
          </button>
        ) : null}
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
