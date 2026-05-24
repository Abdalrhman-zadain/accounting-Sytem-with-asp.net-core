"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  LuSettings,
  LuSave,
  LuCamera,
  LuPrinter,
  LuChevronDown,
  LuFileSpreadsheet,
  LuFileText,
  LuTrash2,
  LuHistory,
  LuLock,
  LuLockOpen,
} from "react-icons/lu";
import { formatDate } from "@/lib/utils";
import type { ReportingCatalogItem, ReportingDefinition, ReportingExportFormat, ReportingSnapshot } from "@/types/api";
import type { TranslationFn } from "../reporting-types";

export function ReportingToolbar({
  t,
  isBusy,
  definitions,
  snapshots,
  onSaveDefinition,
  onUpdateDefinition,
  onDeactivateDefinition,
  onApplyDefinition,
  onSaveSnapshot,
  onApplySnapshot,
  onLockSnapshot,
  onUnlockSnapshot,
  onVersionSnapshot,
  onPrint,
  onExport,
  selectedDefinitionId,
  permissions,
}: {
  t: TranslationFn;
  isBusy: boolean;
  definitions: ReportingDefinition[];
  snapshots: ReportingSnapshot[];
  onSaveDefinition: () => void;
  onUpdateDefinition: () => void;
  onDeactivateDefinition: (id: string) => void;
  onApplyDefinition: (d: ReportingDefinition) => void;
  onSaveSnapshot: () => void;
  onApplySnapshot: (s: ReportingSnapshot) => void;
  onLockSnapshot: (id: string) => void;
  onUnlockSnapshot: (id: string) => void;
  onVersionSnapshot: (s: ReportingSnapshot) => void;
  onPrint: () => void;
  onExport: (f: ReportingExportFormat) => void;
  selectedDefinitionId?: string;
  permissions?: ReportingCatalogItem;
}) {
  const [openDropdown, setOpenDropdown] = useState<"definitions" | "snapshots" | "export" | null>(null);

  const canSaveDef = permissions ? permissions.canSaveDefinition : true;
  const canSnap = permissions ? permissions.canSnapshot : true;
  const canExp = permissions ? permissions.canExport : true;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <LuSettings className="h-5 w-5 text-gray-600" />
        <span className="text-sm font-bold text-gray-900">{t("reporting.toolbar.title")}</span>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        {canSaveDef && (
          <div className="flex items-center gap-2">
            {selectedDefinitionId ? (
              <ToolbarButton
                label={t("reporting.action.updateDefinition")}
                icon={<LuSave className="h-4 w-4" />}
                onClick={onUpdateDefinition}
                disabled={isBusy}
              />
            ) : (
              <ToolbarButton
                label={t("reporting.toolbar.saveDefinition")}
                icon={<LuSave className="h-4 w-4" />}
                onClick={onSaveDefinition}
                disabled={isBusy}
              />
            )}
            <ToolbarDropdown
              label={t("reporting.toolbar.selectDefinition")}
              isOpen={openDropdown === "definitions"}
              onToggle={() => setOpenDropdown(openDropdown === "definitions" ? null : "definitions")}
            >
              <div className="max-h-[300px] space-y-1 overflow-y-auto p-1">
                {definitions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">{t("reporting.control.emptyDefinitions")}</div>
                ) : (
                  definitions.map((def) => (
                    <div
                      key={def.id}
                      onClick={() => {
                        onApplyDefinition(def);
                        setOpenDropdown(null);
                      }}
                      role="button"
                      tabIndex={0}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 ${
                        selectedDefinitionId === def.id ? "border border-blue-200 bg-blue-50" : ""
                      }`}
                    >
                      <div className="pointer-events-none flex flex-col items-start">
                        <span className="font-medium">{def.name}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(def.updatedAt)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeactivateDefinition(def.id);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <LuTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ToolbarDropdown>
          </div>
        )}

        {canSnap && (
          <div className="flex items-center gap-2">
            <ToolbarButton
              label={t("reporting.toolbar.saveSnapshot")}
              icon={<LuCamera className="h-4 w-4" />}
              onClick={onSaveSnapshot}
              disabled={isBusy}
            />
            <ToolbarDropdown
              label={t("reporting.toolbar.viewSnapshots")}
              isOpen={openDropdown === "snapshots"}
              onToggle={() => setOpenDropdown(openDropdown === "snapshots" ? null : "snapshots")}
            >
              <div className="max-h-[300px] space-y-1 overflow-y-auto p-1">
                {snapshots.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">{t("reporting.control.emptySnapshots")}</div>
                ) : (
                  snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      onClick={() => {
                        onApplySnapshot(snap);
                        setOpenDropdown(null);
                      }}
                      role="button"
                      tabIndex={0}
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="pointer-events-none flex flex-col items-start">
                        <span className="font-medium">{snap.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span>v{snap.version}</span>
                          <span>·</span>
                          <span>{formatDate(snap.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVersionSnapshot(snap);
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        >
                          <LuHistory className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            snap.isLocked ? onUnlockSnapshot(snap.id) : onLockSnapshot(snap.id);
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        >
                          {snap.isLocked ? <LuLock className="h-3.5 w-3.5" /> : <LuLockOpen className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ToolbarDropdown>
          </div>
        )}

        {canExp && (
          <div className="flex items-center gap-2">
            <ToolbarButton
              label={t("reporting.toolbar.print")}
              icon={<LuPrinter className="h-4 w-4" />}
              onClick={onPrint}
              disabled={isBusy}
            />
            <ToolbarDropdown
              label={t("reporting.toolbar.export")}
              isOpen={openDropdown === "export"}
              onToggle={() => setOpenDropdown(openDropdown === "export" ? null : "export")}
            >
              <div className="space-y-1 p-1">
                <DropdownItem
                  icon={<LuFileText className="h-4 w-4" />}
                  label={t("reporting.export.PDF")}
                  onClick={() => {
                    onExport("PDF");
                    setOpenDropdown(null);
                  }}
                />
                <DropdownItem
                  icon={<LuFileSpreadsheet className="h-4 w-4" />}
                  label={t("reporting.export.EXCEL")}
                  onClick={() => {
                    onExport("EXCEL");
                    setOpenDropdown(null);
                  }}
                />
              </div>
            </ToolbarDropdown>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:border-gray-400 disabled:opacity-50"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ToolbarDropdown({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:border-gray-400"
      >
        <span>{label}</span>
        <LuChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? (
        <div className="absolute end-0 top-full z-50 mt-1 min-w-[280px] border border-gray-200 bg-white p-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function DropdownItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
