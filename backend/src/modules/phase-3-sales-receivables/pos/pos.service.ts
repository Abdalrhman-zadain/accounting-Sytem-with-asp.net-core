import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import {
  AllocationStatus,
  AuditAction,
  InventoryStockMovementType,
  PosAccountingStatus,
  PosOperationalStatus,
  PosPaymentMethod,
  PosRefundMethod,
  PosReturnStatus,
  PosSessionStatus,
  Prisma,
  SalesInvoiceStatus,
  SalesInvoiceType,
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
  CreatePosReturnDto,
  HoldPosSaleDto,
  OpenPosSessionDto,
  PosPaymentDto,
  PosReverseAccountingDto,
  PosReturnPaymentDto,
  PosReviewDecisionDto,
  SavePosDraftDto,
  SetPosFavoriteItemsDto,
  VoidPosSaleDto,
} from "./dto/pos.dto";

const POS_WALK_IN_CUSTOMER_CODE = "POS-WALKIN";
const POS_WALK_IN_CUSTOMER_NAME = "POS Walk-in Customer";

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
    const session = await this.prisma.posSession.findFirst({
      where: {
        status: PosSessionStatus.OPEN,
        cashierUserId: user?.userId ?? undefined,
      },
      include: this.posSessionInclude(),
      orderBy: { openedAt: "desc" },
    });

    return session ? this.mapSession(session) : null;
  }

  async getSettings(user?: AuthorizedUser) {
    return {
      runtime: {
        autoPost: this.parseBoolean(process.env.POS_AUTO_POST, false),
        allowCloseWithDrafts: this.parseBoolean(process.env.POS_ALLOW_CLOSE_WITH_DRAFTS, false),
        allowCreditSale:
          this.parseBoolean(process.env.POS_ALLOW_CREDIT_SALE, false) ||
          this.hasPosPermissionCode("POS_CREDIT_SALE", user),
        invoiceDiscountTaxPolicy: this.parseTaxPolicy(process.env.POS_INVOICE_DISCOUNT_TAX_POLICY),
        negativeStockAllowed:
          this.parseBoolean(process.env.POS_ALLOW_NEGATIVE_STOCK, false) ||
          this.hasPosPermissionCode("POS_SELL_NEGATIVE_STOCK", user),
        cashierDiscountLimitPercent: Number(process.env.POS_MAX_CASHIER_DISCOUNT_PERCENT ?? "15"),
      },
      permissions: Object.fromEntries(
        this.listKnownPermissionCodes().map((permissionCode) => [
          permissionCode,
          this.hasPosPermissionCode(permissionCode, user),
        ]),
      ),
    };
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

    const report = await this.buildSessionReport(id);
    const actualCash = this.toAmount(dto.actualCash);
    const difference = this.toAmount(
      Number(dto.actualCash) - Number(report.expectedCash),
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

    await this.auditService.log({
      userId: user?.userId,
      entity: "PosSession",
      entityId: closed.id,
      action: AuditAction.CLOSE,
      details: {
        sessionNumber: closed.sessionNumber,
        expectedCash: report.expectedCash,
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
        posSessionId: sessionId,
        posOperationalStatus: PosOperationalStatus.HELD,
      },
      include: this.posSaleInclude(),
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => this.mapPosSale(row));
  }

  async listDraftSales(sessionId: string, user?: AuthorizedUser) {
    await this.ensureSessionAccess(sessionId, user);
    const rows = await this.prisma.salesInvoice.findMany({
      where: {
        invoiceType: SalesInvoiceType.POS,
        posSessionId: sessionId,
        posOperationalStatus: PosOperationalStatus.DRAFT,
      },
      include: this.posSaleInclude(),
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => this.mapPosSale(row));
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
    this.ensurePosPermission("SELL", user);
    return this.saveDraftLikeSale(dto, user, PosOperationalStatus.DRAFT);
  }

  private async saveDraftLikeSale(
    dto: HoldPosSaleDto | SavePosDraftDto,
    user: AuthorizedUser | undefined,
    status: PosOperationalStatus,
  ) {
    const session = await this.ensureOpenSession(dto.sessionId);
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
    const holdPaymentAccountMap = dto.payments?.length
      ? await this.resolvePaymentAccounts(dto.payments)
      : null;
    if (totals.totalAmount <= 0) {
      throw new BadRequestException("Held POS sales require at least one billable line.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
      const existing =
        dto.invoiceId?.trim()
          ? await tx.salesInvoice.findUnique({
              where: { id: dto.invoiceId.trim() },
              select: {
                id: true,
                posSessionId: true,
                invoiceType: true,
                posOperationalStatus: true,
                journalEntryId: true,
              },
            })
          : null;
      if (existing) {
        this.ensureDraftLikePosSale(existing, session.id);
        await tx.posPayment.deleteMany({ where: { salesInvoiceId: existing.id } });
        await tx.salesInvoiceLine.deleteMany({ where: { salesInvoiceId: existing.id } });
      }

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
                  create: resolvedLines.map((line, index) =>
                    this.salesReceivablesService.buildSalesInvoiceLineInput(line, index + 1),
                  ),
                },
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
              },
              include: this.posSaleInclude(),
            });

      if (dto.payments?.length) {
        await tx.posPayment.createMany({
          data: dto.payments.map((payment) => ({
            salesInvoiceId: invoice.id,
            bankCashAccountId: payment.bankCashAccountId,
            paymentMethod: this.mapPaymentMethod(
              holdPaymentAccountMap?.get(payment.bankCashAccountId)?.type ?? "",
            ),
            amount: this.toAmount(payment.amount),
            tenderedAmount: this.toAmount(payment.amount),
            reference: payment.reference?.trim() || null,
          })),
        });
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
    const session = await this.ensureOpenSession(dto.sessionId);
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
    await this.ensurePriceChangePermission(dto.lines, user);
    this.ensureDiscountPermission(resolvedLines, user);
    const totals = this.salesReceivablesService.computeSalesDocumentTotals(resolvedLines);
    if (totals.totalAmount <= 0) {
      throw new BadRequestException("POS sale total must be greater than zero.");
    }

    const bankCashIds = Array.from(
      new Set(dto.payments.map((payment) => payment.bankCashAccountId.trim())),
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
    const normalizedPayments = this.normalizePayments(
      dto.payments,
      accountMap,
      totals.totalAmount,
      allowCreditSale,
    );
    if (normalizedPayments.outstandingAmount > 0 && customerId === walkInCustomer.id) {
      throw new BadRequestException(
        "Partial payment / credit sales require a customer other than POS walk-in.",
      );
    }
    const autoPost = this.parseBoolean(process.env.POS_AUTO_POST, false);

    const result = await this.prisma.$transaction(async (tx) => {
      const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
      const existing =
        dto.invoiceId?.trim()
          ? await tx.salesInvoice.findUnique({
              where: { id: dto.invoiceId.trim() },
              select: {
                id: true,
                posSessionId: true,
                invoiceType: true,
                posOperationalStatus: true,
                journalEntryId: true,
              },
            })
          : null;
      if (existing) {
        this.ensureDraftLikePosSale(existing, session.id);
        await tx.posPayment.deleteMany({ where: { salesInvoiceId: existing.id } });
        await tx.salesInvoiceLine.deleteMany({ where: { salesInvoiceId: existing.id } });
        if (existing.journalEntryId) {
          await tx.journalEntryLine.deleteMany({ where: { journalEntryId: existing.journalEntryId } });
          await tx.journalEntry.delete({ where: { id: existing.journalEntryId } });
        }
      }

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
                create: resolvedLines.map((line, index) =>
                  this.salesReceivablesService.buildSalesInvoiceLineInput(line, index + 1),
                ),
              },
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
            },
            include: this.posSaleInclude(),
          });

      await tx.posPayment.createMany({
        data: normalizedPayments.payments.map((payment) => ({
          salesInvoiceId: invoice.id,
          bankCashAccountId: payment.bankCashAccountId,
          paymentMethod: payment.paymentMethod,
          amount: this.toAmount(payment.appliedAmount),
          tenderedAmount: this.toAmount(payment.amount),
          reference: payment.reference?.trim() || null,
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

      const description = invoiceWithDetails.description
        ? `${invoiceWithDetails.reference} - ${invoiceWithDetails.description}`
        : invoiceWithDetails.reference;
      const salesCredits = await this.salesReceivablesService.buildSalesInvoiceCreditJournalLines(
        tx,
        {
          id: invoiceWithDetails.id,
          reference: invoiceWithDetails.reference,
          customerId: invoiceWithDetails.customerId,
          customer: { receivableAccountId: invoiceWithDetails.customer.receivableAccountId },
          lines: invoiceWithDetails.lines.map((line) => ({
            lineNumber: line.lineNumber,
            description: line.description,
            revenueAccountId: line.revenueAccountId,
            taxId: line.taxId,
            taxAmount: line.taxAmount,
            lineSubtotalAmount: line.lineSubtotalAmount,
          })),
          totalAmount: invoiceWithDetails.totalAmount,
        },
        description,
      );
      const paymentDebits = this.aggregatePaymentDebits(normalizedPayments.payments, description);
      const receivableDebits =
        normalizedPayments.outstandingAmount > 0
          ? [
              {
                accountId: invoiceWithDetails.customer.receivableAccountId,
                description: `${description} credit balance`,
                debitAmount: normalizedPayments.outstandingAmount,
                creditAmount: 0,
              },
            ]
          : [];
      const journalLines = [
        ...paymentDebits,
        ...receivableDebits,
        ...salesCredits,
        ...inventoryPosting.accountingLines,
      ];
      this.salesReceivablesService.ensureBalancedJournalLines(journalLines);

      const journal = await this.journalEntriesService.create(
        {
          entryDate: invoiceWithDetails.invoiceDate.toISOString(),
          description,
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

    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        status: SalesInvoiceStatus.CANCELLED,
        posOperationalStatus: PosOperationalStatus.VOIDED,
        posVoidedAt: new Date(),
        posVoidReason: dto.reason?.trim() || null,
      },
      include: this.posSaleInclude(),
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
        posReviewedByUserId: user?.userId ?? null,
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
            in: [PosAccountingStatus.PENDING_REVIEW, PosAccountingStatus.REJECTED],
          },
          journalEntryId: { not: null },
        },
        select: {
          id: true,
          reference: true,
          journalEntryId: true,
        },
        orderBy: [{ posCompletedAt: "asc" }, { createdAt: "asc" }],
      });
      if (!sales.length) {
        throw new BadRequestException(
          "No POS sales in this session are awaiting accounting approval.",
        );
      }

      for (const sale of sales) {
        await this.postingService.post(sale.journalEntryId!, tx as never);
        await tx.salesInvoice.update({
          where: { id: sale.id },
          data: {
            posAccountingStatus: PosAccountingStatus.POSTED,
            posReviewedAt: new Date(),
            posReviewedByUserId: user?.userId ?? null,
            posReviewNotes: dto.notes?.trim() || null,
            postedAt: new Date(),
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
        sessionNumber: session.sessionNumber,
        approvedSalesCount: result.length,
        notes: dto.notes?.trim() || null,
      },
    });

    return {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      approvedCount: result.length,
      sales: result.map((row) => this.mapPosSale(row)),
    };
  }

  async rejectAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    this.ensurePosPermissionCode("POS_REJECT_ACCOUNTING", user);
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
        posReviewedByUserId: user?.userId ?? null,
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
        posReviewedByUserId: user?.userId ?? null,
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
        reviewedByUserId: user?.userId ?? null,
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
        reviewedByUserId: user?.userId ?? null,
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
        reviewedByUserId: user?.userId ?? null,
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
        const key = payment.paymentMethod;
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
          include: {
            posPayments: true,
          },
        },
        posReturns: {
          where: {
            status: { not: PosReturnStatus.REVERSED },
          },
          include: {
            payments: true,
          },
        },
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
        const current = paymentTotals.get(payment.paymentMethod) ?? 0;
        paymentTotals.set(
          payment.paymentMethod,
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
    };
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

  private hasPosPermissionCode(permissionCode: PosPermissionCode, user?: AuthorizedUser) {
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
      const salesReturnAccountId = line.revenueAccountId;
      journalLines.push({
        accountId: salesReturnAccountId,
        description,
        debitAmount: Number(line.lineSubtotalAmount),
        creditAmount: 0,
      });

      if (Number(line.taxAmount) > 0) {
        const taxAccountId = line.tax?.taxAccountId;
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
      const account = accountMap.get(payment.bankCashAccountId);
      if (!account) {
        throw new BadRequestException("Payment account is missing or inactive.");
      }
      if (!account.account.isActive || !account.account.isPosting || !account.account.allowManualPosting) {
        throw new BadRequestException(
          `Payment account ${account.account.code} must be active and posting.`,
        );
      }
      return {
        bankCashAccountId: payment.bankCashAccountId,
        amount: Number(payment.amount.toFixed(2)),
        reference: payment.reference,
        paymentMethod: this.mapPaymentMethod(account.type),
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
      new Set(payments.map((payment) => payment.bankCashAccountId.trim())),
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
    if (!canSeeAll && session.cashierUserId && session.cashierUserId !== user?.userId) {
      throw new BadRequestException("You do not have permission to access this POS session.");
    }
    return session;
  }

  private mapPaymentMethod(raw: string) {
    const normalized = raw.trim().toUpperCase();
    if (normalized.includes("CARD")) return PosPaymentMethod.CARD;
    if (normalized.includes("CLIQ")) return PosPaymentMethod.CLIQ;
    if (normalized.includes("WALLET")) return PosPaymentMethod.WALLET;
    if (normalized.includes("BANK")) return PosPaymentMethod.BANK_TRANSFER;
    return PosPaymentMethod.CASH;
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

  private toAmount(value: number | string | Prisma.Decimal) {
    return new Prisma.Decimal(value).toDecimalPlaces(2);
  }

  private toQuantity(value: number | string | Prisma.Decimal) {
    return new Prisma.Decimal(value).toDecimalPlaces(4);
  }

  private parseBoolean(value: string | undefined, fallback: boolean) {
    if (value === undefined) {
      return fallback;
    }
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(normalized);
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
      lines: {
        include: {
          item: { select: { id: true, code: true, name: true, type: true, trackInventory: true } },
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
      openedAt: row.openedAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
      notes: row.notes,
      warehouse: row.warehouse,
      cashAccount: row.cashAccount,
      cashierUser: row.cashierUser ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
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
      lines: row.lines.map((line: any) => ({
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
        item: line.item ?? null,
        warehouse: line.warehouse ?? null,
      })),
      payments: row.posPayments.map((payment: any) => ({
        id: payment.id,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount.toString(),
        tenderedAmount: payment.tenderedAmount?.toString() ?? null,
        reference: payment.reference ?? null,
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
}
