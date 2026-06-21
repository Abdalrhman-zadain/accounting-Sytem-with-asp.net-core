"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LuPencil, LuPlus, LuUserCheck, LuUserX } from "react-icons/lu";

import { Card, SectionHeading } from "@/components/ui";
import { Field, Input } from "@/components/forms";
import {
  createAdminUser,
  getAdminUser,
  getPermissionCatalog,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/api";
import { isAdminUser } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import type {
  AdminUserDetail,
  AdminUserSummary,
  PermissionOverrideInput,
  PosAccessRole,
  PosPermissionCode,
  PosPermissionOverrideEffect,
} from "@/types/api";

const POS_ROLES: PosAccessRole[] = ["WAITER", "CASHIER", "KITCHEN", "ACCOUNTANT"];

type OverrideState = "inherit" | PosPermissionOverrideEffect;

type UserFormState = {
  username: string;
  email: string;
  name: string;
  password: string;
  isActive: boolean;
  posRoles: PosAccessRole[];
  overrideStates: Record<string, OverrideState>;
};

function emptyForm(): UserFormState {
  return {
    username: "",
    email: "",
    name: "",
    password: "",
    isActive: true,
    posRoles: ["WAITER"],
    overrideStates: {},
  };
}

function buildOverrides(overrideStates: Record<string, OverrideState>): PermissionOverrideInput[] {
  return Object.entries(overrideStates)
    .filter(([, effect]) => effect !== "inherit")
    .map(([code, effect]) => ({
      code: code as PosPermissionCode,
      effect: effect as PosPermissionOverrideEffect,
    }));
}

function categoryLabel(category: string, language: string) {
  const labels: Record<string, { en: string; ar: string }> = {
    cart: { en: "Cart & sales", ar: "السلة والبيع" },
    restaurant: { en: "Restaurant", ar: "المطعم" },
    session: { en: "POS sessions", ar: "ورديات نقاط البيع" },
    accounting: { en: "Accounting & reports", ar: "المحاسبة والتقارير" },
    system: { en: "System", ar: "النظام" },
  };
  const entry = labels[category] ?? { en: category, ar: category };
  return language === "ar" ? entry.ar : entry.en;
}

export function UsersAdminPage() {
  const { token, user } = useAuth();
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => listAdminUsers(token),
    enabled: Boolean(token) && isAdminUser(user),
  });

  const catalogQuery = useQuery({
    queryKey: queryKeys.permissionCatalog,
    queryFn: () => getPermissionCatalog(token),
    enabled: Boolean(token) && isAdminUser(user),
  });

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof catalogQuery.data>>();
    for (const entry of catalogQuery.data ?? []) {
      const bucket = groups.get(entry.category) ?? [];
      bucket.push(entry);
      groups.set(entry.category, bucket);
    }
    return Array.from(groups.entries());
  }, [catalogQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        password: form.password,
        isActive: form.isActive,
        posRoles: form.posRoles,
        permissionOverrides: buildOverrides(form.overrideStates),
      };

      if (editingUserId) {
        return updateAdminUser(
          editingUserId,
          {
            email: payload.email,
            name: payload.name,
            isActive: payload.isActive,
            password: payload.password || undefined,
            posRoles: payload.posRoles,
            permissionOverrides: payload.permissionOverrides,
          },
          token,
        );
      }

      if (!payload.password || payload.password.length < 6) {
        throw new Error(
          language === "ar"
            ? "كلمة المرور مطلوبة (6 أحرف على الأقل)."
            : "Password is required (at least 6 characters).",
        );
      }

      return createAdminUser(payload, token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
      setEditorOpen(false);
      setEditingUserId(null);
      setForm(emptyForm());
      setFormError(null);
    },
    onError: (error: Error) => {
      setFormError(error.message);
    },
  });

  const openCreate = () => {
    setEditingUserId(null);
    setForm(emptyForm());
    setFormError(null);
    setEditorOpen(true);
  };

  const openEdit = async (summary: AdminUserSummary) => {
    setFormError(null);
    setEditingUserId(summary.id);
    const detail = await getAdminUser(summary.id, token);
    hydrateForm(detail);
    setEditorOpen(true);
  };

  const hydrateForm = (detail: AdminUserDetail) => {
    const overrideStates: Record<string, OverrideState> = {};
    for (const entry of detail.permissionBreakdown) {
      overrideStates[entry.code] = entry.override ?? "inherit";
    }
    setForm({
      username: detail.username,
      email: detail.email,
      name: detail.name ?? "",
      password: "",
      isActive: detail.isActive,
      posRoles: detail.posRoles,
      overrideStates,
    });
  };

  const toggleActive = useMutation({
    mutationFn: (summary: AdminUserSummary) =>
      updateAdminUser(summary.id, { isActive: !summary.isActive }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });

  if (!isAdminUser(user)) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        {language === "ar"
          ? "هذه الصفحة متاحة لمسؤول النظام فقط."
          : "This page is available to system administrators only."}
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          title={language === "ar" ? "إدارة المستخدمين" : "User management"}
          description={
            language === "ar"
              ? "إنشاء حسابات النادل والكاشير وتخصيص الصلاحيات لكل مستخدم."
              : "Create waiter and cashier accounts and tune permissions per user."
          }
        />
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-500"
        >
          <LuPlus className="h-4 w-4" />
          {language === "ar" ? "مستخدم جديد" : "New user"}
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{language === "ar" ? "الاسم" : "Name"}</th>
                <th className="px-4 py-3">{language === "ar" ? "المستخدم" : "Username"}</th>
                <th className="px-4 py-3">{language === "ar" ? "الأدوار" : "Roles"}</th>
                <th className="px-4 py-3">{language === "ar" ? "الحالة" : "Status"}</th>
                <th className="px-4 py-3 text-right">{language === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data ?? []).map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.username}</td>
                  <td className="px-4 py-3 text-slate-600">{row.posRoles.join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.isActive
                        ? language === "ar"
                          ? "نشط"
                          : "Active"
                        : language === "ar"
                          ? "معطل"
                          : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                        title={language === "ar" ? "تعديل" : "Edit"}
                      >
                        <LuPencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive.mutate(row)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                        title={row.isActive ? (language === "ar" ? "تعطيل" : "Deactivate") : language === "ar" ? "تفعيل" : "Activate"}
                      >
                        {row.isActive ? (
                          <LuUserX className="h-4 w-4" />
                        ) : (
                          <LuUserCheck className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {usersQuery.isLoading ? (
          <div className="p-6 text-sm text-slate-500">{t("common.loading")}</div>
        ) : null}
      </Card>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <Card className="my-8 w-full max-w-4xl p-6">
            <SectionHeading
              title={
                editingUserId
                  ? language === "ar"
                    ? "تعديل المستخدم"
                    : "Edit user"
                  : language === "ar"
                    ? "مستخدم جديد"
                    : "New user"
              }
              description={
                language === "ar"
                  ? "التغييرات على الصلاحيات تسري بعد إعادة تسجيل الدخول."
                  : "Permission changes take effect after the user logs in again."
              }
            />

            <form
              className="mt-6 space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {!editingUserId ? (
                  <Field label={language === "ar" ? "اسم المستخدم" : "Username"}>
                    <Input
                      value={form.username}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, username: event.target.value }))
                      }
                      required
                    />
                  </Field>
                ) : (
                  <Field label={language === "ar" ? "اسم المستخدم" : "Username"}>
                    <Input value={form.username} readOnly className="bg-slate-50" />
                  </Field>
                )}
                <Field label={language === "ar" ? "البريد الإلكتروني" : "Email"}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                  />
                </Field>
                <Field label={language === "ar" ? "الاسم الكامل" : "Full name"}>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </Field>
                <Field
                  label={
                    editingUserId
                      ? language === "ar"
                        ? "كلمة مرور جديدة (اختياري)"
                        : "New password (optional)"
                      : language === "ar"
                        ? "كلمة المرور"
                        : "Password"
                  }
                >
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    required={!editingUserId}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                {language === "ar" ? "حساب نشط" : "Active account"}
              </label>

              <div>
                <div className="mb-3 text-sm font-bold text-slate-900">
                  {language === "ar" ? "أدوار نقاط البيع" : "POS roles"}
                </div>
                <div className="flex flex-wrap gap-3">
                  {POS_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.posRoles.includes(role)}
                        onChange={(event) => {
                          setForm((current) => ({
                            ...current,
                            posRoles: event.target.checked
                              ? [...current.posRoles, role]
                              : current.posRoles.filter((entry) => entry !== role),
                          }));
                        }}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="text-sm font-bold text-slate-900">
                  {language === "ar" ? "صلاحيات مخصصة" : "Permission overrides"}
                </div>
                {groupedPermissions.map(([category, entries]) => (
                  <div key={category} className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {categoryLabel(category, language)}
                    </div>
                    <div className="space-y-3">
                      {entries.map((entry) => (
                        <div
                          key={entry.code}
                          className="grid gap-3 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 md:grid-cols-[1fr_auto]"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{entry.name}</div>
                            <div className="text-xs text-slate-500">{entry.description}</div>
                            <div className="mt-1 font-mono text-[10px] text-slate-400">{entry.code}</div>
                          </div>
                          <select
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                            value={form.overrideStates[entry.code] ?? "inherit"}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                overrideStates: {
                                  ...current.overrideStates,
                                  [entry.code]: event.target.value as OverrideState,
                                },
                              }))
                            }
                          >
                            <option value="inherit">
                              {language === "ar" ? "افتراضي من الدور" : "Inherit from role"}
                            </option>
                            <option value="GRANT">{language === "ar" ? "منح" : "Grant"}</option>
                            <option value="DENY">{language === "ar" ? "منع" : "Deny"}</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {formError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false);
                    setEditingUserId(null);
                    setForm(emptyForm());
                    setFormError(null);
                  }}
                  className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-500 disabled:opacity-60"
                >
                  {saveMutation.isPending
                    ? language === "ar"
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : language === "ar"
                      ? "حفظ"
                      : "Save"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
