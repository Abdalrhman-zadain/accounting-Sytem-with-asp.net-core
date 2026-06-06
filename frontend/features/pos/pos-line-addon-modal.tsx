"use client";

import React from "react";
import { LuX } from "react-icons/lu";

import { Modal } from "@/components/ui";
import type {
  PosAddonGroup,
  PosItemAddonConfig,
  PosLineAddonSelection,
} from "@/features/pos/pos-addon-types";
import { localizeAddonLabel } from "@/features/pos/pos-addon-utils";
import { cn } from "@/lib/utils";

type PosLineAddonModalProps = {
  isOpen: boolean;
  itemName: string;
  config: PosItemAddonConfig | null;
  language: string;
  initialAddons?: PosLineAddonSelection[];
  initialLineNote?: string;
  onClose: () => void;
  onConfirm: (payload: {
    addons: PosLineAddonSelection[];
    lineNote: string;
  }) => void;
};

function validateSelection(
  group: PosAddonGroup,
  selected: PosLineAddonSelection[],
  language: string,
): string | null {
  const count = selected.length;
  if (group.isRequired && count === 0) {
    return language === "ar"
      ? `اختر من: ${group.name}`
      : `Select from: ${group.name}`;
  }
  if (count < group.minSelections) {
    return language === "ar"
      ? `اختر ${group.minSelections} على الأقل من ${group.name}`
      : `Pick at least ${group.minSelections} from ${group.name}`;
  }
  if (group.maxSelections != null && count > group.maxSelections) {
    return language === "ar"
      ? `الحد الأقصى ${group.maxSelections} من ${group.name}`
      : `Maximum ${group.maxSelections} for ${group.name}`;
  }
  return null;
}

export function PosLineAddonModal({
  isOpen,
  itemName,
  config,
  language,
  initialAddons = [],
  initialLineNote = "",
  onClose,
  onConfirm,
}: PosLineAddonModalProps) {
  const isAr = language === "ar";
  const [lineNote, setLineNote] = React.useState(initialLineNote);
  const [selectedByGroup, setSelectedByGroup] = React.useState<
    Record<string, PosLineAddonSelection[]>
  >({});
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setLineNote(initialLineNote);
    setError(null);
    const next: Record<string, PosLineAddonSelection[]> = {};
    for (const addon of initialAddons) {
      const bucket = next[addon.groupId] ?? [];
      bucket.push(addon);
      next[addon.groupId] = bucket;
    }
    setSelectedByGroup(next);
  }, [isOpen, initialAddons, initialLineNote]);

  const groups = config?.groups ?? [];

  const toggleOption = (group: PosAddonGroup, optionId: string) => {
    const option = group.options.find((row) => row.id === optionId);
    if (!option) return;

    setSelectedByGroup((current) => {
      const existing = current[group.id] ?? [];
      const entry: PosLineAddonSelection = {
        groupId: group.id,
        groupName: localizeAddonLabel(group.name, group.nameAr, language),
        optionId: option.id,
        name: localizeAddonLabel(option.name, option.nameAr, language),
        priceAdjustment: option.priceAdjustment,
      };

      if (group.selectionType === "SINGLE") {
        const isSelected = existing.some((row) => row.optionId === optionId);
        return { ...current, [group.id]: isSelected ? [] : [entry] };
      }

      const has = existing.some((row) => row.optionId === optionId);
      const next = has
        ? existing.filter((row) => row.optionId !== optionId)
        : [...existing, entry];
      return { ...current, [group.id]: next };
    });
  };

  const handleConfirm = () => {
    const allAddons = Object.values(selectedByGroup).flat();
    for (const group of groups) {
      const selected = selectedByGroup[group.id] ?? [];
      const validationError = validateSelection(group, selected, language);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError(null);
    onConfirm({ addons: allAddons, lineNote: lineNote.trim() });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `إضافات — ${itemName}` : `Add-ons — ${itemName}`}
      size="2xl"
      className="max-h-[90vh] overflow-hidden p-0"
    >
      <div className="flex max-h-[calc(90vh-5rem)] flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-2">
          {groups.length === 0 ? (
            <p className="text-sm text-slate-500">
              {isAr ? "لا توجد إضافات لهذا المنتج." : "No add-ons configured for this product."}
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    {localizeAddonLabel(group.name, group.nameAr, language)}
                  </h3>
                  {group.isRequired ? (
                    <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                      {isAr ? "مطلوب" : "Required"}
                    </span>
                  ) : null}
                  <span className="text-xs font-semibold text-slate-500">
                    {group.selectionType === "SINGLE"
                      ? isAr
                        ? "اختيار واحد"
                        : "Pick one"
                      : isAr
                        ? "متعدد"
                        : "Multiple"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const selected = (selectedByGroup[group.id] ?? []).some(
                      (row) => row.optionId === option.id,
                    );
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleOption(group, option.id)}
                        className={cn(
                          "min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                          selected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        )}
                      >
                        {localizeAddonLabel(option.name, option.nameAr, language)}
                        {option.priceAdjustment > 0 ? (
                          <span className="ms-1 opacity-80">
                            +{option.priceAdjustment.toFixed(2)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}

          <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <label className="block text-sm font-black text-amber-900">
              {isAr ? "ملاحظة للمطبخ (هذا البند)" : "Kitchen note (this item)"}
            </label>
            <textarea
              value={lineNote}
              onChange={(e) => setLineNote(e.target.value)}
              rows={3}
              placeholder={
                isAr ? "مثال: بدون بصل، صلصة إضافية…" : "e.g. no onion, extra sauce…"
              }
              className="mt-2 w-full min-h-[80px] rounded-xl border border-amber-200 bg-white px-4 py-3 text-base text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </section>

          {error ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex shrink-0 gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
          >
            <LuX className="h-4 w-4" />
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex min-h-[48px] flex-[2] items-center justify-center rounded-xl bg-slate-900 text-base font-black text-white"
          >
            {isAr ? "إضافة للسلة" : "Add to cart"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
