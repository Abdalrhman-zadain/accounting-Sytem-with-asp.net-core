import { PosAccessRoleCode, Prisma, PrismaClient, UserRole } from "../../../generated/prisma";

import type { PreflightContext, ReadinessCheck, ReadinessReport, ReadinessSeverity } from "./market-readiness.types";

const POS_WALK_IN_CUSTOMER_CODE = "POS-WALKIN";

const MAPPING_KEYS = {
  cash: "POS_MAPPING_CASH_ACCOUNT_ID",
  card: "POS_MAPPING_CARD_ACCOUNT_ID",
  cliq: "POS_MAPPING_CLIQ_ACCOUNT_ID",
  wallet: "POS_MAPPING_WALLET_ACCOUNT_ID",
  bankTransfer: "POS_MAPPING_BANK_TRANSFER_ACCOUNT_ID",
  salesRevenue: "POS_MAPPING_SALES_REVENUE_ACCOUNT_ID",
  outputVat: "POS_MAPPING_OUTPUT_VAT_ACCOUNT_ID",
} as const;

type PosDb = PrismaClient | Prisma.TransactionClient;

function check(
  id: string,
  ok: boolean,
  message: string,
  options?: {
    severity?: ReadinessSeverity;
    messageAr?: string;
    fixHint?: string;
    details?: Record<string, unknown>;
  },
): ReadinessCheck {
  const severity: ReadinessSeverity = ok
    ? options?.severity === "warn"
      ? "warn"
      : "ok"
    : (options?.severity ?? "error");
  return {
    id,
    severity,
    message,
    messageAr: options?.messageAr,
    fixHint: ok ? undefined : options?.fixHint,
    details: options?.details,
  };
}

async function loadSettingsMap(db: PosDb): Promise<Map<string, string>> {
  const rows = await db.posRuntimeSetting.findMany({
    where: {
      key: {
        in: Object.values(MAPPING_KEYS),
      },
    },
    select: { key: true, value: true },
  });
  return new Map(rows.map((row) => [row.key, row.value]));
}

async function validatePostingAccount(
  db: PosDb,
  accountId: string | null | undefined,
): Promise<{ ok: boolean; reason?: string }> {
  const normalized = accountId?.trim();
  if (!normalized) {
    return { ok: false, reason: "not configured" };
  }
  const account = await db.account.findUnique({
    where: { id: normalized },
    select: { id: true, code: true, isActive: true, isPosting: true },
  });
  if (!account) {
    return { ok: false, reason: "account not found" };
  }
  if (!account.isActive || !account.isPosting) {
    return { ok: false, reason: "account must be active and posting" };
  }
  return { ok: true };
}

async function validatePaymentMappingAccount(
  db: PosDb,
  accountId: string | null | undefined,
): Promise<{ ok: boolean; reason?: string; bankCashAccountId?: string }> {
  const base = await validatePostingAccount(db, accountId);
  if (!base.ok) {
    return base;
  }
  const bankCashAccount = await db.bankCashAccount.findFirst({
    where: { accountId: accountId!.trim(), isActive: true },
    select: { id: true },
  });
  if (!bankCashAccount) {
    return { ok: false, reason: "no active bank/cash account linked to GL account" };
  }
  return { ok: true, bankCashAccountId: bankCashAccount.id };
}

