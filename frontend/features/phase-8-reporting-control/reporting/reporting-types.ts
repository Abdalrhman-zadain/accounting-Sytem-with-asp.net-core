export type TranslationFn = (key: string, vars?: Record<string, string | number>) => string;

export type ReportTab =
  | "summary"
  | "activity"
  | "trialBalance"
  | "balanceSheet"
  | "profitLoss"
  | "cashMovement"
  | "generalLedger"
  | "audit";
