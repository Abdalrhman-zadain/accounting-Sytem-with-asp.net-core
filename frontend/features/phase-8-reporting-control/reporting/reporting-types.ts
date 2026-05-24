export type TranslationFn = (key: string, vars?: Record<string, string | number>) => string;

export type ReportTab =
  | "summary"
  | "trialBalance"
  | "balanceSheet"
  | "profitLoss"
  | "cashMovement"
  | "generalLedger"
  | "audit";

export type ContentTab = "activity" | "trialBalance" | "generalLedger";
