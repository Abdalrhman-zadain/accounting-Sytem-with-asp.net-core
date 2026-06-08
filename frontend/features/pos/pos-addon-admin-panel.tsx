"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LuChevronDown, LuChevronRight, LuPlus } from "react-icons/lu";

import { Card } from "@/components/ui";
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

export function PosAddonAdminPanel() {
  const { token } = useAuth();
  const { language } = useTranslation();
  const isAr = language === "ar";
  const queryClient = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [newGroupCode, setNewGroupCode] = React.useState("");
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupType, setNewGroupType] = React.useState<PosAddonSelectionType>("SINGLE");
  const [newOptionName, setNewOptionName] = React.useState("");
  const [newOptionPrice, setNewOptionPrice] = React.useState("0");

  const [isGroupsExpanded, setIsGroupsExpanded] = React.useState(true);

  const groupsQuery = useQuery({
    queryKey: queryKeys.posAddonGroups(token),
    queryFn: () => getPosAddonGroupsAdmin(token),
    enabled: Boolean(token),
  });

  const itemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, { isActive: "true", page: 1, limit: 500 }),
    queryFn: () => getInventoryItems({ isActive: "true", page: 1, limit: 500 }, token),
    enabled: Boolean(token),
  });

  const itemConfigQuery = useQuery({
    queryKey: queryKeys.posItemAddons(token, selectedItemId),
    queryFn: () => getPosItemAddonConfig(selectedItemId, token),
    enabled: Boolean(token && selectedItemId),
  });

  const selectedGroup = groupsQuery.data?.find((g) => g.id === selectedGroupId) ?? null;

  const createGroupMutation = useMutation({
    mutationFn: () =>
      createPosAddonGroup(
        {
          code: newGroupCode.trim(),
          name: newGroupName.trim(),
          selectionType: newGroupType,
        },
        token,
      ),
    onSuccess: () => {
      setNewGroupCode("");
      setNewGroupName("");
      queryClient.invalidateQueries({ queryKey: queryKeys.posAddonGroups(token) });
    },
  });

  const createOptionMutation = useMutation({
    mutationFn: (groupId: string) =>
      createPosAddonOption(
        groupId,
        {
          name: newOptionName.trim(),
          priceAdjustment: Number(newOptionPrice) || 0,
        },
        token,
      ),
    onSuccess: () => {
      setNewOptionName("");
      setNewOptionPrice("0");
      queryClient.invalidateQueries({ queryKey: queryKeys.posAddonGroups(token) });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (groupIds: string[]) =>
      setPosItemAddonGroups(selectedItemId, { groupIds }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posItemAddons(token, selectedItemId) });
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
    updatePosAddonGroup(group.id, { isActive: !group.isActive }, token).then(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posAddonGroups(token) });
    });
  };

  const items = itemsQuery.data?.data ?? [];
  const groups = groupsQuery.data ?? [];

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
              <LuChevronRight className="h-6 w-6 text-[#64736b] rtl:rotate-180" />
            )}
          </button>
        </div>

        {isGroupsExpanded && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={newGroupCode}
                onChange={(e) => setNewGroupCode(e.target.value)}
                placeholder={isAr ? "رمز" : "Code"}
                dir={isAr ? "rtl" : "ltr"}
                className={cn(
                  "h-11 rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 text-sm font-semibold text-[#233329] outline-none transition-colors focus:border-[#46644b]",
                  isAr ? "text-right arabic-auto" : "text-left",
                )}
              />
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={isAr ? "اسم المجموعة" : "Group name"}
                dir={isAr ? "rtl" : "ltr"}
                className={cn(
                  "h-11 rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 text-sm font-semibold text-[#233329] outline-none transition-colors focus:border-[#46644b] md:col-span-2",
                  isAr ? "text-right arabic-auto" : "text-left",
                )}
              />
              <select
                dir={isAr ? "rtl" : "ltr"}
                value={newGroupType}
                onChange={(e) => setNewGroupType(e.target.value as PosAddonSelectionType)}
                className={cn(
                  "h-11 rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 text-sm font-bold text-[#233329] outline-none transition-colors focus:border-[#46644b]",
                  isAr ? "text-right arabic-auto" : "text-left",
                )}
              >
                <option value="SINGLE">{isAr ? "اختيار واحد" : "Single"}</option>
                <option value="MULTIPLE">{isAr ? "متعدد" : "Multiple"}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => createGroupMutation.mutate()}
              disabled={!newGroupCode.trim() || !newGroupName.trim() || createGroupMutation.isPending}
              className="flex items-center gap-2 rounded-full bg-[#0f8f67] hover:bg-[#0c7a57] text-white px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 transition-all shadow-sm hover:shadow active:scale-95 self-start"
            >
              <LuPlus className="h-4 w-4" />
              {isAr ? "إضافة مجموعة" : "Add group"}
            </button>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-start transition",
                      selectedGroupId === group.id
                        ? "border-[#46644b] bg-[#f2f6f3]"
                        : "border-[#e1e7e2] hover:bg-[#fbfcfb]",
                    )}
                  >
                    <div>
                      <div className="font-bold text-[#233329]">{group.name}</div>
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

              {selectedGroup ? (
                <div className="rounded-2xl border border-[#e1e7e2] p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black text-[#233329]">{selectedGroup.name}</h3>
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

                  <ul className="space-y-2">
                    {selectedGroup.options.map((option) => (
                      <li
                        key={option.id}
                        className="flex items-center justify-between rounded-xl bg-[#fbfcfb] border border-[#e1e7e2] px-3 py-2 text-sm"
                      >
                        <span className="font-semibold text-[#233329]">{option.name}</span>
                        <span className="tabular-nums text-[#64736b] font-bold">
                          +{option.priceAdjustment.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      placeholder={isAr ? "خيار جديد" : "New option"}
                      className="h-10 rounded-[12px] border border-[#d4ddd7] bg-[#fbfcfb] px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b] transition-colors sm:col-span-2"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newOptionPrice}
                      onChange={(e) => setNewOptionPrice(e.target.value)}
                      className="h-10 rounded-[12px] border border-[#d4ddd7] bg-[#fbfcfb] px-3 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b] transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => createOptionMutation.mutate(selectedGroup.id)}
                    disabled={!newOptionName.trim()}
                    className="flex items-center gap-2 rounded-[16px] bg-[#fbfcfb] hover:bg-[#f2f4f2] border border-[#d4ddd7] text-[#233329] px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 shadow-sm hover:shadow"
                  >
                    <LuPlus className="h-4 w-4 text-[#0f8f67]" />
                    {isAr ? "إضافة خيار" : "Add option"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#d4ddd7] p-8 text-sm text-[#64736b]">
                  {isAr ? "اختر مجموعة لإدارة الخيارات" : "Select a group to manage options"}
                </div>
              )}
            </div>

            <hr className="border-[#e1e7e2]" />

            <div className={cn("space-y-4", isAr && "text-right")}>
              <h3 className={cn("text-xl font-black text-[#233329] arabic-heading", isAr && "text-right")}>
                {isAr ? "ربط الإضافات بمنتج" : "Assign add-ons to a product"}
              </h3>
              <select
                dir={isAr ? "rtl" : "ltr"}
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className={cn(
                  "h-11 w-full max-w-xl rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 py-2 text-sm font-bold text-[#233329] outline-none transition-colors focus:border-[#46644b]",
                  isAr ? "text-right arabic-auto" : "text-left",
                )}
              >
                <option value="">{isAr ? "اختر منتجاً…" : "Select a product…"}</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>

              {selectedItemId ? (
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
                            "min-h-[44px] rounded-xl border px-4 py-2 text-sm font-bold transition",
                            assigned
                              ? "border-[#0f8f67] bg-[#e6f4ea] text-[#0f8f67]"
                              : "border-[#d4ddd7] bg-white text-[#64736b] hover:bg-[#fbfcfb]",
                          )}
                        >
                          {group.name}
                        </button>
                      );
                    })}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
