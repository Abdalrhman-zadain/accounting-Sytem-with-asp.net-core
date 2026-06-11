"use client";

import { useMutation } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { LuDownload, LuFileSpreadsheet, LuUpload } from "react-icons/lu";
import * as XLSX from "xlsx";

import { Button, Modal, StatusPill } from "@/components/ui";
import { importInventoryItems, previewInventoryItemImport } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  ImportInventoryItemRowInput,
  ImportInventoryItemRowPreview,
  ImportInventoryItemsPreviewResult,
  ImportInventoryItemsResult,
} from "@/types/api";

const TEMPLATE_HEADERS = [
  "رمز المادة",
  "وصف المادة",
  "الوحدة",
  "الكمية",
  "الكلفة",
  "سعر البيع",
] as const;

const TEMPLATE_SAMPLE_ROW: Record<(typeof TEMPLATE_HEADERS)[number], string> = {
  "رمز المادة": "1",
  "وصف المادة": "شوكلاته شير",
  الوحدة: "كيلو",
  الكمية: "0",
  الكلفة: "0",
  "سعر البيع": "3",
};

const DEFAULT_MARKET_GROUP = "MARKET-SNACKS";

type ItemImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

export function ItemImportModal({ open, onClose, onImported }: ItemImportModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportInventoryItemRowInput[]>([]);
  const [preview, setPreview] = useState<ImportInventoryItemsPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportInventoryItemsResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: (payload: ImportInventoryItemRowInput[]) =>
      previewInventoryItemImport({ rows: payload, duplicatePolicy: "skip" }, token),
    onSuccess: (result) => {
      setPreview(result);
      setImportResult(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: (payload: ImportInventoryItemRowInput[]) =>
      importInventoryItems({ rows: payload, duplicatePolicy: "skip" }, token),
    onSuccess: (result) => {
      setImportResult(result);
      setPreview(null);
      onImported?.();
    },
  });

  const validCount = preview?.summary.validCount ?? 0;
  const isBusy = previewMutation.isPending || importMutation.isPending;

  const statusLabels = useMemo(
    () => ({
      valid: t("inventory.import.status.valid"),
      error: t("inventory.import.status.error"),
      skip: t("inventory.import.status.skip"),
    }),
    [t],
  );

  function resetState() {
    setFileName(null);
    setRows([]);
    setPreview(null);
    setImportResult(null);
    setParseError(null);
    previewMutation.reset();
    importMutation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function downloadTemplate() {
    const worksheet = XLSX.utils.json_to_sheet([TEMPLATE_SAMPLE_ROW], {
      header: [...TEMPLATE_HEADERS],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "market-products-import-template.xlsx");
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setParseError(null);
    setPreview(null);
    setImportResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error(t("inventory.import.error.emptyWorkbook"));
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });

      if (rawRows.length === 0) {
        throw new Error(t("inventory.import.error.noRows"));
      }

      const parsedRows = rawRows
        .map((row) => mapWorkbookRow(row))
        .filter((row) => row.name || row.groupCode || row.categoryCode || row.unitCode);

      if (parsedRows.length === 0) {
        throw new Error(t("inventory.import.error.noDataRows"));
      }

      setRows(parsedRows);
      previewMutation.mutate(parsedRows);
    } catch (error) {
      setRows([]);
      setParseError(error instanceof Error ? error.message : t("inventory.import.error.parseFailed"));
    }
  }

  return (
    <Modal isOpen={open} onClose={handleClose} title={t("inventory.import.title")} size="xl">
      <div className="space-y-5">
        <p className="text-sm text-gray-600">{t("inventory.import.description")}</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={downloadTemplate}>
            <LuDownload className={cn(isArabic ? "ml-2" : "mr-2")} />
            {t("inventory.import.downloadTemplate")}
          </Button>
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            <LuUpload className={cn(isArabic ? "ml-2" : "mr-2")} />
            {t("inventory.import.chooseFile")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <p className="text-sm text-gray-600">{t("inventory.import.hint")}</p>

        {fileName ? (
          <div className="flex items-center gap-2 rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-4 py-3 text-sm font-semibold text-[#233329]">
            <LuFileSpreadsheet />
            <span>{fileName}</span>
            <span className="text-gray-500">
              {t("inventory.import.rowCount", { count: String(rows.length) })}
            </span>
          </div>
        ) : null}

        {parseError ? (
          <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {parseError}
          </p>
        ) : null}

        {previewMutation.error ? (
          <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {previewMutation.error instanceof Error
              ? previewMutation.error.message
              : t("inventory.import.error.previewFailed")}
          </p>
        ) : null}

        {importMutation.error ? (
          <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {importMutation.error instanceof Error
              ? importMutation.error.message
              : t("inventory.import.error.importFailed")}
          </p>
        ) : null}

        {preview ? <ImportPreviewTable rows={preview.rows} statusLabels={statusLabels} isArabic={isArabic} t={t} /> : null}

        {importResult ? (
          <div className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-4 py-4 text-sm text-[#233329]">
            <p className="font-bold">{t("inventory.import.resultTitle")}</p>
            <p>{t("inventory.import.resultCreated", { count: String(importResult.summary.createdCount) })}</p>
            <p>{t("inventory.import.resultSkipped", { count: String(importResult.summary.skippedCount) })}</p>
            <p>{t("inventory.import.resultFailed", { count: String(importResult.summary.failedCount) })}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isBusy}>
            {t("inventory.button.cancel")}
          </Button>
          {preview && validCount > 0 ? (
            <Button
              type="button"
              onClick={() => importMutation.mutate(rows)}
              disabled={isBusy}
            >
              {importMutation.isPending
                ? t("inventory.import.importing")
                : t("inventory.import.importValid", { count: String(validCount) })}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function ImportPreviewTable({
  rows,
  statusLabels,
  isArabic,
  t,
}: {
  rows: ImportInventoryItemRowPreview[];
  statusLabels: Record<ImportInventoryItemRowPreview["status"], string>;
  isArabic: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-[16px] border border-[#d6e1d9]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#f3f7f4] text-left">
          <tr>
            <th className="px-3 py-2 font-bold">#</th>
            <th className="px-3 py-2 font-bold">{t("inventory.import.column.name")}</th>
            <th className="px-3 py-2 font-bold">{t("inventory.import.column.code")}</th>
            <th className="px-3 py-2 font-bold">{t("inventory.import.column.status")}</th>
            <th className="px-3 py-2 font-bold">{t("inventory.import.column.message")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowNumber} className="border-t border-[#e6eee8]">
              <td className="px-3 py-2">{row.rowNumber}</td>
              <td className={cn("px-3 py-2", isArabic && "text-right")}>{row.input.name}</td>
              <td className="px-3 py-2">{row.input.code || row.resolved?.code || "—"}</td>
              <td className="px-3 py-2">
                <StatusPill
                  label={statusLabels[row.status]}
                  tone={row.status === "valid" ? "positive" : row.status === "skip" ? "warning" : "neutral"}
                />
              </td>
              <td className={cn("px-3 py-2 text-gray-600", isArabic && "text-right")}>
                {row.errors.length > 0 ? row.errors.join(" ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function mapWorkbookRow(row: Record<string, unknown>): ImportInventoryItemRowInput {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), stringifyCell(value)]),
  ) as Record<string, string>;

  const arabicName = pickOptional(normalized["وصفالمادة"]);
  const englishName = pickOptional(normalized.name);
  const arabicSourceCode = pickOptional(normalized["رمزالمادة"]);
  const englishCode = pickOptional(normalized.code);
  const arabicUnit = pickOptional(normalized["الوحدة"]);
  const englishUnit = pickOptional(normalized.unitcode);

  const name = arabicName ?? englishName ?? "";
  const unitCode = mapImportUnitCode(arabicUnit ?? englishUnit ?? "");
  const groupCode =
    pickOptional(normalized.groupcode) ??
    pickOptional(normalized.categorycode) ??
    DEFAULT_MARKET_GROUP;
  const categoryCode = pickOptional(normalized.categorycode) ?? groupCode;

  let code = englishCode;
  if (!code && arabicSourceCode) {
    code = `MKT-SHQ-${arabicSourceCode.padStart(3, "0")}`;
  }

  return {
    name,
    groupCode,
    categoryCode,
    unitCode,
    code: pickOptional(code),
    barcode: pickOptional(normalized.barcode),
    defaultSalesPrice:
      pickOptional(normalized["سعرالبيع"]) ?? pickOptional(normalized.defaultsalesprice),
    defaultPurchasePrice:
      pickOptional(normalized["الكلفة"]) ?? pickOptional(normalized.defaultpurchaseprice),
    description: pickOptional(normalized.description),
    type: pickOptional(normalized.type) as ImportInventoryItemRowInput["type"],
  };
}

function mapImportUnitCode(unit: string) {
  const normalized = unit.trim();
  if (normalized === "كيلو") {
    return "KG";
  }
  if (normalized === "حبة") {
    return "PCS";
  }
  return normalized.toUpperCase();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function pickOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
