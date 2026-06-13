export type ReadinessSeverity = "error" | "warn" | "ok";

export type ReadinessCheck = {
  id: string;
  severity: ReadinessSeverity;
  message: string;
  messageAr?: string;
  fixHint?: string;
  details?: Record<string, unknown>;
};

export type ReadinessReport = {
  ready: boolean;
  errorCount: number;
  warnCount: number;
  checks: ReadinessCheck[];
};

export type PreflightContext = {
  cashRegisterId?: string;
  warehouseId?: string;
  salesRepId?: string;
  destinationMarketId?: string;
  catalogItemId?: string;
};
