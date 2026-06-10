"use client";

import { usePathname } from "next/navigation";

import { PageShell, SectionHeading } from "@/components/ui";
import { PosMarketHeldWorkspace } from "@/features/pos-market/pos-market-held-workspace";
import { PosMarketPrinterSettingsPanel } from "@/features/pos-market/pos-market-printer-settings-panel";
import { PosMarketReceivablesWorkspace } from "@/features/pos-market/pos-market-receivables-workspace";
import { PosMarketRegisterWorkspace } from "@/features/pos-market/pos-market-register-workspace";
import { PosMarketReportsWorkspace } from "@/features/pos-market/pos-market-reports-workspace";
import { PosMarketReturnsWorkspace } from "@/features/pos-market/pos-market-returns-workspace";
import { PosMarketReviewWorkspace } from "@/features/pos-market/pos-market-review-workspace";
import { PosMarketSessionsWorkspace } from "@/features/pos-market/pos-market-sessions-workspace";
import { PosMarketSettingsWorkspace } from "@/features/pos-market/pos-market-settings-workspace";
import { useTranslation } from "@/lib/i18n";

type PosMarketWorkspace =
  | "register"
  | "sessions"
  | "held"
  | "review"
  | "returns"
  | "reports"
  | "printers"
  | "receivables"
  | "settings";

const pathnameWorkspaceMap: Record<string, PosMarketWorkspace> = {
  "/pos-market/register": "register",
  "/pos-market/sessions": "sessions",
  "/pos-market/held-sales": "held",
  "/pos-market/accounting-review": "review",
  "/pos-market/returns": "returns",
  "/pos-market/reports": "reports",
  "/pos-market/printers": "printers",
  "/pos-market/receivables": "receivables",
  "/pos-market/settings": "settings",
};

const workspaceTitleKey: Record<PosMarketWorkspace, string> = {
  register: "posMarket.workspace.register",
  sessions: "posMarket.workspace.sessions",
  held: "posMarket.workspace.held",
  review: "posMarket.workspace.review",
  returns: "posMarket.workspace.returns",
  reports: "posMarket.workspace.reports",
  printers: "posMarket.workspace.printers",
  receivables: "posMarket.workspace.receivables",
  settings: "posMarket.workspace.settings",
};

function resolveWorkspace(pathname: string): PosMarketWorkspace {
  return pathnameWorkspaceMap[pathname] ?? "register";
}

export function PosMarketPage() {
  const pathname = usePathname();
  const workspace = resolveWorkspace(pathname);
  const { t } = useTranslation();

  const isFullBleedRegister = workspace === "register";

  const content = (() => {
    switch (workspace) {
      case "register":
        return <PosMarketRegisterWorkspace />;
      case "sessions":
        return <PosMarketSessionsWorkspace />;
      case "held":
        return <PosMarketHeldWorkspace />;
      case "review":
        return <PosMarketReviewWorkspace />;
      case "returns":
        return <PosMarketReturnsWorkspace />;
      case "reports":
        return <PosMarketReportsWorkspace />;
      case "printers":
        return <PosMarketPrinterSettingsPanel />;
      case "receivables":
        return <PosMarketReceivablesWorkspace />;
      case "settings":
        return <PosMarketSettingsWorkspace />;
      default:
        return <PosMarketRegisterWorkspace />;
    }
  })();

  if (isFullBleedRegister) {
    return content;
  }

  return (
    <PageShell>
      <SectionHeading
        title={t("posMarket.title")}
        description={t(workspaceTitleKey[workspace])}
      />
      <div className="rounded-3xl border border-[#d5deea] p-1">
        {content}
      </div>
    </PageShell>
  );
}