function parseBooleanEnv(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === null || value.trim() === "") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export class MarketReadinessService {
  async runPreflight(db: PosDb = new PrismaClient()): Promise<ReadinessReport & { context: PreflightContext }> {
    const checks: ReadinessCheck[] = [];
    const context: PreflightContext = {};
    const settings = await loadSettingsMap(db);

    const cashAccountId = settings.get(MAPPING_KEYS.cash) || null;
    const cashValidation = await validatePaymentMappingAccount(db, cashAccountId);
    checks.push(
      check(
        "mapping_cash",
        cashValidation.ok,
        cashValidation.ok
          ? "Cash payment GL mapping is configured and linked to an active bank/cash account."
          : `Cash payment GL mapping is invalid (${cashValidation.reason}).`,
        {
          messageAr: cashValidation.ok
            ? "ربط الدفع النقدي بحساب GL مضبوط."
            : "ربط الدفع النقدي غير صالح أو ناقص.",
          fixHint: "/pos-market/settings",
          details: { accountId: cashAccountId, reason: cashValidation.reason },
        },
      ),
    );

    const revenueAccountId = settings.get(MAPPING_KEYS.salesRevenue) || null;
    const revenueValidation = await validatePostingAccount(db, revenueAccountId);
    checks.push(
      check(
        "mapping_revenue",
        revenueValidation.ok,
        revenueValidation.ok
          ? "Sales revenue GL mapping is configured."
          : `Sales revenue GL mapping is invalid (${revenueValidation.reason}).`,
        {
          messageAr: revenueValidation.ok ? "ربط إيراد المبيعات مضبوط." : "ربط إيراد المبيعات غير صالح أو ناقص.",
          fixHint: "/pos-market/settings",
          details: { accountId: revenueAccountId, reason: revenueValidation.reason },
        },
      ),
    );

    const optionalMappings: Array<{ id: string; key: string; label: string }> = [
      { id: "mapping_card", key: MAPPING_KEYS.card, label: "Card" },
      { id: "mapping_cliq", key: MAPPING_KEYS.cliq, label: "Cliq" },
      { id: "mapping_wallet", key: MAPPING_KEYS.wallet, label: "Wallet" },
      { id: "mapping_bank_transfer", key: MAPPING_KEYS.bankTransfer, label: "Bank transfer" },
    ];
    for (const mapping of optionalMappings) {
      const accountId = settings.get(mapping.key) || null;
      if (!accountId?.trim()) {
        checks.push(
          check(
            mapping.id,
            true,
            `${mapping.label} payment mapping is not configured (optional).`,
            {
              severity: "warn",
              messageAr: `ربط ${mapping.label} غير مضبوط (اختياري).`,
              fixHint: "/pos-market/settings",
            },
          ),
        );
        continue;
      }
      const validation = await validatePaymentMappingAccount(db, accountId);
      checks.push(
        check(
          mapping.id,
          true,
          validation.ok
            ? `${mapping.label} payment mapping is configured.`
            : `${mapping.label} payment mapping is invalid (${validation.reason}).`,
          {
            severity: validation.ok ? "ok" : "warn",
            fixHint: "/pos-market/settings",
            details: { accountId, reason: validation.reason },
          },
        ),
      );
    }

    const vatAccountId = settings.get(MAPPING_KEYS.outputVat) || null;
    const vatValidation = await validatePostingAccount(db, vatAccountId);
    checks.push(
      check(
        "mapping_output_vat",
        true,
        vatAccountId?.trim()
          ? vatValidation.ok
            ? "Output VAT GL mapping is configured."
            : `Output VAT GL mapping is invalid (${vatValidation.reason}).`
          : "Output VAT GL mapping is not configured (optional for tax-free market receipts).",
        {
          severity:
            vatAccountId?.trim() && !vatValidation.ok
              ? "warn"
              : vatAccountId?.trim()
                ? "ok"
                : "warn",
          fixHint: "/pos-market/settings",
        },
      ),
    );

    const destinationMarkets = await db.customer.findMany({
      where: {
        isActive: true,
        code: { not: POS_WALK_IN_CUSTOMER_CODE },
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
      take: 5,
    });
    if (destinationMarkets.length > 0) {
      context.destinationMarketId = destinationMarkets[0]!.id;
    }
    checks.push(
      check(
        "destination_markets",
        destinationMarkets.length > 0,
        destinationMarkets.length > 0
          ? `${destinationMarkets.length}+ destination market(s) with receivable accounts are configured.`
          : "No active destination market customers with receivable accounts.",
        {
          messageAr:
            destinationMarkets.length > 0
              ? "أسواق الوجهة مربوطة بحسابات ذمم."
              : "لا توجد أسواق وجهة نشطة مربوطة بذمم.",
          fixHint: "/sales-receivables?tab=customers",
          details: { sampleCodes: destinationMarkets.map((row) => row.code) },
        },
      ),
    );

    const activeReps = await db.salesRepresentative.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
      take: 5,
    });
    if (activeReps.length > 0) {
      context.salesRepId = activeReps[0]!.id;
    }
    checks.push(
      check(
        "sales_rep_active",
        activeReps.length > 0,
        activeReps.length > 0
          ? `${activeReps.length}+ active sales representative(s) found.`
          : "No active sales representatives.",
        {
          messageAr: activeReps.length > 0 ? "يوجد مندوب(ون) نشط(ون)." : "لا يوجد مندوب نشط.",
          fixHint: "/sales-receivables?tab=sales-reps",
        },
      ),
    );

    const repStock = await db.repCarStockBalance.findFirst({
      where: { onHandQuantity: { gt: 0 } },
      select: { salesRepId: true, itemId: true, onHandQuantity: true },
      orderBy: { updatedAt: "desc" },
    });
    if (repStock) {
      context.salesRepId = repStock.salesRepId;
      context.catalogItemId = repStock.itemId;
    }
    checks.push(
      check(
        "rep_car_stock",
        Boolean(repStock),
        repStock
          ? "Rep car stock is available for register sales."
          : "No rep car stock balances with on-hand quantity.",
        {
          messageAr: repStock ? "مخزون سيارة المندوب متوفر." : "لا يوجد مخزون على سيارة المندوب.",
          fixHint: "/pos-market/rep-loads",
          details: repStock
            ? {
                salesRepId: repStock.salesRepId,
                itemId: repStock.itemId,
                onHandQuantity: repStock.onHandQuantity.toString(),
              }
            : undefined,
        },
      ),
    );

    const warehouse = await db.inventoryWarehouse.findFirst({
      where: { code: "WH-MAIN", isActive: true },
      select: { id: true, code: true, name: true },
    });
    if (warehouse) {
      context.warehouseId = warehouse.id;
    }
    checks.push(
      check(
        "warehouse_main",
        Boolean(warehouse),
        warehouse ? "Main warehouse WH-MAIN is active." : "Main warehouse WH-MAIN is missing or inactive.",
        {
          messageAr: warehouse ? "المستودع الرئيسي WH-MAIN نشط." : "المستودع WH-MAIN غير موجود أو غير نشط.",
          fixHint: "/inventory",
        },
      ),
    );

    const cashRegister = await db.bankCashAccount.findFirst({
      where: { type: "Cash", isActive: true },
      select: { id: true, name: true, accountId: true },
      orderBy: { createdAt: "asc" },
    });
    if (cashRegister) {
      context.cashRegisterId = cashRegister.id;
    }
    checks.push(
      check(
        "cash_register",
        Boolean(cashRegister),
        cashRegister
          ? `Active cash register found (${cashRegister.name}).`
          : "No active cash bank/cash account register.",
        {
          messageAr: cashRegister ? "يوجد صندوق نقدي نشط." : "لا يوجد صندوق نقدي نشط.",
          fixHint: "/bank-cash-accounts",
        },
      ),
    );

    const marketCashierRole = await db.posAccessRole.findUnique({
      where: { code: PosAccessRoleCode.MARKET_CASHIER },
      select: { id: true },
    });
    const marketCashierUsers = marketCashierRole
      ? await db.user.findMany({
          where: {
            isActive: true,
            posAccessRoles: { some: { roleId: marketCashierRole.id } },
          },
          select: { id: true, username: true },
          take: 3,
        })
      : [];
    checks.push(
      check(
        "market_cashier_user",
        marketCashierUsers.length > 0,
        marketCashierUsers.length > 0
          ? `Active market cashier user(s): ${marketCashierUsers.map((u) => u.username).join(", ")}.`
          : "No active MARKET_CASHIER user.",
        {
          messageAr:
            marketCashierUsers.length > 0 ? "يوجد مستخدم كاشير ماركت نشط." : "لا يوجد مستخدم MARKET_CASHIER نشط.",
          fixHint: "npm run seed:market-cashier",
        },
      ),
    );

    const adminUser = await db.user.findFirst({
      where: {
        isActive: true,
        role: { in: [UserRole.ADMIN, UserRole.MANAGER] },
      },
      select: { id: true, username: true, role: true },
    });

    let accountantCapable = Boolean(adminUser);
    if (!accountantCapable) {
      const capableUser = await db.user.findFirst({
        where: {
          isActive: true,
          posAccessRoles: {
            some: {
              role: {
                isActive: true,
                AND: [
                  { permissions: { some: { permission: { code: "POS_POST_BY_SESSION" } } } },
                  { permissions: { some: { permission: { code: "POS_MARKET_COLLECT_RECEIVABLE" } } } },
                ],
              },
            },
          },
        },
        select: { id: true, username: true },
      });
      accountantCapable = Boolean(capableUser);
    }

    checks.push(
      check(
        "accountant_post_access",
        accountantCapable,
        accountantCapable
          ? "A user can post market POS sessions and collect receivables (admin or accountant permissions)."
          : "No user with session posting and receivables collection permissions.",
        {
          messageAr: accountantCapable
            ? "يوجد مستخدم يستطيع ترحيل الورديات وتحصيل الذمم."
            : "لا يوجد مستخدم بصلاحيات الترحيل والتحصيل.",
          fixHint: adminUser ? undefined : "Assign ACCOUNTANT POS role or use admin user",
          details: adminUser ? { username: adminUser.username, role: adminUser.role } : undefined,
        },
      ),
    );

    const creditAllowedByEnv = parseBooleanEnv(process.env.POS_ALLOW_CREDIT_SALE, false);
    let creditAllowedByRole = false;
    if (marketCashierRole) {
      const creditPermission = await db.posPermission.findUnique({
        where: { code: "POS_CREDIT_SALE" },
        select: { id: true },
      });
      if (creditPermission) {
        const roleHasCredit = await db.posAccessRolePermission.findFirst({
          where: { roleId: marketCashierRole.id, permissionId: creditPermission.id },
          select: { id: true },
        });
        creditAllowedByRole = Boolean(roleHasCredit);
      }
    }
    const creditReady = creditAllowedByEnv || creditAllowedByRole;
    checks.push(
      check(
        "credit_sale_ready",
        true,
        creditReady
          ? "Credit / pay-later sales are enabled for market cashiers."
          : "Credit sale is not enabled (set POS_ALLOW_CREDIT_SALE or grant POS_CREDIT_SALE to MARKET_CASHIER).",
        {
          severity: creditReady ? "ok" : "warn",
          messageAr: creditReady ? "بيع الذمم / الدفع لاحقاً مفعّل." : "بيع الذمم غير مفعّل.",
          fixHint: "/pos-market/settings or POS_ALLOW_CREDIT_SALE env",
        },
      ),
    );

    const errorCount = checks.filter((row) => row.severity === "error").length;
    const warnCount = checks.filter((row) => row.severity === "warn").length;

    return {
      ready: errorCount === 0,
      errorCount,
      warnCount,
      checks,
      context,
    };
  }
}

export async function runMarketPreflight(db?: PosDb) {
  const service = new MarketReadinessService();
  const ownsClient = !db;
  const client = db ?? new PrismaClient();
  try {
    return await service.runPreflight(client);
  } finally {
    if (ownsClient) {
      await (client as PrismaClient).$disconnect();
    }
  }
}
