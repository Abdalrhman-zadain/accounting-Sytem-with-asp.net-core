"use client";

import { useEffect, useMemo, useState } from "react";
import { LuEye, LuPrinter, LuRefreshCw, LuSave } from "react-icons/lu";

import {
  loadPosMarketPrinterConfig,
  savePosMarketPrinterConfig,
  type PosMarketPrinterConfig,
} from "@/features/pos-market/pos-market-printer-config";
import {
  buildPosMarketReceiptPreviewHtml,
  getMarketPrinterBridgeStatus,
  testPosMarketReceiptPrinter,
} from "@/features/pos-market/pos-market-print-service";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";

export function PosMarketPrinterSettingsPanel() {
  const { language, t } = useTranslation();
  const [config, setConfig] = useState<PosMarketPrinterConfig>(() => loadPosMarketPrinterConfig());
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const previewHtml = useMemo(() => buildPosMarketReceiptPreviewHtml(), []);

  const refreshPrinters = async () => {
    setIsLoadingPrinters(true);
    setBridgeError(null);
    setMessage(null);
    try {
      const status = await getMarketPrinterBridgeStatus();
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
    setConfig(savePosMarketPrinterConfig(config));
    setMessage(t("posMarket.printers.saveSuccess"));
  };

  const testPrinter = async () => {
    setIsTesting(true);
    setMessage(null);
    try {
      const result = await testPosMarketReceiptPrinter();
      setMessage(
        result.fallback
          ? t("posMarket.printers.fallbackUsed")
          : t("posMarket.printers.testSuccess"),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTesting(false);
    }
  };

  const printerOptions = Array.from(
    new Set([...printers, config.receiptPrinterName ?? ""].filter(Boolean)),
  );

  return (
    <div
      className="rounded-[28px] border p-6 shadow-sm"
      style={{ borderColor: POS_MARKET_THEME.colors.outline, backgroundColor: POS_MARKET_THEME.colors.cardSurface }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xl font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
            <LuPrinter className="h-5 w-5" />
            {t("posMarket.workspace.printers")}
          </div>
          <p className="mt-2 text-sm leading-7" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {t("posMarket.printers.description")}
          </p>
          {bridgeError ? (
            <p className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {t("posMarket.printers.bridgeUnavailable")} {bridgeError}
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
          className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold disabled:opacity-50"
          style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.text }}
        >
          <LuRefreshCw className="h-4 w-4" />
          {isLoadingPrinters ? t("common.loading") : t("posMarket.printers.refresh")}
        </button>
      </div>

      <div className="mt-6">
        <label className="block">
          <span className="text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
            {getLocalizedText("Receipt printer / طابعة الإيصال", language)}
          </span>
          <select
            value={config.receiptPrinterName ?? ""}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, receiptPrinterName: event.target.value || null }))
            }
            className="mt-2 w-full rounded-[16px] border px-3 py-3 text-sm font-semibold"
            style={{ borderColor: POS_MARKET_THEME.colors.outline }}
          >
            <option value="">{t("posMarket.printers.selectReceipt")}</option>
            {printerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-5 flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm font-semibold" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
        <span style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.printers.autoPrintReceipt")}
        </span>
        <input
          type="checkbox"
          checked={config.autoPrintReceiptOnPay}
          onChange={(event) =>
            setConfig((prev) => ({ ...prev, autoPrintReceiptOnPay: event.target.checked }))
          }
          className="h-4 w-4"
        />
      </label>

      <label className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm font-semibold" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
        <span style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.printers.useBrowserPrint")}
        </span>
        <input
          type="checkbox"
          checked={config.printBridge === "browser"}
          onChange={(event) =>
            setConfig((prev) => ({
              ...prev,
              printBridge: event.target.checked ? "browser" : "qz",
            }))
          }
          className="h-4 w-4"
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveConfig}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
        >
          <LuSave className="h-4 w-4" />
          {t("posMarket.printers.save")}
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((prev) => !prev)}
          className="rounded-full border px-4 py-2 text-sm font-bold"
          style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.text }}
        >
          <span className="inline-flex items-center gap-2">
            <LuEye className="h-4 w-4" />
            {getLocalizedText(
              showPreview ? "Hide preview / إخفاء المعاينة" : "Preview receipt / معاينة الفاتورة",
              language,
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void testPrinter()}
          disabled={isTesting}
          className="rounded-full border px-4 py-2 text-sm font-bold disabled:opacity-50"
          style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.text }}
        >
          {isTesting ? t("posMarket.printers.testing") : t("posMarket.printers.test")}
        </button>
      </div>

      {showPreview ? (
        <div
          className="mt-5 overflow-hidden rounded-[18px] border bg-zinc-100 p-4"
          style={{ borderColor: POS_MARKET_THEME.colors.outline }}
        >
          <p className="mb-3 text-xs font-semibold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {getLocalizedText(
              "Sample credit delivery receipt (80mm thermal) / معاينة فاتورة ذمة تجريبية",
              language,
            )}
          </p>
          <div className="mx-auto max-w-[340px] overflow-auto rounded-[12px] border bg-white shadow-sm">
            <iframe
              title="Market receipt preview"
              srcDoc={previewHtml}
              className="block w-full border-0"
              style={{ minHeight: 620 }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
