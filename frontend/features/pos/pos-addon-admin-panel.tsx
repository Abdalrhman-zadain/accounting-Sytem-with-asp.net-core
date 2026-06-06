"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuPlus } from "react-icons/lu";

import { Button, Card } from "@/components/ui";
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
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-black text-gray-900">
            {isAr ? "مجموعات الإضافات" : "Add-on groups"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isAr
              ? "أنشئ أنواع الإضافات (حجم، إضافات، مستوى النضج…) ثم اربطها بالمنتجات."
              : "Create add-on types (size, extras, cooking level…) then assign them to products."}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={newGroupCode}
            onChange={(e) => setNewGroupCode(e.target.value)}
            placeholder={isAr ? "رمز" : "Code"}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold"
          />
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={isAr ? "اسم المجموعة" : "Group name"}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold md:col-span-2"
          />
          <select
            value={newGroupType}
            onChange={(e) => setNewGroupType(e.target.value as PosAddonSelectionType)}
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold"
          >
            <option value="SINGLE">{isAr ? "اختيار واحد" : "Single"}</option>
            <option value="MULTIPLE">{isAr ? "متعدد" : "Multiple"}</option>
          </select>
        </div>
        <Button
          onClick={() => createGroupMutation.mutate()}
          disabled={!newGroupCode.trim() || !newGroupName.trim() || createGroupMutation.isPending}
        >
          <LuPlus className="h-4 w-4" />
          {isAr ? "إضافة مجموعة" : "Add group"}
        </Button>

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
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:bg-gray-50",
                )}
              >
                <div>
                  <div className="font-bold text-gray-900">{group.name}</div>
                  <div className="text-xs text-gray-500">
                    {group.code} · {group.options.length} {isAr ? "خيارات" : "options"} ·{" "}
                    {group.itemIds?.length ?? 0} {isAr ? "منتجات" : "products"}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs font-bold",
                    group.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500",
                  )}
                >
                  {group.isActive ? (isAr ? "نشط" : "Active") : isAr ? "معطل" : "Off"}
                </span>
              </button>
            ))}
          </div>

          {selectedGroup ? (
            <div className="rounded-2xl border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black text-gray-900">{selectedGroup.name}</h3>
                <button
                  type="button"
                  onClick={() => toggleGroupActive(selectedGroup)}
                  className="text-xs font-bold text-gray-500 underline"
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
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">{option.name}</span>
                    <span className="tabular-nums text-gray-600">
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
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm sm:col-span-2"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newOptionPrice}
                  onChange={(e) => setNewOptionPrice(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => createOptionMutation.mutate(selectedGroup.id)}
                disabled={!newOptionName.trim()}
              >
                <LuPlus className="h-4 w-4" />
                {isAr ? "إضافة خيار" : "Add option"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 p-8 text-sm text-gray-500">
              {isAr ? "اختر مجموعة لإدارة الخيارات" : "Select a group to manage options"}
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-black text-gray-900">
          {isAr ? "ربط الإضافات بمنتج" : "Assign add-ons to a product"}
        </h2>
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="h-11 w-full max-w-xl rounded-xl border border-gray-200 px-3 text-sm font-semibold"
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
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-white text-gray-700",
                    )}
                  >
                    {group.name}
                  </button>
                );
              })}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
