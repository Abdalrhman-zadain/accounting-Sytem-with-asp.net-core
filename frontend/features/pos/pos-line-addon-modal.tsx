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
import {
  clampKitchenLineNote,
  POS_ITEM_KITCHEN_NOTE_MAX,
} from "@/features/pos/pos-kitchen-note-limits";
import {
  formatWeightQuantity,
  getTraditionalAsnaqWeightLabel,
  isKiloWeightUnit,
} from "@/features/pos/pos-weight-utils";
import { cn } from "@/lib/utils";

type PosLineAddonModalProps = {
  isOpen: boolean;
  itemName: string;
  config: PosItemAddonConfig | null;
  language: string;
  weightSelection?: {
    enabled: boolean;
    unitCode: string;
    precision: number;
    minWeight: number;
    maxWeight?: number | null;
    pricePerUnit?: number;
    initialWeight?: number | null;
    presets?: Array<{
      value: number;
      labelAr?: string;
      labelEn?: string;
    }>;
  };
  initialAddons?: PosLineAddonSelection[];
  initialLineNote?: string;
  onClose: () => void;
  onConfirm: (payload: {
    addons: PosLineAddonSelection[];
    lineNote: string;
    selectedWeight?: number | null;
  }) => void;
};

const DEFAULT_WEIGHT_PRESETS = [0.25, 0.5, 0.75, 1];

function getWeightPresetLabel(
  preset: number,
  unitCode: string,
  precision: number,
  language: string,
  customLabel?: {
    value?: number;
    labelAr?: string;
    labelEn?: string;
  },
) {
  if (language === "ar" && customLabel?.labelAr?.trim()) {
    return customLabel.labelAr.trim();
  }
  if (language !== "ar" && customLabel?.labelEn?.trim()) {
    return customLabel.labelEn.trim();
  }

  if (isKiloWeightUnit(unitCode)) {
    const traditional = getTraditionalAsnaqWeightLabel(preset, language);
    if (traditional) {
      return traditional;
    }
  }

  return formatWeightQuantity(preset, unitCode, precision);
}

function validateSelection(
  group: PosAddonGroup,
  selected: PosLineAddonSelection[],
  language: string,
): string | null {
  const count = selected.length;
  const groupName = localizeAddonLabel(group.name, group.nameAr, language);
  if (group.isRequired && count === 0) {
    return language === "ar"
      ? `الرجاء اختيار خيار واحد على الأقل للمجموعة: ${groupName}`
      : `Please select at least one option for group: ${groupName}`;
  }
  if (count < group.minSelections) {
    return language === "ar"
      ? `اختر ${group.minSelections} على الأقل من ${groupName}`
      : `Pick at least ${group.minSelections} from ${groupName}`;
  }
  if (group.maxSelections != null && count > group.maxSelections) {
    return language === "ar"
      ? `الحد الأقصى ${group.maxSelections} من ${groupName}`
      : `Maximum ${group.maxSelections} for ${groupName}`;
  }
  return null;
}

function getSingleSelectedOptionName(
  groups: PosAddonGroup[],
  selectedByGroup: Record<string, PosLineAddonSelection[]>,
  groupCode: string,
) {
  const group = groups.find((entry) => entry.code === groupCode);
  if (!group) return null;
  const selected = selectedByGroup[group.id] ?? [];
  return selected[0]?.name ?? null;
}

function getWeightBasedYogurtPrice(selectedWeight?: number | null) {
  if (selectedWeight == null) {
    return null;
  }

  const roundedWeight = Number(selectedWeight.toFixed(3));
  if (roundedWeight === 0.125) {
    return 0.25;
  }

  return Number(selectedWeight.toFixed(2));
}

