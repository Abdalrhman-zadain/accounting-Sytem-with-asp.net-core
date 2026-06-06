"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/providers/auth-provider";
import { KdsModeProvider } from "@/providers/kds-mode-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SettingsProvider } from "@/providers/settings-provider";

export function AppProviders({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: "en" | "ar";
}) {
  return (
    <QueryProvider>
      <SettingsProvider initialLanguage={initialLanguage}>
        <KdsModeProvider>
          <AuthProvider>{children}</AuthProvider>
        </KdsModeProvider>
      </SettingsProvider>
    </QueryProvider>
  );
}
