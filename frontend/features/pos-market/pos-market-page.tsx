"use client";

import { usePathname } from "next/navigation";

import { PageShell, SectionHeading } from "@/components/ui";
import { PosMarketHeldWorkspace } from "@/features/pos-market/pos-market-held-workspace";
import { PosMarketPrinterSettingsPanel } from "@/features/pos-market/pos-market-printer-settings-panel";
import { PosMarketReceivablesWorkspace } from "@/features/pos-market/pos-market-receivables-workspace";
import { PosMarketMyStockWorkspace } from "@/features/pos-market/pos-market-my-stock-workspace";
import { PosMarketRepLoadWorkspace } from "@/features/pos-market/pos-market-rep-load-workspace";
import { PosMarketRepStocktakeWorkspace } from "@/features/pos-market/pos-market-rep-stocktake-workspace";
import { PosMarketRegisterWorkspace } from "@/features/pos-market/pos-market-register-workspace";
import { PosMarketReportsWorkspace } from "@/features/pos-market/pos-market-reports-workspace";
import { PosMarketReturnsWorkspace } from "@/features/pos-market/pos-market-returns-workspace";
import { PosMarketReviewWorkspace } from "@/features/pos-market/pos-market-review-workspace";
import { PosMarketSessionsWorkspace } from "@/features/pos-market/pos-market-sessions-workspace";
import { PosMarketSettingsWorkspace } from "@/features/pos-market/pos-market-settings-workspace";
import { useTranslation } from "@/lib/i18n";
import { isMarketRepUser } from "@/lib/auth-access";
import { useAuth } from "@/providers/auth-provider";

type PosMarketWorkspace =
  | "register"
  | "sessions"
  | "held"
  | "review"
  | "returns"
  | "reports"
  | "printers"
  | "receivables"
  | "repLoads"
  | "repStocktakes"
  | "myStock"
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
  "/pos-market/rep-loads": "repLoads",
  "/pos-market/rep-stocktakes": "repStocktakes",
  "/pos-market/my-stock": "myStock",
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
  repLoads: "posMarket.workspace.repLoads",
  repStocktakes: "posMarket.workspace.repStocktakes",
  myStock: "posMarket.workspace.myStock",
  settings: "posMarket.workspace.settings",
};

function resolveWorkspace(pathname: string): PosMarketWorkspace {
  return pathnameWorkspaceMap[pathname] ?? "register";
}

export function PosMarketPage() {
  const pathname = usePathname();
  const workspace = resolveWorkspace(pathname);
  const { t } = useTranslation();
  const { user } = useAuth();

  const isFullBleedRegister = workspace === "register";
  const workspaceDescriptionKey =
    workspace === "receivables" && isMarketRepUser(user)
      ? "posMarket.workspace.accountStatements"
      : workspaceTitleKey[workspace];

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
      case "repLoads":
        return <PosMarketRepLoadWorkspace />;
      case "repStocktakes":
        return <PosMarketRepStocktakeWorkspace />;
      case "myStock":
        return <PosMarketMyStockWorkspace />;
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
        description={t(workspaceDescriptionKey)}
      />
      <div className="rounded-3xl border border-[#d5deea] p-1">
        {content}
      </div>
    </PageShell>
  );
}
