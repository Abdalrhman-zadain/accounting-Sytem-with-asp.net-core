"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { createSalesRepMarketLogin } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import type { SalesRepresentative } from "@/types/api";
import { Button, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";

type SalesRepMarketLoginPanelProps = {
  isOpen: boolean;
  salesRep: SalesRepresentative | null;
  token: string | null;
  onClose: () => void;
  onCreated: () => void;
};

type FormState = {
  username: string;
  email: string;
  password: string;
  name: string;
};

const EMPTY_FORM: FormState = {
  username: "",
  email: "",
  password: "",
  name: "",
};

export function SalesRepMarketLoginPanel({
  isOpen,
  salesRep,
  token,
  onClose,
  onCreated,
}: SalesRepMarketLoginPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [clientError, setClientError] = useState<string | null>(null);
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!salesRep || !token) {
        throw new Error(t("salesReceivables.salesReps.marketLogin.error.session"));
      }
      return createSalesRepMarketLogin(
        salesRep.id,
        {
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim() || undefined,
        },
        token,
      );
    },
    onSuccess: (result) => {
      setCreatedUsername(result.username);
      onCreated();
    },
  });

  useEffect(() => {
    if (!isOpen || !salesRep) {
      return;
    }
    setForm({
      username: "",
      email: salesRep.email?.trim() || "",
      password: "",
      name: salesRep.name,
    });
    setClientError(null);
    setCreatedUsername(null);
  }, [isOpen, salesRep?.id]);

  const handleSubmit = () => {
    if (!form.username.trim()) {
      setClientError(t("salesReceivables.salesReps.marketLogin.error.username"));
      return;
    }
    if (!form.email.trim()) {
      setClientError(t("salesReceivables.salesReps.marketLogin.error.email"));
      return;
    }
    if (form.password.length < 6) {
      setClientError(t("salesReceivables.salesReps.marketLogin.error.password"));
      return;
    }
    setClientError(null);
    createMutation.mutate();
  };

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={t("salesReceivables.salesReps.marketLogin.title", { name: salesRep?.name ?? "" })}
    >
      <div className="space-y-5">
        {salesRep ? (
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <div className="font-bold">{salesRep.name}</div>
            <div className="mt-1 text-xs text-sky-800">
              {t("salesReceivables.salesReps.marketLogin.hint")}
            </div>
          </div>
        ) : null}

        {createdUsername ? (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
            <div className="font-bold">{t("salesReceivables.salesReps.marketLogin.successTitle")}</div>
            <div>
              {t("salesReceivables.salesReps.marketLogin.successBody", { username: createdUsername })}
            </div>
            <StatusPill label={t("salesReceivables.salesReps.marketLogin.roleBadge")} tone="positive" />
            <Button type="button" onClick={onClose}>
              {t("common.action.close")}
            </Button>
          </div>
        ) : (
          <>
            {(clientError || createMutation.error) ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {clientError ||
                  (createMutation.error instanceof Error ? createMutation.error.message : null)}
              </div>
            ) : null}

            <Field label={t("salesReceivables.salesReps.marketLogin.field.username")} required>
              <Input
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                autoComplete="off"
              />
            </Field>

            <Field label={t("salesReceivables.salesReps.marketLogin.field.email")} required>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                autoComplete="off"
              />
            </Field>

            <Field label={t("salesReceivables.salesReps.marketLogin.field.displayName")}>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>

            <Field label={t("salesReceivables.salesReps.marketLogin.field.password")} required>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                autoComplete="new-password"
              />
            </Field>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
              <Button type="button" variant="secondary" onClick={onClose}>
                {t("common.action.cancel")}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? t("salesReceivables.salesReps.marketLogin.action.creating")
                  : t("salesReceivables.salesReps.marketLogin.action.create")}
              </Button>
            </div>
          </>
        )}
      </div>
    </SidePanel>
  );
}

export function getActiveSalesRepMarketLogin(salesRep: SalesRepresentative) {
  return (salesRep.linkedUsers ?? []).find((user) => user.isActive) ?? null;
}
