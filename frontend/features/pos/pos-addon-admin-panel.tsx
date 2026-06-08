"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LuCheck, LuChevronDown, LuChevronRight, LuPlus, LuX } from "react-icons/lu";

import { Card, SearchableSelect } from "@/components/ui";
import type { PosAddonGroup, PosAddonSelectionType } from "@/features/pos/pos-addon-types";
import {
  createPosAddonGroup,
  createPosAddonOption,
  getPosAddonGroupsAdmin,
  getPosItemAddonConfig,
  setPosItemAddonGroups,
  updatePosAddonGroup,
  updatePosAddonOption,
} from "@/lib/api";
import { getInventoryItems } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useTranslation } from "@/lib/i18n";
import { localizeAddonLabel } from "./pos-addon-utils";

export function PosAddonAdminPanel() {
  const { token } = useAuth();
  const { language } = useTranslation();
  const isAr = language === "ar";
  const queryClient = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = React.useState("");

  // Create Group Form State
  const [newGroupCode, setNewGroupCode] = React.useState("");
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupNameAr, setNewGroupNameAr] = React.useState("");
  const [newGroupType, setNewGroupType] = React.useState<PosAddonSelectionType>("SINGLE");
  const [newGroupIsRequired, setNewGroupIsRequired] = React.useState(false);
  const [newGroupMinSelections, setNewGroupMinSelections] = React.useState(0);
  const [newGroupMaxSelections, setNewGroupMaxSelections] = React.useState("");

  // Edit Group Form State
  const [isEditingGroup, setIsEditingGroup] = React.useState(false);
  const [editGroupName, setEditGroupName] = React.useState("");
  const [editGroupNameAr, setEditGroupNameAr] = React.useState("");
  const [editGroupType, setEditGroupType] = React.useState<PosAddonSelectionType>("SINGLE");
  const [editGroupIsRequired, setEditGroupIsRequired] = React.useState(false);
  const [editGroupMinSelections, setEditGroupMinSelections] = React.useState(0);
  const [editGroupMaxSelections, setEditGroupMaxSelections] = React.useState("");

  // Create Option Form State
  const [newOptionName, setNewOptionName] = React.useState("");
  const [newOptionNameAr, setNewOptionNameAr] = React.useState("");
  const [newOptionPrice, setNewOptionPrice] = React.useState("0");

  // Edit Option Inline Form State
  const [editingOptionId, setEditingOptionId] = React.useState<string | null>(null);
  const [editOptionName, setEditOptionName] = React.useState("");
  const [editOptionNameAr, setEditOptionNameAr] = React.useState("");
  const [editOptionPrice, setEditOptionPrice] = React.useState("0");

  const [isGroupsExpanded, setIsGroupsExpanded] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: queryKeys.posAddonGroups(token),
    queryFn: () => getPosAddonGroupsAdmin(token),
    enabled: Boolean(token),
  });

  const itemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, { isActive: "true", page: 1, limit: 100 }),
    queryFn: () => getInventoryItems({ isActive: "true", page: 1, limit: 100 }, token),
    enabled: Boolean(token),
  });

  const itemConfigQuery = useQuery({
    queryKey: queryKeys.posItemAddons(token, selectedItemId),
    queryFn: () => getPosItemAddonConfig(selectedItemId, token),
    enabled: Boolean(token && selectedItemId),
  });

  const selectedGroup = groupsQuery.data?.find((g) => g.id === selectedGroupId) ?? null;

  // Sync Edit Group values when selectedGroup changes
  React.useEffect(() => {
    if (selectedGroup) {
      setEditGroupName(selectedGroup.name);
      setEditGroupNameAr(selectedGroup.nameAr ?? "");
      setEditGroupType(selectedGroup.selectionType);
      setEditGroupIsRequired(selectedGroup.isRequired);
      setEditGroupMinSelections(selectedGroup.minSelections);
      setEditGroupMaxSelections(
        selectedGroup.maxSelections != null ? String(selectedGroup.maxSelections) : "",
      );
    } else {
      setIsEditingGroup(false);
    }
  }, [selectedGroupId, selectedGroup]);

  const createGroupMutation = useMutation({
    mutationFn: () => {
      setErrorMsg(null);
      return createPosAddonGroup(
        {
          code: newGroupCode.trim().toUpperCase(),
          name: newGroupName.trim(),
          nameAr: newGroupNameAr.trim() || undefined,
          selectionType: newGroupType,
          isRequired: newGroupIsRequired,
          minSelections: newGroupMinSelections,
          maxSelections: newGroupMaxSelections ? Number(newGroupMaxSelections) : undefined,
        },
        token,
      );
    },
    onSuccess: () => {
      setNewGroupCode("");
      setNewGroupName("");
      setNewGroupNameAr("");
      setNewGroupType("SINGLE");
      setNewGroupIsRequired(false);
      setNewGroupMinSelections(0);
      setNewGroupMaxSelections("");
      queryClient.invalidateQueries({ queryKey: queryKeys.posAddonGroups(token) });
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to create group");
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => {
      setErrorMsg(null);
      return updatePosAddonGroup(selectedGroupId!, payload, token);
    },
    onSuccess: () => {
      setIsEditingGroup(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.posAddonGroups(token) });
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to update group");
    },
  });

  const createOptionMutation = useMutation({
    mutationFn: (groupId: string) => {
      setErrorMsg(null);
      return createPosAddonOption(
        groupId,
        {
          name: newOptionName.trim(),
          nameAr: newOptionNameAr.trim() || undefined,
          priceAdjustment: Number(newOptionPrice) || 0,
        },
        token,
      );
    },
    onSuccess: () => {
      setNewOptionName("");
      setNewOptionNameAr("");
      setNewOptionPrice("0");
      queryClient.invalidateQueries({ queryKey: queryKeys.posAddonGroups(token) });
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to create option");
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: ({ optionId, payload }: { optionId: string; payload: Record<string, any> }) => {
      setErrorMsg(null);
      return updatePosAddonOption(optionId, payload, token);
    },
    onSuccess: () => {
      setEditingOptionId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.posAddonGroups(token) });
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to update option");
    },
  });

  const assignMutation = useMutation({
    mutationFn: (groupIds: string[]) =>
      setPosItemAddonGroups(selectedItemId, { groupIds }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posItemAddons(token, selectedItemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posAddonGroups(token) });
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to assign groups");
    },
  });

  const toggleGroupOnItem = (groupId: string) => {
    const current = itemConfigQuery.data?.groups.map((g) => g.id) ?? [];
    const next = current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId];
    assignMutation.mutate(next);
  };

  const toggleGroupActive = (group: PosAddonGroup) => {
    updateGroupMutation.mutate({ isActive: !group.isActive });
  };

  const handleUpdateGroupDetails = () => {
    updateGroupMutation.mutate({
      name: editGroupName.trim(),
      nameAr: editGroupNameAr.trim() || null,
      selectionType: editGroupType,
      isRequired: editGroupIsRequired,
      minSelections: editGroupMinSelections,
      maxSelections: editGroupMaxSelections ? Number(editGroupMaxSelections) : null,
    });
  };

  const items = itemsQuery.data?.data ?? [];
  const productOptions = React.useMemo(() => {
    return items.map((item) => ({
      value: item.id,
      label: `${item.code} — ${item.name}`,
    }));
  }, [items]);
  const groups = groupsQuery.data ?? [];
  const productSelectPlaceholder = itemsQuery.isLoading
    ? isAr
      ? "جاري تحميل المنتجات..."
      : "Loading products..."
    : itemsQuery.isError
      ? isAr
        ? "تعذر تحميل المنتجات"
        : "Failed to load products"
      : items.length === 0
        ? isAr
          ? "لا توجد منتجات نشطة لربط الإضافات بها"
          : "No active products available for add-ons"
        : isAr
          ? "اختر منتجاً..."
          : "Select a product...";

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsGroupsExpanded(!isGroupsExpanded)}
        >
          <div>
            <h2 className="text-2xl font-black text-[#233329] arabic-heading">
              {isAr ? "مجموعات الإضافات" : "Add-on groups"}
            </h2>
            <p className="mt-2 text-sm text-[#64736b] arabic-auto">
              {isAr
                ? "أنشئ أنواع الإضافات (حجم، إضافات، مستوى النضج…) ثم اربطها بالمنتجات."
                : "Create add-on types (size, extras, cooking level…) then assign them to products."}
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            {isGroupsExpanded ? (
              <LuChevronDown className="h-6 w-6 text-[#64736b]" />
            ) : (
              <LuChevronRight className="h-6 w-6 text-[#64736b] ... rtl:rotate-180" />
            )}
          </button>
        </div>

        {isGroupsExpanded && (
          <div className="mt-6 space-y-6">
            {/* Error Message Alert Banner */}
            {errorMsg && (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm font-semibold text-rose-700 flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-500 hover:text-rose-700 transition-colors p-1"
                >
                  <LuX className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Create Group Card Form */}
            <div className="bg-[#fcfdfc] border border-[#d4ddd7] rounded-[20px] p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#233329]">
                {isAr ? "إنشاء مجموعة إضافات جديدة" : "Create New Add-on Group"}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64736b]">
                    {isAr ? "رمز المجموعة" : "Group Code"}
                  </label>
                  <input
                    value={newGroupCode}
                    onChange={(e) => setNewGroupCode(e.target.value)}
                    placeholder={isAr ? "مثال: SIZE" : "e.g. SIZE"}
                    dir={isAr ? "rtl" : "ltr"}
                    className={cn(
                      "h-11 w-full rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 text-sm font-semibold text-[#233329] outline-none transition-colors focus:border-[#46644b]",
                      isAr ? "text-right arabic-auto" : "text-left",
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64736b]">
                    {isAr ? "الاسم (EN)" : "Name (EN)"}
                  </label>
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder={isAr ? "اسم المجموعة بالإنجليزية" : "Group name in English"}
                    dir="ltr"
                    className="h-11 w-full rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 text-sm font-semibold text-[#233329] outline-none transition-colors focus:border-[#46644b]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64736b]">
                    {isAr ? "الاسم (AR)" : "Name (AR)"}
                  </label>
                  <input
                    value={newGroupNameAr}
                    onChange={(e) => setNewGroupNameAr(e.target.value)}
                    placeholder={isAr ? "اسم المجموعة بالعربية" : "Group name in Arabic"}
                    dir="rtl"
                    className="h-11 w-full rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 text-sm font-semibold text-[#233329] outline-none transition-colors focus:border-[#46644b] text-right arabic-auto"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64736b]">
                    {isAr ? "نوع الاختيار" : "Selection Type"}
                  </label>
                  <select
                    dir={isAr ? "rtl" : "ltr"}
                    value={newGroupType}
                    onChange={(e) => setNewGroupType(e.target.value as PosAddonSelectionType)}
                    className={cn(
                      "h-11 w-full rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 text-sm font-bold text-[#233329] outline-none transition-colors focus:border-[#46644b]",
                      isAr ? "text-right arabic-auto" : "text-left",
                    )}
                  >
                    <option value="SINGLE">{isAr ? "اختيار واحد" : "Single"}</option>
                    <option value="MULTIPLE">{isAr ? "متعدد" : "Multiple"}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 items-center bg-[#f8faf9] border border-[#e8efe9] rounded-2xl p-4">
                <label className="flex items-center gap-2.5 text-sm font-bold text-[#233329] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newGroupIsRequired}
                    onChange={(e) => {
                      setNewGroupIsRequired(e.target.checked);
                      if (e.target.checked && newGroupMinSelections === 0) {
                        setNewGroupMinSelections(1);
                      }
                    }}
                    className="h-4 w-4 rounded border-[#d4ddd7] text-[#0f8f67] focus:ring-[#0f8f67]"
                  />
                  {isAr ? "هذه المجموعة إجبارية؟ (Required)" : "Is this group required?"}
                </label>

                {newGroupType === "MULTIPLE" && (
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#64736b]">
                        {isAr ? "الحد الأدنى للخيارات:" : "Min Selections:"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={newGroupMinSelections}
                        onChange={(e) => setNewGroupMinSelections(Number(e.target.value))}
                        className="w-20 h-9 rounded-xl border border-[#d4ddd7] bg-white px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#64736b]">
                        {isAr ? "الحد الأقصى للخيارات (اختياري):" : "Max Selections (Optional):"}
                      </span>
                      <input
                        type="number"
                        min="1"
                        placeholder="∞"
                        value={newGroupMaxSelections}
                        onChange={(e) => setNewGroupMaxSelections(e.target.value)}
                        className="w-20 h-9 rounded-xl border border-[#d4ddd7] bg-white px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => createGroupMutation.mutate()}
                disabled={
                  !newGroupCode.trim() || !newGroupName.trim() || createGroupMutation.isPending
                }
                className="flex items-center gap-2 rounded-full bg-[#0f8f67] hover:bg-[#0c7a57] text-white px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 transition-all shadow-sm hover:shadow active:scale-95 self-start"
              >
                <LuPlus className="h-4 w-4" />
                {isAr ? "إضافة مجموعة" : "Add group"}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Groups List */}
              <div className="space-y-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setIsEditingGroup(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-start transition",
                      selectedGroupId === group.id
                        ? "border-[#46644b] bg-[#f2f6f3]"
                        : "border-[#e1e7e2] hover:bg-[#fbfcfb]",
                    )}
                  >
                    <div>
                      <div className="font-bold text-[#233329]">
                        {localizeAddonLabel(group.name, group.nameAr, language)}
                      </div>
                      <div className="text-xs text-[#64736b]">
                        {group.code} · {group.options.length} {isAr ? "خيارات" : "options"} ·{" "}
                        {group.itemIds?.length ?? 0} {isAr ? "منتجات" : "products"}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-lg px-2 py-1 text-xs font-bold",
                        group.isActive ? "bg-[#e6f4ea] text-[#0f8f67]" : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {group.isActive ? (isAr ? "نشط" : "Active") : isAr ? "معطل" : "Off"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Selected Group details panel */}
              {selectedGroup ? (
                <div className="rounded-2xl border border-[#e1e7e2] p-5 space-y-4">
                  {isEditingGroup ? (
                    <div className="space-y-3">
                      <div className="text-sm font-bold text-[#233329]">
                        {isAr ? "تعديل تفاصيل المجموعة" : "Edit Group Details"}
                      </div>
                      <div className="grid gap-3 grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#64736b]">
                            {isAr ? "الرمز (ثابت)" : "Code (Static)"}
                          </label>
                          <input
                            disabled
                            value={selectedGroup.code}
                            className="w-full h-10 rounded-[12px] border border-[#e1e7e2] bg-gray-50 px-3 text-sm font-semibold text-gray-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#64736b]">
                            {isAr ? "نوع الاختيار" : "Selection Type"}
                          </label>
                          <select
                            value={editGroupType}
                            onChange={(e) =>
                              setEditGroupType(e.target.value as PosAddonSelectionType)
                            }
                            className="w-full h-10 rounded-[12px] border border-[#d4ddd7] bg-[#fbfcfb] px-3 text-sm font-bold text-[#233329] outline-none focus:border-[#46644b]"
                          >
                            <option value="SINGLE">{isAr ? "اختيار واحد" : "Single"}</option>
                            <option value="MULTIPLE">{isAr ? "متعدد" : "Multiple"}</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#64736b]">
                            {isAr ? "الاسم (EN)" : "Name (EN)"}
                          </label>
                          <input
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            className="w-full h-10 rounded-[12px] border border-[#d4ddd7] bg-[#fbfcfb] px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#64736b]">
                            {isAr ? "الاسم (AR)" : "Name (AR)"}
                          </label>
                          <input
                            value={editGroupNameAr}
                            onChange={(e) => setEditGroupNameAr(e.target.value)}
                            className="w-full h-10 rounded-[12px] border border-[#d4ddd7] bg-[#fbfcfb] px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 items-center pt-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#233329] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editGroupIsRequired}
                            onChange={(e) => {
                              setEditGroupIsRequired(e.target.checked);
                              if (e.target.checked && editGroupMinSelections === 0) {
                                setEditGroupMinSelections(1);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[#0f8f67] focus:ring-[#0f8f67]"
                          />
                          {isAr ? "إجباري؟" : "Required?"}
                        </label>

                        {editGroupType === "MULTIPLE" && (
                          <div className="flex gap-3 items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-[#64736b]">
                                {isAr ? "الأدنى:" : "Min:"}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={editGroupMinSelections}
                                onChange={(e) => setEditGroupMinSelections(Number(e.target.value))}
                                className="w-16 h-8 rounded-[8px] border border-[#d4ddd7] bg-white px-2 text-sm font-semibold text-[#233329] outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-[#64736b]">
                                {isAr ? "الأقصى:" : "Max:"}
                              </span>
                              <input
                                type="number"
                                min="1"
                                placeholder="∞"
                                value={editGroupMaxSelections}
                                onChange={(e) => setEditGroupMaxSelections(e.target.value)}
                                className="w-16 h-8 rounded-[8px] border border-[#d4ddd7] bg-white px-2 text-sm font-semibold text-[#233329] outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingGroup(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          {isAr ? "إلغاء" : "Cancel"}
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdateGroupDetails}
                          disabled={!editGroupName.trim() || updateGroupMutation.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0f8f67] hover:bg-[#0c7a57] text-white transition-colors"
                        >
                          {isAr ? "حفظ" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2 border-b border-[#e1e7e2] pb-3">
                      <div>
                        <h3 className="font-black text-[#233329] text-lg">
                          {localizeAddonLabel(selectedGroup.name, selectedGroup.nameAr, language)}
                        </h3>
                        <p className="text-xs text-[#64736b] mt-0.5">
                          {selectedGroup.selectionType === "SINGLE"
                            ? isAr
                              ? "اختيار واحد"
                              : "Single Selection"
                            : isAr
                              ? "اختيار متعدد"
                              : "Multiple Selection"}
                          {selectedGroup.isRequired && ` · ${isAr ? "مطلوب" : "Required"}`}
                          {selectedGroup.selectionType === "MULTIPLE" && (
                            <>
                              {" · "}
                              {isAr ? "الأدنى" : "Min"}: {selectedGroup.minSelections}
                              {selectedGroup.maxSelections != null && (
                                <>
                                  {" / "}
                                  {isAr ? "الأقصى" : "Max"}: {selectedGroup.maxSelections}
                                </>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingGroup(true)}
                          className="text-xs font-bold text-[#0f8f67] hover:text-[#0c7a57] underline transition-colors"
                        >
                          {isAr ? "تعديل" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleGroupActive(selectedGroup)}
                          className="text-xs font-bold text-[#0f8f67] hover:text-[#0c7a57] underline transition-colors"
                        >
                          {selectedGroup.isActive
                            ? isAr
                              ? "تعطيل"
                              : "Deactivate"
                            : isAr
                              ? "تفعيل"
                              : "Activate"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Options List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#64736b] uppercase tracking-wider">
                      {isAr ? "الخيارات" : "Options"}
                    </h4>
                    <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {selectedGroup.options.length === 0 ? (
                        <li className="text-sm text-gray-400 py-3 text-center italic">
                          {isAr ? "لا توجد خيارات مضافة بعد" : "No options added yet"}
                        </li>
                      ) : (
                        selectedGroup.options.map((option) => {
                          const isEditing = editingOptionId === option.id;
                          return (
                            <li
                              key={option.id}
                              className={cn(
                                "flex items-center justify-between rounded-xl bg-[#fbfcfb] border px-3 py-2 text-sm transition-all",
                                option.isActive === false
                                  ? "opacity-60 border-[#e1e7e2]"
                                  : "border-[#e1e7e2] hover:border-gray-300",
                              )}
                            >
                              {isEditing ? (
                                <div className="w-full flex flex-col gap-2">
                                  <div className="grid gap-2 grid-cols-3">
                                    <input
                                      value={editOptionName}
                                      onChange={(e) => setEditOptionName(e.target.value)}
                                      placeholder={isAr ? "الاسم (EN)" : "Name (EN)"}
                                      className="h-9 rounded-[8px] border border-[#d4ddd7] bg-white px-2.5 text-xs font-semibold text-[#233329] outline-none"
                                    />
                                    <input
                                      value={editOptionNameAr}
                                      onChange={(e) => setEditOptionNameAr(e.target.value)}
                                      placeholder={isAr ? "الاسم (AR)" : "Name (AR)"}
                                      className="h-9 rounded-[8px] border border-[#d4ddd7] bg-white px-2.5 text-xs font-semibold text-[#233329] outline-none"
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editOptionPrice}
                                      onChange={(e) => setEditOptionPrice(e.target.value)}
                                      className="h-9 rounded-[8px] border border-[#d4ddd7] bg-white px-2.5 text-xs font-semibold text-[#233329] outline-none"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setEditingOptionId(null)}
                                      className="px-2.5 py-1 rounded text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                    >
                                      {isAr ? "إلغاء" : "Cancel"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateOptionMutation.mutate({
                                          optionId: option.id,
                                          payload: {
                                            name: editOptionName.trim(),
                                            nameAr: editOptionNameAr.trim() || null,
                                            priceAdjustment: Number(editOptionPrice) || 0,
                                          },
                                        })
                                      }
                                      disabled={
                                        !editOptionName.trim() || updateOptionMutation.isPending
                                      }
                                      className="px-2.5 py-1 rounded text-xs font-bold bg-[#0f8f67] text-white hover:bg-[#0c7a57] transition-colors"
                                    >
                                      {isAr ? "حفظ" : "Save"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateOptionMutation.mutate({
                                          optionId: option.id,
                                          payload: { isActive: !option.isActive },
                                        })
                                      }
                                      className={cn(
                                        "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                                        option.isActive ? "bg-[#0f8f67]" : "bg-gray-300",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                                          option.isActive
                                            ? "translate-x-4 rtl:-translate-x-4"
                                            : "translate-x-0",
                                        )}
                                      />
                                    </button>
                                    <div className="text-start">
                                      <span className="font-semibold text-[#233329]">
                                        {localizeAddonLabel(option.name, option.nameAr, language)}
                                      </span>
                                      {option.nameAr && option.nameAr !== option.name && (
                                        <span className="text-[10px] text-gray-400 block -mt-0.5">
                                          {isAr ? option.name : option.nameAr}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="tabular-nums text-[#64736b] font-bold">
                                      +{option.priceAdjustment.toFixed(2)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingOptionId(option.id);
                                        setEditOptionName(option.name);
                                        setEditOptionNameAr(option.nameAr ?? "");
                                        setEditOptionPrice(String(option.priceAdjustment));
                                      }}
                                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                      {isAr ? "تعديل" : "Edit"}
                                    </button>
                                  </div>
                                </>
                              )}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>

                  {/* Add Option Form */}
                  <div className="space-y-3 bg-[#fbfcfb] border border-[#e1e7e2] rounded-xl p-4">
                    <h5 className="text-xs font-bold text-[#233329]">
                      {isAr ? "إضافة خيار جديد" : "Add New Option"}
                    </h5>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      <input
                        value={newOptionName}
                        onChange={(e) => setNewOptionName(e.target.value)}
                        placeholder={isAr ? "خيار جديد (EN)" : "New option (EN)"}
                        className="h-10 rounded-[12px] border border-[#d4ddd7] bg-white px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b] transition-colors"
                      />
                      <input
                        value={newOptionNameAr}
                        onChange={(e) => setNewOptionNameAr(e.target.value)}
                        placeholder={isAr ? "خيار جديد (AR)" : "New option (AR)"}
                        className="h-10 rounded-[12px] border border-[#d4ddd7] bg-white px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b] transition-colors"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={newOptionPrice}
                        onChange={(e) => setNewOptionPrice(e.target.value)}
                        placeholder={isAr ? "السعر الإضافي" : "Extra Price"}
                        className="h-10 rounded-[12px] border border-[#d4ddd7] bg-white px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b] transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => createOptionMutation.mutate(selectedGroup.id)}
                      disabled={!newOptionName.trim() || createOptionMutation.isPending}
                      className="flex items-center gap-2 rounded-xl bg-white hover:bg-[#f2f4f2] border border-[#d4ddd7] text-[#233329] px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 shadow-sm hover:shadow"
                    >
                      <LuPlus className="h-4 w-4 text-[#0f8f67]" />
                      {isAr ? "إضافة خيار" : "Add option"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#d4ddd7] p-8 text-sm text-[#64736b]">
                  {isAr ? "اختر مجموعة لإدارة الخيارات" : "Select a group to manage options"}
                </div>
              )}
            </div>

            <hr className="border-[#e1e7e2]" />

            {/* Assign Section */}
            <div className={cn("space-y-4", isAr && "text-right")}>
              <h3
                className={cn("text-xl font-black text-[#233329] arabic-heading", isAr && "text-right")}
              >
                {isAr ? "ربط الإضافات بمنتج" : "Assign add-ons to a product"}
              </h3>
              <SearchableSelect
                value={selectedItemId}
                onChange={setSelectedItemId}
                disabled={itemsQuery.isLoading || itemsQuery.isError || items.length === 0}
                className="h-11 w-full max-w-xl rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 py-2 text-sm font-bold text-[#233329] focus-within:border-[#46644b] transition-colors"
                placeholder={productSelectPlaceholder}
                searchPlaceholder={isAr ? "البحث عن منتج..." : "Search product..."}
                options={productOptions}
              />
              {!itemsQuery.isLoading && !itemsQuery.isError && items.length === 0 ? (
                <p className="text-sm text-[#64736b] arabic-auto">
                  {isAr
                    ? "هذه القائمة تعرض المنتجات النشطة فقط. أنشئ منتجاً من بطاقة الأصناف أو أعد تشغيل البذور التي تحتوي على كتالوج POS."
                    : "This list shows active inventory items only. Create an item in Item Master or reseed the POS demo catalog."}
                </p>
              ) : null}

              {selectedItemId ? (
                <div className="space-y-3">
                  <p className="text-sm text-[#64736b] arabic-auto">
                    {itemConfigQuery.isLoading
                      ? isAr
                        ? "جاري تحميل المجموعات المرتبطة بهذا المنتج..."
                        : "Loading assigned groups for this product..."
                      : isAr
                        ? `اضغط على مجموعات الإضافات أدناه لربطها بهذا المنتج أو فك الربط عنه. الأخضر = مربوط. الحالي: ${itemConfigQuery.data?.groups.length ?? 0} مجموعة`
                        : `Tap the add-on groups below to assign or unassign them for this product. Green = assigned. Current: ${itemConfigQuery.data?.groups.length ?? 0} group(s)`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {groups
                      .filter((g) => g.isActive !== false)
                      .map((group) => {
                        const assigned = itemConfigQuery.data?.groups.some((g) => g.id === group.id);
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => toggleGroupOnItem(group.id)}
                            disabled={assignMutation.isPending}
                            className={cn(
                              "inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
                              assigned
                                ? "border-[#0f8f67] bg-[#e6f4ea] text-[#0f8f67]"
                                : "border-[#d4ddd7] bg-white text-[#64736b] hover:bg-[#fbfcfb]",
                            )}
                          >
                            {assigned ? <LuCheck className="h-4 w-4" /> : null}
                            {localizeAddonLabel(group.name, group.nameAr, language)}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
