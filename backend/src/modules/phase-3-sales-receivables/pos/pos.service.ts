import {
  BadRequestException,
  ConflictException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  AccountType,
  AllocationStatus,
  AuditAction,
  InventoryStockMovementType,
  JournalEntryStatus,
  PosAccountingStatus,
  PosOperationalStatus,
  PosPaymentMethod,
  PosRefundMethod,
  PosReturnStatus,
  PosSessionStatus,
  Prisma,
  SalesInvoiceStatus,
  SalesInvoiceType,
  TableStatus,
  OrderType,
  DeliveryStatus,
  KitchenStatus,
  WaiterFoodStatus,
  DeliveryCollectionMethod,
  DeliverySettlementStatus,
} from "../../../generated/prisma";

import { PrismaService } from "../../../common/prisma/prisma.service";
import type { AuthorizedUser, PosPermissionCode } from "../../platform/auth/auth.types";
import { AuditService } from "../../phase-1-accounting-foundation/accounting-core/audit/audit.service";
import { JournalEntriesService } from "../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service";
import { PostingService } from "../../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service";
import { ReversalService } from "../../phase-1-accounting-foundation/accounting-core/reversal-control/reversal.service";
import { InventoryPostingService } from "../../phase-5-inventory-management/inventory/shared/inventory-posting.service";
import {
  ResolvedSalesLine,
  SalesReceivablesService,
} from "../sales-receivables.service";
import {
  ClosePosSessionDto,
  CompletePosSaleDto,
  CreateDeliveryCompanySettlementDto,
  CreatePosReturnDto,
  DeliveryCompanySettlementPreviewDto,
  HoldPosSaleDto,
  OpenPosSessionDto,
  PosPaymentDto,
  PosReverseAccountingDto,
  PosReturnPaymentDto,
  PosReviewDecisionDto,
  UpdatePosSettingsDto,
  SavePosDraftDto,
  SetPosFavoriteItemsDto,
  VoidPosSaleDto,
  TransferTableDto,
  MergeTablesDto,
  SplitTableDto,
  CorrectOrderTypeDto,
  CorrectPaymentMethodDto,
  ReprintKotDto,
  UpdateDeliveryCompanyStatusDto,
} from "./dto/pos.dto";