function isOptionDisabledByDependencies(
  groups: PosAddonGroup[],
  selectedByGroup: Record<string, PosLineAddonSelection[]>,
  group: PosAddonGroup,
  option: { priceAdjustment: number },
  selectedWeight?: number | null,
) {
  if (group.code === "HEAD_YOGURT_ADDON") {
    const headSelection = getSingleSelectedOptionName(groups, selectedByGroup, "HALF_HEAD");
    if (!headSelection) {
      return false;
    }

    if (headSelection.includes("نص") || headSelection.toLowerCase().includes("half")) {
      return option.priceAdjustment !== 0.5;
    }

    if (headSelection.includes("كامل") || headSelection.toLowerCase().includes("full")) {
      return option.priceAdjustment !== 1;
    }

    return false;
  }

  if (group.code === "WEIGHT_YOGURT_ADDON") {
    const yogurtPrice = getWeightBasedYogurtPrice(selectedWeight);
    if (yogurtPrice == null) {
      return false;
    }

    return Number(option.priceAdjustment.toFixed(2)) !== yogurtPrice;
  }

  return false;
}

function shouldHidePriceAdjustment(group: PosAddonGroup) {
  return group.code === "S_W_K" || group.code === "S_W_K_F";
}

export function PosLineAddonModal({
  isOpen,
  itemName,
  config,
  language,
  weightSelection,
  initialAddons = [],
  initialLineNote = "",
  onClose,
  onConfirm,
}: PosLineAddonModalProps) {
  const isAr = language === "ar";
  const [lineNote, setLineNote] = React.useState(initialLineNote);
  const [selectedWeight, setSelectedWeight] = React.useState<number | null>(null);
  const [selectedByGroup, setSelectedByGroup] = React.useState<
    Record<string, PosLineAddonSelection[]>
  >({});
  const [error, setError] = React.useState<string | null>(null);
  const groups = config?.groups ?? [];
  const hasSelectableContent = groups.length > 0 || Boolean(weightSelection?.enabled);

  const weightPresets = React.useMemo(() => {
    if (!weightSelection?.enabled) {
      return [];
    }
    const seen = new Set<number>();
    const roundWeight = (value: number) => Number(value.toFixed(weightSelection.precision));
    const presets = DEFAULT_WEIGHT_PRESETS.map((value) => ({ value }));
    if (Array.isArray(weightSelection.presets)) {
      presets.push(...weightSelection.presets);
    }
    if (
      typeof weightSelection.initialWeight === "number" &&
      weightSelection.initialWeight > 0
    ) {
      presets.push({ value: weightSelection.initialWeight });
    }

    return presets
      .map((preset) => ({
        ...preset,
        value: roundWeight(preset.value),
      }))
      .filter((preset) => {
        const value = preset.value;
        if (!Number.isFinite(value) || value <= 0 || value < weightSelection.minWeight) {
          return false;
        }
        if (typeof weightSelection.maxWeight === "number" && value > weightSelection.maxWeight) {
          return false;
        }
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      })
      .sort((a, b) => a.value - b.value);
  }, [weightSelection]);

  React.useEffect(() => {
    if (!isOpen) return;
    setLineNote(initialLineNote);
    setError(null);
    setSelectedWeight(weightSelection?.enabled ? (weightSelection.initialWeight ?? null) : null);
    const next: Record<string, PosLineAddonSelection[]> = {};
    for (const addon of initialAddons) {
      const bucket = next[addon.groupId] ?? [];
      bucket.push(addon);
      next[addon.groupId] = bucket;
    }
    setSelectedByGroup(next);
  }, [isOpen, initialAddons, initialLineNote, weightSelection]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (selectedWeight == null) return;

    setSelectedByGroup((current) => {
      const weightYogurtGroup = groups.find((group) => group.code === "WEIGHT_YOGURT_ADDON");
      if (!weightYogurtGroup) {
        return current;
      }

      const yogurtPrice = getWeightBasedYogurtPrice(selectedWeight);
      if (yogurtPrice == null) {
        return current;
      }

      const existing = current[weightYogurtGroup.id] ?? [];
      const filtered = existing.filter(
        (selection) =>
          Number(selection.priceAdjustment.toFixed(2)) === yogurtPrice,
      );

      if (filtered.length === existing.length) {
        return current;
      }

      return {
        ...current,
        [weightYogurtGroup.id]: filtered,
      };
    });
  }, [groups, isOpen, selectedWeight]);

  const toggleOption = (group: PosAddonGroup, optionId: string) => {
    const option = group.options.find((row) => row.id === optionId);
    if (!option) return;
    if (isOptionDisabledByDependencies(groups, selectedByGroup, group, option, selectedWeight)) return;

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
        const next = { ...current, [group.id]: isSelected ? [] : [entry] };

        if (group.code === "HALF_HEAD") {
          const yogurtGroup = groups.find((row) => row.code === "HEAD_YOGURT_ADDON");
          if (yogurtGroup) {
            const yogurtSelections = next[yogurtGroup.id] ?? [];
            next[yogurtGroup.id] = yogurtSelections.filter((selection) => {
              if (!next[group.id]?.length) {
                return true;
              }
              if (option.priceAdjustment === -3.5) {
                return selection.priceAdjustment === 0.5;
              }
              return selection.priceAdjustment === 1;
            });
          }
        }

        return next;
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
    if (weightSelection?.enabled && selectedWeight == null) {
      setError(
        isAr
          ? "الرجاء اختيار الوزن أولاً"
          : "Please choose a weight first",
      );
      return;
    }
    for (const group of groups) {
      const selected = selectedByGroup[group.id] ?? [];
      const validationError = validateSelection(group, selected, language);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError(null);
    onConfirm({
      addons: allAddons,
      lineNote: lineNote.trim(),
      selectedWeight,
    });
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
          {weightSelection?.enabled ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  {isAr ? "الوزن" : "Weight"}
                </h3>
                <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                  {isAr ? "مطلوب" : "Required"}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {isAr ? "اختر الوزن" : "Choose weight"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {weightPresets.map((preset) => {
                  const selected = selectedWeight === preset.value;
                  const exceedsOnHand =
                    typeof weightSelection.maxWeight === "number" &&
                    preset.value > weightSelection.maxWeight;
                  const label = getWeightPresetLabel(
                    preset.value,
                    weightSelection.unitCode,
                    weightSelection.precision,
                    language,
                    preset,
                  );
                  const estimatedPrice =
                    typeof weightSelection.pricePerUnit === "number"
                      ? Number((weightSelection.pricePerUnit * preset.value).toFixed(2))
                      : null;

                  return (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={exceedsOnHand}
                      onClick={() => setSelectedWeight(preset.value)}
                      className={cn(
                        "min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        exceedsOnHand && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {label}
                      {estimatedPrice != null ? (
                        <span className="ms-1 opacity-80">
                          {estimatedPrice.toFixed(2)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {!hasSelectableContent ? (
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
                    const disabled = isOptionDisabledByDependencies(
                      groups,
                      selectedByGroup,
                      group,
                      option,
                      selectedWeight,
                    );
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleOption(group, option.id)}
                        className={cn(
                          "min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                          selected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                          disabled && "cursor-not-allowed opacity-40 hover:border-slate-200",
                        )}
                      >
                        {localizeAddonLabel(option.name, option.nameAr, language)}
                        {option.priceAdjustment > 0 && !shouldHidePriceAdjustment(group) ? (
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
            <div className="flex items-center justify-between gap-2">
              <label className="block text-sm font-black text-amber-900">
                {isAr ? "ملاحظة للمطبخ (هذا البند)" : "Kitchen note (this item)"}
              </label>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  lineNote.length >= POS_ITEM_KITCHEN_NOTE_MAX
                    ? "text-amber-800"
                    : "text-amber-700/70",
                )}
              >
                {lineNote.length}/{POS_ITEM_KITCHEN_NOTE_MAX}
              </span>
            </div>
            <textarea
              value={lineNote}
              onChange={(e) => setLineNote(clampKitchenLineNote(e.target.value))}
              maxLength={POS_ITEM_KITCHEN_NOTE_MAX}
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