const POS_WALK_IN_CUSTOMER_CODE = "POS-WALKIN";
const POS_WALK_IN_CUSTOMER_NAME = "POS Walk-in Customer";
type PosDb = Prisma.TransactionClient | PrismaService;
type PosAccountMappings = {
  cashAccountId: string | null;
  cardAccountId: string | null;
  cliqAccountId: string | null;
  walletAccountId: string | null;
  bankTransferAccountId: string | null;
  salesRevenueAccountId: string | null;
  outputVatAccountId: string | null;
  salesDiscountAccountId: string | null;
  salesReturnsAccountId: string | null;
  deliveryCompanies: Array<{
    id: string;
    receivableAccountId: string;
    commissionAccountId?: string;
    serviceFeeAccountId?: string;
  }>;
};

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
    private readonly reversalService: ReversalService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly salesReceivablesService: SalesReceivablesService,
  ) {}

  async getActiveSession(user?: AuthorizedUser) {
    const waiterOnly = this.isWaiterOnlyUser(user);
    const session = await this.prisma.posSession.findFirst({
      where: {
        status: PosSessionStatus.OPEN,
        ...(waiterOnly ? {} : { cashierUserId: user?.userId ?? undefined }),
      },
      include: this.posSessionInclude(),
      orderBy: { openedAt: "desc" },
    });

    return session ? this.mapSession(session) : null;
  }

  async getPosAccountMappings(db: PosDb = this.prisma): Promise<PosAccountMappings> {
    const settings = await db.posRuntimeSetting.findMany({
      where: {
        key: {
          in: [
            "POS_MAPPING_CASH_ACCOUNT_ID",
            "POS_MAPPING_CARD_ACCOUNT_ID",
            "POS_MAPPING_CLIQ_ACCOUNT_ID",
            "POS_MAPPING_WALLET_ACCOUNT_ID",
            "POS_MAPPING_BANK_TRANSFER_ACCOUNT_ID",
            "POS_MAPPING_SALES_REVENUE_ACCOUNT_ID",
            "POS_MAPPING_OUTPUT_VAT_ACCOUNT_ID",
            "POS_MAPPING_SALES_DISCOUNT_ACCOUNT_ID",
            "POS_MAPPING_SALES_RETURNS_ACCOUNT_ID",
            "POS_MAPPING_DELIVERY_COMPANIES",
          ],
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    let deliveryCompanies: Array<{
      id: string;
      receivableAccountId: string;
      commissionAccountId?: string;
      serviceFeeAccountId?: string;
    }> = [];
    const delVal = settingsMap.get("POS_MAPPING_DELIVERY_COMPANIES");
    if (delVal) {
      try {
        deliveryCompanies = JSON.parse(delVal);
      } catch (e) {
        deliveryCompanies = [];
      }
    }

    return {
      cashAccountId: settingsMap.get("POS_MAPPING_CASH_ACCOUNT_ID") || null,
      cardAccountId: settingsMap.get("POS_MAPPING_CARD_ACCOUNT_ID") || null,
      cliqAccountId: settingsMap.get("POS_MAPPING_CLIQ_ACCOUNT_ID") || null,
      walletAccountId: settingsMap.get("POS_MAPPING_WALLET_ACCOUNT_ID") || null,
      bankTransferAccountId: settingsMap.get("POS_MAPPING_BANK_TRANSFER_ACCOUNT_ID") || null,
      salesRevenueAccountId: settingsMap.get("POS_MAPPING_SALES_REVENUE_ACCOUNT_ID") || null,
      outputVatAccountId: settingsMap.get("POS_MAPPING_OUTPUT_VAT_ACCOUNT_ID") || null,
      salesDiscountAccountId: settingsMap.get("POS_MAPPING_SALES_DISCOUNT_ACCOUNT_ID") || null,
      salesReturnsAccountId: settingsMap.get("POS_MAPPING_SALES_RETURNS_ACCOUNT_ID") || null,
      deliveryCompanies,
    };
  }

  async sendSaleToKitchen(invoiceId: string, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("RST_SEND_KOT", user);
    const waiterOnly = this.isWaiterOnlyUser(user);

    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: invoiceId.trim() },
        include: {
          lines: { orderBy: { lineNumber: "asc" } },
          kitchenOrder: { include: { items: true } },
        },
      });

      if (!invoice || invoice.invoiceType !== SalesInvoiceType.POS) {
        throw new BadRequestException("POS sale was not found.");
      }
      if (
        invoice.posOperationalStatus !== PosOperationalStatus.DRAFT &&
        invoice.posOperationalStatus !== PosOperationalStatus.HELD
      ) {
        throw new BadRequestException("Only open POS orders can be sent to the kitchen.");
      }
      if (waiterOnly && invoice.waiterConfirmedAt) {
        throw new ForbiddenException("This order was already confirmed and cannot be sent again.");
      }

      const unsentLines = invoice.lines.filter((line) => !line.kitchenSentAt);
      if (!unsentLines.length) {
        throw new BadRequestException("There are no new items to send to the kitchen.");
      }

      const sentAt = new Date();
      await tx.salesInvoiceLine.updateMany({
        where: { id: { in: unsentLines.map((line) => line.id) } },
        data: { kitchenSentAt: sentAt },
      });

      const headerPatch: Prisma.SalesInvoiceUpdateInput = {
        posOperationalStatus: PosOperationalStatus.HELD,
      };
      if (!invoice.waiterId && user?.userId) {
        headerPatch.waiter = { connect: { id: user.userId } };
      }
      if (waiterOnly && !invoice.waiterConfirmedAt) {
        headerPatch.waiterConfirmedAt = sentAt;
      }
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: headerPatch,
      });
      if (invoice.tableId) {
        await this.updateTableStatus(tx, invoice.tableId, invoice.id, TableStatus.OCCUPIED);
      }

      await this.appendKitchenOrderItems(tx, invoice, unsentLines);

      return tx.salesInvoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: this.posSaleInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "KitchenOrder",
      entityId: result.id,
      action: AuditAction.UPDATE,
      details: {
        message: "KOT_SENT",
        salesInvoiceId: result.id,
        reference: result.reference,
      },
    });

    return this.mapPosSale(result);
  }

  async getSettings(user?: AuthorizedUser) {
    const runtimeConfig = await this.getPosRuntimeConfig();
    const accountMappings = await this.getPosAccountMappings();
    return {
      runtime: {
        autoPost: this.parseBoolean(process.env.POS_AUTO_POST, false),
        allowCloseWithDrafts: this.parseBoolean(process.env.POS_ALLOW_CLOSE_WITH_DRAFTS, false),
        postingMode: runtimeConfig.postingMode,
        cogsPostingEnabled: runtimeConfig.cogsPostingEnabled,
        taxFreeEnabled: runtimeConfig.taxFreeEnabled,
        allowCreditSale:
          this.parseBoolean(process.env.POS_ALLOW_CREDIT_SALE, false) ||
          this.hasPosPermissionCode("POS_CREDIT_SALE", user),
        invoiceDiscountTaxPolicy: this.parseTaxPolicy(process.env.POS_INVOICE_DISCOUNT_TAX_POLICY),
        negativeStockAllowed:
          this.parseBoolean(process.env.POS_ALLOW_NEGATIVE_STOCK, false) ||
          this.hasPosPermissionCode("POS_SELL_NEGATIVE_STOCK", user),
        cashierDiscountLimitPercent: Number(process.env.POS_MAX_CASHIER_DISCOUNT_PERCENT ?? "15"),
      },
      accounts: accountMappings,
      permissions: Object.fromEntries(
        this.listKnownPermissionCodes().map((permissionCode) => [
          permissionCode,
          this.hasPosPermissionCode(permissionCode, user),
        ]),
      ),
    };
  }

  async updateSettings(dto: UpdatePosSettingsDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    await this.prisma.$transaction(async (tx) => {
      if (dto.postingMode) {
        await this.upsertPosRuntimeSetting(tx, "POS_POSTING_MODE", dto.postingMode);
      }
      if (dto.cogsPostingEnabled !== undefined) {
        await this.upsertPosRuntimeSetting(
          tx,
          "POS_COGS_POSTING_ENABLED",
          dto.cogsPostingEnabled ? "true" : "false",
        );
      }
      if (dto.taxFreeEnabled !== undefined) {
        await this.upsertPosRuntimeSetting(
          tx,
          "POS_TAX_FREE_ENABLED",
          dto.taxFreeEnabled ? "true" : "false",
        );
      }
      if (dto.cashAccountId !== undefined) {
        await this.ensurePosPaymentMappingAccount(dto.cashAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_CASH_ACCOUNT_ID", dto.cashAccountId || "");
      }
      if (dto.cardAccountId !== undefined) {
        await this.ensurePosPaymentMappingAccount(dto.cardAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_CARD_ACCOUNT_ID", dto.cardAccountId || "");
      }
      if (dto.cliqAccountId !== undefined) {
        await this.ensurePosPaymentMappingAccount(dto.cliqAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_CLIQ_ACCOUNT_ID", dto.cliqAccountId || "");
      }
      if (dto.walletAccountId !== undefined) {
        await this.ensurePosPaymentMappingAccount(dto.walletAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_WALLET_ACCOUNT_ID", dto.walletAccountId || "");
      }
      if (dto.bankTransferAccountId !== undefined) {
        await this.ensurePosPaymentMappingAccount(dto.bankTransferAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_BANK_TRANSFER_ACCOUNT_ID", dto.bankTransferAccountId || "");
      }
      if (dto.salesRevenueAccountId !== undefined) {
        await this.ensureActivePostingAccount(dto.salesRevenueAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_SALES_REVENUE_ACCOUNT_ID", dto.salesRevenueAccountId || "");
      }
      if (dto.outputVatAccountId !== undefined) {
        await this.ensureActivePostingAccount(dto.outputVatAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_OUTPUT_VAT_ACCOUNT_ID", dto.outputVatAccountId || "");
      }
      if (dto.salesDiscountAccountId !== undefined) {
        await this.ensureActivePostingAccount(dto.salesDiscountAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_SALES_DISCOUNT_ACCOUNT_ID", dto.salesDiscountAccountId || "");
      }
      if (dto.salesReturnsAccountId !== undefined) {
        await this.ensureActivePostingAccount(dto.salesReturnsAccountId, tx);
        await this.upsertPosRuntimeSetting(tx, "POS_MAPPING_SALES_RETURNS_ACCOUNT_ID", dto.salesReturnsAccountId || "");
      }
      if (dto.deliveryCompanies !== undefined) {
        await this.upsertPosRuntimeSetting(
          tx,
          "POS_MAPPING_DELIVERY_COMPANIES",
          JSON.stringify(dto.deliveryCompanies || []),
        );
        if (dto.deliveryCompanies) {
          for (const item of dto.deliveryCompanies) {
            await this.ensureActivePostingAccount(item.receivableAccountId, tx);
            if (item.commissionAccountId?.trim()) {
              await this.ensureActivePostingAccount(item.commissionAccountId, tx);
            }
            if (item.serviceFeeAccountId?.trim()) {
              await this.ensureActivePostingAccount(item.serviceFeeAccountId, tx);
            }
            await tx.deliveryCompany.update({
              where: { id: item.id },
              data: {
                receivableAccountId: item.receivableAccountId,
                commissionAccountId: item.commissionAccountId?.trim() || null,
                serviceFeeAccountId: item.serviceFeeAccountId?.trim() || null,
              },
            });
          }
        }
      }
    });
    return this.getSettings(user);
  }

  async getTimeWindowReport(
    dto: { from: string; to: string },
    user?: AuthorizedUser,
  ) {
    // Keep this aligned with the tables/report screens access.
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);

    const from = new Date(dto.from);
    const to = new Date(dto.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException("Invalid from/to date.");
    }
    if (to <= from) {
      throw new BadRequestException("Time window end must be after start.");
    }

    const reservations = await this.prisma.posTableReservation.findMany({
      where: {
        status: "ACTIVE",
        reservedFrom: { lt: to },
        reservedTo: { gt: from },
      },
      include: {
        table: { select: { id: true, tableNumber: true } },
      },
      orderBy: [{ reservedFrom: "asc" }, { reservedTo: "asc" }],
      take: 500,
    });

    const sales = await this.prisma.salesInvoice.findMany({
      where: {
        invoiceType: SalesInvoiceType.POS,
        OR: [
          // Completed/refunded: use completed timestamp
          {
            posOperationalStatus: { in: [PosOperationalStatus.COMPLETED, PosOperationalStatus.REFUNDED] },
            posCompletedAt: { gte: from, lte: to },
          },
          // Draft/held: treat "activity" as updatedAt, but only for dine-in (table-linked)
          {
            posOperationalStatus: { in: [PosOperationalStatus.DRAFT, PosOperationalStatus.HELD] },
            tableId: { not: null },
            updatedAt: { gte: from, lte: to },
          },
        ],
      },
      include: {
        table: { select: { id: true, tableNumber: true } },
        waiter: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ posCompletedAt: "desc" }, { updatedAt: "desc" }],
      take: 500,
    });

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      reservations: reservations.map((row) => ({
        id: row.id,
        tableId: row.tableId,
        tableNumber: row.table.tableNumber,
        reservedFrom: row.reservedFrom.toISOString(),
        reservedTo: row.reservedTo.toISOString(),
        status: row.status,
        notes: row.notes ?? null,
        createdByUserId: row.createdByUserId ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      sales: sales.map((row) => ({
        id: row.id,
        reference: row.reference,
        posOperationalStatus: row.posOperationalStatus,
        posAccountingStatus: row.posAccountingStatus,
        orderType: row.orderType,
        tableId: row.tableId ?? null,
        tableNumber: row.table?.tableNumber ?? null,
        waiter: row.waiter
          ? { id: row.waiter.id, name: row.waiter.name ?? null, email: row.waiter.email }
          : null,
        totalAmount: row.totalAmount.toString(),
        posCompletedAt: row.posCompletedAt ? row.posCompletedAt.toISOString() : null,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }
  async createTableReservation(
    tableId: string,
    dto: { reservedFrom: string; reservedTo: string; notes?: string; orderNotes?: string },
    user?: AuthorizedUser,
  ) {
    // TODO: add explicit permission when permissions list is finalized
    // this.ensurePosPermissionCode("RST_RESERVE_TABLE", user);

    const from = new Date(dto.reservedFrom);
    const to = new Date(dto.reservedTo);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException("Invalid reservation time.");
    }
    if (to <= from) {
      throw new BadRequestException("Reservation end time must be after start time.");
    }
    const windowMs = to.getTime() - from.getTime();
    const maxWindowMs = 24 * 60 * 60 * 1000;
    if (windowMs > maxWindowMs) {
      throw new BadRequestException("Reservation window cannot exceed 24 hours.");
    }

    return this.prisma.$transaction(async (tx) => {
      const table = await tx.posTable.findUnique({ where: { id: tableId } });
      if (!table) throw new NotFoundException("Table not found.");

      const overlap = await tx.posTableReservation.findFirst({
        where: {
          tableId,
          status: "ACTIVE",
          reservedFrom: { lt: to },
          reservedTo: { gt: from },
        },
        select: { id: true },
      });

      if (overlap) {
        throw new BadRequestException("Table is already reserved in that time range.");
      }

      const reservation = await tx.posTableReservation.create({
        data: {
          tableId,
          reservedFrom: from,
          reservedTo: to,
          status: "ACTIVE",
          notes: JSON.stringify({
            notes: dto.notes?.trim() || null,
            orderNotes: dto.orderNotes?.trim() || null,
            attendanceStatus: "UNKNOWN",
            attendanceMarkedAt: null,
            preOrderSaleId: null,
            preOrderUpdatedAt: null,
          }),
          createdByUserId: user?.userId ?? null,
        },
      });

      await this.refreshTableOperationalStatus(tx, tableId);

      return reservation;
    });
  }

  async cancelTableReservation(
    reservationId: string,
    dto: { reason?: string },
    user?: AuthorizedUser,
  ) {
    // TODO: add explicit permission when permissions list is finalized
    // this.ensurePosPermissionCode("RST_CANCEL_TABLE_RESERVATION", user);
    void dto;
    void user;

    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.posTableReservation.findUnique({
        where: { id: reservationId },
        select: { id: true, tableId: true, status: true },
      });
      if (!reservation) throw new NotFoundException("Reservation not found.");
      if (reservation.status !== "ACTIVE") {
        throw new BadRequestException("Only ACTIVE reservations can be cancelled.");
      }

      await tx.posTableReservation.update({
        where: { id: reservationId },
        data: { status: "CANCELLED" },
      });

      await this.refreshTableOperationalStatus(tx, reservation.tableId);

      return { success: true };
    });
  }

  async updateTableReservation(
    reservationId: string,
    dto: { notes?: string; orderNotes?: string; attendanceStatus?: "UNKNOWN" | "ARRIVED" | "NO_SHOW" },
    user?: AuthorizedUser,
  ) {
    // TODO: add explicit permission when permissions list is finalized
    // this.ensurePosPermissionCode("RST_UPDATE_TABLE_RESERVATION", user);

    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.posTableReservation.findUnique({
        where: { id: reservationId },
        select: { id: true, tableId: true, status: true },
      });
      if (!reservation) throw new NotFoundException("Reservation not found.");
      if (reservation.status !== "ACTIVE") {
        throw new BadRequestException("Only ACTIVE reservations can be updated.");
      }

      const current = await tx.posTableReservation.findUnique({
        where: { id: reservationId },
        select: { notes: true },
      });

      const existingParsed = this.parseReservationNotes(typeof current?.notes === "string" ? current.notes : null);

      const nextPayload = {
        notes: dto.notes !== undefined ? (dto.notes?.trim() || null) : existingParsed.notes,
        orderNotes:
          dto.orderNotes !== undefined ? (dto.orderNotes?.trim() || null) : existingParsed.orderNotes,
        attendanceStatus:
          dto.attendanceStatus !== undefined ? dto.attendanceStatus : existingParsed.attendanceStatus,
        attendanceMarkedAt:
          dto.attendanceStatus !== undefined ? new Date().toISOString() : existingParsed.attendanceMarkedAt,
        preOrderSaleId: existingParsed.preOrderSaleId,
        preOrderUpdatedAt: existingParsed.preOrderUpdatedAt,
      };

      const updated = await tx.posTableReservation.update({
        where: { id: reservationId },
        data: {
          notes: JSON.stringify(nextPayload),
        },
        select: {
          id: true,
          tableId: true,
          reservedFrom: true,
          reservedTo: true,
          status: true,
          notes: true,
          createdByUserId: true,
          createdAt: true,
        },
      });

      await this.refreshTableOperationalStatus(tx, updated.tableId);

      await this.auditService.log({
        userId: user?.userId || "system",
        entity: "PosTableReservation",
        entityId: reservationId,
        action: AuditAction.UPDATE,
        details: {
          message: "Reservation updated",
          reservationId,
          tableId: updated.tableId,
          attendanceStatus: nextPayload.attendanceStatus,
        },
      });

      return {
        ...updated,
        reservedFrom: updated.reservedFrom.toISOString(),
        reservedTo: updated.reservedTo.toISOString(),
        notes: nextPayload.notes,
        orderNotes: nextPayload.orderNotes,
        attendanceStatus: nextPayload.attendanceStatus,
        attendanceMarkedAt: nextPayload.attendanceMarkedAt,
        preOrderSaleId: nextPayload.preOrderSaleId,
        createdAt: updated.createdAt.toISOString(),
      };
    });
  }
  async listFavoriteItemIds(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_SCREEN", user);
    if (!user?.userId) {
      return { itemIds: [] as string[] };
    }
    const rows = await this.prisma.posUserFavoriteItem.findMany({
      where: { userId: user.userId },
      select: { itemId: true },
      orderBy: { createdAt: "desc" },
    });
    return { itemIds: rows.map((row) => row.itemId) };
  }

  async setFavoriteItemIds(dto: SetPosFavoriteItemsDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_SCREEN", user);
    if (!user?.userId) {
      throw new BadRequestException("User context is required to sync favorites.");
    }
    const incoming = dto.itemIds.map((id) => id.trim()).filter(Boolean);
    const uniqueIncoming = Array.from(new Set(incoming));
    let validIds = uniqueIncoming;
    if (uniqueIncoming.length) {
      const found = await this.prisma.inventoryItem.findMany({
        where: { id: { in: uniqueIncoming }, isActive: true },
        select: { id: true },
      });
      const allowed = new Set(found.map((row) => row.id));
      validIds = uniqueIncoming.filter((id) => allowed.has(id));
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.posUserFavoriteItem.deleteMany({ where: { userId: user.userId! } });
      if (validIds.length) {
        await tx.posUserFavoriteItem.createMany({
          data: validIds.map((itemId) => ({ userId: user.userId!, itemId })),
        });
      }
    });

    return this.listFavoriteItemIds(user);
  }

  async listSessions(user?: AuthorizedUser) {
    const rows = await this.prisma.posSession.findMany({
      where: this.canReviewAllSessions(user) ? undefined : user?.userId ? { cashierUserId: user.userId } : undefined,
      include: this.posSessionInclude(),
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      take: 20,
    });

    return rows.map((row) => this.mapSession(row));
  }

  async openSession(dto: OpenPosSessionDto, user?: AuthorizedUser) {
    this.ensurePosPermission("OPEN_SESSION", user);
    if (user?.userId) {
      await this.ensureUserExists(user.userId);
    }
    await this.ensureWarehouse(dto.warehouseId);
    await this.ensureBankCashAccount(dto.cashAccountId);

    const activeSession = await this.prisma.posSession.findFirst({
      where: {
        status: PosSessionStatus.OPEN,
        cashierUserId: user?.userId ?? undefined,
      },
      select: { id: true, sessionNumber: true },
    });
    if (activeSession) {
      throw new ConflictException(
        `Cashier already has an open POS session (${activeSession.sessionNumber}).`,
      );
    }

    const sessionNumber = await this.generateSessionNumber();
    const created = await this.prisma.posSession.create({
      data: {
        sessionNumber,
        terminalName: dto.terminalName?.trim() || "POS Terminal 01",
        branchName: dto.branchName?.trim() || null,
        warehouseId: dto.warehouseId,
        cashierUserId: user?.userId ?? null,
        cashAccountId: dto.cashAccountId,
        openingCash: this.toAmount(dto.openingCash),
        expectedCash: this.toAmount(dto.openingCash),
        notes: dto.notes?.trim() || null,
      },
      include: this.posSessionInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosSession",
      entityId: created.id,
      action: AuditAction.OPEN,
      details: {
        sessionNumber: created.sessionNumber,
        warehouseId: created.warehouseId,
        cashAccountId: created.cashAccountId,
        openingCash: dto.openingCash,
      },
    });

    return this.mapSession(created);
  }

  async closeSession(id: string, dto: ClosePosSessionDto, user?: AuthorizedUser) {
    this.ensurePosPermission("CLOSE_SESSION", user);
    const session = await this.prisma.posSession.findUnique({
      where: { id },
      include: {
        salesInvoices: {
          where: {
            invoiceType: SalesInvoiceType.POS,
            posOperationalStatus: { in: [PosOperationalStatus.DRAFT, PosOperationalStatus.HELD] },
          },
          select: { id: true, reference: true },
        },
      },
    });
    if (!session) {
      throw new BadRequestException(`POS session ${id} was not found.`);
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException("Only open POS sessions can be closed.");
    }
    const allowCloseWithDrafts = this.parseBoolean(
      process.env.POS_ALLOW_CLOSE_WITH_DRAFTS,
      false,
    );
    if (!allowCloseWithDrafts && session.salesInvoices.length) {
      throw new BadRequestException(
        "Cannot close the POS session while draft or held sales still exist.",
      );
    }

    const reportBeforeClose = await this.buildSessionReport(id);
    const actualCash = this.toAmount(dto.actualCash);
    const difference = this.toAmount(
      Number(dto.actualCash) - Number(reportBeforeClose.expectedCash),
    );

    const closed = await this.prisma.posSession.update({
      where: { id },
      data: {
        actualCash,
        difference,
        status: PosSessionStatus.CLOSED,
        closedAt: new Date(),
        notes: dto.notes?.trim() || session.notes,
      },
      include: this.posSessionInclude(),
    });

    if ((await this.getPosPostingMode()) === "BY_SESSION") {
      await this.prisma.$transaction(async (tx) => {
        await this.syncSessionGroupedJournalEntry(tx, id);
      });
    }

    const report = await this.buildSessionReport(id);

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosSession",
      entityId: closed.id,
      action: AuditAction.CLOSE,
      details: {
        sessionNumber: closed.sessionNumber,
        expectedCash: reportBeforeClose.expectedCash,
        actualCash: dto.actualCash,
        difference: difference.toString(),
      },
    });

    return {
      session: this.mapSession(closed),
      report,
    };
  }

  async getSessionReport(id: string, user?: AuthorizedUser) {
    if (this.canReviewAllSessions(user)) {
      this.ensurePosPermissionCode("POS_VIEW_SESSION_REPORT", user);
    } else {
      this.ensurePosPermissionCode("POS_VIEW_OWN_SESSION_REPORT", user);
    }
    await this.ensureSessionExists(id);
    return this.buildSessionReport(id);
  }

  async listHeldSales(sessionId: string, user?: AuthorizedUser) {
    await this.ensureSessionAccess(sessionId, user);
    const rows = await this.prisma.salesInvoice.findMany({
      where: {
        invoiceType: SalesInvoiceType.POS,
        posOperationalStatus: PosOperationalStatus.HELD,
        OR: [
          { posSessionId: sessionId },
          { tableId: { not: null } }
        ]
      },
      include: this.posSaleInclude(),
      orderBy: { updatedAt: "desc" },
    });

    return this.mapPosSalesWithHeldContext(rows);
  }

  async listDraftSales(sessionId: string, user?: AuthorizedUser) {
    await this.ensureSessionAccess(sessionId, user);
    const rows = await this.prisma.salesInvoice.findMany({
      where: {
        invoiceType: SalesInvoiceType.POS,
        posOperationalStatus: PosOperationalStatus.DRAFT,
        OR: [
          { posSessionId: sessionId },
          { tableId: { not: null } }
        ]
      },
      include: this.posSaleInclude(),
      orderBy: { updatedAt: "desc" },
    });

    return this.mapPosSalesWithHeldContext(rows);
  }

  async listCompletedSales(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_COMPLETED_SALES", user);
    const canSeeAll = this.canReviewAllSessions(user);
    const rows = await this.prisma.salesInvoice.findMany({
      where: {
        invoiceType: SalesInvoiceType.POS,
        posOperationalStatus: {
          in: [PosOperationalStatus.COMPLETED, PosOperationalStatus.REFUNDED],
        },
        ...(canSeeAll ? {} : { posSession: { cashierUserId: user?.userId ?? undefined } }),
      },
      include: this.posSaleInclude(),
      orderBy: [{ posCompletedAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    return rows.map((row) => this.mapPosSale(row));
  }

  async listPendingReview(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_PENDING_ACCOUNTING", user);
    const rows = await this.prisma.salesInvoice.findMany({
      where: {
        invoiceType: SalesInvoiceType.POS,
        posOperationalStatus: PosOperationalStatus.COMPLETED,
        posAccountingStatus: {
          in: [PosAccountingStatus.PENDING_REVIEW, PosAccountingStatus.REJECTED],
        },
      },
      include: this.posSaleInclude(),
      orderBy: [{ posCompletedAt: "desc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => this.mapPosSale(row));
  }

  async holdSale(dto: HoldPosSaleDto, user?: AuthorizedUser) {
    this.ensurePosPermission("HOLD_SALE", user);
    return this.saveDraftLikeSale(dto, user, PosOperationalStatus.HELD);
  }

  async saveDraft(dto: SavePosDraftDto, user?: AuthorizedUser) {
    this.ensureCanSavePosDraft(user);
    return this.saveDraftLikeSale(dto, user, PosOperationalStatus.DRAFT);
  }

  /** Persist cart changes, then replace the kitchen ticket with the full current order. */
  async updateSaleKitchen(dto: SavePosDraftDto, user?: AuthorizedUser) {
    this.ensureCanSavePosDraft(user);

    let invoiceId = dto.invoiceId?.trim() || null;
    if (!invoiceId && dto.tableId?.trim()) {
      const table = await this.prisma.posTable.findUnique({
        where: { id: dto.tableId.trim() },
        select: { activeInvoiceId: true },
      });
      invoiceId = table?.activeInvoiceId ?? null;
    }
    if (!invoiceId) {
      throw new BadRequestException(
        "Open table order or invoiceId is required to update the kitchen ticket.",
      );
    }

    const sale = await this.saveDraftLikeSale(
      { ...dto, invoiceId },
      user,
      PosOperationalStatus.DRAFT,
      { skipKitchenSync: true },
    );

    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: sale.id },
        include: { lines: { orderBy: { lineNumber: "asc" } } },
      });
      if (!invoice) {
        return;
      }

      const kitchenLocks = await this.loadKitchenLineStatusByInvoiceLineId(tx, sale.id);
      const sentAt = new Date();
      const lineIdsToMark = invoice.lines
        .filter((line) => {
          if (!line.kitchenSentAt) {
            return true;
          }
          return !this.isInvoiceLineKitchenLocked(
            kitchenLocks,
            line.id,
            line.kitchenSentAt,
          );
        })
        .map((line) => line.id);

      if (lineIdsToMark.length) {
        await tx.salesInvoiceLine.updateMany({
          where: { id: { in: lineIdsToMark } },
          data: { kitchenSentAt: sentAt },
        });
      }

      await this.rebuildKitchenOrderFromInvoice(tx, sale.id);
    });

    const refreshed = await this.prisma.salesInvoice.findUniqueOrThrow({
      where: { id: sale.id },
      include: this.posSaleInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "KitchenOrder",
      entityId: refreshed.id,
      action: AuditAction.UPDATE,
      details: {
        message: "KOT_REBUILT_FROM_CART",
        salesInvoiceId: refreshed.id,
        reference: refreshed.reference,
      },
    });

    return this.mapPosSale(refreshed);
  }

  private async saveDraftLikeSale(
    dto: HoldPosSaleDto | SavePosDraftDto,
    user: AuthorizedUser | undefined,
    status: PosOperationalStatus,
    options?: { skipKitchenSync?: boolean },
  ) {
    const session = await this.ensureOpenSession(dto.sessionId);
    const runtimeConfig = await this.getPosRuntimeConfig();
    if (runtimeConfig.taxFreeEnabled) {
      dto.lines = dto.lines.map((l) => ({
        ...l,
        taxId: undefined,
        taxAmount: 0,
      }));
    }
    const walkInCustomer = await this.ensureWalkInCustomer();
    let customerId = walkInCustomer.id;
    if (dto.customerId?.trim()) {
      const cust = await this.prisma.customer.findUnique({
        where: { id: dto.customerId.trim(), isActive: true },
        select: { id: true },
      });
      if (!cust) {
        throw new BadRequestException(`Customer with ID ${dto.customerId} was not found or is inactive.`);
      }
      customerId = cust.id;
    }
    const resolvedLines = await this.salesReceivablesService.resolveSalesInvoiceLines(dto.lines);
    const totals = this.salesReceivablesService.computeSalesDocumentTotals(resolvedLines);
    const serviceCharge = dto.serviceChargeAmount ?? 0;
    const deliveryFee = dto.deliveryFeeAmount ?? 0;
    totals.totalAmount += serviceCharge + deliveryFee;

    const accountMappings = await this.getPosAccountMappings();
    if (dto.payments?.length) {
      await this.resolvePaymentDtoAccounts(dto.payments, accountMappings, this.prisma, session.cashAccountId);
    }
    const holdPaymentAccountMap = dto.payments?.length
      ? await this.resolvePaymentAccounts(dto.payments)
      : null;
    const isClearingOpenSale =
      Boolean(dto.invoiceId?.trim()) && resolvedLines.length === 0;
    if (totals.totalAmount <= 0 && !isClearingOpenSale) {
      throw new BadRequestException("Held POS sales require at least one billable line.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
      const existing =
        dto.invoiceId?.trim()
          ? await tx.salesInvoice.findUnique({
              where: { id: dto.invoiceId.trim() },
              include: { lines: { orderBy: { lineNumber: "asc" } } },
            })
          : null;
      let sentLineIdsToKeep: string[] = [];
      if (existing) {
        this.ensureDraftLikePosSale(existing, session.id);
        sentLineIdsToKeep = await this.applyOpenPosSaleLineChanges(
          tx,
          user,
          existing,
          dto.lines,
          resolvedLines,
        );
        await tx.posPayment.deleteMany({ where: { salesInvoiceId: existing.id } });
      }

      const resolvedOrderType = dto.orderType || (dto.tableId ? OrderType.DINE_IN : null);
      const restaurantFields = {
        orderType: resolvedOrderType,
        tableId: dto.tableId?.trim() || null,
        waiterId: dto.waiterId?.trim() || existing?.waiterId || user?.userId || null,
        serviceChargeAmount: dto.serviceChargeAmount ? this.toAmount(dto.serviceChargeAmount) : this.toAmount(0),
        deliveryFeeAmount: dto.deliveryFeeAmount ? this.toAmount(dto.deliveryFeeAmount) : this.toAmount(0),
        driverId: dto.driverId?.trim() || null,
        deliveryStatus: dto.deliveryStatus || null,
        deliveryAddress: dto.deliveryAddress?.trim() || null,
        deliveryNotes: dto.deliveryNotes?.trim() || null,
        deliveryCompanyId: dto.deliveryCompanyId?.trim() || null,
        deliveryCollectionMethod: dto.deliveryCompanyId?.trim() ? DeliveryCollectionMethod.COMPANY : null,
        deliverySettlementStatus: null,
        deliverySettledAmount: this.toAmount(0),
        originalOrderType: resolvedOrderType,
      };

      const reference = existing ? undefined : await this.generateInvoiceReference(tx);
      const invoice = existing
          ? await tx.salesInvoice.update({
              where: { id: existing.id },
              data: {
                invoiceDate,
                customerId: customerId,
                currencyCode: dto.currencyCode?.trim().toUpperCase() || "JOD",
                description: dto.description?.trim() || null,
                subtotalAmount: this.toAmount(totals.subtotalAmount),
                discountAmount: this.toAmount(totals.discountAmount),
                taxAmount: this.toAmount(totals.taxAmount),
                totalAmount: this.toAmount(totals.totalAmount),
                allocatedAmount: this.toAmount(0),
                outstandingAmount: this.toAmount(0),
                allocationStatus: AllocationStatus.UNALLOCATED,
                status: SalesInvoiceStatus.DRAFT,
                posOperationalStatus: status,
                posAccountingStatus: PosAccountingStatus.UNPOSTED,
                posCompletedAt: null,
                posReceiptNumber: null,
                posChangeAmount: null,
                posReviewNotes: null,
                posReviewedAt: null,
                posReviewedByUserId: null,
                lines: {
                  create: this.buildDraftLineCreates(
                    existing,
                    resolvedLines,
                    sentLineIdsToKeep,
                  ),
                },
                ...restaurantFields,
              },
              include: this.posSaleInclude(),
            })
          : await tx.salesInvoice.create({
              data: {
                reference: reference!,
                invoiceType: SalesInvoiceType.POS,
                status: SalesInvoiceStatus.DRAFT,
                invoiceDate,
                customerId: customerId,
                currencyCode: dto.currencyCode?.trim().toUpperCase() || "JOD",
                description: dto.description?.trim() || null,
                subtotalAmount: this.toAmount(totals.subtotalAmount),
                discountAmount: this.toAmount(totals.discountAmount),
                taxAmount: this.toAmount(totals.taxAmount),
                totalAmount: this.toAmount(totals.totalAmount),
                allocatedAmount: this.toAmount(0),
                outstandingAmount: this.toAmount(0),
                allocationStatus: AllocationStatus.UNALLOCATED,
                posOperationalStatus: status,
                posAccountingStatus: PosAccountingStatus.UNPOSTED,
                posSessionId: session.id,
                lines: {
                  create: resolvedLines.map((line, index) =>
                    this.salesReceivablesService.buildSalesInvoiceLineInput(line, index + 1),
                  ),
                },
                ...restaurantFields,
              },
              include: this.posSaleInclude(),
            });

      // Manage dine-in tables
      const isPreOrder = Boolean(dto.reservationId?.trim());
      if (existing && existing.tableId && existing.tableId !== dto.tableId) {
        await this.updateTableStatus(tx, existing.tableId, null, null);
      }
      if (dto.tableId?.trim() && !isPreOrder) {
        await this.updateTableStatus(tx, dto.tableId.trim(), invoice.id, TableStatus.OCCUPIED);
      }

      // Keep the reservation preOrderSaleId in sync when this is a pre-order save
      if (isPreOrder && dto.reservationId) {
        await this.syncReservationPreOrder(tx, dto.reservationId, invoice.id);
      }

      if (dto.payments?.length) {
        if (this.isWaiterOnlyUser(user)) {
          throw new ForbiddenException("Waiters cannot record payments on held sales.");
        }
        await tx.posPayment.createMany({
          data: dto.payments.map((payment) => ({
            salesInvoiceId: invoice.id,
            bankCashAccountId: payment.bankCashAccountId!,
            paymentMethod: this.resolvePosPaymentMethod(
              payment.paymentMethod ??
                holdPaymentAccountMap?.get(payment.bankCashAccountId!)?.type ??
                "",
            ),
            amount: this.toAmount(payment.amount),
            tenderedAmount: this.toAmount(payment.amount),
            reference: payment.reference?.trim() || null,
          })),
        });
      }

      if (existing && !options?.skipKitchenSync) {
        const kitchenOrder = await tx.kitchenOrder.findUnique({
          where: { salesInvoiceId: invoice.id },
          select: { id: true },
        });
        if (kitchenOrder) {
          await this.rebuildKitchenOrderFromInvoice(tx, invoice.id);
        }
      }

      return tx.salesInvoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: this.posSaleInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: result.id,
      action: AuditAction.UPDATE,
      details: {
        reference: result.reference,
        invoiceType: SalesInvoiceType.POS,
        posOperationalStatus: result.posOperationalStatus,
      },
    });

    return this.mapPosSale(result);
  }

  async completeSale(dto: CompletePosSaleDto, user?: AuthorizedUser) {
    this.ensurePosPermission("SELL", user);
    if (this.isWaiterOnlyUser(user)) {
      throw new ForbiddenException("Waiters cannot complete sales or take payment.");
    }
    const session = await this.ensureOpenSession(dto.sessionId);
    const runtimeConfig = await this.getPosRuntimeConfig();
    if (runtimeConfig.taxFreeEnabled) {
      dto.lines = dto.lines.map((l) => ({
        ...l,
        taxId: undefined,
        taxAmount: 0,
      }));
    }
    const walkInCustomer = await this.ensureWalkInCustomer();
    let customerId = walkInCustomer.id;
    if (dto.customerId?.trim()) {
      const cust = await this.prisma.customer.findUnique({
        where: { id: dto.customerId.trim(), isActive: true },
        select: { id: true },
      });
      if (!cust) {
        throw new BadRequestException(`Customer with ID ${dto.customerId} was not found or is inactive.`);
      }
      customerId = cust.id;
    }
    let deliveryCompany = null;
    if (dto.deliveryCompanyId?.trim()) {
      deliveryCompany = await this.prisma.deliveryCompany.findUnique({
        where: { id: dto.deliveryCompanyId.trim(), isActive: true },
      });
      if (!deliveryCompany) {
        throw new BadRequestException(
          `Delivery company with ID ${dto.deliveryCompanyId} was not found or is inactive.`,
        );
      }
    }
    const deliveryCollectionMethod =
      dto.deliveryCompanyId?.trim()
        ? DeliveryCollectionMethod.COMPANY
        : null;
    if (deliveryCollectionMethod === DeliveryCollectionMethod.COMPANY) {
      if (!deliveryCompany) {
        throw new BadRequestException("A delivery company is required when the delivery company collects payment.");
      }
      if (!deliveryCompany.receivableAccountId) {
        throw new BadRequestException(
          `No receivable account is configured for the selected delivery company (${deliveryCompany.name}).`
        );
      }
    }

    const resolvedLines = await this.salesReceivablesService.resolveSalesInvoiceLines(dto.lines);
    await this.ensurePriceChangePermission(dto.lines, user);
    this.ensureDiscountPermission(resolvedLines, user);
    const totals = this.salesReceivablesService.computeSalesDocumentTotals(resolvedLines);
    
    const serviceCharge = dto.serviceChargeAmount ?? 0;
    const deliveryFee = dto.deliveryFeeAmount ?? 0;
    totals.totalAmount += serviceCharge + deliveryFee;

    if (totals.totalAmount <= 0) {
      throw new BadRequestException("POS sale total must be greater than zero.");
    }

    const accountMappings = await this.getPosAccountMappings();

    const paymentDtos =
      deliveryCollectionMethod === DeliveryCollectionMethod.COMPANY
        ? [
            {
              amount: Number(totals.totalAmount.toFixed(2)),
              paymentMethod: PosPaymentMethod.DELIVERY,
            } as PosPaymentDto,
          ]
        : dto.payments;

    if (paymentDtos?.length) {
      await this.resolvePaymentDtoAccounts(paymentDtos, accountMappings, this.prisma, session.cashAccountId);
    }

    const bankCashIds = Array.from(
      new Set((paymentDtos ?? []).map((payment) => payment.bankCashAccountId!.trim())),
    );
    const bankCashAccounts = await this.prisma.bankCashAccount.findMany({
      where: { id: { in: bankCashIds }, isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        currencyCode: true,
        accountId: true,
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            isPosting: true,
            allowManualPosting: true,
          },
        },
      },
    });
    if (bankCashAccounts.length !== bankCashIds.length) {
      throw new BadRequestException("Every POS payment must use an active bank/cash account.");
    }
    const accountMap = new Map(bankCashAccounts.map((account) => [account.id, account]));
    const allowCreditSale =
      this.parseBoolean(process.env.POS_ALLOW_CREDIT_SALE, false) ||
      this.hasPosPermissionCode("POS_CREDIT_SALE", user);
    const allowNegativeStockIssue =
      this.parseBoolean(process.env.POS_ALLOW_NEGATIVE_STOCK, false) ||
      this.hasPosPermissionCode("POS_SELL_NEGATIVE_STOCK", user);
    const posPostingMode = runtimeConfig.postingMode;
    const cogsPostingEnabled = runtimeConfig.cogsPostingEnabled;
    const normalizedPayments = this.normalizePayments(
      paymentDtos ?? [],
      accountMap,
      totals.totalAmount,
      allowCreditSale,
    );
    if (normalizedPayments.outstandingAmount > 0 && customerId === walkInCustomer.id && !dto.deliveryCompanyId) {
      throw new BadRequestException(
        "Partial payment / credit sales require a customer other than POS walk-in.",
      );
    }
    const autoPost =
      posPostingMode === "BY_INVOICE"
        ? this.parseBoolean(process.env.POS_AUTO_POST, false)
        : false;

    const result = await this.prisma.$transaction(async (tx) => {
      const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
      const existing =
        dto.invoiceId?.trim()
          ? await tx.salesInvoice.findUnique({
              where: { id: dto.invoiceId.trim() },
              include: { lines: { orderBy: { lineNumber: "asc" } } },
            })
          : null;
      let sentLineIdsToKeep: string[] = [];
      if (existing) {
        this.ensureDraftLikePosSale(existing, session.id);
        sentLineIdsToKeep = await this.applyOpenPosSaleLineChanges(
          tx,
          user,
          existing,
          dto.lines,
          resolvedLines,
        );
        await tx.posPayment.deleteMany({ where: { salesInvoiceId: existing.id } });
        if (existing.journalEntryId) {
          await tx.journalEntryLine.deleteMany({ where: { journalEntryId: existing.journalEntryId } });
          await tx.journalEntry.delete({ where: { id: existing.journalEntryId } });
        }
      }

      const resolvedOrderType = dto.orderType || (dto.tableId ? OrderType.DINE_IN : null);
      const restaurantFields = {
        orderType: resolvedOrderType,
        tableId: dto.tableId?.trim() || null,
        waiterId: dto.waiterId?.trim() || existing?.waiterId || user?.userId || null,
        serviceChargeAmount: dto.serviceChargeAmount ? this.toAmount(dto.serviceChargeAmount) : this.toAmount(0),
        deliveryFeeAmount: dto.deliveryFeeAmount ? this.toAmount(dto.deliveryFeeAmount) : this.toAmount(0),
        driverId: dto.driverId?.trim() || null,
        deliveryStatus: dto.deliveryStatus || null,
        deliveryAddress: dto.deliveryAddress?.trim() || null,
        deliveryNotes: dto.deliveryNotes?.trim() || null,
        deliveryCompanyId: dto.deliveryCompanyId?.trim() || null,
        deliveryCollectionMethod,
        deliverySettlementStatus:
          deliveryCollectionMethod === DeliveryCollectionMethod.COMPANY
            ? DeliverySettlementStatus.PENDING
            : null,
        deliverySettledAmount: this.toAmount(0),
        originalOrderType: resolvedOrderType,
      };

      const reference = existing ? undefined : await this.generateInvoiceReference(tx);
      const receiptNumber = await this.generateReceiptNumber(tx);
      const invoice = existing
        ? await tx.salesInvoice.update({
            where: { id: existing.id },
            data: {
              invoiceDate,
              customerId: customerId,
              currencyCode: dto.currencyCode?.trim().toUpperCase() || "JOD",
              description: dto.description?.trim() || null,
              subtotalAmount: this.toAmount(totals.subtotalAmount),
              discountAmount: this.toAmount(totals.discountAmount),
              taxAmount: this.toAmount(totals.taxAmount),
              totalAmount: this.toAmount(totals.totalAmount),
              allocatedAmount: this.toAmount(normalizedPayments.totalApplied),
              outstandingAmount: this.toAmount(normalizedPayments.outstandingAmount),
              allocationStatus:
                normalizedPayments.outstandingAmount > 0
                  ? AllocationStatus.PARTIAL
                  : AllocationStatus.FULLY_ALLOCATED,
              status:
                normalizedPayments.outstandingAmount > 0
                  ? SalesInvoiceStatus.PARTIALLY_PAID
                  : SalesInvoiceStatus.FULLY_PAID,
              posOperationalStatus: PosOperationalStatus.COMPLETED,
              posAccountingStatus: autoPost
                ? PosAccountingStatus.POSTED
                : PosAccountingStatus.PENDING_REVIEW,
              posCompletedAt: new Date(),
              posReceiptNumber: receiptNumber,
              posChangeAmount: this.toAmount(normalizedPayments.changeAmount),
              lines: {
                create: this.buildDraftLineCreates(
                  existing,
                  resolvedLines,
                  sentLineIdsToKeep,
                ),
              },
              ...restaurantFields,
            },
            include: this.posSaleInclude(),
          })
        : await tx.salesInvoice.create({
            data: {
              reference: reference!,
              invoiceType: SalesInvoiceType.POS,
              status:
                normalizedPayments.outstandingAmount > 0
                  ? SalesInvoiceStatus.PARTIALLY_PAID
                  : SalesInvoiceStatus.FULLY_PAID,
              invoiceDate,
              customerId: customerId,
              currencyCode: dto.currencyCode?.trim().toUpperCase() || "JOD",
              description: dto.description?.trim() || null,
              subtotalAmount: this.toAmount(totals.subtotalAmount),
              discountAmount: this.toAmount(totals.discountAmount),
              taxAmount: this.toAmount(totals.taxAmount),
              totalAmount: this.toAmount(totals.totalAmount),
              allocatedAmount: this.toAmount(normalizedPayments.totalApplied),
              outstandingAmount: this.toAmount(normalizedPayments.outstandingAmount),
              allocationStatus:
                normalizedPayments.outstandingAmount > 0
                  ? AllocationStatus.PARTIAL
                  : AllocationStatus.FULLY_ALLOCATED,
              posOperationalStatus: PosOperationalStatus.COMPLETED,
              posAccountingStatus: autoPost
                ? PosAccountingStatus.POSTED
                : PosAccountingStatus.PENDING_REVIEW,
              posSessionId: session.id,
              posCompletedAt: new Date(),
              posReceiptNumber: receiptNumber,
              posChangeAmount: this.toAmount(normalizedPayments.changeAmount),
              lines: {
                create: resolvedLines.map((line, index) =>
                  this.salesReceivablesService.buildSalesInvoiceLineInput(line, index + 1),
                ),
              },
              ...restaurantFields,
            },
            include: this.posSaleInclude(),
          });

      // Manage dine-in tables
      if (existing && existing.tableId && existing.tableId !== dto.tableId) {
        await this.updateTableStatus(tx, existing.tableId, null, null);
      }
      if (dto.tableId?.trim()) {
        const paidTableId = dto.tableId.trim();
        const isDineIn =
          dto.orderType === OrderType.DINE_IN ||
          existing?.orderType === OrderType.DINE_IN ||
          invoice.orderType === OrderType.DINE_IN;
        if (isDineIn) {
          await tx.posTable.update({
            where: { id: paidTableId },
            data: {
              activeInvoiceId: null,
              status: TableStatus.CLEANING,
            },
          });
        } else {
          await this.updateTableStatus(tx, paidTableId, null, null);
        }
      }

      if (existing) {
        const kitchenOrder = await tx.kitchenOrder.findUnique({
          where: { salesInvoiceId: invoice.id },
          select: { id: true },
        });
        if (kitchenOrder) {
          await this.rebuildKitchenOrderFromInvoice(tx, invoice.id);
        }
      }

      const unsentAtComplete = await tx.salesInvoiceLine.findMany({
        where: { salesInvoiceId: invoice.id, kitchenSentAt: null },
        orderBy: { lineNumber: "asc" },
      });
      if (unsentAtComplete.length && dto.orderType) {
        const sentAt = new Date();
        await tx.salesInvoiceLine.updateMany({
          where: { id: { in: unsentAtComplete.map((line) => line.id) } },
          data: { kitchenSentAt: sentAt },
        });
        const invoiceForKot = await tx.salesInvoice.findUniqueOrThrow({
          where: { id: invoice.id },
          include: { lines: true },
        });
        await this.appendKitchenOrderItems(tx, invoiceForKot, unsentAtComplete);
      }

      await tx.posPayment.createMany({
        data: normalizedPayments.payments.map((payment) => ({
          salesInvoiceId: invoice.id,
          bankCashAccountId: payment.bankCashAccountId!,
          paymentMethod: payment.paymentMethod as PosPaymentMethod,
          amount: this.toAmount(payment.appliedAmount),
          tenderedAmount: this.toAmount(payment.amount),
          reference: payment.reference?.trim() || null,
          deliveryCompanyId:
            deliveryCollectionMethod === DeliveryCollectionMethod.COMPANY
              ? invoice.deliveryCompanyId ?? null
              : null,
        })),
      });

      const invoiceWithDetails = await tx.salesInvoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: {
          customer: { include: { receivableAccount: true } },
          lines: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  trackInventory: true,
                  inventoryAccountId: true,
                  cogsAccountId: true,
                  isActive: true,
                },
              },
            },
            orderBy: { lineNumber: "asc" },
          },
          posPayments: {
            include: { bankCashAccount: { include: { account: true } } },
          },
        },
      });

      const inventoryPosting = await this.salesReceivablesService.createSalesInvoiceInventoryEffects(
        tx,
        {
          id: invoiceWithDetails.id,
          reference: invoiceWithDetails.reference,
          invoiceDate: invoiceWithDetails.invoiceDate,
          description: invoiceWithDetails.description,
          lines: invoiceWithDetails.lines.map((line) => ({
            id: line.id,
            lineNumber: line.lineNumber,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            description: line.description,
            item: line.item,
          })),
        },
        { allowNegativeStockIssue },
      );

      if (posPostingMode === "BY_INVOICE") {
        const description = invoiceWithDetails.description
          ? `${invoiceWithDetails.reference} - ${invoiceWithDetails.description}`
          : invoiceWithDetails.reference;

        const { creditLines, debitLines } = await this.buildSaleAccountingCredits(
          tx,
          {
            id: invoiceWithDetails.id,
            reference: invoiceWithDetails.reference,
            serviceChargeAmount: invoiceWithDetails.serviceChargeAmount,
            deliveryFeeAmount: invoiceWithDetails.deliveryFeeAmount,
            lines: invoiceWithDetails.lines.map((line) => ({
              lineNumber: line.lineNumber,
              description: line.description,
              revenueAccountId: line.revenueAccountId,
              taxId: line.taxId,
              taxAmount: line.taxAmount,
              lineSubtotalAmount: line.lineSubtotalAmount,
              discountAmount: line.discountAmount,
            })),
          },
          accountMappings,
          description,
        );

        let receivableAccountId = invoiceWithDetails.customer.receivableAccountId;
        if (invoiceWithDetails.deliveryCompanyId) {
          const company = await tx.deliveryCompany.findUnique({
            where: { id: invoiceWithDetails.deliveryCompanyId },
            select: { receivableAccountId: true },
          });
          if (company?.receivableAccountId) {
            receivableAccountId = company.receivableAccountId;
          }
        }

        const paymentsWithReceivables = normalizedPayments.payments.map((p) => {
          if (
            p.paymentMethod === PosPaymentMethod.DELIVERY &&
            invoiceWithDetails.deliveryCompanyId
          ) {
            return {
              ...p,
              accountId: receivableAccountId,
            };
          }
          return p;
        });

        const paymentDebits = this.aggregatePaymentDebits(paymentsWithReceivables, description);
        const receivableDebits =
          normalizedPayments.outstandingAmount > 0
            ? [
                {
                  accountId: receivableAccountId,
                  description: `${description} credit balance`,
                  debitAmount: normalizedPayments.outstandingAmount,
                  creditAmount: 0,
                },
              ]
            : [];
        const journalLines = [
          ...paymentDebits,
          ...receivableDebits,
          ...debitLines,
          ...creditLines,
          ...(cogsPostingEnabled ? inventoryPosting.accountingLines : []),
        ];
        this.salesReceivablesService.ensureBalancedJournalLines(journalLines);

        const journal = await this.journalEntriesService.create(
          {
            entryDate: invoiceWithDetails.invoiceDate.toISOString(),
            description,
            sourceType: "SalesInvoice",
            sourceId: invoiceWithDetails.id,
            sourceNumber: invoiceWithDetails.reference,
            lines: journalLines,
          },
          { tx },
        );

        let postedAt: Date | null = null;
        if (autoPost) {
          const posted = await this.postingService.post(journal.id, tx as never);
          postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();
        }

        await tx.salesInvoice.update({
          where: { id: invoiceWithDetails.id },
          data: {
            journalEntryId: journal.id,
            postedAt,
          },
        });
      } else {
        await this.syncSessionGroupedJournalEntry(tx, session.id);
      }

      await tx.posSession.update({
        where: { id: session.id },
        data: {
          expectedCash: {
            increment: this.toAmount(normalizedPayments.cashAppliedAmount),
          },
        },
      });

      return tx.salesInvoice.findUniqueOrThrow({
        where: { id: invoiceWithDetails.id },
        include: this.posSaleInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: result.id,
      action: AuditAction.POST,
      details: {
        reference: result.reference,
        invoiceType: SalesInvoiceType.POS,
        posOperationalStatus: result.posOperationalStatus,
        posAccountingStatus: result.posAccountingStatus,
      },
    });

    return {
      sale: this.mapPosSale(result),
      receipt: this.mapReceipt(result),
    };
  }

  async voidSale(id: string, dto: VoidPosSaleDto, user?: AuthorizedUser) {
    this.ensurePosPermission("VOID_SALE", user);
    const sale = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: this.posSaleInclude(),
    });
    if (!sale || sale.invoiceType !== SalesInvoiceType.POS) {
      throw new BadRequestException(`POS sale ${id} was not found.`);
    }
    if (
      sale.posOperationalStatus !== PosOperationalStatus.DRAFT &&
      sale.posOperationalStatus !== PosOperationalStatus.HELD
    ) {
      throw new BadRequestException("Only draft or held POS sales can be voided.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.update({
        where: { id },
        data: {
          status: SalesInvoiceStatus.CANCELLED,
          posOperationalStatus: PosOperationalStatus.VOIDED,
          posVoidedAt: new Date(),
          posVoidReason: dto.reason?.trim() || null,
        },
        include: this.posSaleInclude(),
      });

      if (sale.tableId) {
        await this.updateTableStatus(tx, sale.tableId, null, null);
      }

      return invoice;
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: updated.id,
      action: AuditAction.DELETE,
      details: {
        reference: updated.reference,
        invoiceType: SalesInvoiceType.POS,
        reason: dto.reason?.trim() || null,
      },
    });

    return this.mapPosSale(updated);
  }

  async approveAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_APPROVE_ACCOUNTING", user);
    const actorUserId = await this.resolveExistingUserId(user?.userId);
    if ((await this.getPosPostingMode()) === "BY_SESSION") {
      throw new BadRequestException("POS accounting posting is configured by session. Approve the session instead of a single invoice.");
    }
    const sale = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        journalEntry: {
          select: { id: true, status: true, postedAt: true },
        },
      },
    });
    if (!sale || sale.invoiceType !== SalesInvoiceType.POS) {
      throw new BadRequestException(`POS sale ${id} was not found.`);
    }

    if (sale.posSessionId) {
      const session = await this.prisma.posSession.findUnique({
        where: { id: sale.posSessionId },
        select: { difference: true },
      });
      if (session) {
        const diffVal = Number(session.difference || 0);
        if (diffVal !== 0) {
          throw new BadRequestException("لا يمكن ترحيل القيود المحاسبية لهذه الوردية لوجود فارق كاش لم يتم قبوله بعد.");
        }
      }
    }

    if (sale.posOperationalStatus !== PosOperationalStatus.COMPLETED) {
      throw new BadRequestException("Only completed POS sales can be posted accounting-wise.");
    }
    if (!sale.journalEntryId) {
      throw new BadRequestException("POS sale does not have a draft journal entry to review.");
    }
    if (sale.posAccountingStatus === PosAccountingStatus.POSTED) {
      throw new BadRequestException("POS sale is already posted.");
    }

    const posted = await this.postingService.post(sale.journalEntryId);
    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        posAccountingStatus: PosAccountingStatus.POSTED,
        posReviewedAt: new Date(),
        posReviewedByUserId: actorUserId,
        posReviewNotes: dto.notes?.trim() || null,
        postedAt: posted.postedAt ? new Date(posted.postedAt) : new Date(),
      },
      include: this.posSaleInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: updated.id,
      action: AuditAction.POST,
      details: {
        reference: updated.reference,
        reviewDecision: "APPROVED",
        notes: dto.notes?.trim() || null,
      },
    });

    return this.mapPosSale(updated);
  }

  async approveSessionAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_POST_BY_SESSION", user);
    const actorUserId = await this.resolveExistingUserId(user?.userId);
    const session = await this.prisma.posSession.findUnique({
      where: { id },
      select: {
        id: true,
        sessionNumber: true,
        difference: true,
        expectedCash: true,
        actualCash: true,
        status: true,
      },
    });
    if (!session) {
      throw new BadRequestException(`POS session ${id} was not found.`);
    }

    const diffVal = Number(session.difference || 0);

    // If there is a cash difference, require an explicit decision.
    if (diffVal !== 0) {
      if (!dto.decision) {
        throw new BadRequestException("يجب مراجعة فارق الكاش أولاً واتخاذ قرار بشأنه.");
      }

      if (dto.decision === "ACCEPT") {
        const absDiff = Math.abs(diffVal);
        const tolerance = Number(process.env.POS_CASH_TOLERANCE) || 10.0;
        const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
        
        if (absDiff > tolerance && !isManagerOrAdmin) {
          throw new ForbiddenException("فرق الصندوق أعلى من الحد المسموح ويتطلب موافقة مدير.");
        }

        if (!dto.reason || !dto.reason.trim()) {
          throw new BadRequestException("يجب إدخال سبب قبول فارق الكاش.");
        }

        await this.prisma.posSession.update({
          where: { id },
          data: {
            notes: dto.reason.trim(),
          },
        });

        await this.auditService.log({
          userId: user?.userId,
          entity: "PosSession",
          entityId: session.id,
          action: AuditAction.UPDATE,
          details: {
            sessionId: session.id,
            sessionNumber: session.sessionNumber,
            expectedCash: session.expectedCash,
            actualCash: session.actualCash,
            cashDifference: session.difference,
            decision: dto.decision,
            reason: dto.reason.trim(),
            decidedBy: user?.username,
            decidedAt: new Date(),
          },
        });

        return {
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          approvedCount: 0,
          sales: [],
        };
      } else if (dto.decision === "CORRECTION") {
        await this.prisma.posSession.update({
          where: { id },
          data: {
            notes: dto.reason?.trim() || null,
          },
        });
        
        await this.auditService.log({
          userId: user?.userId,
          entity: "PosSession",
          entityId: session.id,
          action: AuditAction.UPDATE,
          details: {
            sessionId: session.id,
            sessionNumber: session.sessionNumber,
            expectedCash: session.expectedCash,
            actualCash: session.actualCash,
            cashDifference: session.difference,
            decision: dto.decision,
            reason: dto.reason?.trim() || null,
            decidedBy: user?.username,
            decidedAt: new Date(),
          },
        });

        return {
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          approvedCount: 0,
          sales: [],
        };
      } else if (dto.decision === "REJECT") {
        if (!dto.reason || !dto.reason.trim()) {
          throw new BadRequestException("يجب إدخال سبب رفض الوردية.");
        }
        await this.prisma.posSession.update({
          where: { id },
          data: {
            notes: dto.reason.trim(),
          },
        });

        await this.auditService.log({
          userId: user?.userId,
          entity: "PosSession",
          entityId: session.id,
          action: AuditAction.UPDATE,
          details: {
            sessionId: session.id,
            sessionNumber: session.sessionNumber,
            expectedCash: session.expectedCash,
            actualCash: session.actualCash,
            cashDifference: session.difference,
            decision: dto.decision,
            reason: dto.reason.trim(),
            decidedBy: user?.username,
            decidedAt: new Date(),
          },
        });

        return {
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          approvedCount: 0,
          sales: [],
        };
      } else if (dto.decision === "REOPEN") {
        await this.prisma.posSession.update({
          where: { id },
          data: {
            status: "OPEN",
            closedAt: null,
            actualCash: null,
            difference: null,
            notes: null,
          },
        });

        await this.auditService.log({
          userId: user?.userId,
          entity: "PosSession",
          entityId: session.id,
          action: AuditAction.UPDATE,
          details: {
            sessionId: session.id,
            sessionNumber: session.sessionNumber,
            expectedCash: session.expectedCash,
            actualCash: session.actualCash,
            cashDifference: session.difference,
            decision: dto.decision,
            reason: dto.reason?.trim() || null,
            decidedBy: user?.username,
            decidedAt: new Date(),
          },
        });

        return {
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          approvedCount: 0,
          sales: [],
          status: "OPEN",
        };
      } else {
        throw new BadRequestException("القرار غير صالح.");
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const sales = await tx.salesInvoice.findMany({
        where: {
          invoiceType: SalesInvoiceType.POS,
          posSessionId: id,
          posOperationalStatus: PosOperationalStatus.COMPLETED,
          posAccountingStatus: {
            in: [
              PosAccountingStatus.PENDING_REVIEW,
              PosAccountingStatus.REJECTED,
              PosAccountingStatus.UNPOSTED,
            ],
          },
        },
        select: {
          id: true,
          reference: true,
        },
        orderBy: [{ posCompletedAt: "asc" }, { createdAt: "asc" }],
      });
      if (!sales.length) {
        throw new BadRequestException(
          "No POS sales in this session are awaiting accounting approval.",
        );
      }

      let groupedPostedAt = new Date();
      if ((await this.getPosPostingMode(tx)) === "BY_SESSION") {
        const existingPostedSessionJournal = await tx.journalEntry.findFirst({
          where: {
            sourceType: "PosSession",
            sourceId: id,
            status: JournalEntryStatus.POSTED,
          },
          select: { id: true },
        });
        if (existingPostedSessionJournal) {
          throw new BadRequestException("This POS session has already been posted.");
        }

        const draftJournal = await this.syncSessionGroupedJournalEntry(tx, id);
        if (!draftJournal) {
          throw new BadRequestException(
            "No grouped POS session journal entry could be prepared for posting.",
          );
        }

        const posted = await this.postingService.post(draftJournal.id, tx as never);
        groupedPostedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();
      } else {
        const salesWithJournals = await tx.salesInvoice.findMany({
          where: {
            id: { in: sales.map((sale) => sale.id) },
          },
          select: {
            id: true,
            journalEntryId: true,
          },
        });

        for (const sale of salesWithJournals) {
          if (!sale.journalEntryId) {
            throw new BadRequestException(
              `POS sale ${sale.id} does not have a draft journal entry to review.`,
            );
          }
          await this.postingService.post(sale.journalEntryId, tx as never);
        }
      }

      for (const sale of sales) {
        await tx.salesInvoice.update({
          where: { id: sale.id },
          data: {
            posAccountingStatus: PosAccountingStatus.POSTED,
            posReviewedAt: new Date(),
            posReviewedByUserId: actorUserId,
            posReviewNotes: dto.notes?.trim() || null,
            postedAt: groupedPostedAt,
          },
        });
      }

      return tx.salesInvoice.findMany({
        where: {
          id: { in: sales.map((sale) => sale.id) },
        },
        include: this.posSaleInclude(),
        orderBy: [{ posCompletedAt: "asc" }, { createdAt: "asc" }],
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosSession",
      entityId: session.id,
      action: AuditAction.POST,
      details: {
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        approvedSalesCount: result.length,
        notes: dto.notes?.trim() || null,
        expectedCash: session.expectedCash,
        actualCash: session.actualCash,
        cashDifference: session.difference,
        decision: dto.decision || "NORMAL_APPROVE",
        reason: dto.reason || null,
        decidedBy: user?.username,
        decidedAt: new Date(),
      },
    });

    return {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      approvedCount: result.length,
      sales: result.map((row) => this.mapPosSale(row)),
    };
  }

  async rejectSessionAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_REJECT_ACCOUNTING", user);
    const actorUserId = await this.resolveExistingUserId(user?.userId);
    const session = await this.prisma.posSession.findUnique({
      where: { id },
      select: { id: true, sessionNumber: true },
    });
    if (!session) {
      throw new BadRequestException(`POS session ${id} was not found.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const sales = await tx.salesInvoice.findMany({
        where: {
          invoiceType: SalesInvoiceType.POS,
          posSessionId: id,
          posOperationalStatus: PosOperationalStatus.COMPLETED,
          posAccountingStatus: {
            in: [PosAccountingStatus.PENDING_REVIEW, PosAccountingStatus.UNPOSTED],
          },
        },
        select: {
          id: true,
          reference: true,
        },
      });

      if (!sales.length) {
        throw new BadRequestException(
          "No POS sales in this session are awaiting accounting review.",
        );
      }

      for (const sale of sales) {
        await tx.salesInvoice.update({
          where: { id: sale.id },
          data: {
            posAccountingStatus: PosAccountingStatus.REJECTED,
            posReviewedAt: new Date(),
            posReviewedByUserId: actorUserId,
            posReviewNotes: dto.notes?.trim() || null,
          },
        });
      }

      return tx.salesInvoice.findMany({
        where: {
          id: { in: sales.map((sale) => sale.id) },
        },
        include: this.posSaleInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosSession",
      entityId: session.id,
      action: AuditAction.UPDATE,
      details: {
        sessionNumber: session.sessionNumber,
        rejectedSalesCount: result.length,
        notes: dto.notes?.trim() || null,
      },
    });

    return {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      rejectedCount: result.length,
      sales: result.map((row) => this.mapPosSale(row)),
    };
  }

  async rejectAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_REJECT_ACCOUNTING", user);
    const actorUserId = await this.resolveExistingUserId(user?.userId);
    if ((await this.getPosPostingMode()) === "BY_SESSION") {
      throw new BadRequestException("POS accounting posting is configured by session. Review the session instead of a single invoice.");
    }
    const sale = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: this.posSaleInclude(),
    });
    if (!sale || sale.invoiceType !== SalesInvoiceType.POS) {
      throw new BadRequestException(`POS sale ${id} was not found.`);
    }
    if (sale.posOperationalStatus !== PosOperationalStatus.COMPLETED) {
      throw new BadRequestException("Only completed POS sales can be rejected accounting-wise.");
    }
    if (sale.posAccountingStatus === PosAccountingStatus.POSTED) {
      throw new BadRequestException("Posted POS sales cannot be rejected without reversal.");
    }

    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        posAccountingStatus: PosAccountingStatus.REJECTED,
        posReviewedAt: new Date(),
        posReviewedByUserId: actorUserId,
        posReviewNotes: dto.notes?.trim() || null,
      },
      include: this.posSaleInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: updated.id,
      action: AuditAction.UPDATE,
      details: {
        reference: updated.reference,
        reviewDecision: "REJECTED",
        notes: dto.notes?.trim() || null,
      },
    });

    return this.mapPosSale(updated);
  }

  async reverseAccounting(id: string, dto: PosReverseAccountingDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_APPROVE_ACCOUNTING", user);
    const actorUserId = await this.resolveExistingUserId(user?.userId);
    if ((await this.getPosPostingMode()) === "BY_SESSION") {
      throw new BadRequestException("POS accounting reversal is configured by session. Reverse the grouped session posting instead of a single invoice.");
    }
    const sale = await this.prisma.salesInvoice.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        invoiceType: true,
        posOperationalStatus: true,
        posAccountingStatus: true,
        journalEntryId: true,
      },
    });
    if (!sale || sale.invoiceType !== SalesInvoiceType.POS) {
      throw new BadRequestException(`POS sale ${id} was not found.`);
    }
    if (sale.posOperationalStatus !== PosOperationalStatus.COMPLETED) {
      throw new BadRequestException("Only completed POS sales can be reversed.");
    }
    if (!sale.journalEntryId || sale.posAccountingStatus !== PosAccountingStatus.POSTED) {
      throw new BadRequestException("Only accounting-posted POS sales can be reversed.");
    }

    await this.reversalService.reverse(sale.journalEntryId, {
      reversalDate: dto.reversalDate,
      description:
        dto.description?.trim() || `POS reversal for ${sale.reference}`,
    });

    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        posAccountingStatus: PosAccountingStatus.REVERSED,
        posReviewedAt: new Date(),
        posReviewedByUserId: actorUserId,
        posReviewNotes: dto.description?.trim() || "Accounting reversal created",
      },
      include: this.posSaleInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: {
        reference: updated.reference,
        reviewDecision: "REVERSED",
      },
    });

    return this.mapPosSale(updated);
  }

  async reprintReceipt(id: string, user?: AuthorizedUser) {
    this.ensurePosPermission("REPRINT_RECEIPT", user);
    const sale = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: this.posSaleInclude(),
    });
    if (!sale || sale.invoiceType !== SalesInvoiceType.POS) {
      throw new BadRequestException(`POS sale ${id} was not found.`);
    }
    if (sale.posOperationalStatus !== PosOperationalStatus.COMPLETED) {
      throw new BadRequestException("Only completed POS sales can be reprinted.");
    }

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: sale.id,
      action: AuditAction.VIEW,
      details: {
        reference: sale.reference,
        event: "REPRINT_RECEIPT",
      },
    });

    return {
      sale: this.mapPosSale(sale),
      receipt: this.mapReceipt(sale),
    };
  }

  async printSessionRollReport(
    sessionId: string,
    printType: "SESSION_ROLL_REPORT" | "INVOICE_LIST_ROLL" | "ALL_RECEIPTS_ROLL",
    user?: AuthorizedUser,
  ) {
    this.ensurePosPermissionCode("POS_VIEW_SESSION_REPORT", user);
    const session = await this.prisma.posSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        sessionNumber: true,
        reviewStatus: true,
      },
    });
    if (!session) {
      throw new BadRequestException(`POS session ${sessionId} was not found.`);
    }

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosSession",
      entityId: session.id,
      action: AuditAction.VIEW,
      details: {
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        printType,
        printedBy: user?.username,
        printedAt: new Date(),
        event: "PRINT_ROLL_REPORT",
      },
    });

    return {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      printType,
      printedBy: user?.username ?? null,
      printedAt: new Date().toISOString(),
    };
  }

  async listReturns(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_COMPLETED_SALES", user);
    const rows = await this.prisma.posReturn.findMany({
      include: this.posReturnInclude(),
      orderBy: [{ returnDate: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.mapPosReturn(row));
  }

  async createReturn(dto: CreatePosReturnDto, user?: AuthorizedUser) {
    this.ensurePosPermission("RETURN_SALE", user);
    this.ensurePosPermission("REFUND", user);
    const autoPost = this.parseBoolean(process.env.POS_AUTO_POST, false);

    const result = await this.prisma.$transaction(async (tx) => {
      const originalSale = await tx.salesInvoice.findUnique({
        where: { id: dto.salesInvoiceId },
        include: {
          customer: { select: { id: true, receivableAccountId: true } },
          posSession: { select: { id: true } },
          lines: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  trackInventory: true,
                  inventoryAccountId: true,
                  cogsAccountId: true,
                  salesReturnAccountId: true,
                },
              },
              warehouse: { select: { id: true, code: true, name: true } },
              tax: { select: { id: true, taxCode: true, taxAccountId: true } },
            },
            orderBy: { lineNumber: "asc" },
          },
        },
      });
      if (!originalSale || originalSale.invoiceType !== SalesInvoiceType.POS) {
        throw new BadRequestException("Original POS sale was not found.");
      }
      if (originalSale.posOperationalStatus !== PosOperationalStatus.COMPLETED) {
        throw new BadRequestException("Only completed POS sales can be returned.");
      }

      const sessionId = dto.sessionId?.trim() || originalSale.posSessionId || null;
      if (sessionId) {
        await this.ensureSessionExists(sessionId);
      }

      const returnLines = await this.buildPosReturnLines(tx, originalSale, dto.lines);
      const totals = this.computePosReturnTotals(returnLines);
      if (totals.totalAmount <= 0) {
        throw new BadRequestException("POS returns require at least one valid return line.");
      }

      const normalizedRefunds = await this.normalizeRefundPayments(
        tx,
        dto.payments,
        totals.totalAmount,
        originalSale.customer.receivableAccountId,
      );

      const reference = await this.generateReturnReference(tx);
      const posReturn = await tx.posReturn.create({
        data: {
          reference,
          returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
          salesInvoiceId: originalSale.id,
          posSessionId: sessionId,
          customerId: originalSale.customerId,
          currencyCode: originalSale.currencyCode,
          reason: dto.reason?.trim() || null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          discountAmount: this.toAmount(totals.discountAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          refundAmount: this.toAmount(totals.totalAmount),
          accountingStatus: autoPost
            ? PosAccountingStatus.POSTED
            : PosAccountingStatus.PENDING_REVIEW,
          createdByUserId: user?.userId ?? null,
          lines: {
            create: returnLines.map((line, index) => ({
              lineNumber: index + 1,
              salesInvoiceLineId: line.salesInvoiceLineId,
              itemId: line.itemId,
              warehouseId: line.warehouseId,
              itemName: line.itemName,
              description: line.description,
              quantity: this.toQuantity(line.quantity),
              unitPrice: this.toAmount(line.unitPrice),
              discountAmount: this.toAmount(line.discountAmount),
              taxId: line.taxId,
              taxAmount: this.toAmount(line.taxAmount),
              lineSubtotalAmount: this.toAmount(line.lineSubtotalAmount),
              lineAmount: this.toAmount(line.lineAmount),
              revenueAccountId: line.revenueAccountId,
              inventoryAccountId: line.inventoryAccountId,
              cogsAccountId: line.cogsAccountId,
              unitCost: line.unitCost === null ? null : this.toQuantity(line.unitCost),
              totalCost: line.totalCost === null ? null : this.toAmount(line.totalCost),
            })),
          },
          payments: {
            create: normalizedRefunds.map((payment) => ({
              refundMethod: payment.refundMethod,
              bankCashAccountId: payment.bankCashAccountId,
              amount: this.toAmount(payment.amount),
              reference: payment.reference?.trim() || null,
            })),
          },
        },
        include: this.posReturnInclude(),
      });

      await this.applyPosReturnInventoryEffects(tx, posReturn.id, posReturn.reference, posReturn.returnDate);
      const journalLines = await this.buildPosReturnJournalLines(tx, posReturn.id);
      this.salesReceivablesService.ensureBalancedJournalLines(journalLines);

      const journal = await this.journalEntriesService.create(
        {
          entryDate: posReturn.returnDate.toISOString(),
          description: posReturn.reason
            ? `${posReturn.reference} - ${posReturn.reason}`
            : posReturn.reference,
          lines: journalLines,
        },
        { tx },
      );

      let postedAt: Date | null = null;
      if (autoPost) {
        const posted = await this.postingService.post(journal.id, tx as never);
        postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();
      }

      await tx.posReturn.update({
        where: { id: posReturn.id },
        data: {
          journalEntryId: journal.id,
          postedAt,
        },
      });

      const cashRefundAmount = normalizedRefunds
        .filter((payment) => payment.refundMethod === PosRefundMethod.CASH)
        .reduce((sum, payment) => sum + payment.amount, 0);
      if (sessionId && cashRefundAmount > 0) {
        await tx.posSession.update({
          where: { id: sessionId },
          data: {
            expectedCash: {
              decrement: this.toAmount(cashRefundAmount),
            },
          },
        });
      }

      await this.refreshOriginalSaleReturnStatus(tx, originalSale.id);

      return tx.posReturn.findUniqueOrThrow({
        where: { id: posReturn.id },
        include: this.posReturnInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosReturn",
      entityId: result.id,
      action: AuditAction.CREATE,
      details: {
        reference: result.reference,
        salesInvoiceId: result.salesInvoiceId,
        accountingStatus: result.accountingStatus,
      },
    });

    return this.mapPosReturn(result);
  }

  async approveReturnAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_APPROVE_ACCOUNTING", user);
    const actorUserId = await this.resolveExistingUserId(user?.userId);
    const posReturn = await this.prisma.posReturn.findUnique({
      where: { id },
      include: {
        journalEntry: { select: { id: true, status: true, postedAt: true } },
      },
    });
    if (!posReturn) {
      throw new BadRequestException(`POS return ${id} was not found.`);
    }
    if (!posReturn.journalEntryId) {
      throw new BadRequestException("POS return does not have a draft journal entry to review.");
    }
    if (posReturn.accountingStatus === PosAccountingStatus.POSTED) {
      throw new BadRequestException("POS return is already posted.");
    }

    const posted = await this.postingService.post(posReturn.journalEntryId);
    const updated = await this.prisma.posReturn.update({
      where: { id },
      data: {
        status: PosReturnStatus.APPROVED,
        accountingStatus: PosAccountingStatus.POSTED,
        reviewedAt: new Date(),
        reviewedByUserId: actorUserId,
        reviewNotes: dto.notes?.trim() || null,
        postedAt: posted.postedAt ? new Date(posted.postedAt) : new Date(),
      },
      include: this.posReturnInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosReturn",
      entityId: updated.id,
      action: AuditAction.POST,
      details: {
        reference: updated.reference,
        reviewDecision: "APPROVED",
      },
    });

    return this.mapPosReturn(updated);
  }

  async rejectReturnAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_REJECT_ACCOUNTING", user);
    const actorUserId = await this.resolveExistingUserId(user?.userId);
    const posReturn = await this.prisma.posReturn.findUnique({
      where: { id },
      include: this.posReturnInclude(),
    });
    if (!posReturn) {
      throw new BadRequestException(`POS return ${id} was not found.`);
    }
    if (posReturn.accountingStatus === PosAccountingStatus.POSTED) {
      throw new BadRequestException("Posted POS returns cannot be rejected without reversal.");
    }

    const updated = await this.prisma.posReturn.update({
      where: { id },
      data: {
        status: PosReturnStatus.REJECTED,
        accountingStatus: PosAccountingStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedByUserId: actorUserId,
        reviewNotes: dto.notes?.trim() || null,
      },
      include: this.posReturnInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosReturn",
      entityId: updated.id,
      action: AuditAction.UPDATE,
      details: {
        reference: updated.reference,
        reviewDecision: "REJECTED",
      },
    });

    return this.mapPosReturn(updated);
  }

  async reverseReturnAccounting(id: string, dto: PosReverseAccountingDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_APPROVE_ACCOUNTING", user);
    const actorUserId = await this.resolveExistingUserId(user?.userId);
    const posReturn = await this.prisma.posReturn.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        accountingStatus: true,
        journalEntryId: true,
      },
    });
    if (!posReturn) {
      throw new BadRequestException(`POS return ${id} was not found.`);
    }
    if (!posReturn.journalEntryId || posReturn.accountingStatus !== PosAccountingStatus.POSTED) {
      throw new BadRequestException("Only accounting-posted POS returns can be reversed.");
    }

    await this.reversalService.reverse(posReturn.journalEntryId, {
      reversalDate: dto.reversalDate,
      description:
        dto.description?.trim() || `POS return reversal for ${posReturn.reference}`,
    });

    const updated = await this.prisma.posReturn.update({
      where: { id },
      data: {
        status: PosReturnStatus.REVERSED,
        accountingStatus: PosAccountingStatus.REVERSED,
        reversedAt: new Date(),
        reviewedAt: new Date(),
        reviewedByUserId: actorUserId,
        reviewNotes: dto.description?.trim() || "Accounting reversal created",
      },
      include: this.posReturnInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosReturn",
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: {
        reference: updated.reference,
      },
    });

    return this.mapPosReturn(updated);
  }

  async getReportsOverview(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const [salesByPaymentMethod, salesByCashier, salesByBranch, pendingReview, taxSummary] =
      await Promise.all([
        this.getSalesByPaymentMethodReport(user),
        this.getSalesByCashierReport(user),
        this.getSalesByBranchReport(user),
        this.listPendingReview(user),
        this.getTaxSummaryReport(user),
      ]);

    return {
      salesByPaymentMethod,
      salesByCashier,
      salesByBranch,
      pendingReviewCount: pendingReview.length,
      taxSummary,
    };
  }

  async getSalesByPaymentMethodReport(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const sales = await this.loadCompletedPosSalesForReports(user);
    const totals = new Map<string, { method: string; salesAmount: number; invoiceCount: number }>();
    for (const sale of sales) {
      for (const payment of sale.posPayments) {
        const key =
          payment.paymentMethod === PosPaymentMethod.DELIVERY || payment.deliveryCompanyId
            ? sale.deliveryCompany?.arabicName || sale.deliveryCompany?.name || PosPaymentMethod.DELIVERY
            : payment.paymentMethod;
        const current = totals.get(key) ?? { method: key, salesAmount: 0, invoiceCount: 0 };
        current.salesAmount += Number(payment.amount);
        current.invoiceCount += 1;
        totals.set(key, current);
      }
    }
    return Array.from(totals.values()).map((row) => ({
      ...row,
      salesAmount: row.salesAmount.toFixed(2),
    }));
  }

  async getSalesByCashierReport(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const sales = await this.loadCompletedPosSalesForReports(user);
    const totals = new Map<string, { cashierId: string | null; cashierName: string; salesAmount: number; invoiceCount: number }>();
    for (const sale of sales) {
      const key = sale.posSession?.cashierUser?.id ?? "unassigned";
      const current = totals.get(key) ?? {
        cashierId: sale.posSession?.cashierUser?.id ?? null,
        cashierName: sale.posSession?.cashierUser?.name || sale.posSession?.cashierUser?.email || "Unassigned",
        salesAmount: 0,
        invoiceCount: 0,
      };
      current.salesAmount += Number(sale.totalAmount);
      current.invoiceCount += 1;
      totals.set(key, current);
    }
    return Array.from(totals.values()).map((row) => ({
      ...row,
      salesAmount: row.salesAmount.toFixed(2),
    }));
  }

  async getSalesByBranchReport(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const sales = await this.loadCompletedPosSalesForReports(user);
    const totals = new Map<string, { branchName: string; salesAmount: number; invoiceCount: number }>();
    for (const sale of sales) {
      const key = sale.posSession?.branchName ?? "Unassigned";
      const current = totals.get(key) ?? { branchName: key, salesAmount: 0, invoiceCount: 0 };
      current.salesAmount += Number(sale.totalAmount);
      current.invoiceCount += 1;
      totals.set(key, current);
    }
    return Array.from(totals.values()).map((row) => ({
      ...row,
      salesAmount: row.salesAmount.toFixed(2),
    }));
  }

  async getSalesByItemReport(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const sales = await this.loadCompletedPosSalesForReports(user);
    const totals = new Map<string, { itemId: string | null; itemName: string; quantity: number; salesAmount: number; taxAmount: number }>();
    for (const sale of sales) {
      for (const line of sale.lines) {
        const key = line.itemId ?? line.id;
        const current = totals.get(key) ?? {
          itemId: line.itemId,
          itemName: line.itemName ?? line.description ?? `Line ${line.lineNumber}`,
          quantity: 0,
          salesAmount: 0,
          taxAmount: 0,
        };
        current.quantity += Number(line.quantity);
        current.salesAmount += Number(line.lineAmount);
        current.taxAmount += Number(line.taxAmount);
        totals.set(key, current);
      }
    }
    return Array.from(totals.values()).map((row) => ({
      ...row,
      quantity: row.quantity.toFixed(4),
      salesAmount: row.salesAmount.toFixed(2),
      taxAmount: row.taxAmount.toFixed(2),
    }));
  }

  async getInventoryImpactReport(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_INVENTORY_MOVEMENTS", user);
    const rows = await this.prisma.inventoryStockMovement.findMany({
      where: {
        movementType: {
          in: [InventoryStockMovementType.SALES_ISSUE, InventoryStockMovementType.SALES_RETURN],
        },
      },
      include: {
        item: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return rows.map((row) => ({
      id: row.id,
      movementType: row.movementType,
      transactionType: row.transactionType,
      transactionReference: row.transactionReference,
      transactionDate: row.transactionDate.toISOString(),
      item: row.item,
      warehouse: row.warehouse,
      quantityIn: row.quantityIn.toString(),
      quantityOut: row.quantityOut.toString(),
      unitCost: row.unitCost.toString(),
      valueIn: row.valueIn.toString(),
      valueOut: row.valueOut.toString(),
      runningQuantity: row.runningQuantity.toString(),
      runningValuation: row.runningValuation.toString(),
    }));
  }

  async getTaxSummaryReport(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const [salesLines, returnLines] = await Promise.all([
      this.prisma.salesInvoiceLine.findMany({
        where: {
          salesInvoice: {
            invoiceType: SalesInvoiceType.POS,
            posOperationalStatus: PosOperationalStatus.COMPLETED,
          },
        },
        include: { tax: { select: { id: true, taxCode: true, taxName: true, rate: true } } },
      }),
      this.prisma.posReturnLine.findMany({
        where: {
          posReturn: {
            status: { not: PosReturnStatus.REVERSED },
          },
        },
        include: { tax: { select: { id: true, taxCode: true, taxName: true, rate: true } } },
      }),
    ]);

    const totals = new Map<string, { taxId: string | null; taxCode: string; taxName: string; rate: string; salesTax: number; returnTax: number; netTax: number }>();
    for (const line of salesLines) {
      const key = line.taxId ?? "UNTAXED";
      const current = totals.get(key) ?? {
        taxId: line.taxId,
        taxCode: line.tax?.taxCode ?? "UNTAXED",
        taxName: line.tax?.taxName ?? "Untaxed",
        rate: line.tax?.rate?.toString() ?? "0.00",
        salesTax: 0,
        returnTax: 0,
        netTax: 0,
      };
      current.salesTax += Number(line.taxAmount);
      current.netTax += Number(line.taxAmount);
      totals.set(key, current);
    }
    for (const line of returnLines) {
      const key = line.taxId ?? "UNTAXED";
      const current = totals.get(key) ?? {
        taxId: line.taxId,
        taxCode: line.tax?.taxCode ?? "UNTAXED",
        taxName: line.tax?.taxName ?? "Untaxed",
        rate: line.tax?.rate?.toString() ?? "0.00",
        salesTax: 0,
        returnTax: 0,
        netTax: 0,
      };
      current.returnTax += Number(line.taxAmount);
      current.netTax -= Number(line.taxAmount);
      totals.set(key, current);
    }
    return Array.from(totals.values()).map((row) => ({
      ...row,
      salesTax: row.salesTax.toFixed(2),
      returnTax: row.returnTax.toFixed(2),
      netTax: row.netTax.toFixed(2),
    }));
  }

  private async buildSessionReport(sessionId: string) {
    if ((await this.getPosPostingMode()) === "BY_SESSION") {
      await this.prisma.$transaction(async (tx) => {
        await this.syncSessionGroupedJournalEntry(tx, sessionId);
      });
    }

    const session = await this.prisma.posSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        cashAccount: { select: { id: true, name: true, type: true, account: { select: { id: true, code: true, name: true } } } },
        salesInvoices: {
          where: {
            invoiceType: SalesInvoiceType.POS,
            posOperationalStatus: PosOperationalStatus.COMPLETED,
          },
          include: this.posSaleInclude(),
        },
        posReturns: {
          where: {
            status: { not: PosReturnStatus.REVERSED },
          },
          include: this.posReturnInclude(),
        },
      },
    });
    const sessionJournalEntry = await this.prisma.journalEntry.findFirst({
      where: {
        sourceType: "PosSession",
        sourceId: session.id,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        reference: true,
        status: true,
        postedAt: true,
        sourceType: true,
        sourceId: true,
        sourceNumber: true,
      },
    });

    const completedSales = session.salesInvoices;
    const completedReturns = session.posReturns;
    const paymentTotals = new Map<PosPaymentMethod, number>();
    const refundTotals = new Map<PosRefundMethod, number>();
    let totalSales = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let invoiceCount = 0;

    for (const invoice of completedSales) {
      totalSales += Number(invoice.totalAmount);
      totalDiscounts += Number(invoice.discountAmount);
      totalTax += Number(invoice.taxAmount);
      invoiceCount += 1;
      for (const payment of invoice.posPayments) {
        const paymentMethod =
          payment.paymentMethod === PosPaymentMethod.DELIVERY || payment.deliveryCompanyId
            ? PosPaymentMethod.DELIVERY
            : payment.paymentMethod;
        const current = paymentTotals.get(paymentMethod) ?? 0;
        paymentTotals.set(
          paymentMethod,
          Number((current + Number(payment.amount)).toFixed(2)),
        );
      }
    }

    for (const posReturn of completedReturns) {
      totalDiscounts -= Number(posReturn.discountAmount);
      totalTax -= Number(posReturn.taxAmount);
      for (const payment of posReturn.payments) {
        const current = refundTotals.get(payment.refundMethod) ?? 0;
        refundTotals.set(
          payment.refundMethod,
          Number((current + Number(payment.amount)).toFixed(2)),
        );
      }
    }

    const cashSales = paymentTotals.get(PosPaymentMethod.CASH) ?? 0;
    const cashRefunds = refundTotals.get(PosRefundMethod.CASH) ?? 0;
    const expectedCash = Number(
      (Number(session.openingCash) + cashSales - cashRefunds).toFixed(2),
    );

    return {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      status: session.status,
      terminalName: session.terminalName,
      branchName: session.branchName,
      warehouse: session.warehouse,
      cashAccount: session.cashAccount,
      openingCash: session.openingCash.toString(),
      cashSales: cashSales.toFixed(2),
      cashRefunds: cashRefunds.toFixed(2),
      cardSales: (paymentTotals.get(PosPaymentMethod.CARD) ?? 0).toFixed(2),
      cliqSales: (paymentTotals.get(PosPaymentMethod.CLIQ) ?? 0).toFixed(2),
      bankTransferSales: (paymentTotals.get(PosPaymentMethod.BANK_TRANSFER) ?? 0).toFixed(2),
      walletSales: (paymentTotals.get(PosPaymentMethod.WALLET) ?? 0).toFixed(2),
      deliveryCompanySales: (paymentTotals.get(PosPaymentMethod.DELIVERY) ?? 0).toFixed(2),
      totalSales: totalSales.toFixed(2),
      discounts: totalDiscounts.toFixed(2),
      tax: totalTax.toFixed(2),
      expectedCash: expectedCash.toFixed(2),
      actualCash: session.actualCash?.toString() ?? null,
      difference:
        session.actualCash !== null && session.actualCash !== undefined
          ? (Number(session.actualCash) - expectedCash).toFixed(2)
          : null,
      invoiceCount,
      returnCount: completedReturns.length,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      sessionJournalEntry: sessionJournalEntry
        ? {
            id: sessionJournalEntry.id,
            reference: sessionJournalEntry.reference,
            status: sessionJournalEntry.status,
            postedAt: sessionJournalEntry.postedAt?.toISOString() ?? null,
            sourceType: sessionJournalEntry.sourceType,
            sourceId: sessionJournalEntry.sourceId,
            sourceNumber: sessionJournalEntry.sourceNumber,
          }
        : null,
      sales: completedSales.map((s) => this.mapPosSale(s)),
      returns: completedReturns.map((r) => this.mapPosReturn(r)),
    };
  }

  private ensureCanSavePosDraft(user?: AuthorizedUser) {
    if (
      this.hasPosPermissionCode("POS_HOLD_SALE", user) ||
      this.hasPosPermissionCode("POS_COMPLETE_SALE", user) ||
      (this.isWaiterOnlyUser(user) &&
        this.hasPosPermissionCode("RST_OPEN_TABLE_ORDER", user))
    ) {
      return;
    }
    throw new BadRequestException("You do not have permission to save POS drafts.");
  }

  private ensurePosPermission(
    action:
      | "OPEN_SESSION"
      | "CLOSE_SESSION"
      | "SELL"
      | "HOLD_SALE"
      | "VOID_SALE"
      | "RETURN_SALE"
      | "REFUND"
      | "REPRINT_RECEIPT"
      | "SESSION_REPORT"
      | "ACCOUNTING_POST"
      | "ACCOUNTING_REJECT"
      | "ACCOUNTING_REVERSE"
      | "NEGATIVE_STOCK_OVERRIDE",
    user?: AuthorizedUser,
  ) {
    const requiredPermission = this.resolveActionPermission(action);
    if (!requiredPermission) {
      return;
    }
    if (!this.hasPosPermissionCode(requiredPermission, user)) {
      throw new BadRequestException(`You do not have permission to ${action.toLowerCase().replaceAll("_", " ")}.`);
    }
  }

  private ensurePosPermissionCode(permissionCode: PosPermissionCode, user?: AuthorizedUser) {
    if (!this.hasPosPermissionCode(permissionCode, user)) {
      throw new BadRequestException(`You do not have permission for ${permissionCode}.`);
    }
  }

  assertKitchenViewPermission(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("RST_VIEW_KITCHEN_SCREEN", user);
  }

  /** Cashier register polls kitchen orders for the print hub without kitchen-screen access. */
  assertKitchenOrdersListPermission(user?: AuthorizedUser) {
    if (
      this.hasPosPermissionCode("RST_VIEW_KITCHEN_SCREEN", user) ||
      this.hasPosPermissionCode("POS_VIEW_POS_SCREEN", user)
    ) {
      return;
    }
    throw new BadRequestException(
      "You do not have permission to view kitchen orders.",
    );
  }

  assertKitchenUpdatePermission(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("RST_UPDATE_KITCHEN_STATUS", user);
  }

  assertWaiterOrdersViewPermission(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("RST_VIEW_WAITER_ORDERS", user);
  }

  assertWaiterOrdersUpdatePermission(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("RST_UPDATE_WAITER_ORDER_STATUS", user);
  }

  async listWaiterOrders(user?: AuthorizedUser, status?: WaiterFoodStatus) {
    this.assertWaiterOrdersViewPermission(user);
    return this.prisma.kitchenOrder.findMany({
      where: {
        orderType: OrderType.DINE_IN,
        ...(status ? { waiterStatus: status } : {}),
        salesInvoice: {
          posOperationalStatus: {
            in: [PosOperationalStatus.DRAFT, PosOperationalStatus.HELD],
          },
        },
      },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateWaiterOrderStatus(
    orderId: string,
    nextStatus: WaiterFoodStatus,
    user?: AuthorizedUser,
  ) {
    this.assertWaiterOrdersUpdatePermission(user);
    const order = await this.prisma.kitchenOrder.findUnique({
      where: { id: orderId.trim() },
      include: {
        salesInvoice: {
          select: {
            id: true,
            posOperationalStatus: true,
            tableId: true,
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException(`Waiter order with ID ${orderId} was not found.`);
    }
    if (order.orderType !== OrderType.DINE_IN) {
      throw new BadRequestException("Only dine-in orders can be updated on the waiter board.");
    }
    if (
      !order.salesInvoice ||
      this.isPosSaleDone(order.salesInvoice.posOperationalStatus)
    ) {
      throw new BadRequestException("This order is no longer open.");
    }

    const allowedNext: Record<WaiterFoodStatus, WaiterFoodStatus | null> = {
      [WaiterFoodStatus.WAITING]: WaiterFoodStatus.RECEIVED,
      [WaiterFoodStatus.RECEIVED]: WaiterFoodStatus.DEPARTED,
      [WaiterFoodStatus.DEPARTED]: null,
    };
    if (allowedNext[order.waiterStatus] !== nextStatus) {
      throw new BadRequestException(
        `Cannot move order from ${order.waiterStatus} to ${nextStatus}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const patch: Prisma.KitchenOrderUpdateInput = {
        waiterStatus: nextStatus,
      };
      if (nextStatus === WaiterFoodStatus.RECEIVED) {
        patch.receivedAt = new Date();
      }
      if (nextStatus === WaiterFoodStatus.DEPARTED) {
        patch.departedAt = new Date();
        const tableId = order.salesInvoice?.tableId ?? order.tableId;
        if (tableId && order.salesInvoice?.id) {
          await tx.posTable.update({
            where: { id: tableId },
            data: {
              status: TableStatus.CLEANING,
              activeInvoiceId: order.salesInvoice.id,
            },
          });
        }
      }

      return tx.kitchenOrder.update({
        where: { id: order.id },
        data: patch,
        include: { items: true },
      });
    });
  }

  assertPosAddonAdminPermission(user?: AuthorizedUser) {
    if (user?.role === "ADMIN" || user?.role === "MANAGER") return;
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
  }

  assertPosAddonReadPermission(user?: AuthorizedUser) {
    if (user?.role === "ADMIN" || user?.role === "MANAGER") return;
    this.ensurePosPermissionCode("POS_VIEW_POS_SCREEN", user);
  }

  private hasPosPermissionCode(permissionCode: PosPermissionCode, user?: AuthorizedUser) {
    if (permissionCode === "POS_VIEW_POS_SCREEN") {
      const hasDirect = Boolean(user?.permissions?.includes(permissionCode));
      if (hasDirect) return true;
      return Boolean(
        user?.permissions?.includes("RST_VIEW_TABLE_SCREEN") ||
        user?.permissions?.includes("RST_OPEN_TABLE_ORDER") ||
        user?.permissions?.includes("RST_VIEW_WAITER_ORDERS")
      );
    }
    return Boolean(user?.permissions?.includes(permissionCode));
  }

  private listKnownPermissionCodes(): PosPermissionCode[] {
    return [
      "POS_OPEN_SESSION",
      "POS_CLOSE_OWN_SESSION",
      "POS_VIEW_POS_SCREEN",
      "POS_SCAN_BARCODE",
      "POS_SEARCH_ITEM",
      "POS_ADD_ITEM_TO_CART",
      "POS_UPDATE_ITEM_QUANTITY",
      "POS_REMOVE_ITEM_FROM_CART",
      "POS_HOLD_SALE",
      "POS_RESUME_OWN_HELD_SALE",
      "POS_VOID_DRAFT_SALE",
      "POS_COMPLETE_SALE",
      "POS_SELECT_PAYMENT_METHOD",
      "POS_PRINT_RECEIPT",
      "POS_VIEW_OWN_SESSION_REPORT",
      "POS_VIEW_COMPLETED_SALES",
      "POS_VIEW_PENDING_ACCOUNTING",
      "POS_VIEW_POS_INVOICE_DETAILS",
      "POS_VIEW_POS_PAYMENTS",
      "POS_VIEW_POS_INVENTORY_MOVEMENTS",
      "POS_VIEW_SESSIONS",
      "POS_VIEW_SESSION_REPORT",
      "POS_APPROVE_ACCOUNTING",
      "POS_REJECT_ACCOUNTING",
      "POS_POST_BY_INVOICE",
      "POS_POST_BY_SESSION",
      "POS_VIEW_POS_REPORTS",
      "POS_EXPORT_POS_REPORTS",
      "VIEW_JOURNAL_ENTRIES",
      "VIEW_GENERAL_LEDGER",
      "VIEW_INVENTORY_MOVEMENTS",
      "POS_CREDIT_SALE",
      "POS_SELL_NEGATIVE_STOCK",
      "POS_CHANGE_UNIT_PRICE",
    ];
  }

  private resolveActionPermission(action: string): PosPermissionCode | null {
    const actionToPermission: Record<string, PosPermissionCode | null> = {
      OPEN_SESSION: "POS_OPEN_SESSION",
      CLOSE_SESSION: "POS_CLOSE_OWN_SESSION",
      SELL: "POS_COMPLETE_SALE",
      HOLD_SALE: "POS_HOLD_SALE",
      VOID_SALE: "POS_VOID_DRAFT_SALE",
      RETURN_SALE: "POS_VIEW_COMPLETED_SALES",
      REFUND: "POS_VIEW_COMPLETED_SALES",
      REPRINT_RECEIPT: "POS_PRINT_RECEIPT",
      SESSION_REPORT: "POS_VIEW_OWN_SESSION_REPORT",
      ACCOUNTING_POST: "POS_APPROVE_ACCOUNTING",
      ACCOUNTING_REJECT: "POS_REJECT_ACCOUNTING",
      ACCOUNTING_REVERSE: "POS_APPROVE_ACCOUNTING",
      NEGATIVE_STOCK_OVERRIDE: "POS_SELL_NEGATIVE_STOCK",
    };
    return actionToPermission[action] ?? null;
  }

  private canReviewAllSessions(user?: AuthorizedUser) {
    return Boolean(
      user?.posRoles?.includes("ACCOUNTANT") ||
        user?.role === "ADMIN" ||
        user?.role === "MANAGER",
    );
  }

  private async resolveExistingUserId(userId?: string | null) {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId) {
      return null;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true },
    });

    return existingUser?.id ?? null;
  }

  private ensureDiscountPermission(lines: ResolvedSalesLine[], user?: AuthorizedUser) {
    const gross = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const discounts = lines.reduce((sum, line) => sum + line.discountAmount, 0);
    if (gross <= 0 || discounts <= 0) {
      return;
    }

    const discountPercent = Number(((discounts / gross) * 100).toFixed(2));
    const cashierLimit = Number(process.env.POS_MAX_CASHIER_DISCOUNT_PERCENT ?? "15");
    if (discountPercent > cashierLimit) {
      this.ensurePosPermissionCode("POS_APPROVE_ACCOUNTING", user);
    }
  }

  private async ensurePriceChangePermission(lines: Array<{ itemId?: string | null; unitPrice?: number }>, user?: AuthorizedUser) {
    const itemIds = Array.from(new Set(lines.map((line) => line.itemId?.trim()).filter(Boolean))) as string[];
    if (!itemIds.length) {
      return;
    }
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, defaultSalesPrice: true },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const hasPriceChange = lines.some((line) => {
      if (!line.itemId) {
        return false;
      }
      const item = itemMap.get(line.itemId);
      if (!item?.defaultSalesPrice) {
        return false;
      }
      return Number(item.defaultSalesPrice) !== Number((line.unitPrice ?? 0).toFixed(2));
    });
    if (hasPriceChange) {
      this.ensurePosPermissionCode("POS_CHANGE_UNIT_PRICE", user);
      await this.auditService.log({
        userId: user?.userId,
        entity: "SalesInvoice",
        action: AuditAction.UPDATE,
        details: {
          event: "PRICE_CHANGE",
        },
      });
    }
  }

  private async buildPosReturnLines(
    tx: Prisma.TransactionClient,
    originalSale: any,
    requestedLines: CreatePosReturnDto["lines"],
  ) {
    const priorReturns = await tx.posReturnLine.findMany({
      where: {
        posReturn: {
          salesInvoiceId: originalSale.id,
          status: { not: PosReturnStatus.REVERSED },
        },
      },
      select: {
        salesInvoiceLineId: true,
        quantity: true,
      },
    });
    const returnedByLine = new Map<string, number>();
    for (const row of priorReturns) {
      if (!row.salesInvoiceLineId) {
        continue;
      }
      const current = returnedByLine.get(row.salesInvoiceLineId) ?? 0;
      returnedByLine.set(row.salesInvoiceLineId, current + Number(row.quantity));
    }

    return Promise.all(requestedLines.map(async (requested) => {
      const originalLine = originalSale.lines.find((line: any) => line.id === requested.salesInvoiceLineId);
      if (!originalLine) {
        throw new BadRequestException(`Original sale line ${requested.salesInvoiceLineId} was not found.`);
      }
      const requestedQty = Number(requested.quantity.toFixed(4));
      const alreadyReturnedQty = returnedByLine.get(originalLine.id) ?? 0;
      const remainingQty = Number((Number(originalLine.quantity) - alreadyReturnedQty).toFixed(4));
      if (requestedQty > remainingQty) {
        throw new BadRequestException(
          `Return quantity for line ${originalLine.lineNumber} exceeds the remaining sold quantity.`,
        );
      }

      const ratio = Number((requestedQty / Number(originalLine.quantity)).toFixed(8));
      const movement =
        originalLine.item?.trackInventory && originalLine.itemId && originalLine.warehouseId
          ? await tx.inventoryStockMovement.findFirst({
              where: {
                transactionType: "SalesInvoice",
                transactionLineId: originalLine.id,
                movementType: InventoryStockMovementType.SALES_ISSUE,
              },
              select: { unitCost: true },
            })
          : null;
      const unitCost = movement ? Number(movement.unitCost) : null;
      const totalCost =
        unitCost === null ? null : Number((unitCost * requestedQty).toFixed(2));

      return {
        salesInvoiceLineId: originalLine.id,
        itemId: originalLine.itemId,
        warehouseId: originalLine.warehouseId,
        itemName: originalLine.itemName,
        description: originalLine.description,
        quantity: requestedQty,
        unitPrice: Number(originalLine.unitPrice),
        discountAmount: Number((Number(originalLine.discountAmount) * ratio).toFixed(2)),
        taxId: originalLine.taxId,
        taxAmount: Number((Number(originalLine.taxAmount) * ratio).toFixed(2)),
        lineSubtotalAmount: Number((Number(originalLine.lineSubtotalAmount) * ratio).toFixed(2)),
        lineAmount: Number((Number(originalLine.lineAmount) * ratio).toFixed(2)),
        revenueAccountId:
          originalLine.item?.salesReturnAccountId || originalLine.revenueAccountId,
        inventoryAccountId: originalLine.item?.inventoryAccountId ?? null,
        cogsAccountId: originalLine.item?.cogsAccountId ?? null,
        unitCost,
        totalCost,
      };
    }));
  }

  private computePosReturnTotals(
    resolved: Array<{
      lineSubtotalAmount: number;
      discountAmount: number;
      taxAmount: number;
      lineAmount: number;
    }>,
  ) {
    return resolved.reduce(
      (totals, line) => {
        totals.subtotalAmount += line.lineSubtotalAmount;
        totals.discountAmount += line.discountAmount;
        totals.taxAmount += line.taxAmount;
        totals.totalAmount += line.lineAmount;
        return totals;
      },
      {
        subtotalAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
    );
  }

  private async normalizeRefundPayments(
    tx: Prisma.TransactionClient,
    payments: PosReturnPaymentDto[],
    totalAmount: number,
    storeCreditAccountId: string,
  ) {
    if (!payments.length) {
      throw new BadRequestException("At least one refund method is required.");
    }

    const accountMappings = await this.getPosAccountMappings(tx);

    for (const payment of payments) {
      if (payment.refundMethod === PosRefundMethod.STORE_CREDIT) {
        continue;
      }
      if (!payment.bankCashAccountId) {
        let mappedAccountId: string | null = null;
        const method = payment.refundMethod;
        if (method === PosRefundMethod.CASH) {
          mappedAccountId = accountMappings.cashAccountId;
        } else if (method === PosRefundMethod.CARD) {
          mappedAccountId = accountMappings.cardAccountId;
        } else if (method === PosRefundMethod.CLIQ) {
          mappedAccountId = accountMappings.cliqAccountId;
        } else if (method === PosRefundMethod.WALLET) {
          mappedAccountId = accountMappings.walletAccountId;
        } else if (method === PosRefundMethod.BANK_TRANSFER) {
          mappedAccountId = accountMappings.bankTransferAccountId;
        }

        if (!mappedAccountId) {
          throw new BadRequestException("طريقة الدفع غير مربوطة بحساب محاسبي");
        }

        const bankCashAcc = await tx.bankCashAccount.findFirst({
          where: { accountId: mappedAccountId, isActive: true },
          select: { id: true },
        });

        if (!bankCashAcc) {
          throw new BadRequestException("طريقة الدفع غير مربوطة بحساب محاسبي");
        }

        payment.bankCashAccountId = bankCashAcc.id;
      } else {
        const bankCashAcc = await tx.bankCashAccount.findUnique({
          where: { id: payment.bankCashAccountId },
          select: { type: true, accountId: true },
        });
        if (!bankCashAcc) {
          throw new BadRequestException(`Refund account ${payment.bankCashAccountId} was not found or is inactive.`);
        }
        const method = bankCashAcc.type.toUpperCase();
        let mappedAccountId: string | null = null;
        if (method.includes("CASH")) {
          mappedAccountId = accountMappings.cashAccountId;
        } else if (method.includes("CARD")) {
          mappedAccountId = accountMappings.cardAccountId;
        } else if (method.includes("CLIQ")) {
          mappedAccountId = accountMappings.cliqAccountId;
        } else if (method.includes("WALLET")) {
          mappedAccountId = accountMappings.walletAccountId;
        } else if (method.includes("BANK")) {
          mappedAccountId = accountMappings.bankTransferAccountId;
        }

        if (!mappedAccountId) {
          throw new BadRequestException("طريقة الدفع غير مربوطة بحساب محاسبي");
        }
      }
    }

    const accountIds = Array.from(
      new Set(
        payments
          .map((payment) => payment.bankCashAccountId?.trim())
          .filter(Boolean),
      ),
    ) as string[];
    const accounts = accountIds.length
      ? await tx.bankCashAccount.findMany({
          where: { id: { in: accountIds }, isActive: true },
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
                isPosting: true,
                allowManualPosting: true,
              },
            },
          },
        })
      : [];
    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    const normalized = payments.map((payment) => {
      if (payment.refundMethod === PosRefundMethod.STORE_CREDIT) {
        return {
          refundMethod: payment.refundMethod,
          bankCashAccountId: null,
          accountId: storeCreditAccountId,
          amount: Number(payment.amount.toFixed(2)),
          reference: payment.reference,
        };
      }

      const bankCashAccountId = payment.bankCashAccountId?.trim();
      if (!bankCashAccountId) {
        throw new BadRequestException(`Refund account is required for ${payment.refundMethod}.`);
      }
      const bankCash = accountMap.get(bankCashAccountId);
      if (!bankCash) {
        throw new BadRequestException(`Refund account ${bankCashAccountId} was not found or is inactive.`);
      }
      if (!bankCash.account.isActive || !bankCash.account.isPosting || !bankCash.account.allowManualPosting) {
        throw new BadRequestException(
          `Refund account ${bankCash.account.code} must be active and posting.`,
        );
      }
      return {
        refundMethod: payment.refundMethod,
        bankCashAccountId,
        accountId: bankCash.accountId,
        amount: Number(payment.amount.toFixed(2)),
        reference: payment.reference,
      };
    });

    const totalRefund = Number(
      normalized.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
    );
    if (totalRefund !== Number(totalAmount.toFixed(2))) {
      throw new BadRequestException("Refund allocation must equal the POS return total.");
    }
    return normalized;
  }

  private async applyPosReturnInventoryEffects(
    tx: Prisma.TransactionClient,
    posReturnId: string,
    reference: string,
    returnDate: Date,
  ) {
    const lines = await tx.posReturnLine.findMany({
      where: { posReturnId },
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            trackInventory: true,
          },
        },
      },
      orderBy: { lineNumber: "asc" },
    });

    for (const line of lines) {
      if (!line.itemId || !line.item?.trackInventory || !line.warehouseId) {
        continue;
      }
      const quantity = new Prisma.Decimal(line.quantity);
      const totalCost = new Prisma.Decimal(line.totalCost ?? 0);
      const unitCost = quantity.gt(0)
        ? totalCost.div(quantity)
        : new Prisma.Decimal(line.unitCost ?? 0);

      await tx.inventoryItem.update({
        where: { id: line.itemId },
        data: {
          onHandQuantity: {
            increment: quantity,
          },
          valuationAmount: {
            increment: totalCost,
          },
        },
      });

      const warehouseBalance = await this.inventoryPostingService.applyWarehouseBalance(tx, {
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        quantityDelta: quantity,
        valueDelta: totalCost,
      });

      await this.inventoryPostingService.createMovement(tx, {
        movementType: InventoryStockMovementType.SALES_RETURN,
        transactionType: "PosReturn",
        transactionId: posReturnId,
        transactionLineId: line.id,
        transactionReference: reference,
        transactionDate: returnDate,
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        quantityIn: quantity,
        quantityOut: new Prisma.Decimal(0),
        unitCost,
        valueIn: totalCost,
        valueOut: new Prisma.Decimal(0),
        balanceId: warehouseBalance.id,
        runningQuantity: warehouseBalance.onHandQuantity,
        runningValuation: warehouseBalance.valuationAmount,
        description: line.description,
      });

      await this.inventoryPostingService.addCostLayer(tx, {
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        quantity,
        unitCost,
        movementType: InventoryStockMovementType.SALES_RETURN,
        sourceType: "PosReturn",
        sourceId: posReturnId,
        sourceLineId: line.id,
        sourceReference: reference,
        sourceDate: returnDate,
      });
    }
  }

  private async buildPosReturnJournalLines(tx: Prisma.TransactionClient, posReturnId: string) {
    const posReturn = await tx.posReturn.findUniqueOrThrow({
      where: { id: posReturnId },
      include: {
        customer: { select: { receivableAccountId: true } },
        lines: {
          include: {
            tax: { select: { id: true, taxCode: true, taxAccountId: true } },
          },
          orderBy: { lineNumber: "asc" },
        },
        payments: {
          include: {
            bankCashAccount: {
              select: {
                accountId: true,
              },
            },
          },
        },
      },
    });

    const accountMappings = await this.getPosAccountMappings(tx);

    const description = posReturn.reason
      ? `${posReturn.reference} - ${posReturn.reason}`
      : posReturn.reference;
    const journalLines: Array<{
      accountId: string;
      description: string;
      debitAmount: number;
      creditAmount: number;
    }> = [];

    for (const line of posReturn.lines) {
      const salesReturnAccountId = accountMappings.salesReturnsAccountId || line.revenueAccountId;
      journalLines.push({
        accountId: salesReturnAccountId,
        description,
        debitAmount: Number(line.lineSubtotalAmount),
        creditAmount: 0,
      });

      if (Number(line.taxAmount) > 0) {
        const taxAccountId = accountMappings.outputVatAccountId || line.tax?.taxAccountId;
        if (!taxAccountId) {
          throw new BadRequestException(
            `Tax account mapping is missing for POS return line ${line.lineNumber}.`,
          );
        }
        journalLines.push({
          accountId: taxAccountId,
          description: `${description} tax`,
          debitAmount: Number(line.taxAmount),
          creditAmount: 0,
        });
      }

      if (line.inventoryAccountId && line.cogsAccountId && Number(line.totalCost ?? 0) > 0) {
        journalLines.push({
          accountId: line.inventoryAccountId,
          description: `Inventory return ${posReturn.reference}`,
          debitAmount: Number(line.totalCost),
          creditAmount: 0,
        });
        journalLines.push({
          accountId: line.cogsAccountId,
          description: `COGS reversal ${posReturn.reference}`,
          debitAmount: 0,
          creditAmount: Number(line.totalCost),
        });
      }
    }

    for (const payment of posReturn.payments) {
      const accountId =
        payment.refundMethod === PosRefundMethod.STORE_CREDIT
          ? posReturn.customer.receivableAccountId
          : payment.bankCashAccount?.accountId;
      if (!accountId) {
        throw new BadRequestException(`Refund account mapping is missing for ${payment.refundMethod}.`);
      }
      journalLines.push({
        accountId,
        description,
        debitAmount: 0,
        creditAmount: Number(payment.amount),
      });
    }

    return journalLines;
  }

  private async buildSaleAccountingCredits(
    tx: Prisma.TransactionClient,
    sale: {
      id: string;
      reference: string;
      serviceChargeAmount: Prisma.Decimal | number | null;
      deliveryFeeAmount: Prisma.Decimal | number | null;
      lines: Array<{
        lineNumber: number;
        description: string | null;
        revenueAccountId: string;
        taxId: string | null;
        taxAmount: Prisma.Decimal | number;
        lineSubtotalAmount: Prisma.Decimal | number;
        discountAmount: Prisma.Decimal | number;
      }>;
    },
    accountMappings: any,
    description: string,
  ) {
    const taxIds = Array.from(
      new Set(sale.lines.map((line) => line.taxId).filter(Boolean)),
    ) as string[];
    const taxes = taxIds.length
      ? await tx.tax.findMany({
          where: { id: { in: taxIds }, isActive: true },
          select: {
            id: true,
            taxName: true,
            taxAccountId: true,
            taxAccount: {
              select: {
                id: true,
                isActive: true,
                isPosting: true,
                allowManualPosting: true,
              },
            },
          },
        })
      : [];
    const taxMap = new Map(taxes.map((tax) => [tax.id, tax]));
    const fallbackTaxAccountId = accountMappings.outputVatAccountId || await this.getPosSalesTaxAccountId(tx);

    const revenueByAccount = new Map<string, number>();
    const discountByAccount = new Map<string, number>();
    const taxByAccount = new Map<string, number>();

    const salesRevenueAccountId = accountMappings.salesRevenueAccountId || (await tx.account.findFirst({
      where: { code: "4110001" },
      select: { id: true },
    }))?.id;

    if (!salesRevenueAccountId) {
      throw new BadRequestException("Sales revenue account is not configured.");
    }

    for (const line of sale.lines) {
      const discountAmount = Number(line.discountAmount ?? 0);
      const subtotal = Number(line.lineSubtotalAmount ?? 0);
      const revenueAccountId = accountMappings.salesRevenueAccountId || line.revenueAccountId;

      if (discountAmount > 0 && accountMappings.salesDiscountAccountId) {
        const currentRev = revenueByAccount.get(revenueAccountId) ?? 0;
        revenueByAccount.set(
          revenueAccountId,
          Number((currentRev + subtotal + discountAmount).toFixed(2)),
        );

        const currentDisc = discountByAccount.get(accountMappings.salesDiscountAccountId) ?? 0;
        discountByAccount.set(
          accountMappings.salesDiscountAccountId,
          Number((currentDisc + discountAmount).toFixed(2)),
        );
      } else {
        const currentRev = revenueByAccount.get(revenueAccountId) ?? 0;
        revenueByAccount.set(
          revenueAccountId,
          Number((currentRev + subtotal).toFixed(2)),
        );
      }

      const taxAmount = Number(line.taxAmount);
      if (taxAmount <= 0) {
        continue;
      }

      const taxAccountId = accountMappings.outputVatAccountId || (line.taxId ? taxMap.get(line.taxId)?.taxAccountId : null) || fallbackTaxAccountId;
      if (!taxAccountId) {
        throw new BadRequestException("Output VAT account is required because tax is applied.");
      }
      const currentTax = taxByAccount.get(taxAccountId) ?? 0;
      taxByAccount.set(
        taxAccountId,
        Number((currentTax + taxAmount).toFixed(2)),
      );
    }

    const serviceChargeVal = Number(sale.serviceChargeAmount ?? 0);
    if (serviceChargeVal > 0) {
      const currentRev = revenueByAccount.get(salesRevenueAccountId) ?? 0;
      revenueByAccount.set(salesRevenueAccountId, Number((currentRev + serviceChargeVal).toFixed(2)));
    }

    const deliveryFeeVal = Number(sale.deliveryFeeAmount ?? 0);
    if (deliveryFeeVal > 0) {
      const currentRev = revenueByAccount.get(salesRevenueAccountId) ?? 0;
      revenueByAccount.set(salesRevenueAccountId, Number((currentRev + deliveryFeeVal).toFixed(2)));
    }

    const creditLines = [
      ...Array.from(revenueByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description,
        debitAmount: 0,
        creditAmount: amount,
      })),
      ...Array.from(taxByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description: `${description} tax`,
        debitAmount: 0,
        creditAmount: amount,
      })),
    ];

    const debitLines = [
      ...Array.from(discountByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description: `${description} discount`,
        debitAmount: amount,
        creditAmount: 0,
      })),
    ];

    return { creditLines, debitLines };
  }

  private resolvePosPaymentMethod(raw: string) {
    const normalized = raw.trim().toUpperCase();
    if (normalized === PosPaymentMethod.DELIVERY) return PosPaymentMethod.DELIVERY;
    if (normalized.includes("CARD") || normalized.includes("VISA") || normalized.includes("MASTER")) {
      return PosPaymentMethod.CARD;
    }
    if (normalized.includes("CLIQ")) return PosPaymentMethod.CLIQ;
    if (normalized.includes("WALLET")) return PosPaymentMethod.WALLET;
    if (normalized.includes("BANK")) return PosPaymentMethod.BANK_TRANSFER;
    return PosPaymentMethod.CASH;
  }

  private getMappedAccountIdForPaymentMethod(
    paymentMethod: PosPaymentMethod,
    accountMappings: PosAccountMappings,
  ) {
    if (paymentMethod === PosPaymentMethod.CARD) return accountMappings.cardAccountId;
    if (paymentMethod === PosPaymentMethod.CLIQ) return accountMappings.cliqAccountId;
    if (paymentMethod === PosPaymentMethod.WALLET) return accountMappings.walletAccountId;
    if (paymentMethod === PosPaymentMethod.BANK_TRANSFER) return accountMappings.bankTransferAccountId;
    return accountMappings.cashAccountId;
  }

  private async ensureActivePostingAccount(accountId: string | undefined, db: PosDb = this.prisma) {
    const normalizedAccountId = accountId?.trim();
    if (!normalizedAccountId) {
      return;
    }
    const account = await db.account.findUnique({
      where: { id: normalizedAccountId },
      select: {
        id: true,
        code: true,
        isActive: true,
        isPosting: true,
      },
    });
    if (!account || !account.isActive || !account.isPosting) {
      throw new BadRequestException(`Account ${normalizedAccountId} must be an active posting account.`);
    }
  }

  private async ensurePosPaymentMappingAccount(accountId: string | undefined, db: PosDb = this.prisma) {
    const normalizedAccountId = accountId?.trim();
    if (!normalizedAccountId) {
      return;
    }
    await this.ensureActivePostingAccount(normalizedAccountId, db);
    const bankCashAccount = await db.bankCashAccount.findFirst({
      where: { accountId: normalizedAccountId, isActive: true },
      select: { id: true },
    });
    if (!bankCashAccount) {
      throw new BadRequestException(
        `POS payment mapping account ${normalizedAccountId} must be linked to an active bank/cash account.`,
      );
    }
  }

  private async resolveMappedBankCashAccountId(
    db: PosDb,
    paymentMethod: PosPaymentMethod,
    accountMappings: PosAccountMappings,
    sessionCashAccountId?: string | null,
  ) {
    if (paymentMethod === PosPaymentMethod.DELIVERY) {
      return sessionCashAccountId?.trim() || null;
    }
    if (paymentMethod === PosPaymentMethod.CASH && sessionCashAccountId?.trim()) {
      return sessionCashAccountId.trim();
    }

    const mappedAccountId = this.getMappedAccountIdForPaymentMethod(paymentMethod, accountMappings)?.trim();
    if (!mappedAccountId) {
      return null;
    }

    const bankCashAccount = await db.bankCashAccount.findFirst({
      where: { accountId: mappedAccountId, isActive: true },
      select: { id: true },
    });
    return bankCashAccount?.id ?? null;
  }

  private async resolvePaymentDtoAccounts(
    payments: PosPaymentDto[],
    accountMappings: PosAccountMappings,
    db: PosDb = this.prisma,
    sessionCashAccountId?: string | null,
  ) {
    for (const payment of payments) {
      let paymentMethod: PosPaymentMethod | null = null;
      if (payment.paymentMethod?.trim()) {
        paymentMethod = this.resolvePosPaymentMethod(payment.paymentMethod);
      } else if (payment.bankCashAccountId?.trim()) {
        const existingBankCashAcc = await db.bankCashAccount.findUnique({
          where: { id: payment.bankCashAccountId.trim() },
          select: { type: true },
        });
        if (!existingBankCashAcc) {
          throw new BadRequestException("Every POS payment must use an active bank/cash account.");
        }
        paymentMethod = this.resolvePosPaymentMethod(existingBankCashAcc.type);
      }

      if (!paymentMethod) {
        throw new BadRequestException("Payment method is required.");
      }

      const mappedBankCashAccountId = await this.resolveMappedBankCashAccountId(
        db,
        paymentMethod,
        accountMappings,
        sessionCashAccountId,
      );
      if (!mappedBankCashAccountId) {
        throw new BadRequestException("طريقة الدفع غير مربوطة بحساب محاسبي");
      }
      payment.paymentMethod = paymentMethod;
      payment.bankCashAccountId = mappedBankCashAccountId;
    }
  }

  private async refreshOriginalSaleReturnStatus(tx: Prisma.TransactionClient, salesInvoiceId: string) {
    const [saleLines, returnLines] = await Promise.all([
      tx.salesInvoiceLine.findMany({
        where: { salesInvoiceId },
        select: { id: true, quantity: true },
      }),
      tx.posReturnLine.findMany({
        where: {
          posReturn: {
            salesInvoiceId,
            status: { not: PosReturnStatus.REVERSED },
          },
        },
        select: { salesInvoiceLineId: true, quantity: true },
      }),
    ]);

    const returnedByLine = new Map<string, number>();
    for (const row of returnLines) {
      if (!row.salesInvoiceLineId) {
        continue;
      }
      const current = returnedByLine.get(row.salesInvoiceLineId) ?? 0;
      returnedByLine.set(row.salesInvoiceLineId, current + Number(row.quantity));
    }

    const fullyReturned = saleLines.length > 0 && saleLines.every((line) => {
      const returned = returnedByLine.get(line.id) ?? 0;
      return returned >= Number(line.quantity);
    });

    await tx.salesInvoice.update({
      where: { id: salesInvoiceId },
      data: {
        posOperationalStatus: fullyReturned
          ? PosOperationalStatus.REFUNDED
          : PosOperationalStatus.COMPLETED,
      },
    });
  }

  private async loadCompletedPosSalesForReports(user?: AuthorizedUser) {
    const canSeeAll = this.canReviewAllSessions(user);
    return this.prisma.salesInvoice.findMany({
      where: {
        invoiceType: SalesInvoiceType.POS,
        posOperationalStatus: PosOperationalStatus.COMPLETED,
        ...(canSeeAll ? {} : { posSession: { cashierUserId: user?.userId ?? undefined } }),
      },
      include: {
        posPayments: true,
        lines: true,
        deliveryCompany: {
          select: {
            id: true,
            name: true,
            arabicName: true,
          },
        },
        posSession: {
          select: {
            id: true,
            branchName: true,
            cashierUser: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      take: 500,
    });
  }

  private normalizePayments(
    payments: PosPaymentDto[],
    accountMap: Map<
      string,
      {
        id: string;
        name: string;
        type: string;
        currencyCode: string;
        accountId: string;
        account: {
          id: string;
          code: string;
          name: string;
          isActive: boolean;
          isPosting: boolean;
          allowManualPosting: boolean;
        };
      }
    >,
    invoiceTotal: number,
    allowCreditSale = false,
  ) {
    if (!payments.length) {
      throw new BadRequestException("At least one payment method is required.");
    }

    const normalized = payments.map((payment) => {
      const account = accountMap.get(payment.bankCashAccountId!);
      if (!account) {
        throw new BadRequestException("Payment account is missing or inactive.");
      }
      if (!account.account.isActive || !account.account.isPosting || !account.account.allowManualPosting) {
        throw new BadRequestException(
          `Payment account ${account.account.code} must be active and posting.`,
        );
      }
      return {
        bankCashAccountId: payment.bankCashAccountId!,
        amount: Number(payment.amount.toFixed(2)),
        reference: payment.reference,
        paymentMethod: payment.paymentMethod || this.mapPaymentMethod(account.type),
        accountId: account.accountId,
      };
    });

    const totalTendered = Number(
      normalized.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
    );
    if (totalTendered < invoiceTotal && !allowCreditSale) {
      throw new BadRequestException("Total paid amount is less than the POS invoice total.");
    }

    let remainingChange = Number((Math.max(totalTendered - invoiceTotal, 0)).toFixed(2));
    if (remainingChange > 0 && !normalized.some((payment) => payment.paymentMethod === PosPaymentMethod.CASH)) {
      throw new BadRequestException("POS change can only be returned against cash payments.");
    }

    const applied = normalized.map((payment) => ({
      ...payment,
      appliedAmount: payment.amount,
    }));
    for (let index = applied.length - 1; index >= 0 && remainingChange > 0; index -= 1) {
      const payment = applied[index];
      if (payment.paymentMethod !== PosPaymentMethod.CASH) {
        continue;
      }
      const deduction = Math.min(payment.appliedAmount, remainingChange);
      payment.appliedAmount = Number((payment.appliedAmount - deduction).toFixed(2));
      remainingChange = Number((remainingChange - deduction).toFixed(2));
    }
    if (remainingChange > 0) {
      throw new BadRequestException("Cash payment is required to cover POS change.");
    }

    const totalApplied = Number(
      applied.reduce((sum, payment) => sum + payment.appliedAmount, 0).toFixed(2),
    );
    if (
      !allowCreditSale &&
      totalApplied !== Number(invoiceTotal.toFixed(2))
    ) {
      throw new BadRequestException("POS payment allocation does not equal the invoice total.");
    }
    if (allowCreditSale && totalApplied > Number(invoiceTotal.toFixed(2))) {
      throw new BadRequestException("POS payment allocation cannot exceed the invoice total.");
    }

    const outstandingAmount = Number((invoiceTotal - totalApplied).toFixed(2));
    if (outstandingAmount < 0) {
      throw new BadRequestException("POS outstanding amount cannot be negative.");
    }

    const cashAppliedAmount = Number(
      applied
        .filter((payment) => payment.paymentMethod === PosPaymentMethod.CASH)
        .reduce((sum, payment) => sum + payment.appliedAmount, 0)
        .toFixed(2),
    );

    return {
      payments: applied,
      totalTendered,
      changeAmount: Number((totalTendered - totalApplied).toFixed(2)),
      cashAppliedAmount,
      totalApplied,
      outstandingAmount,
    };
  }

  private async resolvePaymentAccounts(payments: PosPaymentDto[]) {
    const ids = Array.from(
      new Set(payments.map((payment) => payment.bankCashAccountId!.trim())),
    );
    const accounts = await this.prisma.bankCashAccount.findMany({
      where: { id: { in: ids }, isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        currencyCode: true,
        accountId: true,
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            isPosting: true,
            allowManualPosting: true,
          },
        },
      },
    });
    if (accounts.length !== ids.length) {
      throw new BadRequestException("Every POS payment must use an active bank/cash account.");
    }
    return new Map(accounts.map((account) => [account.id, account]));
  }

  private aggregatePaymentDebits(
    payments: Array<{ accountId: string; appliedAmount: number }>,
    description: string,
  ) {
    const byAccount = new Map<string, number>();
    for (const payment of payments) {
      const accountId = payment.accountId;
      const current = byAccount.get(accountId) ?? 0;
      byAccount.set(accountId, Number((current + payment.appliedAmount).toFixed(2)));
    }

    return Array.from(byAccount.entries()).map(([accountId, amount]) => ({
      accountId,
      description,
      debitAmount: amount,
      creditAmount: 0,
    }));
  }

  private requiresPaymentReference(method: PosPaymentMethod) {
    return (
      method === PosPaymentMethod.CARD ||
      method === PosPaymentMethod.CLIQ ||
      method === PosPaymentMethod.BANK_TRANSFER ||
      method === PosPaymentMethod.WALLET
    );
  }

  private async resolveCorrectionBankCashAccountId(
    tx: Prisma.TransactionClient,
    invoice: {
      posSessionId: string | null;
      posSession?: { cashAccountId: string } | null;
    },
    currentPayment: {
      bankCashAccountId: string;
      bankCashAccount: { type: string };
    },
    paymentMethod: PosPaymentMethod,
  ) {
    const accountMappings = await this.getPosAccountMappings(tx);
    const resolved = await this.resolveMappedBankCashAccountId(
      tx,
      paymentMethod,
      accountMappings,
      invoice.posSession?.cashAccountId,
    );
    if (!resolved) {
      throw new BadRequestException("طريقة الدفع غير مربوطة بحساب محاسبي");
    }
    return resolved;
  }

  private async recomputeSessionExpectedCash(
    tx: Prisma.TransactionClient,
    sessionId: string,
  ) {
    const session = await tx.posSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: {
        openingCash: true,
        salesInvoices: {
          where: {
            invoiceType: SalesInvoiceType.POS,
            posOperationalStatus: PosOperationalStatus.COMPLETED,
          },
          select: {
            posPayments: {
              select: {
                amount: true,
                paymentMethod: true,
                deliveryCompanyId: true,
              },
            },
          },
        },
        posReturns: {
          where: {
            status: { not: PosReturnStatus.REVERSED },
          },
          select: {
            payments: {
              select: {
                amount: true,
                refundMethod: true,
              },
            },
          },
        },
      },
    });

    const cashSales = session.salesInvoices.reduce((sum, sale) => {
      const saleCash = sale.posPayments.reduce((paymentSum, payment) => {
        if (
          payment.paymentMethod !== PosPaymentMethod.CASH ||
          payment.deliveryCompanyId
        ) {
          return paymentSum;
        }
        return paymentSum + Number(payment.amount);
      }, 0);
      return sum + saleCash;
    }, 0);

    const cashRefunds = session.posReturns.reduce((sum, posReturn) => {
      const refundCash = posReturn.payments.reduce((paymentSum, payment) => {
        if (payment.refundMethod !== PosRefundMethod.CASH) {
          return paymentSum;
        }
        return paymentSum + Number(payment.amount);
      }, 0);
      return sum + refundCash;
    }, 0);

    const expectedCash = Number(
      (Number(session.openingCash) + cashSales - cashRefunds).toFixed(2),
    );

    await tx.posSession.update({
      where: { id: sessionId },
      data: {
        expectedCash: this.toAmount(expectedCash),
      },
    });

    return expectedCash;
  }

  private async buildCorrectedInvoiceDebitLines(
    tx: Prisma.TransactionClient,
    invoice: {
      reference: string;
      description?: string | null;
      totalAmount: Prisma.Decimal | number | string;
      outstandingAmount: Prisma.Decimal | number | string;
      customer: { receivableAccountId: string };
      deliveryCompany?: { id: string; receivableAccountId: string | null } | null;
      posPayments: Array<{
        amount: Prisma.Decimal | number | string;
        paymentMethod: PosPaymentMethod;
        deliveryCompanyId?: string | null;
        bankCashAccount: { accountId: string };
        deliveryCompany?: { receivableAccountId: string | null } | null;
      }>;
    },
    description: string,
  ) {
    const debitByAccount = new Map<string, number>();
    const addAmount = (accountId: string, amount: number) => {
      const current = debitByAccount.get(accountId) ?? 0;
      debitByAccount.set(accountId, Number((current + amount).toFixed(2)));
    };
    const accountMappings = await this.getPosAccountMappings(tx);

    for (const payment of invoice.posPayments) {
      const amount = Number(payment.amount);
      if (amount <= 0) {
        continue;
      }

      let accountId =
        payment.bankCashAccount?.accountId ||
        this.getMappedAccountIdForPaymentMethod(payment.paymentMethod, accountMappings) ||
        "";
      if (
        payment.paymentMethod === PosPaymentMethod.DELIVERY &&
        payment.deliveryCompany?.receivableAccountId &&
        invoice.deliveryCompany?.id &&
        payment.deliveryCompanyId === invoice.deliveryCompany.id
      ) {
        accountId = payment.deliveryCompany.receivableAccountId;
      }
      if (!accountId) {
        throw new BadRequestException("طريقة الدفع غير مربوطة بحساب محاسبي");
      }
      addAmount(accountId, amount);
    }

    const totalApplied = Number(
      invoice.posPayments.reduce((sum, payment) => sum + Number(payment.amount), 0).toFixed(2),
    );
    const outstandingAmount = Math.max(
      0,
      Number((Number(invoice.totalAmount ?? invoice.outstandingAmount ?? 0) - totalApplied).toFixed(2)),
    );
    if (outstandingAmount > 0) {
      const receivableAccountId =
        invoice.deliveryCompany?.receivableAccountId || invoice.customer.receivableAccountId;
      addAmount(receivableAccountId, outstandingAmount);
    }

    return Array.from(debitByAccount.entries()).map(([accountId, amount]) => ({
      accountId,
      description,
      debitAmount: amount,
      creditAmount: 0,
    }));
  }

  private async refreshInvoiceDraftAccountingPreview(
    tx: Prisma.TransactionClient,
    invoiceId: string,
  ) {
    const invoice = await tx.salesInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        customer: {
          select: {
            receivableAccountId: true,
          },
        },
        deliveryCompany: {
          select: {
            id: true,
            receivableAccountId: true,
          },
        },
        posPayments: {
          include: {
            bankCashAccount: {
              select: {
                accountId: true,
              },
            },
            deliveryCompany: {
              select: {
                receivableAccountId: true,
              },
            },
          },
        },
        journalEntry: {
          select: {
            id: true,
            status: true,
            lines: {
              include: {
                account: {
                  select: {
                    type: true,
                  },
                },
              },
              orderBy: { lineNumber: "asc" },
            },
          },
        },
      },
    });

    if (!invoice.journalEntry?.id || invoice.journalEntry.status === JournalEntryStatus.POSTED) {
      return;
    }

    const description = invoice.description
      ? `${invoice.reference} - ${invoice.description}`
      : invoice.reference;
    const debitLines = await this.buildCorrectedInvoiceDebitLines(tx, invoice, description);
    const preservedLines = invoice.journalEntry.lines
      .filter((line) => !(Number(line.debitAmount) > 0 && line.account.type === AccountType.ASSET))
      .map((line) => ({
        accountId: line.accountId,
        description: line.description,
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
      }));
    const journalLines = [...debitLines, ...preservedLines];
    this.salesReceivablesService.ensureBalancedJournalLines(journalLines);

    await tx.journalEntryLine.deleteMany({
      where: { journalEntryId: invoice.journalEntry.id },
    });
    await tx.journalEntryLine.createMany({
      data: journalLines.map((line, index) => ({
        journalEntryId: invoice.journalEntry!.id,
        accountId: line.accountId,
        lineNumber: index + 1,
        description: line.description ?? null,
        debitAmount: this.toAmount(line.debitAmount),
        creditAmount: this.toAmount(line.creditAmount),
      })),
    });
  }

  private async syncSessionGroupedJournalEntry(
    tx: Prisma.TransactionClient,
    sessionId: string,
  ) {
    if ((await this.getPosPostingMode(tx)) !== "BY_SESSION") {
      return null;
    }

    const existingSessionJournal = await tx.journalEntry.findFirst({
      where: {
        sourceType: "PosSession",
        sourceId: sessionId,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        reference: true,
        status: true,
        postedAt: true,
      },
    });

    if (existingSessionJournal?.status === JournalEntryStatus.POSTED) {
      return existingSessionJournal;
    }

    const sales = await tx.salesInvoice.findMany({
      where: {
        invoiceType: SalesInvoiceType.POS,
        posSessionId: sessionId,
        posOperationalStatus: PosOperationalStatus.COMPLETED,
        posAccountingStatus: {
          in: [
            PosAccountingStatus.PENDING_REVIEW,
            PosAccountingStatus.REJECTED,
            PosAccountingStatus.UNPOSTED,
          ],
        },
      },
      include: {
        customer: {
          select: {
            receivableAccountId: true,
          },
        },
        deliveryCompany: {
          select: {
            id: true,
            receivableAccountId: true,
          },
        },
        lines: {
          select: {
            id: true,
            lineNumber: true,
            revenueAccountId: true,
            taxId: true,
            taxAmount: true,
            lineSubtotalAmount: true,
          },
          orderBy: { lineNumber: "asc" },
        },
        posPayments: {
          include: {
            bankCashAccount: {
              select: {
                accountId: true,
                account: {
                  select: {
                    id: true,
                    isActive: true,
                    isPosting: true,
                    allowManualPosting: true,
                  },
                },
              },
            },
            deliveryCompany: {
              select: {
                receivableAccountId: true,
              },
            },
          },
        },
      },
      orderBy: [{ posCompletedAt: "asc" }, { createdAt: "asc" }],
    });

    if (!sales.length) {
      if (existingSessionJournal?.id) {
        await tx.journalEntryLine.deleteMany({
          where: { journalEntryId: existingSessionJournal.id },
        });
        await tx.journalEntry.delete({
          where: { id: existingSessionJournal.id },
        });
      }
      return null;
    }

    const legacyDraftJournalIds = sales
      .map((sale) => sale.journalEntryId)
      .filter((id): id is string => Boolean(id));

    if (legacyDraftJournalIds.length) {
      await tx.salesInvoice.updateMany({
        where: { id: { in: sales.map((sale) => sale.id) } },
        data: { journalEntryId: null },
      });
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: { in: legacyDraftJournalIds } },
      });
      await tx.journalEntry.deleteMany({
        where: {
          id: { in: legacyDraftJournalIds },
          status: "DRAFT",
        },
      });
    }

    const session = await tx.posSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: {
        id: true,
        sessionNumber: true,
      },
    });

    const journalLines = await this.buildGroupedSessionJournalLines(tx, sales, session.sessionNumber);
    this.salesReceivablesService.ensureBalancedJournalLines(journalLines);

    if (existingSessionJournal?.id) {
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: existingSessionJournal.id },
      });
      await tx.journalEntry.delete({
        where: { id: existingSessionJournal.id },
      });
    }

    const latestInvoiceDate = sales[sales.length - 1]?.invoiceDate ?? new Date();
    return this.journalEntriesService.create(
      {
        entryDate: latestInvoiceDate.toISOString(),
        description: `POS session ${session.sessionNumber} grouped posting`,
        sourceType: "PosSession",
        sourceId: session.id,
        sourceNumber: session.sessionNumber,
        lines: journalLines,
      },
      { tx },
    );
  }

  private async buildGroupedSessionJournalLines(
    tx: Prisma.TransactionClient,
    sales: Array<any>,
    sessionNumber: string,
  ) {
    const debitByAccount = new Map<string, number>();
    const creditByAccount = new Map<string, number>();

    const addAmount = (bucket: Map<string, number>, accountId: string, amount: number) => {
      const current = bucket.get(accountId) ?? 0;
      bucket.set(accountId, Number((current + amount).toFixed(2)));
    };

    const accountMappings = await this.getPosAccountMappings(tx);

    const salesRevenueAccountId = accountMappings.salesRevenueAccountId || (await tx.account.findFirst({
      where: { code: "4110001" },
      select: { id: true },
    }))?.id;

    if (!salesRevenueAccountId) {
      throw new BadRequestException("Sales revenue account is not configured.");
    }

    for (const sale of sales) {
      for (const payment of sale.posPayments) {
        const amount = Number(payment.amount);
        if (amount <= 0) {
          continue;
        }

        let debitAccountId =
          payment.bankCashAccount?.accountId ||
          this.getMappedAccountIdForPaymentMethod(payment.paymentMethod, accountMappings) ||
          "";
        if (
          payment.deliveryCompany?.receivableAccountId &&
          sale.deliveryCompany?.id &&
          payment.deliveryCompanyId === sale.deliveryCompany.id
        ) {
          debitAccountId = payment.deliveryCompany.receivableAccountId;
        } else if (
          payment.paymentMethod !== PosPaymentMethod.CASH ||
          !payment.bankCashAccount?.accountId
        ) {
          debitAccountId =
            this.getMappedAccountIdForPaymentMethod(payment.paymentMethod, accountMappings) || "";
        }
        if (!debitAccountId) {
          throw new BadRequestException("طريقة الدفع غير مربوطة بحساب محاسبي");
        }
        addAmount(debitByAccount, debitAccountId, amount);
      }

      const totalApplied = Number(
        sale.posPayments.reduce(
          (sum: number, payment: { amount: Prisma.Decimal | number | string }) =>
            sum + Number(payment.amount),
          0,
        ).toFixed(2),
      );
      const outstandingAmount = Math.max(
        0,
        Number((Number(sale.totalAmount ?? sale.outstandingAmount ?? 0) - totalApplied).toFixed(2)),
      );
      if (outstandingAmount > 0) {
        const receivableAccountId =
          sale.deliveryCompany?.receivableAccountId || sale.customer?.receivableAccountId;
        if (!receivableAccountId) {
          throw new BadRequestException(
            `POS sale ${sale.reference} requires a receivable account for the outstanding balance.`,
          );
        }
        addAmount(debitByAccount, receivableAccountId, outstandingAmount);
      }

      const { creditLines, debitLines } = await this.buildSaleAccountingCredits(
        tx,
        sale,
        accountMappings,
        "",
      );

      for (const line of creditLines) {
        addAmount(creditByAccount, line.accountId, line.creditAmount);
      }
      for (const line of debitLines) {
        addAmount(debitByAccount, line.accountId, line.debitAmount);
      }
    }

    const description = `POS session ${sessionNumber} grouped posting`;
    const journalLines = [
      ...Array.from(debitByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description,
        debitAmount: Number(amount.toFixed(2)),
        creditAmount: 0,
      })),
      ...Array.from(creditByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description,
        debitAmount: 0,
        creditAmount: Number(amount.toFixed(2)),
      })),
    ];

    return this.applySmallBalancingAdjustment(
      journalLines,
      salesRevenueAccountId,
      `${description} rounding adjustment`,
    );
  }

  private applySmallBalancingAdjustment(
    lines: Array<{
      accountId: string;
      description: string;
      debitAmount: number;
      creditAmount: number;
    }>,
    balancingAccountId: string,
    description: string,
  ) {
    const totalDebit = Number(
      lines.reduce((sum, line) => sum + Number(line.debitAmount), 0).toFixed(2),
    );
    const totalCredit = Number(
      lines.reduce((sum, line) => sum + Number(line.creditAmount), 0).toFixed(2),
    );
    const delta = Number((totalDebit - totalCredit).toFixed(2));

    if (delta === 0) {
      return lines;
    }

    // Allow only tiny balancing drift caused by persisted line/header rounding.
    if (Math.abs(delta) > 0.05) {
      return lines;
    }

    return [
      ...lines,
      {
        accountId: balancingAccountId,
        description,
        debitAmount: delta < 0 ? Number(Math.abs(delta).toFixed(2)) : 0,
        creditAmount: delta > 0 ? Number(delta.toFixed(2)) : 0,
      },
    ];
  }

  private async getPosSalesTaxAccountId(tx: Prisma.TransactionClient) {
    const account = await tx.account.findFirst({
      where: {
        type: "LIABILITY",
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
        OR: [
          { subtype: { contains: "tax", mode: "insensitive" } },
          { subtype: { contains: "vat", mode: "insensitive" } },
          { name: { contains: "tax", mode: "insensitive" } },
          { name: { contains: "vat", mode: "insensitive" } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    return account?.id ?? null;
  }

  private async ensureWalkInCustomer() {
    const existing = await this.prisma.customer.findFirst({
      where: {
        OR: [
          { code: POS_WALK_IN_CUSTOMER_CODE },
          { name: POS_WALK_IN_CUSTOMER_NAME },
        ],
      },
      select: { id: true, isActive: true },
    });
    if (existing?.isActive) {
      return existing;
    }

    const taxTreatment = await this.prisma.taxTreatment.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!taxTreatment) {
      throw new BadRequestException("An active tax treatment is required before using POS.");
    }

    try {
      const created = await this.salesReceivablesService.createCustomer({
        code: POS_WALK_IN_CUSTOMER_CODE,
        name: POS_WALK_IN_CUSTOMER_NAME,
        taxTreatmentId: taxTreatment.id,
        creditLimit: 0,
        receivableAccountLinkMode: "AUTO",
      });
      return { id: created.id, isActive: created.isActive };
    } catch (error) {
      const fallback = await this.prisma.customer.findFirst({
        where: { code: POS_WALK_IN_CUSTOMER_CODE },
        select: { id: true, isActive: true },
      });
      if (!fallback) {
        throw error;
      }
      if (!fallback.isActive) {
        throw new BadRequestException("POS walk-in customer exists but is inactive.");
      }
      return fallback;
    }
  }

  private async ensureOpenSession(id: string) {
    const session = await this.prisma.posSession.findUnique({
      where: { id },
      include: this.posSessionInclude(),
    });
    if (!session) {
      throw new BadRequestException(`POS session ${id} was not found.`);
    }
    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException("POS session must be open before creating or completing sales.");
    }
    return session;
  }

  private ensureDraftLikePosSale(
    sale: {
      id: string;
      posSessionId: string | null;
      invoiceType: SalesInvoiceType;
      posOperationalStatus: PosOperationalStatus | null;
      journalEntryId: string | null;
    },
    sessionId: string,
  ) {
    if (sale.invoiceType !== SalesInvoiceType.POS || sale.posSessionId !== sessionId) {
      throw new BadRequestException("POS sale does not belong to the selected session.");
    }
    if (
      sale.posOperationalStatus !== PosOperationalStatus.DRAFT &&
      sale.posOperationalStatus !== PosOperationalStatus.HELD
    ) {
      throw new BadRequestException("Only draft or held POS sales can be updated.");
    }
    if (sale.journalEntryId) {
      throw new BadRequestException("POS sale already has accounting activity and cannot be rewritten.");
    }
  }

  private async ensureWarehouse(id: string) {
    const warehouse = await this.prisma.inventoryWarehouse.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!warehouse?.isActive) {
      throw new BadRequestException("POS session warehouse must be active.");
    }
    return warehouse;
  }

  private async ensureUserExists(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!u?.isActive) {
      throw new BadRequestException("User session is invalid. Please login again.");
    }
    return u;
  }

  private async ensureBankCashAccount(id: string) {
    const account = await this.prisma.bankCashAccount.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!account?.isActive) {
      throw new BadRequestException("POS bank/cash account must be active.");
    }
    return account;
  }

  private async ensureSessionExists(id: string) {
    const session = await this.prisma.posSession.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!session) {
      throw new BadRequestException(`POS session ${id} was not found.`);
    }
    return session;
  }

  private async ensureSessionAccess(id: string, user?: AuthorizedUser) {
    const session = await this.prisma.posSession.findUnique({
      where: { id },
      select: { id: true, cashierUserId: true },
    });
    if (!session) {
      throw new BadRequestException(`POS session ${id} was not found.`);
    }
    const canSeeAll = this.canReviewAllSessions(user);
    const isWaiter = user?.posRoles?.includes("WAITER");
    if (!canSeeAll && !isWaiter && session.cashierUserId && session.cashierUserId !== user?.userId) {
      throw new BadRequestException("You do not have permission to access this POS session.");
    }
    return session;
  }

  private mapPaymentMethod(raw: string) {
    return this.resolvePosPaymentMethod(raw);
  }

  private async generateSessionNumber() {
    const today = this.dateStamp();
    const prefix = `SESSION-${today}-`;
    const last = await this.prisma.posSession.findFirst({
      where: { sessionNumber: { startsWith: prefix } },
      orderBy: { sessionNumber: "desc" },
      select: { sessionNumber: true },
    });
    const lastSequence = last?.sessionNumber.split("-").pop();
    const nextNumber = (lastSequence ? Number.parseInt(lastSequence, 10) : 0) + 1;
    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  }

  private async generateInvoiceReference(tx: Prisma.TransactionClient) {
    const today = this.dateStamp();
    const prefix = `POS-${today}-`;
    const last = await tx.salesInvoice.findFirst({
      where: { reference: { startsWith: prefix } },
      orderBy: { reference: "desc" },
      select: { reference: true },
    });
    const lastSequence = last?.reference.split("-").pop();
    const nextNumber = (lastSequence ? Number.parseInt(lastSequence, 10) : 0) + 1;
    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  private async generateReceiptNumber(tx: Prisma.TransactionClient) {
    const today = this.dateStamp();
    const prefix = `RECEIPT-${today}-`;
    const last = await tx.salesInvoice.findFirst({
      where: { posReceiptNumber: { startsWith: prefix } },
      orderBy: { posReceiptNumber: "desc" },
      select: { posReceiptNumber: true },
    });
    const lastSequence = last?.posReceiptNumber?.split("-").pop();
    const nextNumber = (lastSequence ? Number.parseInt(lastSequence, 10) : 0) + 1;
    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  private async generateReturnReference(tx: Prisma.TransactionClient) {
    const today = this.dateStamp();
    const prefix = `RETURN-${today}-`;
    const last = await tx.posReturn.findFirst({
      where: { reference: { startsWith: prefix } },
      orderBy: { reference: "desc" },
      select: { reference: true },
    });
    const lastSequence = last?.reference.split("-").pop();
    const nextNumber = (lastSequence ? Number.parseInt(lastSequence, 10) : 0) + 1;
    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  private dateStamp() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  private async generateDeliverySettlementReference(tx: Prisma.TransactionClient) {
    const stamp = this.dateStamp();
    const prefix = `DCS-${stamp}-`;
    const rows = await tx.deliveryCompanySettlement.findMany({
      where: { reference: { startsWith: prefix } },
      select: { reference: true },
      orderBy: { reference: "desc" },
      take: 50,
    });
    let nextNumber = 1;
    for (const row of rows) {
      const candidate = Number(row.reference.slice(prefix.length));
      if (Number.isFinite(candidate)) {
        nextNumber = Math.max(nextNumber, candidate + 1);
      }
    }
    return `${prefix}${nextNumber}`;
  }

  private async loadSettlementCandidateOrders(
    deliveryCompanyId: string,
    periodFromRaw: string,
    periodToRaw: string,
    selectedInvoiceIds?: string[],
  ) {
    const periodFrom = new Date(periodFromRaw);
    const periodTo = new Date(periodToRaw);
    if (Number.isNaN(periodFrom.getTime()) || Number.isNaN(periodTo.getTime())) {
      throw new BadRequestException("Settlement period dates are invalid.");
    }
    if (periodTo < periodFrom) {
      throw new BadRequestException("Settlement period end must be on or after the period start.");
    }

    const company = await this.prisma.deliveryCompany.findUnique({
      where: { id: deliveryCompanyId, isActive: true },
    });
    if (!company) {
      throw new BadRequestException(`Delivery company ${deliveryCompanyId} was not found or is inactive.`);
    }

    const orders = await this.prisma.salesInvoice.findMany({
      where: {
        id: selectedInvoiceIds?.length ? { in: selectedInvoiceIds } : undefined,
        invoiceType: SalesInvoiceType.POS,
        deliveryCompanyId,
        deliveryCollectionMethod: DeliveryCollectionMethod.COMPANY,
        posOperationalStatus: PosOperationalStatus.COMPLETED,
        OR: [
          { deliverySettlementStatus: null },
          { deliverySettlementStatus: DeliverySettlementStatus.PENDING },
          { deliverySettlementStatus: DeliverySettlementStatus.PARTIALLY_SETTLED },
          { deliverySettlementStatus: DeliverySettlementStatus.DIFFERENCE },
        ],
        posCompletedAt: {
          gte: periodFrom,
          lte: periodTo,
        },
      },
      include: {
        posSession: {
          select: {
            branchName: true,
          },
        },
      },
      orderBy: [{ posCompletedAt: "asc" }, { createdAt: "asc" }],
    });

    const grossOrdersAmount = orders.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
    return {
      company,
      periodFrom,
      periodTo,
      orders,
      grossOrdersAmount,
    };
  }

  private mapDeliveryCompanySettlement(row: any) {
    const differenceAmount = Number(row.differenceAmount ?? 0);
    return {
      id: row.id,
      reference: row.reference,
      deliveryCompany: row.deliveryCompany
        ? {
            id: row.deliveryCompany.id,
            name: row.deliveryCompany.name,
            arabicName: row.deliveryCompany.arabicName ?? null,
          }
        : null,
      periodFrom: row.periodFrom.toISOString(),
      periodTo: row.periodTo.toISOString(),
      settlementDate: row.settlementDate.toISOString(),
      statementReference: row.statementReference ?? null,
      bankCashAccount: row.bankCashAccount
        ? {
            id: row.bankCashAccount.id,
            name: row.bankCashAccount.name,
            type: row.bankCashAccount.type,
          }
        : null,
      grossOrdersAmount: row.grossOrdersAmount.toString(),
      statementAmount: row.statementAmount.toString(),
      commissionAmount: row.commissionAmount.toString(),
      serviceFeeAmount: row.serviceFeeAmount.toString(),
      refundAmount: row.refundAmount.toString(),
      adjustmentAmount: row.adjustmentAmount.toString(),
      differenceAmount: row.differenceAmount.toString(),
      differenceReason: row.differenceReason ?? null,
      differenceNotes: row.differenceNotes ?? null,
      netReceivedAmount: row.netReceivedAmount.toString(),
      statementAttachmentUrl: row.statementAttachmentUrl ?? null,
      bankReceiptAttachmentUrl: row.bankReceiptAttachmentUrl ?? null,
      status: row.reversedAt
        ? "REVERSED"
        : differenceAmount !== 0
          ? DeliverySettlementStatus.DIFFERENCE
          : DeliverySettlementStatus.SETTLED,
      journalEntry: row.journalEntry
        ? {
            id: row.journalEntry.id,
            reference: row.journalEntry.reference,
            status: row.journalEntry.status,
            postedAt: row.journalEntry.postedAt?.toISOString() ?? null,
          }
        : null,
      orders: (row.orders ?? []).map((orderRow: any) => ({
        salesInvoiceId: orderRow.salesInvoiceId ?? orderRow.salesInvoice?.id,
        reference: orderRow.salesInvoice?.reference ?? null,
        grossAmount: orderRow.grossAmount.toString(),
        totalAmount: orderRow.salesInvoice?.totalAmount?.toString() ?? null,
      })),
      reversedAt: row.reversedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAmount(value: number | string | Prisma.Decimal) {
    return new Prisma.Decimal(value).toDecimalPlaces(2);
  }

  private toQuantity(value: number | string | Prisma.Decimal) {
    return new Prisma.Decimal(value).toDecimalPlaces(4);
  }

  private parseBoolean(value: string | undefined | null, fallback: boolean) {
    if (value === undefined || value === null) {
      return fallback;
    }
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(normalized);
  }

  private async getPosPostingMode(db: PosDb = this.prisma): Promise<"BY_INVOICE" | "BY_SESSION"> {
    const config = await this.getPosRuntimeConfig(db);
    return config.postingMode;
  }

  private async isPosCogsPostingEnabled(db: PosDb = this.prisma) {
    const config = await this.getPosRuntimeConfig(db);
    return config.cogsPostingEnabled;
  }

  private resolvePosPostingMode(value: string | undefined | null): "BY_INVOICE" | "BY_SESSION" {
    return value?.trim().toUpperCase() === "BY_INVOICE"
      ? "BY_INVOICE"
      : "BY_SESSION";
  }

  private async getPosRuntimeConfig(db: PosDb = this.prisma) {
    let overrides = new Map<string, string>();
    try {
      const rows = await db.$queryRaw<Array<{ key: string; value: string }>>(Prisma.sql`
        SELECT "key", "value"
        FROM "PosRuntimeSetting"
        WHERE "key" IN ('POS_POSTING_MODE', 'POS_COGS_POSTING_ENABLED', 'POS_TAX_FREE_ENABLED')
      `);
      overrides = new Map(rows.map((row) => [row.key, row.value]));
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code !== "P2021" && code !== "P2022") {
        throw error;
      }
    }
    return {
      postingMode: this.resolvePosPostingMode(
        overrides.get("POS_POSTING_MODE") ?? process.env.POS_POSTING_MODE,
      ),
      cogsPostingEnabled: this.parseBoolean(
        overrides.get("POS_COGS_POSTING_ENABLED") ?? process.env.POS_COGS_POSTING_ENABLED,
        false,
      ),
      taxFreeEnabled: this.parseBoolean(
        overrides.get("POS_TAX_FREE_ENABLED") ?? process.env.POS_TAX_FREE_ENABLED,
        true,
      ),
    };
  }

  private async upsertPosRuntimeSetting(db: PosDb, key: string, value: string) {
    await db.$executeRaw(Prisma.sql`
      INSERT INTO "PosRuntimeSetting" ("key", "value", "createdAt", "updatedAt")
      VALUES (${key}, ${value}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("key")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "updatedAt" = CURRENT_TIMESTAMP
    `);
  }

  private parseTaxPolicy(value: string | undefined) {
    return value?.trim().toUpperCase() === "AFTER_TAX" ? "AFTER_TAX" : "BEFORE_TAX";
  }

  private posSessionInclude() {
    return {
      warehouse: { select: { id: true, code: true, name: true } },
      cashAccount: {
        select: {
          id: true,
          name: true,
          type: true,
          currencyCode: true,
          account: { select: { id: true, code: true, name: true } },
        },
      },
      cashierUser: { select: { id: true, email: true, name: true } },
      salesInvoices: {
        where: {
          invoiceType: SalesInvoiceType.POS,
          posOperationalStatus: PosOperationalStatus.COMPLETED,
        },
        select: {
          id: true,
          totalAmount: true,
          discountAmount: true,
          taxAmount: true,
          posAccountingStatus: true,
          posPayments: {
            select: {
              amount: true,
              paymentMethod: true,
              deliveryCompanyId: true,
            },
          },
        },
      },
      posReturns: {
        where: {
          status: { not: PosReturnStatus.REVERSED },
        },
        select: {
          id: true,
          totalAmount: true,
          discountAmount: true,
          taxAmount: true,
          payments: {
            select: {
              amount: true,
              refundMethod: true,
            },
          },
        },
      },
    } satisfies Prisma.PosSessionInclude;
  }

  private posSaleInclude() {
    return {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      table: {
        select: {
          id: true,
          tableNumber: true,
          status: true,
          activeInvoiceId: true,
        },
      },
      waiter: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      deliveryCompany: {
        select: {
          id: true,
          name: true,
          arabicName: true,
          receivableAccountId: true,
          commissionRate: true,
          commissionAccountId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      posSession: {
        select: {
          id: true,
          sessionNumber: true,
          terminalName: true,
          branchName: true,
          cashierUser: {
            select: { id: true, email: true, name: true },
          },
          warehouse: { select: { id: true, code: true, name: true } },
        },
      },
      kitchenOrder: {
        select: {
          id: true,
          status: true,
          items: { select: { salesInvoiceLineId: true, status: true } },
        },
      },
      lines: {
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              trackInventory: true,
              unitOfMeasure: true,
              allowFractionalQuantity: true,
              unitOfMeasureRef: { select: { decimalPrecision: true } },
            },
          },
          warehouse: { select: { id: true, code: true, name: true } },
        },
        orderBy: { lineNumber: "asc" },
      },
      posPayments: {
        include: {
          bankCashAccount: {
            select: {
              id: true,
              name: true,
              type: true,
              currencyCode: true,
              account: { select: { id: true, code: true, name: true } },
            },
          },
          deliveryCompany: {
            select: {
              id: true,
              name: true,
              arabicName: true,
            },
          },
        },
      },
      journalEntry: {
        select: { id: true, reference: true, status: true, postedAt: true },
      },
    } satisfies Prisma.SalesInvoiceInclude;
  }

  private posReturnInclude() {
    return {
      salesInvoice: {
        select: {
          id: true,
          reference: true,
          posReceiptNumber: true,
        },
      },
      posSession: {
        select: {
          id: true,
          sessionNumber: true,
          branchName: true,
          warehouse: { select: { id: true, code: true, name: true } },
        },
      },
      lines: {
        include: {
          item: { select: { id: true, code: true, name: true, type: true, trackInventory: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          tax: { select: { id: true, taxCode: true, taxName: true, rate: true } },
        },
        orderBy: { lineNumber: "asc" },
      },
      payments: {
        include: {
          bankCashAccount: {
            select: {
              id: true,
              name: true,
              type: true,
              currencyCode: true,
              account: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
      journalEntry: {
        select: { id: true, reference: true, status: true, postedAt: true },
      },
      reviewedByUser: { select: { id: true, email: true, name: true } },
      createdByUser: { select: { id: true, email: true, name: true } },
    } satisfies Prisma.PosReturnInclude;
  }

  private mapSession(row: any) {
    const sales = row.salesInvoices ?? [];
    const returns = row.posReturns ?? [];

    const invoiceCount = sales.length;
    
    // Net totals = sales - returns
    const salesTotal = sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
    const returnsTotal = returns.reduce((sum: number, r: any) => sum + Number(r.totalAmount), 0);
    const totalSales = (salesTotal - returnsTotal).toFixed(2);

    const salesTax = sales.reduce((sum: number, s: any) => sum + Number(s.taxAmount), 0);
    const returnsTax = returns.reduce((sum: number, r: any) => sum + Number(r.taxAmount), 0);
    const taxAmount = (salesTax - returnsTax).toFixed(2);

    const salesDiscount = sales.reduce((sum: number, s: any) => sum + Number(s.discountAmount), 0);
    const returnsDiscount = returns.reduce((sum: number, r: any) => sum + Number(r.discountAmount), 0);
    const discountAmount = (salesDiscount - returnsDiscount).toFixed(2);

    // Cash and Card payments
    let cashSalesVal = 0;
    let cardSalesVal = 0;
    let deliveryCompanySalesVal = 0;

    for (const sale of sales) {
      for (const p of (sale.posPayments ?? [])) {
        const amt = Number(p.amount);
        const normalizedPaymentMethod =
          p.paymentMethod === PosPaymentMethod.DELIVERY || p.deliveryCompanyId
            ? PosPaymentMethod.DELIVERY
            : p.paymentMethod;
        if (normalizedPaymentMethod === PosPaymentMethod.CASH) {
          cashSalesVal += amt;
        } else if (
          [PosPaymentMethod.CARD, PosPaymentMethod.CLIQ, PosPaymentMethod.WALLET].includes(
            normalizedPaymentMethod,
          )
        ) {
          cardSalesVal += amt;
        }
        if (normalizedPaymentMethod === PosPaymentMethod.DELIVERY) {
          deliveryCompanySalesVal += amt;
        }
      }
    }

    for (const ret of returns) {
      for (const p of (ret.payments ?? [])) {
        const amt = Number(p.amount);
        if (p.refundMethod === "CASH") {
          cashSalesVal -= amt;
        } else if (["CARD", "CLIQ", "WALLET"].includes(p.refundMethod)) {
          cardSalesVal -= amt;
        }
      }
    }

    const cashSales = cashSalesVal.toFixed(2);
    const cardSales = cardSalesVal.toFixed(2);
    const deliveryCompanySales = deliveryCompanySalesVal.toFixed(2);

    let accountingStatus: "OPEN" | "CLOSED" | "PENDING_REVIEW" | "REJECTED" | "POSTED" = "OPEN";
    if (row.status === "CLOSED") {
      if (sales.length === 0) {
        accountingStatus = "CLOSED";
      } else if (sales.some((s: any) => s.posAccountingStatus === "PENDING_REVIEW")) {
        accountingStatus = "PENDING_REVIEW";
      } else if (sales.some((s: any) => s.posAccountingStatus === "REJECTED")) {
        accountingStatus = "REJECTED";
      } else if (sales.every((s: any) => s.posAccountingStatus === "POSTED")) {
        accountingStatus = "POSTED";
      } else {
        accountingStatus = "CLOSED";
      }
    }

    return {
      id: row.id,
      sessionNumber: row.sessionNumber,
      terminalName: row.terminalName,
      branchName: row.branchName,
      status: row.status,
      openingCash: row.openingCash.toString(),
      expectedCash: row.expectedCash.toString(),
      actualCash: row.actualCash?.toString() ?? null,
      difference: row.difference?.toString() ?? null,
      differenceStatus: row.differenceStatus ?? null,
      openedAt: row.openedAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
      notes: row.notes,
      warehouse: row.warehouse,
      cashAccount: row.cashAccount,
      cashierUser: row.cashierUser ?? null,
      invoiceCount,
      totalSales,
      cashSales,
      cardSales,
      deliveryCompanySales,
      taxAmount,
      discountAmount,
      accountingStatus,
      reviewStatus: row.reviewStatus ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async mapPosSalesWithHeldContext(rows: any[]) {
    if (!rows.length) {
      return [];
    }

    const saleIds = new Set(rows.map((row) => row.id));
    const reservations = await this.prisma.posTableReservation.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        reservedFrom: true,
        reservedTo: true,
        notes: true,
        table: { select: { tableNumber: true } },
      },
    });

    const reservationBySaleId = new Map<
      string,
      {
        reservationId: string;
        reservedFrom: string;
        reservedTo: string;
        tableNumber: string;
      }
    >();

    for (const reservation of reservations) {
      const parsed = this.parseReservationNotes(reservation.notes);
      if (!parsed.preOrderSaleId || !saleIds.has(parsed.preOrderSaleId)) {
        continue;
      }
      reservationBySaleId.set(parsed.preOrderSaleId, {
        reservationId: reservation.id,
        reservedFrom: reservation.reservedFrom.toISOString(),
        reservedTo: reservation.reservedTo.toISOString(),
        tableNumber: reservation.table.tableNumber,
      });
    }

    return rows.map((row) => {
      const reservation = reservationBySaleId.get(row.id) ?? null;
      const isActiveTableOrder = row.table?.activeInvoiceId === row.id;
      const source = reservation
        ? "RESERVATION_PREORDER"
        : isActiveTableOrder || (row.tableId && row.orderType === "DINE_IN")
          ? "TABLE_ORDER"
          : row.posOperationalStatus === "DRAFT"
            ? "DRAFT"
            : "HELD";

      return {
        ...this.mapPosSale(row),
        heldContext: {
          source,
          reservationId: reservation?.reservationId ?? null,
          reservedFrom: reservation?.reservedFrom ?? null,
          reservedTo: reservation?.reservedTo ?? null,
          tableNumber: reservation?.tableNumber ?? row.table?.tableNumber ?? null,
          orderType: row.orderType ?? null,
          isActiveTableOrder,
        },
      };
    });
  }

  private mapPosSale(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      receiptNumber: row.posReceiptNumber ?? null,
      invoiceDate: row.invoiceDate.toISOString(),
      status: row.status,
      invoiceType: row.invoiceType,
      currencyCode: row.currencyCode,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      discountAmount: row.discountAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      allocatedAmount: row.allocatedAmount.toString(),
      outstandingAmount: row.outstandingAmount.toString(),
      allocationStatus: row.allocationStatus,
      posOperationalStatus: row.posOperationalStatus,
      posAccountingStatus: row.posAccountingStatus,
      posCompletedAt: row.posCompletedAt?.toISOString() ?? null,
      posVoidedAt: row.posVoidedAt?.toISOString() ?? null,
      posVoidReason: row.posVoidReason ?? null,
      posReviewedAt: row.posReviewedAt?.toISOString() ?? null,
      posReviewedByUserId: row.posReviewedByUserId ?? null,
      posReviewNotes: row.posReviewNotes ?? null,
      posChangeAmount: row.posChangeAmount?.toString() ?? null,
      orderType: row.orderType ?? null,
      originalOrderType: row.originalOrderType ?? null,
      tableId: row.tableId ?? null,
      waiterId: row.waiterId ?? null,
      waiterConfirmedAt: row.waiterConfirmedAt?.toISOString() ?? null,
      serviceChargeAmount: row.serviceChargeAmount?.toString() ?? null,
      deliveryFeeAmount: row.deliveryFeeAmount?.toString() ?? null,
      deliveryStatus: row.deliveryStatus ?? null,
      deliveryAddress: row.deliveryAddress ?? null,
      deliveryNotes: row.deliveryNotes ?? null,
      deliveryCompanyId: row.deliveryCompanyId ?? null,
      deliveryCollectionMethod: row.deliveryCollectionMethod ?? null,
      deliverySettlementStatus: row.deliverySettlementStatus ?? null,
      deliverySettledAmount: row.deliverySettledAmount?.toString() ?? "0.00",
      driverId: row.driverId ?? null,
      isCorrected: row.isCorrected ?? false,
      correctedAt: row.correctedAt?.toISOString() ?? null,
      correctionReason: row.correctionReason ?? null,
      postedAt: row.postedAt?.toISOString() ?? null,
      journalEntry: row.journalEntry
        ? {
            id: row.journalEntry.id,
            reference: row.journalEntry.reference,
            status: row.journalEntry.status,
            postedAt: row.journalEntry.postedAt?.toISOString() ?? null,
          }
        : null,
      session: row.posSession ?? null,
      customer: row.customer ?? null,
      table: row.table ?? null,
      waiter: row.waiter ?? null,
      deliveryCompany: row.deliveryCompany ?? null,
      driver: row.driver ?? null,
      lines: row.lines.map((line: any) => {
        const kitchenItem = row.kitchenOrder?.items?.find(
          (item: { salesInvoiceLineId: string | null }) =>
            item.salesInvoiceLineId === line.id,
        );
        return {
          id: line.id,
          lineNumber: line.lineNumber,
          itemId: line.itemId,
          itemName: line.itemName,
          description: line.description,
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
          discountAmount: line.discountAmount.toString(),
          taxAmount: line.taxAmount.toString(),
          lineSubtotalAmount: line.lineSubtotalAmount.toString(),
          lineAmount: line.lineAmount.toString(),
          revenueAccountId: line.revenueAccountId,
          taxId: line.taxId,
          kitchenSentAt: line.kitchenSentAt?.toISOString() ?? null,
          kitchenItemStatus: kitchenItem?.status ?? null,
          modifiers: line.modifiers === null ? undefined : line.modifiers,
          item: line.item ?? null,
          warehouse: line.warehouse ?? null,
        };
      }),
      payments: row.posPayments.map((payment: any) => ({
        id: payment.id,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount.toString(),
        tenderedAmount: payment.tenderedAmount?.toString() ?? null,
        reference: payment.reference ?? null,
        deliveryCompanyId: payment.deliveryCompanyId ?? null,
        deliveryCompany: payment.deliveryCompany ?? null,
        bankCashAccount: payment.bankCashAccount,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapReceipt(row: any) {
    const totalPaid = row.posPayments.reduce(
      (sum: number, payment: any) => sum + Number(payment.tenderedAmount ?? payment.amount),
      0,
    );
    const appliedPaid = row.posPayments.reduce(
      (sum: number, payment: any) => sum + Number(payment.amount),
      0,
    );
    return {
      receiptNumber: row.posReceiptNumber,
      soldAt: row.posCompletedAt?.toISOString() ?? row.updatedAt.toISOString(),
      companyName: process.env.POS_RECEIPT_COMPANY_NAME?.trim() || "Simple Account",
      branchName: row.posSession?.branchName ?? null,
      taxNumber: process.env.POS_RECEIPT_TAX_NUMBER?.trim() || null,
      cashierName:
        row.posSession?.cashierUser?.name ??
        row.posSession?.cashierUser?.email ??
        "Cashier",
      terminalName: row.posSession?.terminalName ?? null,
      total: row.totalAmount.toString(),
      tax: row.taxAmount.toString(),
      discount: row.discountAmount.toString(),
      subtotal: row.subtotalAmount.toString(),
      paid: appliedPaid.toFixed(2),
      tendered: totalPaid.toFixed(2),
      change: row.posChangeAmount?.toString() ?? "0.00",
      paymentSummary: row.posPayments
        .map((payment: any) => `${payment.bankCashAccount.name} ${payment.amount.toString()}`)
        .join(" + "),
      warehouseName: row.posSession?.warehouse?.name ?? "—",
      lines: row.lines.map((line: any) => ({
        name: line.itemName ?? line.description ?? `Line ${line.lineNumber}`,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        discountAmount: line.discountAmount.toString(),
        taxAmount: line.taxAmount.toString(),
        lineTotal: line.lineAmount.toString(),
        unitCode: line.item?.unitOfMeasure ?? null,
      })),
    };
  }

  private mapPosReturn(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      returnDate: row.returnDate.toISOString(),
      reason: row.reason ?? null,
      currencyCode: row.currencyCode,
      subtotalAmount: row.subtotalAmount.toString(),
      discountAmount: row.discountAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      refundAmount: row.refundAmount.toString(),
      accountingStatus: row.accountingStatus,
      postedAt: row.postedAt?.toISOString() ?? null,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewNotes: row.reviewNotes ?? null,
      reversedAt: row.reversedAt?.toISOString() ?? null,
      salesInvoice: row.salesInvoice,
      session: row.posSession ?? null,
      journalEntry: row.journalEntry
        ? {
            id: row.journalEntry.id,
            reference: row.journalEntry.reference,
            status: row.journalEntry.status,
            postedAt: row.journalEntry.postedAt?.toISOString() ?? null,
          }
        : null,
      lines: row.lines.map((line: any) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        salesInvoiceLineId: line.salesInvoiceLineId ?? null,
        itemId: line.itemId ?? null,
        itemName: line.itemName ?? line.description ?? `Line ${line.lineNumber}`,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        discountAmount: line.discountAmount.toString(),
        taxAmount: line.taxAmount.toString(),
        lineSubtotalAmount: line.lineSubtotalAmount.toString(),
        lineAmount: line.lineAmount.toString(),
        unitCost: line.unitCost?.toString() ?? null,
        totalCost: line.totalCost?.toString() ?? null,
        item: line.item ?? null,
        warehouse: line.warehouse ?? null,
        tax: line.tax ?? null,
      })),
      payments: row.payments.map((payment: any) => ({
        id: payment.id,
        refundMethod: payment.refundMethod,
        amount: payment.amount.toString(),
        reference: payment.reference ?? null,
        bankCashAccount: payment.bankCashAccount ?? null,
      })),
      createdByUser: row.createdByUser ?? null,
      reviewedByUser: row.reviewedByUser ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async updateTableStatus(
    tx: Prisma.TransactionClient,
    tableId: string | null,
    invoiceId: string | null,
    status: TableStatus | null,
  ) {
    if (!tableId) return;
    if (status && invoiceId) {
      await tx.posTable.update({
        where: { id: tableId },
        data: {
          status,
          activeInvoiceId: invoiceId,
        },
      });
      return;
    }

    await tx.posTable.update({
      where: { id: tableId },
      data: { activeInvoiceId: null },
    });
    await this.refreshTableOperationalStatus(tx, tableId, true);
  }

  private isWaiterOnlyUser(user?: AuthorizedUser) {
    if (!user) {
      return false;
    }
    return (
      user.posRoles.includes("WAITER") &&
      !user.posRoles.includes("CASHIER") &&
      !user.posRoles.includes("ACCOUNTANT")
    );
  }

  private canCashierEditPosCart(user?: AuthorizedUser) {
    return this.hasPosPermissionCode("POS_VIEW_POS_SCREEN", user);
  }

  private isPosSaleDone(
    status: PosOperationalStatus | null | undefined,
  ) {
    return (
      status === PosOperationalStatus.COMPLETED ||
      status === PosOperationalStatus.REFUNDED ||
      status === PosOperationalStatus.VOIDED
    );
  }

  private isCashierOnlyUser(user?: AuthorizedUser) {
    if (!user?.posRoles?.length) {
      return false;
    }
    return (
      user.posRoles.includes("CASHIER") &&
      !user.posRoles.includes("ACCOUNTANT")
    );
  }

  private isKitchenItemDone(status: KitchenStatus) {
    return status === KitchenStatus.READY || status === KitchenStatus.SERVED;
  }

  private async loadKitchenLineStatusByInvoiceLineId(
    tx: Prisma.TransactionClient,
    salesInvoiceId: string,
  ) {
    const order = await tx.kitchenOrder.findUnique({
      where: { salesInvoiceId },
      select: {
        items: { select: { salesInvoiceLineId: true, status: true } },
      },
    });
    const map = new Map<string, KitchenStatus>();
    for (const item of order?.items ?? []) {
      if (item.salesInvoiceLineId) {
        map.set(item.salesInvoiceLineId, item.status);
      }
    }
    return map;
  }

  private isInvoiceLineKitchenLocked(
    kitchenStatusByLineId: Map<string, KitchenStatus>,
    lineId: string,
    kitchenSentAt: Date | null,
  ) {
    if (!kitchenSentAt) {
      return false;
    }
    const status = kitchenStatusByLineId.get(lineId);
    return status ? this.isKitchenItemDone(status) : false;
  }

  private findDtoLineForInvoiceLine(
    lineId: string,
    dtoLines: Array<{ salesInvoiceLineId?: string; itemId?: string; quantity?: number }>,
    resolvedLines: ResolvedSalesLine[],
  ) {
    return (
      dtoLines.find((line) => line.salesInvoiceLineId === lineId) ??
      resolvedLines.find((line) => line.salesInvoiceLineId === lineId) ??
      null
    );
  }

  private getPreservedSentLineIds(
    existing: {
      lines: Array<{
        id: string;
        itemId: string | null;
        quantity: Prisma.Decimal;
        kitchenSentAt: Date | null;
      }>;
    },
    dtoLines: Array<{ salesInvoiceLineId?: string; itemId?: string; quantity?: number }>,
    resolvedLines: ResolvedSalesLine[],
  ) {
    const kept: string[] = [];
    for (const sentLine of existing.lines) {
      if (!sentLine.kitchenSentAt) {
        continue;
      }
      const dtoLine = this.findDtoLineForInvoiceLine(sentLine.id, dtoLines, resolvedLines);
      if (!dtoLine) {
        continue;
      }
      const nextQty = Number(dtoLine.quantity ?? 0);
      if (sentLine.itemId && dtoLine.itemId && sentLine.itemId !== dtoLine.itemId) {
        continue;
      }
      if (Math.abs(Number(sentLine.quantity) - nextQty) > 0.0001) {
        continue;
      }
      kept.push(sentLine.id);
    }
    return kept;
  }

  private assertPosSaleDraftModification(
    user: AuthorizedUser | undefined,
    existing: {
      posOperationalStatus?: PosOperationalStatus | null;
      waiterConfirmedAt: Date | null;
      lines: Array<{
        id: string;
        itemId: string | null;
        quantity: Prisma.Decimal;
        kitchenSentAt: Date | null;
      }>;
    },
    dtoLines: Array<{ salesInvoiceLineId?: string; itemId?: string; quantity?: number }>,
    resolvedLines: ResolvedSalesLine[],
    kitchenStatusByLineId: Map<string, KitchenStatus>,
  ) {
    if (this.isPosSaleDone(existing.posOperationalStatus)) {
      throw new BadRequestException(
        "Completed POS orders cannot be changed. Use accountant correction flows instead.",
      );
    }

    const waiterOnly = this.isWaiterOnlyUser(user);
    const cashierCanEdit = this.canCashierEditPosCart(user) && !waiterOnly;

    if (waiterOnly && existing.waiterConfirmedAt) {
      throw new ForbiddenException(
        "This order was confirmed and can no longer be changed by the waiter.",
      );
    }

    if (!cashierCanEdit && existing.waiterConfirmedAt) {
      if (existing.lines.length !== resolvedLines.length) {
        throw new BadRequestException(
          "This order was confirmed by the waiter. No order changes are allowed until payment.",
        );
      }
      for (const line of existing.lines) {
        const dtoLine = this.findDtoLineForInvoiceLine(line.id, dtoLines, resolvedLines);
        if (!dtoLine) {
          throw new BadRequestException(
            "This order was confirmed by the waiter. No order changes are allowed until payment.",
          );
        }
        const nextQty = Number(dtoLine.quantity ?? 0);
        if (line.itemId && dtoLine.itemId && line.itemId !== dtoLine.itemId) {
          throw new BadRequestException(
            "This order was confirmed by the waiter. No order changes are allowed until payment.",
          );
        }
        if (Math.abs(Number(line.quantity) - nextQty) > 0.0001) {
          throw new BadRequestException(
            "This order was confirmed by the waiter. No order changes are allowed until payment.",
          );
        }
      }
      const newDtoLines = dtoLines.filter((line) => !line.salesInvoiceLineId);
      if (newDtoLines.length > 0) {
        throw new BadRequestException(
          "This order was confirmed by the waiter. No order changes are allowed until payment.",
        );
      }
    }

    const sentLines = existing.lines.filter((line) => line.kitchenSentAt);
    for (const sentLine of sentLines) {
      const dtoLine = this.findDtoLineForInvoiceLine(sentLine.id, dtoLines, resolvedLines);
      const nextQty = dtoLine ? Number(dtoLine.quantity ?? 0) : 0;
      const removed = !dtoLine;
      const itemChanged =
        Boolean(dtoLine) &&
        Boolean(sentLine.itemId) &&
        Boolean(dtoLine?.itemId) &&
        sentLine.itemId !== dtoLine?.itemId;
      const qtyChanged =
        Boolean(dtoLine) &&
        Math.abs(Number(sentLine.quantity) - nextQty) > 0.0001;

      if (!removed && !itemChanged && !qtyChanged) {
        continue;
      }

      if (!cashierCanEdit) {
        if (removed) {
          throw new BadRequestException(
            "Items already sent to the kitchen cannot be removed.",
          );
        }
        throw new BadRequestException(
          "Items already sent to the kitchen cannot be changed.",
        );
      }

      if (
        this.isInvoiceLineKitchenLocked(
          kitchenStatusByLineId,
          sentLine.id,
          sentLine.kitchenSentAt,
        )
      ) {
        throw new BadRequestException(
          "Items already marked ready or served in the kitchen cannot be changed.",
        );
      }
    }

    if (!cashierCanEdit && waiterOnly && sentLines.length) {
      const unsentDtoCount = dtoLines.filter(
        (line) =>
          !line.salesInvoiceLineId ||
          !sentLines.some((sent) => sent.id === line.salesInvoiceLineId),
      ).length;
      if (unsentDtoCount > 0 && existing.waiterConfirmedAt) {
        throw new ForbiddenException("Waiter cannot add items after the order was confirmed.");
      }
    }
  }

  private async applyOpenPosSaleLineChanges(
    tx: Prisma.TransactionClient,
    user: AuthorizedUser | undefined,
    existing: {
      id: string;
      posOperationalStatus?: PosOperationalStatus | null;
      waiterConfirmedAt: Date | null;
      lines: Array<{
        id: string;
        itemId: string | null;
        quantity: Prisma.Decimal;
        kitchenSentAt: Date | null;
      }>;
    },
    dtoLines: Array<{ salesInvoiceLineId?: string; itemId?: string; quantity?: number }>,
    resolvedLines: ResolvedSalesLine[],
  ) {
    const kitchenStatusByLineId = await this.loadKitchenLineStatusByInvoiceLineId(
      tx,
      existing.id,
    );
    this.assertPosSaleDraftModification(
      user,
      existing,
      dtoLines,
      resolvedLines,
      kitchenStatusByLineId,
    );

    const sentIdsToKeep = this.getPreservedSentLineIds(existing, dtoLines, resolvedLines);
    await tx.salesInvoiceLine.deleteMany({
      where: {
        salesInvoiceId: existing.id,
        OR: [
          { kitchenSentAt: null },
          sentIdsToKeep.length
            ? { kitchenSentAt: { not: null }, id: { notIn: sentIdsToKeep } }
            : { kitchenSentAt: { not: null } },
        ],
      },
    });

    if (sentIdsToKeep.length > 0) {
      const runtimeConfig = await this.getPosRuntimeConfig(tx);
      for (const id of sentIdsToKeep) {
        const resolved = resolvedLines.find((l) => l.salesInvoiceLineId === id);
        if (!resolved) continue;

        const taxId = runtimeConfig.taxFreeEnabled ? null : (resolved.taxId || null);
        const taxAmount = runtimeConfig.taxFreeEnabled ? 0 : (resolved.taxAmount || 0);
        const lineAmount = runtimeConfig.taxFreeEnabled ? resolved.lineSubtotalAmount : resolved.lineTotalAmount;

        await tx.salesInvoiceLine.update({
          where: { id },
          data: {
            quantity: this.toQuantity(resolved.quantity),
            unitPrice: this.toAmount(resolved.unitPrice),
            discountAmount: this.toAmount(resolved.discountAmount),
            taxId,
            taxAmount: this.toAmount(taxAmount),
            lineSubtotalAmount: this.toAmount(resolved.lineSubtotalAmount),
            lineAmount: this.toAmount(lineAmount),
            revenueAccountId: resolved.revenueAccountId!,
            description: resolved.description || null,
            modifiers: resolved.modifiers || null,
          },
        });
      }
    }

    return sentIdsToKeep;
  }

  private async recomputeKitchenOrderStatus(
    tx: Prisma.TransactionClient,
    kitchenOrderId: string,
  ) {
    const allItems = await tx.kitchenOrderItem.findMany({
      where: { kitchenOrderId },
      select: { status: true },
    });
    if (!allItems.length) {
      return;
    }

    let nextStatus: KitchenStatus = KitchenStatus.NEW;
    const statuses = allItems.map((item) => item.status);
    if (statuses.every((status) => status === KitchenStatus.SERVED)) {
      nextStatus = KitchenStatus.SERVED;
    } else if (
      statuses.every(
        (status) => status === KitchenStatus.READY || status === KitchenStatus.SERVED,
      )
    ) {
      nextStatus = KitchenStatus.READY;
    } else if (
      statuses.some(
        (status) => status === KitchenStatus.PREPARING || status === KitchenStatus.READY,
      )
    ) {
      nextStatus = KitchenStatus.PREPARING;
    }

    await tx.kitchenOrder.update({
      where: { id: kitchenOrderId },
      data: { status: nextStatus },
    });
  }

  /** Replace kitchen ticket lines with the invoice's current kitchen-sent lines (full order sync). */
  private async rebuildKitchenOrderFromInvoice(
    tx: Prisma.TransactionClient,
    salesInvoiceId: string,
  ) {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: salesInvoiceId },
      select: {
        id: true,
        orderType: true,
        tableId: true,
        waiterId: true,
        description: true,
        lines: {
          orderBy: { lineNumber: "asc" },
          select: {
            id: true,
            itemId: true,
            itemName: true,
            quantity: true,
            description: true,
            modifiers: true,
            kitchenSentAt: true,
          },
        },
      },
    });

    if (!invoice?.orderType) {
      return;
    }

    const sentLines = invoice.lines.filter((line) => line.kitchenSentAt);
    let kitchenOrder = await tx.kitchenOrder.findUnique({
      where: { salesInvoiceId },
      select: { id: true, orderType: true },
    });

    if (!sentLines.length) {
      if (kitchenOrder) {
        await tx.kitchenOrderItem.deleteMany({
          where: { kitchenOrderId: kitchenOrder.id },
        });
        await tx.kitchenOrder.delete({ where: { id: kitchenOrder.id } });
      }
      return;
    }

    if (!kitchenOrder) {
      await this.appendKitchenOrderItems(tx, invoice, sentLines);
      return;
    }

    let waiterName: string | null = null;
    if (invoice.waiterId) {
      const waiter = await tx.user.findUnique({
        where: { id: invoice.waiterId },
        select: { name: true },
      });
      waiterName = waiter?.name || null;
    }

    let tableName: string | null = null;
    if (invoice.tableId) {
      const table = await tx.posTable.findUnique({
        where: { id: invoice.tableId },
        select: { tableNumber: true },
      });
      tableName = table?.tableNumber || null;
    }

    const existingItems = await tx.kitchenOrderItem.findMany({
      where: { kitchenOrderId: kitchenOrder.id },
      select: {
        id: true,
        salesInvoiceLineId: true,
      },
    });
    const existingByLineId = new Map(
      existingItems
        .filter((item) => item.salesInvoiceLineId)
        .map((item) => [item.salesInvoiceLineId!, item.id]),
    );
    const sentLineIds = new Set(sentLines.map((line) => line.id));

    for (const line of sentLines) {
      const itemData = {
        itemId: line.itemId!,
        itemName: line.itemName || "Item",
        quantity: line.quantity,
        notes: line.description || null,
        modifiers: line.modifiers === null ? undefined : line.modifiers,
      };
      const existingItemId = existingByLineId.get(line.id);
      if (existingItemId) {
        await tx.kitchenOrderItem.update({
          where: { id: existingItemId },
          data: itemData,
        });
      } else {
        await tx.kitchenOrderItem.create({
          data: {
            kitchenOrderId: kitchenOrder.id,
            salesInvoiceLineId: line.id,
            ...itemData,
            status: KitchenStatus.NEW,
          },
        });
      }
    }

    const staleItemIds = existingItems
      .filter(
        (item) =>
          item.salesInvoiceLineId && !sentLineIds.has(item.salesInvoiceLineId),
      )
      .map((item) => item.id);
    if (staleItemIds.length) {
      await tx.kitchenOrderItem.deleteMany({
        where: { id: { in: staleItemIds } },
      });
    }

    await tx.kitchenOrder.update({
      where: { id: kitchenOrder.id },
      data: {
        tableId: invoice.tableId || null,
        tableName,
        waiterId: invoice.waiterId || null,
        waiterName,
        orderType: invoice.orderType,
        notes: invoice.description || null,
        ...(invoice.orderType === OrderType.DINE_IN
          ? { waiterStatus: WaiterFoodStatus.WAITING }
          : {}),
      },
    });
  }

  private buildDraftLineCreates(
    existing: { lines: Array<{ id: string; lineNumber: number; kitchenSentAt: Date | null }> } | null,
    resolvedLines: ResolvedSalesLine[],
    sentLineIdsToKeep: string[] = [],
  ) {
    if (!existing) {
      return resolvedLines.map((line, index) =>
        this.salesReceivablesService.buildSalesInvoiceLineInput(line, index + 1),
      );
    }

    const sentIds = new Set(sentLineIdsToKeep);
    const unsentResolved = resolvedLines
      .filter((line) => {
        const lineId = line.salesInvoiceLineId;
        return !lineId || !sentIds.has(lineId);
      })
      .map((line) => ({
        ...line,
        salesInvoiceLineId:
          line.salesInvoiceLineId && sentIds.has(line.salesInvoiceLineId)
            ? line.salesInvoiceLineId
            : null,
      }));
    const startNumber =
      existing.lines.reduce((max, line) => Math.max(max, line.lineNumber), 0) + 1;

    return unsentResolved.map((line, index) =>
      this.salesReceivablesService.buildSalesInvoiceLineInput(line, startNumber + index),
    );
  }

  private async appendKitchenOrderItems(
    tx: Prisma.TransactionClient,
    invoice: {
      id: string;
      orderType: OrderType | null;
      tableId: string | null;
      waiterId: string | null;
      description: string | null;
      lines?: Array<{
        id: string;
        itemId: string | null;
        itemName: string | null;
        quantity: Prisma.Decimal;
        description: string | null;
        modifiers: Prisma.JsonValue | null;
      }>;
    },
    linesToSend: Array<{
      id: string;
      itemId: string | null;
      itemName: string | null;
      quantity: Prisma.Decimal;
      description: string | null;
      modifiers: Prisma.JsonValue | null;
    }>,
  ) {
    if (!invoice.orderType || !linesToSend.length) {
      return;
    }

    let waiterName: string | null = null;
    if (invoice.waiterId) {
      const waiter = await tx.user.findUnique({
        where: { id: invoice.waiterId },
        select: { name: true },
      });
      waiterName = waiter?.name || null;
    }

    let tableName: string | null = null;
    if (invoice.tableId) {
      const table = await tx.posTable.findUnique({
        where: { id: invoice.tableId },
        select: { tableNumber: true },
      });
      tableName = table?.tableNumber || null;
    }

    const existing = await tx.kitchenOrder.findUnique({
      where: { salesInvoiceId: invoice.id },
    });

    if (existing) {
      await tx.kitchenOrder.update({
        where: { id: existing.id },
        data: {
          tableId: invoice.tableId || null,
          tableName,
          waiterId: invoice.waiterId || null,
          waiterName,
          orderType: invoice.orderType,
          notes: invoice.description || null,
          ...(invoice.orderType === OrderType.DINE_IN
            ? { waiterStatus: WaiterFoodStatus.WAITING }
            : {}),
          items: {
            create: linesToSend.map((line) => ({
              salesInvoiceLineId: line.id,
              itemId: line.itemId!,
              itemName: line.itemName || "Item",
              quantity: line.quantity,
              notes: line.description || null,
              modifiers: line.modifiers === null ? undefined : line.modifiers,
            })),
          },
        },
      });
      return;
    }

    const orderNumber = `KOT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await tx.kitchenOrder.create({
      data: {
        orderNumber,
        salesInvoiceId: invoice.id,
        tableId: invoice.tableId || null,
        tableName,
        waiterId: invoice.waiterId || null,
        waiterName,
        orderType: invoice.orderType,
        notes: invoice.description || null,
        waiterStatus:
          invoice.orderType === OrderType.DINE_IN
            ? WaiterFoodStatus.WAITING
            : undefined,
        items: {
          create: linesToSend.map((line) => ({
            salesInvoiceLineId: line.id,
            itemId: line.itemId!,
            itemName: line.itemName || "Item",
            quantity: line.quantity,
            notes: line.description || null,
            modifiers: line.modifiers === null ? undefined : line.modifiers,
          })),
        },
      },
    });
  }

  /** @deprecated Use appendKitchenOrderItems via sendSaleToKitchen instead. */
  private async createOrUpdateKitchenOrder(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    dto: CompletePosSaleDto | HoldPosSaleDto | SavePosDraftDto,
  ) {
    if (!dto.orderType) return;

    const invoice = await tx.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: { lines: { where: { kitchenSentAt: null }, orderBy: { lineNumber: "asc" } } },
    });
    if (!invoice?.lines.length) {
      return;
    }

    const sentAt = new Date();
    await tx.salesInvoiceLine.updateMany({
      where: { id: { in: invoice.lines.map((line) => line.id) } },
      data: { kitchenSentAt: sentAt },
    });

    await this.appendKitchenOrderItems(tx, invoice, invoice.lines);
  }

  async transferTable(dto: TransferTableDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_HOLD_SALE", user);
    const { fromTableId, toTableId } = dto;
    const fromTable = await this.prisma.posTable.findUnique({
      where: { id: fromTableId },
    });
    if (!fromTable || !fromTable.activeInvoiceId) {
      throw new BadRequestException("Source table not found or has no active order.");
    }
    const toTable = await this.prisma.posTable.findUnique({
      where: { id: toTableId },
    });
    if (!toTable) {
      throw new BadRequestException("Target table not found.");
    }
    if (toTable.activeInvoiceId) {
      throw new BadRequestException("Target table is already occupied.");
    }

    const invoiceId = fromTable.activeInvoiceId;

    await this.prisma.$transaction(async (tx) => {
      // Update the sales invoice tableId
      await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: { tableId: toTableId },
      });

      // If there is an active KitchenOrder, update its table details
      const kot = await tx.kitchenOrder.findUnique({
        where: { salesInvoiceId: invoiceId },
      });
      if (kot) {
        await tx.kitchenOrder.update({
          where: { id: kot.id },
          data: {
            tableId: toTableId,
            tableName: toTable.tableNumber,
          },
        });
      }

      // Update tables
      await tx.posTable.update({
        where: { id: fromTableId },
        data: {
          status: TableStatus.AVAILABLE,
          activeInvoiceId: null,
        },
      });

      await tx.posTable.update({
        where: { id: toTableId },
        data: {
          status: TableStatus.OCCUPIED,
          activeInvoiceId: invoiceId,
        },
      });
    });

    await this.auditService.log({
      userId: user?.userId || "system",
      entity: "PosTable",
      entityId: toTableId,
      action: AuditAction.UPDATE,
      details: {
        message: "Table transferred",
        fromTableId,
        toTableId,
        invoiceId,
      },
    });

    return { success: true };
  }

  async mergeTables(dto: MergeTablesDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_HOLD_SALE", user);
    const { sourceTableIds, targetTableId } = dto;
    const targetTable = await this.prisma.posTable.findUnique({
      where: { id: targetTableId },
    });
    if (!targetTable) {
      throw new BadRequestException("Target table not found.");
    }

    let targetInvoiceId = targetTable.activeInvoiceId;

    await this.prisma.$transaction(async (tx) => {
      const sourceInvoices: any[] = [];
      for (const sourceId of sourceTableIds) {
        const t = await tx.posTable.findUnique({ where: { id: sourceId } });
        if (t?.activeInvoiceId) {
          const inv = await tx.salesInvoice.findUnique({
            where: { id: t.activeInvoiceId },
            include: { lines: true },
          });
          if (inv) sourceInvoices.push({ tableId: sourceId, invoice: inv });
        }
      }

      if (sourceInvoices.length === 0) {
        throw new BadRequestException("No active orders found on source tables.");
      }

      let baseInvoice: any = null;
      if (targetInvoiceId) {
        baseInvoice = await tx.salesInvoice.findUnique({
          where: { id: targetInvoiceId },
          include: { lines: true },
        });
      }

      if (!baseInvoice) {
        const first = sourceInvoices.shift();
        baseInvoice = first.invoice;
        targetInvoiceId = baseInvoice.id;

        await tx.salesInvoice.update({
          where: { id: targetInvoiceId! },
          data: { tableId: targetTableId },
        });
        await tx.posTable.update({
          where: { id: targetTableId },
          data: {
            status: TableStatus.OCCUPIED,
            activeInvoiceId: targetInvoiceId,
          },
        });
        await tx.posTable.update({
          where: { id: first.tableId },
          data: {
            status: TableStatus.AVAILABLE,
            activeInvoiceId: null,
          },
        });
      }

      for (const item of sourceInvoices) {
        const oldInv = item.invoice;
        for (const line of oldInv.lines) {
          const match = baseInvoice.lines.find((l: any) => l.itemId === line.itemId);
          if (match) {
            await tx.salesInvoiceLine.update({
              where: { id: match.id },
              data: {
                quantity: new Prisma.Decimal(match.quantity).add(new Prisma.Decimal(line.quantity)),
                lineSubtotalAmount: new Prisma.Decimal(match.lineSubtotalAmount).add(new Prisma.Decimal(line.lineSubtotalAmount)),
                lineAmount: new Prisma.Decimal(match.lineAmount).add(new Prisma.Decimal(line.lineAmount)),
              },
            });
          } else {
            await tx.salesInvoiceLine.create({
              data: {
                salesInvoiceId: targetInvoiceId!,
                lineNumber: baseInvoice.lines.length + 1,
                itemId: line.itemId,
                itemName: line.itemName,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineSubtotalAmount: line.lineSubtotalAmount,
                lineAmount: line.lineAmount,
                discountAmount: line.discountAmount,
                taxAmount: line.taxAmount,
                revenueAccountId: line.revenueAccountId,
                description: line.description,
              },
            });
            baseInvoice.lines.push(line);
          }
        }

        await tx.salesInvoiceLine.deleteMany({ where: { salesInvoiceId: oldInv.id } });
        await tx.kitchenOrder.deleteMany({ where: { salesInvoiceId: oldInv.id } });
        await tx.salesInvoice.delete({ where: { id: oldInv.id } });

        await tx.posTable.update({
          where: { id: item.tableId },
          data: {
            status: TableStatus.AVAILABLE,
            activeInvoiceId: null,
          },
        });
      }

      const updatedLines = await tx.salesInvoiceLine.findMany({
        where: { salesInvoiceId: targetInvoiceId! },
      });
      let subtotal = new Prisma.Decimal(0);
      let tax = new Prisma.Decimal(0);
      for (const l of updatedLines) {
         subtotal = subtotal.add(l.lineSubtotalAmount);
         tax = tax.add(l.taxAmount);
      }
      const total = subtotal.add(tax).add(baseInvoice.serviceChargeAmount || 0).add(baseInvoice.deliveryFeeAmount || 0);

      await tx.salesInvoice.update({
        where: { id: targetInvoiceId! },
        data: {
          subtotalAmount: subtotal,
          taxAmount: tax,
          totalAmount: total,
          outstandingAmount: total,
        },
      });

      const allLines = updatedLines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        quantity: Number(l.quantity),
        description: l.description,
      }));
      await this.createOrUpdateKitchenOrder(tx, targetInvoiceId!, {
        sessionId: baseInvoice.sessionId,
        orderType: baseInvoice.orderType || OrderType.DINE_IN,
        tableId: targetTableId,
        waiterId: baseInvoice.waiterId,
        description: baseInvoice.description,
        lines: allLines,
      } as any);
    });

    await this.auditService.log({
      userId: user?.userId || "system",
      entity: "PosTable",
      entityId: targetTableId,
      action: AuditAction.UPDATE,
      details: {
        message: "Tables merged",
        sourceTableIds,
        targetTableId,
        invoiceId: targetInvoiceId,
      },
    });

    return { success: true };
  }

  async splitTable(dto: SplitTableDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_HOLD_SALE", user);
    const { tableId, lines } = dto;
    const table = await this.prisma.posTable.findUnique({
      where: { id: tableId },
    });
    if (!table || !table.activeInvoiceId) {
      throw new BadRequestException("Table not found or has no active order.");
    }

    const originalInvoiceId = table.activeInvoiceId;
    let newInvoiceId = "";

    await this.prisma.$transaction(async (tx) => {
      const originalInvoice = await tx.salesInvoice.findUnique({
        where: { id: originalInvoiceId },
        include: { lines: true },
      });
      if (!originalInvoice) {
        throw new BadRequestException("Original invoice not found.");
      }

      const invoiceNumber = `INV-SPLIT-${Date.now()}`;
      const newInvoice = await tx.salesInvoice.create({
        data: {
          reference: invoiceNumber,
          invoiceDate: new Date(),
          dueDate: new Date(),
          status: originalInvoice.status,
          posOperationalStatus: originalInvoice.posOperationalStatus,
          posAccountingStatus: originalInvoice.posAccountingStatus,
          invoiceType: originalInvoice.invoiceType,
          posSessionId: originalInvoice.posSessionId,
          customerId: originalInvoice.customerId,
          currencyCode: originalInvoice.currencyCode,
          waiterId: originalInvoice.waiterId,
          orderType: originalInvoice.orderType,
          subtotalAmount: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          outstandingAmount: 0,
        },
      });
      newInvoiceId = newInvoice.id;

      let splitSubtotal = new Prisma.Decimal(0);
      let splitTax = new Prisma.Decimal(0);

      for (const splitLine of lines) {
        const originalLine = originalInvoice.lines.find((l) => l.itemId === splitLine.itemId);
        if (!originalLine) continue;

        const splitQty = new Prisma.Decimal(splitLine.quantity);
        const remainingQty = new Prisma.Decimal(originalLine.quantity).sub(splitQty);

        if (remainingQty.lt(0)) {
          throw new BadRequestException(`Cannot split more quantity than exists for item ${splitLine.itemId}`);
        }

        const unitPrice = new Prisma.Decimal(originalLine.unitPrice);
        const originalQty = new Prisma.Decimal(originalLine.quantity);
        const taxRate = originalQty.gt(0)
          ? new Prisma.Decimal(originalLine.taxAmount).div(originalQty.mul(unitPrice))
          : new Prisma.Decimal(0);

        const splitLineSubtotal = splitQty.mul(unitPrice);
        const splitLineTax = splitLineSubtotal.mul(taxRate);
        const splitLineTotal = splitLineSubtotal.add(splitLineTax);

        await tx.salesInvoiceLine.create({
          data: {
            salesInvoiceId: newInvoiceId,
            lineNumber: lines.indexOf(splitLine) + 1,
            itemId: originalLine.itemId,
            itemName: originalLine.itemName,
            quantity: splitQty,
            unitPrice: originalLine.unitPrice,
            lineSubtotalAmount: splitLineSubtotal,
            lineAmount: splitLineTotal,
            discountAmount: 0,
            taxAmount: splitLineTax,
            revenueAccountId: originalLine.revenueAccountId,
            description: originalLine.description,
          },
        });

        splitSubtotal = splitSubtotal.add(splitLineSubtotal);
        splitTax = splitTax.add(splitLineTax);

        if (remainingQty.eq(0)) {
          await tx.salesInvoiceLine.delete({ where: { id: originalLine.id } });
        } else {
          const remainingLineSubtotal = remainingQty.mul(unitPrice);
          const remainingLineTax = remainingLineSubtotal.mul(taxRate);
          const remainingLineTotal = remainingLineSubtotal.add(remainingLineTax);

          await tx.salesInvoiceLine.update({
            where: { id: originalLine.id },
            data: {
              quantity: remainingQty,
              lineSubtotalAmount: remainingLineSubtotal,
              lineAmount: remainingLineTotal,
              taxAmount: remainingLineTax,
            },
          });
        }
      }

      await tx.salesInvoice.update({
        where: { id: newInvoiceId },
        data: {
          subtotalAmount: splitSubtotal,
          taxAmount: splitTax,
          totalAmount: splitSubtotal.add(splitTax),
          outstandingAmount: splitSubtotal.add(splitTax),
        },
      });

      const remainingLines = await tx.salesInvoiceLine.findMany({
        where: { salesInvoiceId: originalInvoiceId },
      });
      let origSubtotal = new Prisma.Decimal(0);
      let origTax = new Prisma.Decimal(0);
      for (const rl of remainingLines) {
        origSubtotal = origSubtotal.add(rl.lineSubtotalAmount);
        origTax = origTax.add(rl.taxAmount);
      }
      const origTotal = origSubtotal.add(origTax).add(originalInvoice.serviceChargeAmount || 0).add(originalInvoice.deliveryFeeAmount || 0);

      await tx.salesInvoice.update({
        where: { id: originalInvoiceId },
        data: {
          subtotalAmount: origSubtotal,
          taxAmount: origTax,
          totalAmount: origTotal,
          outstandingAmount: origTotal,
        },
      });

      const allOrig = remainingLines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        quantity: Number(l.quantity),
        description: l.description,
      }));
      await this.createOrUpdateKitchenOrder(tx, originalInvoiceId, {
        posSessionId: originalInvoice.posSessionId,
        orderType: originalInvoice.orderType || OrderType.DINE_IN,
        tableId,
        waiterId: originalInvoice.waiterId,
        description: originalInvoice.description,
        lines: allOrig,
      } as any);

      const allSplit = lines.map((l) => {
        const originalLine = originalInvoice.lines.find((ol) => ol.itemId === l.itemId);
        return {
          itemId: l.itemId,
          itemName: originalLine?.itemName || "Item",
          quantity: l.quantity,
        };
      });
      await this.createOrUpdateKitchenOrder(tx, newInvoiceId, {
        posSessionId: originalInvoice.posSessionId,
        orderType: originalInvoice.orderType || OrderType.DINE_IN,
        tableId: null,
        waiterId: originalInvoice.waiterId,
        lines: allSplit,
      } as any);
    });

    await this.auditService.log({
      userId: user?.userId || "system",
      entity: "PosTable",
      entityId: tableId,
      action: AuditAction.UPDATE,
      details: {
        message: "Table bill split",
        tableId,
        originalInvoiceId,
        newInvoiceId,
      },
    });

    return { success: true, originalInvoiceId, newInvoiceId };
  }

  async correctOrderType(id: string, dto: CorrectOrderTypeDto, user?: AuthorizedUser) {
    if (
      !this.hasPosPermissionCode("POS_CORRECT_ORDER_TYPE", user) &&
      !this.hasPosPermissionCode("POS_APPROVE_ACCOUNTING", user)
    ) {
      throw new BadRequestException("You do not have permission for POS_CORRECT_ORDER_TYPE.");
    }
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        posSession: {
          select: {
            cashAccountId: true,
          },
        },
        posPayments: {
          select: {
            amount: true,
          },
        },
      },
    });
    if (!invoice) {
      throw new BadRequestException(`Invoice ${id} was not found.`);
    }
    if (invoice.posAccountingStatus === PosAccountingStatus.POSTED) {
      throw new BadRequestException("Cannot correct order type of a posted invoice. Reversal is required first.");
    }

    const originalOrderType = invoice.orderType;
    const originalTableId = invoice.tableId;

    if (dto.orderType === OrderType.DINE_IN && !dto.tableId?.trim()) {
      throw new BadRequestException("A table is required when correcting to DINE_IN.");
    }

    let deliveryCompanyId: string | null = null;
    if (dto.deliveryCompanyId?.trim()) {
      const company = await this.prisma.deliveryCompany.findUnique({
        where: { id: dto.deliveryCompanyId.trim(), isActive: true },
      });
      if (!company) {
        throw new BadRequestException(`Delivery company ${dto.deliveryCompanyId} was not found or is inactive.`);
      }
      if (dto.orderType === OrderType.DELIVERY && !company.receivableAccountId) {
        throw new BadRequestException(
          `No receivable account is configured for the selected delivery company (${company.name}).`
        );
      }
      deliveryCompanyId = company.id;
    }

    let driverId: string | null = null;
    if (dto.driverId?.trim()) {
      const driver = await this.prisma.deliveryDriver.findUnique({
        where: { id: dto.driverId.trim(), isActive: true },
      });
      if (!driver) {
        throw new BadRequestException(`Delivery driver ${dto.driverId} was not found or is inactive.`);
      }
      driverId = driver.id;
    }

    const actorUserId = await this.resolveExistingUserId(user?.userId);

    await this.prisma.$transaction(async (tx) => {
      const serviceCharge = new Prisma.Decimal(dto.serviceChargeAmount ?? invoice.serviceChargeAmount ?? 0);
      const deliveryFee = new Prisma.Decimal(dto.deliveryFeeAmount ?? invoice.deliveryFeeAmount ?? 0);

      const subtotal = new Prisma.Decimal(invoice.subtotalAmount);
      const tax = new Prisma.Decimal(invoice.taxAmount);
      const total = subtotal.add(tax).add(serviceCharge).add(deliveryFee);
      const appliedPaymentTotal = Number(
        invoice.posPayments.reduce((sum, payment) => sum + Number(payment.amount), 0).toFixed(2),
      );
      const nextTotal = Number(total.toFixed(2));
      if (appliedPaymentTotal > nextTotal) {
        throw new BadRequestException(
          "Corrected order total cannot be lower than the already applied POS payments.",
        );
      }
      const nextOutstandingAmount = Number((nextTotal - appliedPaymentTotal).toFixed(2));

      const nextTableId = dto.orderType === OrderType.DINE_IN ? dto.tableId?.trim() || null : null;
      if (originalTableId && originalTableId !== nextTableId) {
        await tx.posTable.update({
          where: { id: originalTableId },
          data: {
            status: TableStatus.AVAILABLE,
            activeInvoiceId: null,
          },
        });
      }
      if (nextTableId) {
        const targetTable = await tx.posTable.findUnique({ where: { id: nextTableId } });
        if (!targetTable) {
          throw new BadRequestException(`Table ${nextTableId} was not found.`);
        }
        if (targetTable.activeInvoiceId && targetTable.activeInvoiceId !== id) {
          throw new BadRequestException("Selected table already has an active order.");
        }
        await tx.posTable.update({
          where: { id: nextTableId },
          data: {
            status: TableStatus.OCCUPIED,
            activeInvoiceId: id,
          },
        });
      }

      await tx.salesInvoice.update({
        where: { id },
        data: {
          orderType: dto.orderType,
          tableId: nextTableId,
          deliveryCompanyId: dto.orderType === OrderType.DELIVERY ? deliveryCompanyId : null,
          driverId: dto.orderType === OrderType.DELIVERY ? driverId : null,
          serviceChargeAmount: serviceCharge,
          deliveryFeeAmount: deliveryFee,
          deliveryStatus: dto.orderType === OrderType.DELIVERY ? DeliveryStatus.PENDING : null,
          deliveryCollectionMethod:
            dto.orderType === OrderType.DELIVERY && deliveryCompanyId
              ? DeliveryCollectionMethod.COMPANY
              : null,
          deliverySettlementStatus:
            dto.orderType === OrderType.DELIVERY && deliveryCompanyId
              ? DeliverySettlementStatus.PENDING
              : null,
          totalAmount: total,
          allocatedAmount: this.toAmount(appliedPaymentTotal),
          outstandingAmount: this.toAmount(nextOutstandingAmount),
          allocationStatus:
            nextOutstandingAmount > 0
              ? AllocationStatus.PARTIAL
              : AllocationStatus.FULLY_ALLOCATED,
          status:
            nextOutstandingAmount > 0
              ? SalesInvoiceStatus.PARTIALLY_PAID
              : SalesInvoiceStatus.FULLY_PAID,
          originalOrderType: originalOrderType,
          correctionReason: dto.reason,
          isCorrected: true,
          correctedAt: new Date(),
          correctedByUserId: actorUserId,
        },
      });

      if (dto.orderType === OrderType.DELIVERY && deliveryCompanyId) {
        await tx.posPayment.updateMany({
          where: { salesInvoiceId: id },
          data: {
            paymentMethod: PosPaymentMethod.DELIVERY,
            deliveryCompanyId: deliveryCompanyId,
            bankCashAccountId: invoice.posSession?.cashAccountId ?? undefined,
          },
        });
      } else if (originalOrderType === OrderType.DELIVERY && invoice.deliveryCompanyId && dto.orderType !== OrderType.DELIVERY) {
        await tx.posPayment.updateMany({
          where: { salesInvoiceId: id },
          data: {
            paymentMethod: PosPaymentMethod.CASH,
            deliveryCompanyId: null,
            bankCashAccountId: invoice.posSession?.cashAccountId ?? undefined,
          },
        });
      }

      const kot = await tx.kitchenOrder.findUnique({
        where: { salesInvoiceId: id },
      });
      if (kot) {
        let tableName: string | null = null;
        if (nextTableId) {
          const t = await tx.posTable.findUnique({ where: { id: nextTableId } });
          tableName = t?.tableNumber || null;
        }
        await tx.kitchenOrder.update({
          where: { id: kot.id },
          data: {
            orderType: dto.orderType,
            tableId: nextTableId,
            tableName,
          },
        });
      }
    });

    await this.auditService.log({
      userId: user?.userId || "system",
      entity: "SalesInvoice",
      entityId: id,
      action: AuditAction.UPDATE,
      details: {
        message: "Invoice order type corrected",
        invoiceId: id,
        originalOrderType,
        newOrderType: dto.orderType,
        tableId: dto.tableId ?? null,
        deliveryCompanyId,
        driverId,
        reason: dto.reason,
      },
    });

    return { success: true };
  }

  async correctPaymentMethod(id: string, dto: CorrectPaymentMethodDto, user?: AuthorizedUser) {
    if (
      !this.hasPosPermissionCode("POS_CORRECT_ORDER_TYPE", user) &&
      !this.hasPosPermissionCode("POS_APPROVE_ACCOUNTING", user)
    ) {
      throw new BadRequestException("You do not have permission to correct POS payment methods.");
    }

    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        posSession: {
          select: {
            id: true,
            cashAccountId: true,
          },
        },
        deliveryCompany: {
          select: {
            id: true,
            name: true,
            receivableAccountId: true,
          },
        },
        posPayments: {
          include: {
            bankCashAccount: {
              select: {
                id: true,
                type: true,
              },
            },
            deliveryCompany: {
              select: {
                id: true,
                name: true,
                receivableAccountId: true,
              },
            },
          },
        },
      },
    });
    if (!invoice) {
      throw new BadRequestException(`Invoice ${id} was not found.`);
    }
    if (invoice.posOperationalStatus !== PosOperationalStatus.COMPLETED) {
      throw new BadRequestException("Only completed POS invoices can be corrected.");
    }
    if (!invoice.posSessionId) {
      throw new BadRequestException("POS invoice is not linked to a session.");
    }
    if (invoice.posAccountingStatus === PosAccountingStatus.POSTED) {
      throw new BadRequestException("Cannot correct payment method after final posting. Reversal is required first.");
    }
    if (invoice.posPayments.length !== 1) {
      throw new BadRequestException("Payment method correction currently supports invoices with exactly one payment.");
    }
    if (!dto.reason.trim()) {
      throw new BadRequestException("Correction reason is required.");
    }
    if (this.requiresPaymentReference(dto.paymentMethod) && !dto.reference?.trim()) {
      throw new BadRequestException("Reference number is required for the selected payment method.");
    }

    const currentPayment = invoice.posPayments[0];
    const existingSessionJournal = await this.prisma.journalEntry.findFirst({
      where: {
        sourceType: "PosSession",
        sourceId: invoice.posSessionId,
        status: JournalEntryStatus.POSTED,
      },
      select: { id: true },
    });
    if (existingSessionJournal?.id) {
      throw new BadRequestException("Cannot correct payment method after final session posting. Reversal is required first.");
    }

    let targetDeliveryCompany:
      | {
          id: string;
          name: string;
          receivableAccountId: string | null;
        }
      | null = null;
    if (invoice.orderType === OrderType.DELIVERY && invoice.deliveryCompanyId) {
      if (dto.paymentMethod !== PosPaymentMethod.DELIVERY) {
        throw new BadRequestException("Normal payment methods are not allowed for delivery company orders.");
      }
      if (dto.deliveryCompanyId !== invoice.deliveryCompanyId) {
        throw new BadRequestException("Cannot change the delivery company during payment correction.");
      }
    }

    if (dto.paymentMethod === PosPaymentMethod.DELIVERY) {
      if (!dto.deliveryCompanyId?.trim()) {
        throw new BadRequestException("A delivery company is required for delivery payment correction.");
      }
      targetDeliveryCompany = await this.prisma.deliveryCompany.findUnique({
        where: { id: dto.deliveryCompanyId.trim(), isActive: true },
        select: {
          id: true,
          name: true,
          receivableAccountId: true,
        },
      });
      if (!targetDeliveryCompany) {
        throw new BadRequestException(`Delivery company ${dto.deliveryCompanyId} was not found or is inactive.`);
      }
      if (!targetDeliveryCompany.receivableAccountId) {
        throw new BadRequestException("Selected delivery company must have a receivable account before correction.");
      }
    }

    const actorUserId = await this.resolveExistingUserId(user?.userId);

    const bankCashAccountId = await this.prisma.$transaction(async (tx) => {
      const nextBankCashAccountId = await this.resolveCorrectionBankCashAccountId(
        tx,
        invoice,
        currentPayment,
        dto.paymentMethod,
      );

      await tx.posPayment.update({
        where: { id: currentPayment.id },
        data: {
          paymentMethod: dto.paymentMethod,
          bankCashAccountId: nextBankCashAccountId,
          deliveryCompanyId:
            dto.paymentMethod === PosPaymentMethod.DELIVERY
              ? targetDeliveryCompany!.id
              : null,
          reference: dto.reference?.trim() || null,
        },
      });

      await tx.salesInvoice.update({
        where: { id },
        data: {
          deliveryCompanyId:
            dto.paymentMethod === PosPaymentMethod.DELIVERY
              ? targetDeliveryCompany!.id
              : invoice.deliveryCompanyId ?? null,
          deliveryCollectionMethod:
            dto.paymentMethod === PosPaymentMethod.DELIVERY
              ? DeliveryCollectionMethod.COMPANY
              : null,
          deliverySettlementStatus:
            dto.paymentMethod === PosPaymentMethod.DELIVERY
              ? (invoice.deliverySettlementStatus ?? DeliverySettlementStatus.PENDING)
              : null,
          correctionReason: dto.reason.trim(),
          isCorrected: true,
          correctedAt: new Date(),
          correctedByUserId: actorUserId,
        },
      });

      await this.recomputeSessionExpectedCash(tx, invoice.posSessionId!);

      if ((await this.getPosPostingMode(tx)) === "BY_SESSION") {
        await this.syncSessionGroupedJournalEntry(tx, invoice.posSessionId!);
      } else {
        await this.refreshInvoiceDraftAccountingPreview(tx, id);
      }

      return nextBankCashAccountId;
    });

    await this.auditService.log({
      userId: user?.userId || "system",
      entity: "SalesInvoice",
      entityId: id,
      action: AuditAction.UPDATE,
      details: {
        message: "Invoice payment method corrected",
        invoiceId: id,
        oldPaymentMethod:
          currentPayment.paymentMethod === PosPaymentMethod.DELIVERY || currentPayment.deliveryCompanyId
            ? currentPayment.deliveryCompany?.name || PosPaymentMethod.DELIVERY
            : currentPayment.paymentMethod,
        newPaymentMethod:
          dto.paymentMethod === PosPaymentMethod.DELIVERY
            ? targetDeliveryCompany?.name || PosPaymentMethod.DELIVERY
            : dto.paymentMethod,
        oldReference: currentPayment.reference ?? null,
        newReference: dto.reference?.trim() || null,
        correctionReason: dto.reason.trim(),
        correctedBy: user?.userId || null,
        correctedAt: new Date().toISOString(),
        oldDeliveryCompanyId: currentPayment.deliveryCompanyId ?? null,
        newDeliveryCompanyId:
          dto.paymentMethod === PosPaymentMethod.DELIVERY
            ? targetDeliveryCompany?.id ?? null
            : null,
        bankCashAccountId,
      },
    });

    return { success: true };
  }

  async auditKotReprint(id: string, dto: ReprintKotDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_COMPLETE_SALE", user);
    const kot = await this.prisma.kitchenOrder.findUnique({
      where: { id },
    });
    if (!kot) {
      throw new BadRequestException(`Kitchen order ${id} not found.`);
    }

    await this.auditService.log({
      userId: user?.userId || "system",
      entity: "KitchenOrder",
      entityId: id,
      action: AuditAction.UPDATE,
      details: {
        message: "Kitchen order ticket (KOT) reprinted",
        kotId: id,
        reason: dto.reason,
      },
    });

    return { success: true };
  }

  async listDeliveryCompanies(user?: AuthorizedUser) {
    if (
      !this.hasPosPermissionCode("POS_VIEW_POS_SCREEN", user) &&
      !this.hasPosPermissionCode("POS_VIEW_POS_REPORTS", user)
    ) {
      throw new BadRequestException("You do not have permission to view delivery companies.");
    }
    const includeInactive = this.hasPosPermissionCode("POS_VIEW_POS_REPORTS", user);
    return this.prisma.deliveryCompany.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async updateDeliveryCompanyStatus(id: string, isActive: boolean, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const company = await this.prisma.deliveryCompany.findUnique({
      where: { id },
      include: {
        salesInvoices: {
          select: { id: true },
          take: 1,
        },
        settlements: {
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!company) {
      throw new NotFoundException(`Delivery company ${id} was not found.`);
    }
    if (!isActive && company.salesInvoices.length === 0 && company.settlements.length === 0) {
      return this.prisma.deliveryCompany.update({
        where: { id },
        data: { isActive: false },
      });
    }
    if (!isActive) {
      return this.prisma.deliveryCompany.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.deliveryCompany.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async previewDeliveryCompanySettlement(dto: DeliveryCompanySettlementPreviewDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const { company, periodFrom, periodTo, orders, grossOrdersAmount } =
      await this.loadSettlementCandidateOrders(dto.deliveryCompanyId, dto.periodFrom, dto.periodTo);

    return {
      deliveryCompany: {
        id: company.id,
        name: company.name,
        arabicName: company.arabicName,
      },
      periodFrom,
      periodTo,
      grossOrdersAmount: grossOrdersAmount.toFixed(2),
      orders: orders.map((invoice) => ({
        id: invoice.id,
        reference: invoice.reference,
        branchName: invoice.posSession?.branchName ?? null,
        completedAt: invoice.posCompletedAt?.toISOString() ?? invoice.invoiceDate.toISOString(),
        totalAmount: Number(invoice.totalAmount).toFixed(2),
        settlementStatus: invoice.deliverySettlementStatus ?? DeliverySettlementStatus.PENDING,
      })),
    };
  }

  async createDeliveryCompanySettlement(dto: CreateDeliveryCompanySettlementDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const { company, periodFrom, periodTo, orders, grossOrdersAmount } =
      await this.loadSettlementCandidateOrders(dto.deliveryCompanyId, dto.periodFrom, dto.periodTo, dto.salesInvoiceIds);
    if (!orders.length) {
      throw new BadRequestException("No unsettled delivery company orders were found for this settlement.");
    }

    const bankCashAccount = await this.prisma.bankCashAccount.findUnique({
      where: { id: dto.bankCashAccountId, isActive: true },
      include: {
        account: {
          select: {
            id: true,
            isActive: true,
            isPosting: true,
          },
        },
      },
    });
    if (!bankCashAccount?.account?.isActive || !bankCashAccount.account.isPosting) {
      throw new BadRequestException("Settlement bank account must be linked to an active posting account.");
    }

    const commissionAmount = Number(dto.commissionAmount.toFixed(2));
    const serviceFeeAmount = Number(dto.serviceFeeAmount.toFixed(2));
    const refundAmount = Number(dto.refundAmount.toFixed(2));
    const adjustmentAmount = Number(dto.adjustmentAmount.toFixed(2));
    const statementAmount = Number(dto.statementAmount.toFixed(2));
    const grossOrders = Number(grossOrdersAmount.toFixed(2));
    const differenceAmount = Number((grossOrders - statementAmount).toFixed(2));
    const netReceivedAmount = Number(
      (statementAmount - commissionAmount - serviceFeeAmount - refundAmount - adjustmentAmount).toFixed(2),
    );
    if (netReceivedAmount < 0) {
      throw new BadRequestException("Net received amount cannot be negative.");
    }

    const requiresDifferenceAccount =
      refundAmount > 0 || adjustmentAmount > 0 || differenceAmount !== 0;
    let differenceAccountId = dto.differenceAccountId?.trim() || null;
    if (requiresDifferenceAccount && !differenceAccountId) {
      throw new BadRequestException("A difference/adjustment account is required for settlement deductions or differences.");
    }
    if (differenceAccountId) {
      await this.ensureActivePostingAccount(differenceAccountId);
    }
    if (commissionAmount > 0 && !company.commissionAccountId) {
      throw new BadRequestException("The selected delivery company is missing a commission expense account.");
    }
    if (serviceFeeAmount > 0 && !company.serviceFeeAccountId) {
      throw new BadRequestException("The selected delivery company is missing a service fee expense account.");
    }

    return this.prisma.$transaction(async (tx) => {
      const reference = await this.generateDeliverySettlementReference(tx);
      const description = `Delivery settlement ${reference} - ${company.name}`;
      const journalLines: Array<{
        accountId: string;
        description: string;
        debitAmount: number;
        creditAmount: number;
      }> = [
        {
          accountId: bankCashAccount.accountId,
          description,
          debitAmount: netReceivedAmount,
          creditAmount: 0,
        },
      ];

      if (commissionAmount > 0) {
        journalLines.push({
          accountId: company.commissionAccountId!,
          description: `${description} commission`,
          debitAmount: commissionAmount,
          creditAmount: 0,
        });
      }
      if (serviceFeeAmount > 0) {
        journalLines.push({
          accountId: company.serviceFeeAccountId!,
          description: `${description} service fees`,
          debitAmount: serviceFeeAmount,
          creditAmount: 0,
        });
      }
      if (differenceAccountId) {
        const deductionDebit = Number((refundAmount + adjustmentAmount + Math.max(differenceAmount, 0)).toFixed(2));
        const differenceCredit = Number(Math.max(-differenceAmount, 0).toFixed(2));
        if (deductionDebit > 0 || differenceCredit > 0) {
          journalLines.push({
            accountId: differenceAccountId,
            description: `${description} differences`,
            debitAmount: deductionDebit,
            creditAmount: differenceCredit,
          });
        }
      }
      journalLines.push({
        accountId: company.receivableAccountId,
        description: `${description} clear receivable`,
        debitAmount: 0,
        creditAmount: grossOrders,
      });
      this.salesReceivablesService.ensureBalancedJournalLines(journalLines);

      const journal = await this.journalEntriesService.create(
        {
          entryDate: new Date(dto.settlementDate).toISOString(),
          description,
          sourceType: "DeliveryCompanySettlement",
          sourceNumber: reference,
          lines: journalLines,
        },
        { tx },
      );
      const posted = await this.postingService.post(journal.id, tx as never);

      const settlement = await tx.deliveryCompanySettlement.create({
        data: {
          reference,
          deliveryCompanyId: company.id,
          periodFrom,
          periodTo,
          settlementDate: new Date(dto.settlementDate),
          statementReference: dto.statementReference?.trim() || null,
          bankCashAccountId: bankCashAccount.id,
          statementAmount: this.toAmount(statementAmount),
          grossOrdersAmount: this.toAmount(grossOrders),
          commissionAmount: this.toAmount(commissionAmount),
          serviceFeeAmount: this.toAmount(serviceFeeAmount),
          refundAmount: this.toAmount(refundAmount),
          adjustmentAmount: this.toAmount(adjustmentAmount),
          differenceAmount: this.toAmount(differenceAmount),
          differenceReason: dto.differenceReason?.trim() || null,
          differenceAccountId,
          differenceNotes: dto.differenceNotes?.trim() || null,
          netReceivedAmount: this.toAmount(netReceivedAmount),
          statementAttachmentUrl: dto.statementAttachmentUrl?.trim() || null,
          bankReceiptAttachmentUrl: dto.bankReceiptAttachmentUrl?.trim() || null,
          journalEntryId: journal.id,
          createdByUserId: user?.userId ?? null,
          confirmedByUserId: user?.userId ?? null,
          orders: {
            create: orders.map((invoice) => ({
              salesInvoiceId: invoice.id,
              grossAmount: this.toAmount(invoice.totalAmount),
            })),
          },
        },
        include: {
          deliveryCompany: true,
          bankCashAccount: true,
          journalEntry: { select: { id: true, reference: true, status: true, postedAt: true } },
          orders: {
            include: {
              salesInvoice: {
                select: {
                  id: true,
                  reference: true,
                  totalAmount: true,
                },
              },
            },
          },
        },
      });

      await tx.salesInvoice.updateMany({
        where: { id: { in: orders.map((invoice) => invoice.id) } },
        data: {
          deliverySettlementStatus:
            differenceAmount !== 0
              ? DeliverySettlementStatus.DIFFERENCE
              : DeliverySettlementStatus.SETTLED,
          deliverySettledAmount: this.toAmount(grossOrders),
        },
      });

      await this.auditService.log({
        userId: user?.userId,
        entity: "DeliveryCompanySettlement",
        entityId: settlement.id,
        action: AuditAction.POST,
        details: {
          reference,
          deliveryCompanyId: company.id,
          grossOrdersAmount: grossOrders,
          netReceivedAmount,
          postedAt: posted.postedAt,
        },
      });

      return this.mapDeliveryCompanySettlement(settlement);
    });
  }

  async reverseDeliveryCompanySettlement(id: string, dto: PosReverseAccountingDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const settlement = await this.prisma.deliveryCompanySettlement.findUnique({
      where: { id },
      include: {
        orders: { select: { salesInvoiceId: true } },
      },
    });
    if (!settlement) {
      throw new NotFoundException(`Delivery company settlement ${id} was not found.`);
    }
    if (settlement.reversedAt) {
      throw new BadRequestException("This delivery company settlement has already been reversed.");
    }
    if (!settlement.journalEntryId) {
      throw new BadRequestException("This delivery company settlement has no journal entry to reverse.");
    }

    await this.reversalService.reverse(settlement.journalEntryId, {
      reversalDate: dto.reversalDate,
      description: dto.description?.trim() || `Reverse delivery settlement ${settlement.reference}`,
    });

    const reversed = await this.prisma.$transaction(async (tx) => {
      await tx.salesInvoice.updateMany({
        where: { id: { in: settlement.orders.map((row) => row.salesInvoiceId) } },
        data: {
          deliverySettlementStatus: DeliverySettlementStatus.PENDING,
          deliverySettledAmount: this.toAmount(0),
        },
      });

      return tx.deliveryCompanySettlement.update({
        where: { id },
        data: {
          reversedAt: new Date(),
          reversedByUserId: user?.userId ?? null,
        },
        include: {
          deliveryCompany: true,
          bankCashAccount: true,
          journalEntry: { select: { id: true, reference: true, status: true, postedAt: true } },
          orders: {
            include: {
              salesInvoice: {
                select: {
                  id: true,
                  reference: true,
                  totalAmount: true,
                },
              },
            },
          },
        },
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "DeliveryCompanySettlement",
      entityId: reversed.id,
      action: AuditAction.REVERSE,
      details: {
        reference: reversed.reference,
      },
    });

    return this.mapDeliveryCompanySettlement(reversed);
  }

  async listDeliveryCompanySettlements(
    filters: { deliveryCompanyId?: string },
    user?: AuthorizedUser,
  ) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const rows = await this.prisma.deliveryCompanySettlement.findMany({
      where: {
        deliveryCompanyId: filters.deliveryCompanyId?.trim() || undefined,
      },
      include: {
        deliveryCompany: true,
        bankCashAccount: true,
        journalEntry: { select: { id: true, reference: true, status: true, postedAt: true } },
        orders: {
          include: {
            salesInvoice: {
              select: {
                id: true,
                reference: true,
                totalAmount: true,
              },
            },
          },
        },
      },
      orderBy: [{ settlementDate: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.mapDeliveryCompanySettlement(row));
  }

  async getDeliveryCompanyReceivableReport(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const companies = await this.prisma.deliveryCompany.findMany({
      include: {
        salesInvoices: {
          where: {
            invoiceType: SalesInvoiceType.POS,
            deliveryCollectionMethod: DeliveryCollectionMethod.COMPANY,
            posOperationalStatus: PosOperationalStatus.COMPLETED,
          },
          select: {
            totalAmount: true,
            deliverySettlementStatus: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return companies.map((company) => {
      const totalReceivable = company.salesInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
      const outstanding = company.salesInvoices
        .filter((invoice) => invoice.deliverySettlementStatus !== DeliverySettlementStatus.SETTLED)
        .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
      return {
        deliveryCompanyId: company.id,
        deliveryCompanyName: company.name,
        deliveryCompanyArabicName: company.arabicName ?? null,
        totalReceivable: totalReceivable.toFixed(2),
        outstandingBalance: outstanding.toFixed(2),
        settledBalance: Number((totalReceivable - outstanding).toFixed(2)).toFixed(2),
      };
    });
  }

  async getDeliveryCompanySettlementReport(
    filters: { deliveryCompanyId?: string },
    user?: AuthorizedUser,
  ) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const rows = await this.listDeliveryCompanySettlements(filters, user);
    return rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      deliveryCompany: row.deliveryCompany,
      settlementDate: row.settlementDate,
      periodFrom: row.periodFrom,
      periodTo: row.periodTo,
      grossOrdersAmount: row.grossOrdersAmount,
      commissionAmount: row.commissionAmount,
      serviceFeeAmount: row.serviceFeeAmount,
      refundAmount: row.refundAmount,
      adjustmentAmount: row.adjustmentAmount,
      differenceAmount: row.differenceAmount,
      netReceivedAmount: row.netReceivedAmount,
      status: row.status,
      statementReference: row.statementReference,
      orderCount: row.orders.length,
    }));
  }

  async getDeliveryCompanySalesReport(
    filters: {
      deliveryCompanyId?: string;
      branchName?: string;
      settlementStatus?: string;
      from?: string;
      to?: string;
    },
    user?: AuthorizedUser,
  ) {
    this.ensurePosPermissionCode("POS_VIEW_POS_REPORTS", user);
    const where: Prisma.SalesInvoiceWhereInput = {
      invoiceType: SalesInvoiceType.POS,
      deliveryCompanyId: filters.deliveryCompanyId?.trim() || undefined,
      posOperationalStatus: PosOperationalStatus.COMPLETED,
      deliveryCollectionMethod: DeliveryCollectionMethod.COMPANY,
    };
    if (filters.branchName?.trim()) {
      where.posSession = { branchName: filters.branchName.trim() };
    }
    if (filters.settlementStatus?.trim()) {
      where.deliverySettlementStatus = filters.settlementStatus.trim() as DeliverySettlementStatus;
    }
    if (filters.from || filters.to) {
      where.posCompletedAt = {};
      if (filters.from) {
        where.posCompletedAt.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.posCompletedAt.lte = new Date(filters.to);
      }
    }

    const rows = await this.prisma.salesInvoice.findMany({
      where,
      include: {
        deliveryCompany: {
          select: { id: true, name: true, arabicName: true },
        },
        posSession: {
          select: { id: true, branchName: true, sessionNumber: true },
        },
      },
      orderBy: [{ posCompletedAt: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      completedAt: row.posCompletedAt?.toISOString() ?? row.invoiceDate.toISOString(),
      branchName: row.posSession?.branchName ?? null,
      sessionNumber: row.posSession?.sessionNumber ?? null,
      totalAmount: row.totalAmount.toString(),
      deliveryCompany: row.deliveryCompany,
      settlementStatus: row.deliverySettlementStatus ?? DeliverySettlementStatus.PENDING,
    }));
  }

  async listDeliveryDrivers(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_SCREEN", user);
    return this.prisma.deliveryDriver.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async assignDriver(id: string, driverId: string | null, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_SCREEN", user);
    const invoice = await this.prisma.salesInvoice.findUnique({ where: { id } });
    if (!invoice) throw new BadRequestException(`Invoice ${id} not found.`);
    if (invoice.orderType !== OrderType.DELIVERY) {
      throw new BadRequestException("Drivers can only be assigned to delivery orders.");
    }

    let resolvedDriverId: string | null = null;
    if (driverId?.trim()) {
      const driver = await this.prisma.deliveryDriver.findUnique({
        where: { id: driverId.trim(), isActive: true },
      });
      if (!driver) {
        throw new BadRequestException(`Delivery driver ${driverId} was not found or is inactive.`);
      }
      resolvedDriverId = driver.id;
    }

    await this.prisma.salesInvoice.update({
      where: { id },
      data: { driverId: resolvedDriverId },
    });

    await this.auditService.log({
      userId: user?.userId || "system",
      entity: "SalesInvoice",
      entityId: id,
      action: AuditAction.UPDATE,
      details: {
        message: "Driver assigned to delivery invoice",
        driverId: resolvedDriverId,
      },
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Reservation notes helpers
  // ---------------------------------------------------------------------------

  private async refreshTableOperationalStatus(
    tx: Prisma.TransactionClient,
    tableId: string,
    forceReset?: boolean,
  ) {
    const table = await tx.posTable.findUnique({
      where: { id: tableId },
      select: { id: true, status: true, activeInvoiceId: true },
    });
    if (!table) {
      return;
    }

    if (table.activeInvoiceId) {
      if (
        !forceReset &&
        (table.status === TableStatus.CLEANING ||
          table.status === TableStatus.WAITING_FOR_PAYMENT)
      ) {
        return;
      }
      if (table.status !== TableStatus.OCCUPIED) {
        await tx.posTable.update({
          where: { id: tableId },
          data: { status: TableStatus.OCCUPIED },
        });
      }
      return;
    }

    if (
      !forceReset &&
      (table.status === TableStatus.WAITING_FOR_PAYMENT ||
        table.status === TableStatus.CLEANING)
    ) {
      return;
    }

    const now = new Date();
    const reservations = await tx.posTableReservation.findMany({
      where: {
        tableId,
        status: "ACTIVE",
        reservedTo: { gt: now },
      },
      select: { reservedFrom: true, reservedTo: true, notes: true },
    });

    const hasArrivedInWindow = reservations.some((row) => {
      const parsed = this.parseReservationNotes(row.notes);
      return (
        now >= row.reservedFrom &&
        now <= row.reservedTo &&
        parsed.attendanceStatus === "ARRIVED"
      );
    });

    const hasScheduled = reservations.some(
      (row) => now <= row.reservedTo,
    );

    const nextStatus = hasArrivedInWindow
      ? TableStatus.OCCUPIED
      : hasScheduled
        ? TableStatus.RESERVED
        : TableStatus.AVAILABLE;

    if (table.status !== nextStatus) {
      await tx.posTable.update({
        where: { id: tableId },
        data: { status: nextStatus },
      });
    }
  }

  parseReservationNotes(raw: string | null): {
    notes: string | null;
    orderNotes: string | null;
    attendanceStatus: "UNKNOWN" | "ARRIVED" | "NO_SHOW";
    attendanceMarkedAt: string | null;
    preOrderSaleId: string | null;
    preOrderUpdatedAt: string | null;
  } {
    if (!raw || !raw.trim().startsWith("{")) {
      return {
        notes: raw ?? null,
        orderNotes: null,
        attendanceStatus: "UNKNOWN",
        attendanceMarkedAt: null,
        preOrderSaleId: null,
        preOrderUpdatedAt: null,
      };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        notes: parsed?.notes ?? null,
        orderNotes: parsed?.orderNotes ?? null,
        attendanceStatus: parsed?.attendanceStatus ?? "UNKNOWN",
        attendanceMarkedAt: parsed?.attendanceMarkedAt ?? null,
        preOrderSaleId: parsed?.preOrderSaleId ?? null,
        preOrderUpdatedAt: parsed?.preOrderUpdatedAt ?? null,
      };
    } catch {
      return {
        notes: raw,
        orderNotes: null,
        attendanceStatus: "UNKNOWN",
        attendanceMarkedAt: null,
        preOrderSaleId: null,
        preOrderUpdatedAt: null,
      };
    }
  }

  private async syncReservationPreOrder(
    tx: Prisma.TransactionClient,
    reservationId: string,
    invoiceId: string,
  ) {
    const reservation = await tx.posTableReservation.findUnique({
      where: { id: reservationId },
      select: { notes: true },
    });
    if (!reservation) return;
    const parsed = this.parseReservationNotes(reservation.notes);
    await tx.posTableReservation.update({
      where: { id: reservationId },
      data: {
        notes: JSON.stringify({
          notes: parsed.notes,
          orderNotes: parsed.orderNotes,
          attendanceStatus: parsed.attendanceStatus,
          attendanceMarkedAt: parsed.attendanceMarkedAt,
          preOrderSaleId: invoiceId,
          preOrderUpdatedAt: new Date().toISOString(),
        }),
      },
    });
  }

  private buildPreOrderSummary(sale: any) {
    const lines: any[] = sale.lines ?? [];
    return {
      saleId: sale.id,
      lineCount: lines.length,
      totalAmount: sale.totalAmount,
      itemsPreview: lines.slice(0, 5).map((l: any) => ({
        name: l.itemName ?? "",
        quantity: Number(l.quantity),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Pre-order for a special reservation (table stays Available)
  // ---------------------------------------------------------------------------

  async openReservationPreOrder(reservationId: string, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_SCREEN", user);

    const reservation = await this.prisma.posTableReservation.findUnique({
      where: { id: reservationId },
      include: { table: { select: { id: true, tableNumber: true, activeInvoiceId: true } } },
    });
    if (!reservation) throw new NotFoundException("Reservation not found.");
    if (reservation.status !== "ACTIVE") {
      throw new BadRequestException("Only ACTIVE reservations can have pre-orders.");
    }
    const parsed = this.parseReservationNotes(reservation.notes);

    if (
      reservation.table.activeInvoiceId &&
      reservation.table.activeInvoiceId !== parsed.preOrderSaleId
    ) {
      throw new BadRequestException(
        "Cannot add pre-order: the table already has a different active order.",
      );
    }

    // Resume existing pre-order if it is still a live draft/held sale
    if (parsed.preOrderSaleId) {
      const existing = await this.prisma.salesInvoice.findUnique({
        where: { id: parsed.preOrderSaleId },
        include: this.posSaleInclude(),
      });
      if (
        existing &&
        (existing.posOperationalStatus === PosOperationalStatus.DRAFT ||
          existing.posOperationalStatus === PosOperationalStatus.HELD)
      ) {
        const mapped = this.mapPosSale(existing);
        return {
          reservationId,
          preOrderSaleId: existing.id,
          sale: mapped,
          preOrderSummary: this.buildPreOrderSummary(mapped),
        };
      }
    }

    // Require an open POS session
    const session = await this.prisma.posSession.findFirst({
      where: { status: PosSessionStatus.OPEN },
      orderBy: { openedAt: "desc" },
    });
    if (!session) {
      throw new BadRequestException(
        "No open POS session found. Please open a session before creating a pre-order.",
      );
    }

    const walkInCustomer = await this.ensureWalkInCustomer();

    const result = await this.prisma.$transaction(async (tx) => {
      const reference = await this.generateInvoiceReference(tx);
      const invoice = await tx.salesInvoice.create({
        data: {
          reference,
          invoiceType: SalesInvoiceType.POS,
          status: SalesInvoiceStatus.DRAFT,
          invoiceDate: new Date(),
          customerId: walkInCustomer.id,
          currencyCode: "JOD",
          subtotalAmount: this.toAmount(0),
          discountAmount: this.toAmount(0),
          taxAmount: this.toAmount(0),
          totalAmount: this.toAmount(0),
          allocatedAmount: this.toAmount(0),
          outstandingAmount: this.toAmount(0),
          allocationStatus: AllocationStatus.UNALLOCATED,
          posOperationalStatus: PosOperationalStatus.HELD,
          posAccountingStatus: PosAccountingStatus.UNPOSTED,
          posSessionId: session.id,
          orderType: OrderType.DINE_IN,
          tableId: reservation.table.id,
          // Intentionally NOT setting activeInvoiceId on the table — pre-order does not occupy
        },
        include: this.posSaleInclude(),
      });

      // Persist preOrderSaleId on the reservation
      await tx.posTableReservation.update({
        where: { id: reservationId },
        data: {
          notes: JSON.stringify({
            notes: parsed.notes,
            orderNotes: parsed.orderNotes,
            attendanceStatus: parsed.attendanceStatus,
            attendanceMarkedAt: parsed.attendanceMarkedAt,
            preOrderSaleId: invoice.id,
            preOrderUpdatedAt: new Date().toISOString(),
          }),
        },
      });

      return invoice;
    });

    await this.auditService.log({
      userId: user?.userId ?? "system",
      entity: "PosTableReservation",
      entityId: reservationId,
      action: AuditAction.UPDATE,
      details: { message: "Pre-order sale created for reservation", preOrderSaleId: result.id },
    });

    const mapped = this.mapPosSale(result);
    return {
      reservationId,
      preOrderSaleId: result.id,
      sale: mapped,
      preOrderSummary: this.buildPreOrderSummary(mapped),
    };
  }

  async updateDeliveryStatus(id: string, status: DeliveryStatus, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_SCREEN", user);
    const invoice = await this.prisma.salesInvoice.findUnique({ where: { id } });
    if (!invoice) throw new BadRequestException(`Invoice ${id} not found.`);
    if (invoice.orderType !== OrderType.DELIVERY) {
      throw new BadRequestException("Delivery status can only be updated for delivery orders.");
    }

    await this.prisma.salesInvoice.update({
      where: { id },
      data: { deliveryStatus: status },
    });

    await this.auditService.log({
      userId: user?.userId || "system",
      entity: "SalesInvoice",
      entityId: id,
      action: AuditAction.UPDATE,
      details: {
        message: "Delivery status updated",
        status,
      },
    });

    return { success: true };
  }

  async listWaiters(user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_VIEW_POS_SCREEN", user);
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }
}
