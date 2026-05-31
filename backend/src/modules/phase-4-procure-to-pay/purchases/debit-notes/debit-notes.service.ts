import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  AllocationStatus,
  AuditAction,
  CreditNoteLinkedInvoiceRequirement,
  CreditNoteTypeEffect,
  DebitNoteStatus,
  InventoryStockMovementType,
  Prisma,
  PurchaseInvoiceStatus,
} from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuditService } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.service';
import { JournalEntriesService } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service';
import { ReverseJournalEntryDto } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/dto/reverse-journal-entry.dto';
import { PostingService } from '../../../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service';
import { ReversalService } from '../../../phase-1-accounting-foundation/accounting-core/reversal-control/reversal.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import {
  CreateDebitNoteDto,
  DebitNoteLineDto,
  UpdateDebitNoteDto,
} from './dto/debit-notes.dto';
import { InventoryPostingService } from '../../../phase-5-inventory-management/inventory/shared/inventory-posting.service';

type DebitNoteListQuery = {
  status?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ResolvedSupplierDebitNoteType = {
  id: string;
  code: string;
  name: string;
  effect: CreditNoteTypeEffect;
  linkedInvoiceRequirement: CreditNoteLinkedInvoiceRequirement;
  affectsInventory: boolean;
  allowsTaxAdjustment: boolean;
  defaultAccountId: string;
  helperText: string | null;
  isActive: boolean;
};

type ResolvedDebitNoteLine = {
  purchaseInvoiceLineId: string | null;
  itemId: string | null;
  warehouseId: string | null;
  itemName: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  discountAccountId: string;
  taxId: string | null;
  taxAmount: number;
  originalUnitPrice: number | null;
  correctedUnitPrice: number | null;
  originalTaxAmount: number | null;
  correctedTaxAmount: number | null;
  returnToStock: boolean;
  returnReason: string | null;
  itemCondition: string | null;
  lineSubtotalAmount: number;
  lineTotalAmount: number;
  inventoryAccountId: string | null;
  unitCost: number | null;
  totalCost: number | null;
  reason: string;
};

type AuthUser = { userId?: string; email?: string; role?: string };

@Injectable()
export class DebitNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
    private readonly reversalService: ReversalService,
    private readonly auditService: AuditService,
    private readonly inventoryPostingService: InventoryPostingService,
  ) {}

  async list(query: DebitNoteListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.debitNote.findMany({
      where: {
        supplierId: query.supplierId,
        status: this.parseStatus(query.status),
        noteDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { supplier: { code: { contains: search, mode: 'insensitive' } } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              {
                purchaseInvoice: {
                  reference: { contains: search, mode: 'insensitive' },
                },
              },
              {
                supplierDebitNoteType: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
              {
                lines: {
                  some: {
                    OR: [
                      { reason: { contains: search, mode: 'insensitive' } },
                      { itemName: { contains: search, mode: 'insensitive' } },
                      { description: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ]
          : undefined,
      },
      include: this.debitNoteInclude(),
      orderBy: [{ noteDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapDebitNote(row));
  }

  async getById(id: string) {
    const row = await this.prisma.debitNote.findUnique({
      where: { id },
      include: this.debitNoteInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    return this.mapDebitNote(row);
  }

  async create(dto: CreateDebitNoteDto, user?: AuthUser) {
    const supplier = await this.suppliersService.ensureActiveSupplier(dto.supplierId);
    const supplierDebitNoteType = await this.resolveSupplierDebitNoteType(
      dto.supplierDebitNoteTypeId,
    );
    await this.ensurePurchaseInvoiceRequirement(
      dto.purchaseInvoiceId,
      supplier.id,
      supplierDebitNoteType,
    );

    const reference = dto.reference?.trim() || this.generateReference('DN');
    const currencyCode =
      dto.currencyCode?.trim().toUpperCase() || supplier.defaultCurrency;
    const lines = await this.resolveLines({
      dto,
      supplierDebitNoteType,
      supplierId: supplier.id,
      user,
    });
    const totals = this.computeTotals(lines);

    try {
      const created = await this.prisma.debitNote.create({
        data: {
          reference,
          noteDate: new Date(dto.noteDate),
          supplierId: supplier.id,
          supplierDebitNoteTypeId: supplierDebitNoteType.id,
          purchaseInvoiceId: dto.purchaseInvoiceId || null,
          currencyCode,
          description: dto.description?.trim() || null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          lines: {
            create: lines.map((line, index) =>
              this.buildDebitNoteLineCreateInput(line, index + 1),
            ),
          },
        },
        include: this.debitNoteInclude(),
      });

      await this.auditService.log({
        entity: 'DebitNote',
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { status: created.status, reference: created.reference },
      });

      return this.mapDebitNote(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException(
          'A debit note with this reference already exists.',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateDebitNoteDto, user?: AuthUser) {
    const current = await this.getDebitNoteOrThrow(id);
    if (current.status !== DebitNoteStatus.DRAFT) {
      throw new BadRequestException(
        'Posted debit notes are locked and cannot be edited.',
      );
    }

    const nextSupplierId = dto.supplierId ?? current.supplierId;
    const supplier = await this.suppliersService.ensureActiveSupplier(nextSupplierId);
    const nextType = await this.resolveSupplierDebitNoteType(
      dto.supplierDebitNoteTypeId ?? current.supplierDebitNoteTypeId,
    );
    const nextPurchaseInvoiceId =
      dto.purchaseInvoiceId === undefined
        ? current.purchaseInvoiceId ?? undefined
        : dto.purchaseInvoiceId || undefined;
    await this.ensurePurchaseInvoiceRequirement(
      nextPurchaseInvoiceId,
      supplier.id,
      nextType,
    );

    const lines = dto.lines
      ? await this.resolveLines({
          dto: {
            reference: dto.reference ?? current.reference,
            noteDate: dto.noteDate ?? current.noteDate.toISOString(),
            supplierId: supplier.id,
            supplierDebitNoteTypeId: nextType.id,
            purchaseInvoiceId: nextPurchaseInvoiceId,
            currencyCode:
              dto.currencyCode ?? current.currencyCode ?? supplier.defaultCurrency,
            description: dto.description ?? current.description ?? undefined,
            lines: dto.lines,
          },
          supplierDebitNoteType: nextType,
          supplierId: supplier.id,
          existingDebitNoteId: id,
          user,
        })
      : null;
    const totals = lines ? this.computeTotals(lines) : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.debitNoteLine.deleteMany({ where: { debitNoteId: id } });
        }

        return tx.debitNote.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            noteDate: dto.noteDate ? new Date(dto.noteDate) : undefined,
            supplierId: nextSupplierId,
            supplierDebitNoteTypeId: nextType.id,
            purchaseInvoiceId:
              dto.purchaseInvoiceId === undefined
                ? undefined
                : dto.purchaseInvoiceId || null,
            currencyCode:
              dto.currencyCode?.trim().toUpperCase() || supplier.defaultCurrency,
            description:
              dto.description === undefined
                ? undefined
                : dto.description.trim() || null,
            subtotalAmount: totals
              ? this.toAmount(totals.subtotalAmount)
              : undefined,
            taxAmount: totals ? this.toAmount(totals.taxAmount) : undefined,
            totalAmount: totals ? this.toAmount(totals.totalAmount) : undefined,
            lines: lines
              ? {
                  create: lines.map((line, index) =>
                    this.buildDebitNoteLineCreateInput(line, index + 1),
                  ),
                }
              : undefined,
          },
          include: this.debitNoteInclude(),
        });
      });

      await this.auditService.log({
        entity: 'DebitNote',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference },
      });

      return this.mapDebitNote(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException(
          'A debit note with this reference already exists.',
        );
      }
      throw error;
    }
  }

  async post(id: string) {
    const note = await this.prisma.debitNote.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            payableAccountId: true,
          },
        },
        supplierDebitNoteType: true,
        purchaseInvoice: {
          select: {
            id: true,
            reference: true,
            supplierId: true,
            totalAmount: true,
            status: true,
            journalEntry: {
              select: {
                id: true,
                lines: {
                  where: { creditAmount: { gt: 0 } },
                  orderBy: { creditAmount: 'desc' },
                  select: {
                    accountId: true,
                    creditAmount: true,
                  },
                },
              },
            },
          },
        },
        lines: {
          orderBy: { lineNumber: 'asc' },
          include: {
            tax: {
              select: {
                id: true,
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
            },
            item: {
              select: {
                id: true,
                trackInventory: true,
              },
            },
          },
        },
      },
    });
    if (!note) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    if (note.status !== DebitNoteStatus.DRAFT) {
      throw new BadRequestException('Only draft debit notes can be posted.');
    }
    if (!note.supplier.isActive) {
      throw new BadRequestException(
        'Deactivated suppliers cannot be selected for new transactions.',
      );
    }

    if (note.purchaseInvoice) {
      if (
        note.purchaseInvoice.status === PurchaseInvoiceStatus.CANCELLED ||
        note.purchaseInvoice.status === PurchaseInvoiceStatus.REVERSED
      ) {
        throw new BadRequestException(
          'Cancelled or reversed purchase invoices cannot be linked to posted debit notes.',
        );
      }

      const postedCredits = await this.prisma.debitNote.aggregate({
        where: {
          purchaseInvoiceId: note.purchaseInvoiceId!,
          id: { not: id },
          status: { in: [DebitNoteStatus.POSTED, DebitNoteStatus.APPLIED] },
        },
        _sum: { totalAmount: true },
      });

      const remaining =
        Number(note.purchaseInvoice.totalAmount) -
        Number(postedCredits._sum.totalAmount ?? 0);
      if (Number(note.totalAmount) - Number(remaining.toFixed(2)) > 0.0001) {
        throw new BadRequestException(
          'Debit note amount cannot exceed the remaining payable amount of the linked purchase invoice.',
        );
      }
    }

    const description = note.description
      ? `${note.reference} - ${note.description}`
      : note.reference;
    const journalLines = [
      {
        accountId: this.resolveSupplierPayableAccountId(note),
        description,
        debitAmount: Number(note.totalAmount),
        creditAmount: 0,
      },
      ...(await this.buildOffsetJournalLines(note, description)),
    ];
    this.ensureBalancedJournal(journalLines);
    const journal = await this.journalEntriesService.create({
      entryDate: note.noteDate.toISOString(),
      description,
      lines: journalLines,
    });
    const posted = await this.postingService.post(journal.id);
    const postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.debitNote.update({
        where: { id },
        data: {
          status: note.purchaseInvoiceId
            ? DebitNoteStatus.APPLIED
            : DebitNoteStatus.POSTED,
          journalEntryId: posted.id,
          postedAt,
        },
        include: this.debitNoteInclude(),
      });

      await tx.supplier.update({
        where: { id: note.supplierId },
        data: {
          currentBalance: {
            decrement: this.toAmount(Number(note.totalAmount)),
          },
        },
      });

      if (
        note.supplierDebitNoteType.effect ===
        CreditNoteTypeEffect.FINANCIAL_INVENTORY
      ) {
        await this.applyPurchaseReturnInventoryEffects(
          tx,
          note.id,
          note.reference,
          note.noteDate,
        );
      }

      if (note.purchaseInvoiceId) {
        await this.recomputePurchaseInvoiceAmounts(tx, note.purchaseInvoiceId);
      }

      return next;
    });

    await this.auditService.log({
      entity: 'DebitNote',
      entityId: updated.id,
      action: AuditAction.POST,
      details: {
        status: updated.status,
        reference: updated.reference,
        journalEntryId: posted.id,
      },
    });

    return this.mapDebitNote(updated);
  }

  async cancel(id: string) {
    const note = await this.prisma.debitNote.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!note) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    if (note.status !== DebitNoteStatus.DRAFT) {
      throw new BadRequestException('Only draft debit notes can be cancelled.');
    }

    const updated = await this.prisma.debitNote.update({
      where: { id },
      data: { status: DebitNoteStatus.CANCELLED },
      include: this.debitNoteInclude(),
    });

    await this.auditService.log({
      entity: 'DebitNote',
      entityId: updated.id,
      action: AuditAction.DELETE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapDebitNote(updated);
  }

  async reverse(id: string, dto: ReverseJournalEntryDto) {
    const note = await this.prisma.debitNote.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        status: true,
        supplierId: true,
        purchaseInvoiceId: true,
        totalAmount: true,
        journalEntryId: true,
      },
    });
    if (!note) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    if (
      note.status !== DebitNoteStatus.POSTED &&
      note.status !== DebitNoteStatus.APPLIED
    ) {
      throw new BadRequestException('Only posted debit notes can be reversed.');
    }
    if (!note.journalEntryId) {
      throw new BadRequestException(
        'Debit note does not have a posted journal entry to reverse.',
      );
    }

    await this.reversalService.reverse(note.journalEntryId, dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.debitNote.update({
        where: { id },
        data: { status: DebitNoteStatus.REVERSED },
        include: this.debitNoteInclude(),
      });

      await tx.supplier.update({
        where: { id: note.supplierId },
        data: {
          currentBalance: {
            increment: this.toAmount(Number(note.totalAmount)),
          },
        },
      });

      if (note.purchaseInvoiceId) {
        await this.recomputePurchaseInvoiceAmounts(tx, note.purchaseInvoiceId);
      }

      return next;
    });

    await this.auditService.log({
      entity: 'DebitNote',
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: {
        status: updated.status,
        reference: updated.reference,
        journalEntryId: note.journalEntryId,
      },
    });

    return this.mapDebitNote(updated);
  }

  private async resolveLines(options: {
    dto: {
      reference?: string;
      noteDate?: string;
      supplierId?: string;
      supplierDebitNoteTypeId?: string;
      purchaseInvoiceId?: string;
      currencyCode?: string;
      description?: string;
      lines: DebitNoteLineDto[];
    };
    supplierDebitNoteType: ResolvedSupplierDebitNoteType;
    supplierId: string;
    existingDebitNoteId?: string;
    user?: AuthUser;
  }) {
    const { dto, supplierDebitNoteType, existingDebitNoteId } = options;
    if (!dto.lines?.length) {
      throw new BadRequestException('At least one debit note line is required.');
    }

    if (supplierDebitNoteType.code === 'DN-PURCHASE-RETURN') {
      return this.buildPurchaseReturnLines(
        dto.purchaseInvoiceId,
        dto.lines,
        supplierDebitNoteType,
        existingDebitNoteId,
      );
    }
    if (supplierDebitNoteType.code === 'DN-PRICE-CORRECTION') {
      return this.buildPriceCorrectionLines(
        dto.purchaseInvoiceId,
        dto.lines,
        supplierDebitNoteType,
      );
    }
    if (supplierDebitNoteType.code === 'DN-TAX-CORRECTION') {
      return this.buildTaxCorrectionLines(
        dto.purchaseInvoiceId,
        dto.lines,
        supplierDebitNoteType,
      );
    }
    if (supplierDebitNoteType.code === 'DN-SUPPLIER-SETTLEMENT') {
      return this.buildSupplierSettlementLines(dto.lines, supplierDebitNoteType);
    }

    return this.buildPurchaseDiscountLines(dto.lines, supplierDebitNoteType);
  }

  private async buildPurchaseDiscountLines(
    inputLines: DebitNoteLineDto[],
    supplierDebitNoteType: ResolvedSupplierDebitNoteType,
  ): Promise<ResolvedDebitNoteLine[]> {
    const { validAccounts, taxById } = await this.resolveReferenceData(inputLines);
    return inputLines.map((line, index) => {
      const amount = Number(line.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException(
          `Discount amount must be greater than zero for line ${index + 1}.`,
        );
      }
      const taxId = line.taxId?.trim() || null;
      const taxAmount = taxId
        ? Number((amount * ((taxById.get(taxId) ?? 0) / 100)).toFixed(2))
        : Number(line.taxAmount ?? 0);
      const discountAccountId =
        line.discountAccountId?.trim() || supplierDebitNoteType.defaultAccountId;
      this.ensureValidAccount(validAccounts, discountAccountId, index + 1);

      return {
        purchaseInvoiceLineId: null,
        itemId: null,
        warehouseId: null,
        itemName: null,
        description: line.description?.trim() || null,
        quantity: Number(line.quantity ?? 1),
        unitPrice: amount,
        amount,
        discountAccountId,
        taxId,
        taxAmount,
        originalUnitPrice: null,
        correctedUnitPrice: null,
        originalTaxAmount: null,
        correctedTaxAmount: null,
        returnToStock: false,
        returnReason: null,
        itemCondition: null,
        lineSubtotalAmount: amount,
        lineTotalAmount: Number((amount + taxAmount).toFixed(2)),
        inventoryAccountId: null,
        unitCost: null,
        totalCost: null,
        reason: line.reason.trim(),
      };
    });
  }

  private async buildSupplierSettlementLines(
    inputLines: DebitNoteLineDto[],
    supplierDebitNoteType: ResolvedSupplierDebitNoteType,
  ): Promise<ResolvedDebitNoteLine[]> {
    const { validAccounts } = await this.resolveReferenceData(inputLines);
    return inputLines.map((line, index) => {
      const amount = Number(line.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException(
          `Settlement amount must be greater than zero for line ${index + 1}.`,
        );
      }
      const discountAccountId =
        line.discountAccountId?.trim() || supplierDebitNoteType.defaultAccountId;
      this.ensureValidAccount(validAccounts, discountAccountId, index + 1);

      return {
        purchaseInvoiceLineId: null,
        itemId: null,
        warehouseId: null,
        itemName: line.itemName?.trim() || 'تسوية مورد',
        description: line.description?.trim() || null,
        quantity: 1,
        unitPrice: amount,
        amount,
        discountAccountId,
        taxId: null,
        taxAmount: 0,
        originalUnitPrice: null,
        correctedUnitPrice: null,
        originalTaxAmount: null,
        correctedTaxAmount: null,
        returnToStock: false,
        returnReason: null,
        itemCondition: null,
        lineSubtotalAmount: amount,
        lineTotalAmount: amount,
        inventoryAccountId: null,
        unitCost: null,
        totalCost: null,
        reason: line.reason.trim(),
      };
    });
  }

  private async buildPurchaseReturnLines(
    purchaseInvoiceId: string | undefined,
    inputLines: DebitNoteLineDto[],
    supplierDebitNoteType: ResolvedSupplierDebitNoteType,
    existingDebitNoteId?: string,
  ): Promise<ResolvedDebitNoteLine[]> {
    const invoice = await this.getSourcePurchaseInvoiceOrThrow(purchaseInvoiceId);
    const lineIds = inputLines
      .map((line) => line.purchaseInvoiceLineId?.trim())
      .filter(Boolean) as string[];
    const priorReturns = lineIds.length
      ? await this.prisma.debitNoteLine.findMany({
          where: {
            purchaseInvoiceLineId: { in: lineIds },
            debitNote: {
              id: existingDebitNoteId ? { not: existingDebitNoteId } : undefined,
              status: { in: [DebitNoteStatus.POSTED, DebitNoteStatus.APPLIED] },
            },
          },
          select: {
            purchaseInvoiceLineId: true,
            quantity: true,
          },
        })
      : [];
    const returnedByLine = new Map<string, number>();
    for (const row of priorReturns) {
      if (!row.purchaseInvoiceLineId) continue;
      returnedByLine.set(
        row.purchaseInvoiceLineId,
        (returnedByLine.get(row.purchaseInvoiceLineId) ?? 0) + Number(row.quantity),
      );
    }

    return inputLines.map((line, index) => {
      const sourceLineId = line.purchaseInvoiceLineId?.trim();
      if (!sourceLineId) {
        throw new BadRequestException(
          `Original purchase invoice line is required for purchase return line ${index + 1}.`,
        );
      }
      const invoiceLine = invoice.lines.find((candidate: any) => candidate.id === sourceLineId);
      if (!invoiceLine) {
        throw new BadRequestException(
          `Purchase invoice line ${sourceLineId} was not found on the linked purchase invoice.`,
        );
      }
      const returnQty = Number(line.quantity ?? 0);
      if (!Number.isFinite(returnQty) || returnQty <= 0) {
        throw new BadRequestException(
          `Returned quantity must be greater than zero for line ${invoiceLine.lineNumber}.`,
        );
      }
      const purchasedQty = Number(invoiceLine.quantity);
      const previouslyReturnedQty = returnedByLine.get(invoiceLine.id) ?? 0;
      const availableQty = Number(
        (purchasedQty - previouslyReturnedQty).toFixed(4),
      );
      if (returnQty > availableQty + 0.0001) {
        throw new BadRequestException(
          `Returned quantity for purchase invoice line ${invoiceLine.lineNumber} exceeds the available return quantity.`,
        );
      }
      const warehouseId =
        line.warehouseId?.trim() || invoiceLine.warehouseId || null;
      if (!warehouseId) {
        throw new BadRequestException(
          `Warehouse is required for purchase return line ${invoiceLine.lineNumber}.`,
        );
      }

      const ratio = returnQty / purchasedQty;
      const lineBaseAmount = Number(
        (
          (Number(invoiceLine.lineSubtotalAmount) - Number(invoiceLine.discountAmount)) *
          ratio
        ).toFixed(2),
      );
      const originalTaxAmount = Number(
        (Number(invoiceLine.taxAmount) * ratio).toFixed(2),
      );
      const taxAmount = supplierDebitNoteType.allowsTaxAdjustment
        ? Number((line.taxAmount ?? originalTaxAmount).toFixed(2))
        : originalTaxAmount;
      const returnToStock = true;
      if (!invoiceLine.itemId || !this.lineTracksInventory(invoiceLine.item)) {
        throw new BadRequestException(
          `Purchase return line ${invoiceLine.lineNumber} must reference a stocked inventory item.`,
        );
      }
      const netUnitCost = purchasedQty > 0 ? lineBaseAmount / returnQty : 0;
      return {
        purchaseInvoiceLineId: invoiceLine.id,
        itemId: invoiceLine.itemId,
        warehouseId,
        itemName: invoiceLine.itemName,
        description: line.description?.trim() || invoiceLine.description || null,
        quantity: returnQty,
        unitPrice: Number(invoiceLine.unitPrice),
        amount: lineBaseAmount,
        discountAccountId: supplierDebitNoteType.defaultAccountId,
        taxId: invoiceLine.taxId,
        taxAmount,
        originalUnitPrice: Number(invoiceLine.unitPrice),
        correctedUnitPrice: null,
        originalTaxAmount,
        correctedTaxAmount:
          supplierDebitNoteType.allowsTaxAdjustment && line.taxAmount !== undefined
            ? taxAmount
            : null,
        returnToStock,
        returnReason: line.reason.trim(),
        itemCondition: line.itemCondition?.trim() || null,
        lineSubtotalAmount: lineBaseAmount,
        lineTotalAmount: Number((lineBaseAmount + taxAmount).toFixed(2)),
        inventoryAccountId: invoiceLine.item?.inventoryAccountId ?? null,
        unitCost: Number(netUnitCost.toFixed(4)),
        totalCost: Number((netUnitCost * returnQty).toFixed(2)),
        reason: line.reason.trim(),
      };
    });
  }

  private async buildPriceCorrectionLines(
    purchaseInvoiceId: string | undefined,
    inputLines: DebitNoteLineDto[],
    supplierDebitNoteType: ResolvedSupplierDebitNoteType,
  ): Promise<ResolvedDebitNoteLine[]> {
    const invoice = await this.getSourcePurchaseInvoiceOrThrow(purchaseInvoiceId);
    return inputLines.map((line, index) => {
      const sourceLineId = line.purchaseInvoiceLineId?.trim();
      if (!sourceLineId) {
        throw new BadRequestException(
          `Original purchase invoice line is required for price correction line ${index + 1}.`,
        );
      }
      const invoiceLine = invoice.lines.find((candidate: any) => candidate.id === sourceLineId);
      if (!invoiceLine) {
        throw new BadRequestException(
          `Purchase invoice line ${sourceLineId} was not found on the linked purchase invoice.`,
        );
      }
      const originalUnitPrice = Number(invoiceLine.unitPrice);
      const correctedUnitPrice = Number(
        line.correctedUnitPrice ?? line.unitPrice ?? 0,
      );
      if (!Number.isFinite(correctedUnitPrice) || correctedUnitPrice < 0) {
        throw new BadRequestException(
          `Corrected price is required for line ${invoiceLine.lineNumber}.`,
        );
      }
      if (correctedUnitPrice > originalUnitPrice) {
        throw new BadRequestException(
          `Corrected price cannot exceed the original price for line ${invoiceLine.lineNumber}.`,
        );
      }
      const quantity = Number(invoiceLine.quantity);
      const amount = Number(
        ((originalUnitPrice - correctedUnitPrice) * quantity).toFixed(2),
      );
      const originalTaxAmount = Number(invoiceLine.taxAmount);
      const derivedCorrectedTax = Number(
        (
          originalTaxAmount *
          (correctedUnitPrice / (originalUnitPrice || 1))
        ).toFixed(2),
      );
      const correctedTaxAmount = supplierDebitNoteType.allowsTaxAdjustment
        ? Number((line.correctedTaxAmount ?? derivedCorrectedTax).toFixed(2))
        : derivedCorrectedTax;
      const taxAmount = Number(
        (originalTaxAmount - correctedTaxAmount).toFixed(2),
      );
      return {
        purchaseInvoiceLineId: invoiceLine.id,
        itemId: invoiceLine.itemId,
        warehouseId: invoiceLine.warehouseId,
        itemName: invoiceLine.itemName,
        description: line.description?.trim() || invoiceLine.description || null,
        quantity,
        unitPrice: amount,
        amount,
        discountAccountId: supplierDebitNoteType.defaultAccountId,
        taxId: invoiceLine.taxId,
        taxAmount: Math.max(0, taxAmount),
        originalUnitPrice,
        correctedUnitPrice,
        originalTaxAmount,
        correctedTaxAmount,
        returnToStock: false,
        returnReason: null,
        itemCondition: null,
        lineSubtotalAmount: amount,
        lineTotalAmount: Number((amount + Math.max(0, taxAmount)).toFixed(2)),
        inventoryAccountId: null,
        unitCost: null,
        totalCost: null,
        reason: line.reason.trim(),
      };
    });
  }

  private async buildTaxCorrectionLines(
    purchaseInvoiceId: string | undefined,
    inputLines: DebitNoteLineDto[],
    supplierDebitNoteType: ResolvedSupplierDebitNoteType,
  ): Promise<ResolvedDebitNoteLine[]> {
    const invoice = await this.getSourcePurchaseInvoiceOrThrow(purchaseInvoiceId);
    return inputLines.map((line, index) => {
      const sourceLineId = line.purchaseInvoiceLineId?.trim();
      if (!sourceLineId) {
        throw new BadRequestException(
          `Original purchase invoice line is required for tax correction line ${index + 1}.`,
        );
      }
      const invoiceLine = invoice.lines.find((candidate: any) => candidate.id === sourceLineId);
      if (!invoiceLine) {
        throw new BadRequestException(
          `Purchase invoice line ${sourceLineId} was not found on the linked purchase invoice.`,
        );
      }
      const originalTaxAmount = Number(
        line.originalTaxAmount ?? invoiceLine.taxAmount,
      );
      const correctedTaxAmount = Number(
        line.correctedTaxAmount ?? line.taxAmount ?? 0,
      );
      if (!Number.isFinite(correctedTaxAmount) || correctedTaxAmount < 0) {
        throw new BadRequestException(
          `Corrected tax is required for line ${invoiceLine.lineNumber}.`,
        );
      }
      if (correctedTaxAmount > originalTaxAmount) {
        throw new BadRequestException(
          `Corrected tax cannot exceed the original tax for line ${invoiceLine.lineNumber}.`,
        );
      }
      const taxAmount = Number(
        (originalTaxAmount - correctedTaxAmount).toFixed(2),
      );
      return {
        purchaseInvoiceLineId: invoiceLine.id,
        itemId: invoiceLine.itemId,
        warehouseId: invoiceLine.warehouseId,
        itemName: invoiceLine.itemName,
        description: line.description?.trim() || invoiceLine.description || null,
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        discountAccountId: supplierDebitNoteType.defaultAccountId,
        taxId: invoiceLine.taxId,
        taxAmount,
        originalUnitPrice: Number(invoiceLine.unitPrice),
        correctedUnitPrice: Number(invoiceLine.unitPrice),
        originalTaxAmount,
        correctedTaxAmount,
        returnToStock: false,
        returnReason: null,
        itemCondition: null,
        lineSubtotalAmount: 0,
        lineTotalAmount: taxAmount,
        inventoryAccountId: null,
        unitCost: null,
        totalCost: null,
        reason: line.reason.trim(),
      };
    });
  }

  private computeTotals(lines: ResolvedDebitNoteLine[]) {
    return lines.reduce(
      (totals, line) => ({
        subtotalAmount: Number(
          (totals.subtotalAmount + line.lineSubtotalAmount).toFixed(2),
        ),
        taxAmount: Number((totals.taxAmount + line.taxAmount).toFixed(2)),
        totalAmount: Number((totals.totalAmount + line.lineTotalAmount).toFixed(2)),
      }),
      { subtotalAmount: 0, taxAmount: 0, totalAmount: 0 },
    );
  }

  private buildDebitNoteLineCreateInput(
    line: ResolvedDebitNoteLine,
    lineNumber: number,
  ): Prisma.DebitNoteLineUncheckedCreateWithoutDebitNoteInput {
    return {
      lineNumber,
      purchaseInvoiceLineId: line.purchaseInvoiceLineId,
      itemId: line.itemId,
      warehouseId: line.warehouseId,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      unitPrice: this.toAmount(line.unitPrice),
      amount: this.toAmount(line.amount),
      discountAccountId: line.discountAccountId,
      taxId: line.taxId,
      taxAmount: this.toAmount(line.taxAmount),
      originalUnitPrice:
        line.originalUnitPrice === null ? null : this.toAmount(line.originalUnitPrice),
      correctedUnitPrice:
        line.correctedUnitPrice === null
          ? null
          : this.toAmount(line.correctedUnitPrice),
      originalTaxAmount:
        line.originalTaxAmount === null ? null : this.toAmount(line.originalTaxAmount),
      correctedTaxAmount:
        line.correctedTaxAmount === null
          ? null
          : this.toAmount(line.correctedTaxAmount),
      returnToStock: line.returnToStock,
      returnReason: line.returnReason,
      itemCondition: line.itemCondition,
      lineSubtotalAmount: this.toAmount(line.lineSubtotalAmount),
      inventoryAccountId: line.inventoryAccountId,
      unitCost: line.unitCost === null ? null : this.toUnitCost(line.unitCost),
      totalCost: line.totalCost === null ? null : this.toAmount(line.totalCost),
      reason: line.reason,
      lineTotalAmount: this.toAmount(line.lineTotalAmount),
    };
  }

  private async resolveSupplierDebitNoteType(
    id: string,
  ): Promise<ResolvedSupplierDebitNoteType> {
    const row = await this.prisma.supplierDebitNoteType.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        effect: true,
        linkedInvoiceRequirement: true,
        affectsInventory: true,
        allowsTaxAdjustment: true,
        defaultAccountId: true,
        helperText: true,
        isActive: true,
      },
    });
    if (!row) {
      throw new BadRequestException(
        'Supplier debit note type was not found or is inactive.',
      );
    }
    return row;
  }

  private async ensurePurchaseInvoiceRequirement(
    purchaseInvoiceId: string | undefined,
    supplierId: string,
    supplierDebitNoteType: ResolvedSupplierDebitNoteType,
  ) {
    if (
      supplierDebitNoteType.linkedInvoiceRequirement ===
        CreditNoteLinkedInvoiceRequirement.REQUIRED &&
      !purchaseInvoiceId
    ) {
      throw new BadRequestException(
        'Linked purchase invoice is required for the selected supplier debit note type.',
      );
    }
    if (purchaseInvoiceId) {
      await this.ensurePurchaseInvoice(purchaseInvoiceId, supplierId);
    }
  }

  private async ensurePurchaseInvoice(
    purchaseInvoiceId: string | undefined,
    supplierId: string,
  ) {
    if (!purchaseInvoiceId) return;
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id: purchaseInvoiceId },
      select: { id: true, supplierId: true, status: true },
    });
    if (!invoice) {
      throw new BadRequestException('Linked purchase invoice was not found.');
    }
    if (invoice.supplierId !== supplierId) {
      throw new BadRequestException(
        'Debit notes and linked purchase invoices must use the same supplier.',
      );
    }
    if (
      invoice.status === PurchaseInvoiceStatus.DRAFT ||
      invoice.status === PurchaseInvoiceStatus.CANCELLED ||
      invoice.status === PurchaseInvoiceStatus.REVERSED
    ) {
      throw new BadRequestException(
        'Only posted purchase invoices can be linked to debit notes.',
      );
    }
  }

  private async getSourcePurchaseInvoiceOrThrow(purchaseInvoiceId?: string) {
    if (!purchaseInvoiceId) {
      throw new BadRequestException(
        'Linked purchase invoice is required for the selected supplier debit note type.',
      );
    }
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id: purchaseInvoiceId },
      include: {
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
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });
    if (!invoice) {
      throw new BadRequestException('Linked purchase invoice was not found.');
    }
    return invoice;
  }

  private async resolveReferenceData(lines: DebitNoteLineDto[]) {
    const accountIds = Array.from(
      new Set(lines.map((line) => line.discountAccountId?.trim()).filter(Boolean)),
    ) as string[];
    const taxIds = Array.from(
      new Set(lines.map((line) => line.taxId?.trim()).filter(Boolean)),
    ) as string[];
    const [accounts, taxes] = await Promise.all([
      accountIds.length
        ? this.prisma.account.findMany({
            where: { id: { in: accountIds }, isActive: true, isPosting: true },
            select: { id: true, type: true },
          })
        : Promise.resolve([]),
      taxIds.length
        ? this.prisma.tax.findMany({
            where: { id: { in: taxIds }, isActive: true },
            select: { id: true, rate: true },
          })
        : Promise.resolve([]),
    ]);
    return {
      validAccounts: new Set(accounts.map((account) => account.id)),
      taxById: new Map(taxes.map((tax) => [tax.id, Number(tax.rate)])),
    };
  }

  private ensureValidAccount(
    validAccounts: Set<string>,
    accountId: string,
    lineNumber: number,
  ) {
    if (!validAccounts.size) {
      return;
    }
    if (!validAccounts.has(accountId)) {
      throw new BadRequestException(
        `Selected default account is invalid for line ${lineNumber}.`,
      );
    }
  }

  private async buildOffsetJournalLines(
    note: {
      reference: string;
      supplierDebitNoteType: { effect: CreditNoteTypeEffect };
      lines: Array<{
        discountAccountId: string | null;
        amount: { toString(): string };
        lineSubtotalAmount: { toString(): string };
        taxId: string | null;
        taxAmount: { toString(): string };
        inventoryAccountId: string | null;
        totalCost: { toString(): string } | null;
        tax?: {
          id: string;
          taxAccountId: string | null;
          taxAccount?: {
            id: string;
            isActive: boolean;
            isPosting: boolean;
            allowManualPosting: boolean;
          } | null;
        } | null;
      }>;
    },
    description: string,
  ) {
    const lines: Array<{
      accountId: string;
      description: string;
      debitAmount: number;
      creditAmount: number;
    }> = [];
    const creditByAccount = new Map<string, number>();
    const debitByAccount = new Map<string, number>();
    const taxByAccount = new Map<string, number>();
    const inventoryByAccount = new Map<string, number>();

    for (const line of note.lines) {
      const accountId = line.discountAccountId;
      const baseAmount =
        note.supplierDebitNoteType.effect === CreditNoteTypeEffect.TAX_ONLY
          ? Number(line.amount)
          : Number(line.lineSubtotalAmount);
      if (baseAmount > 0) {
        if (!accountId) {
          throw new BadRequestException(
            'Each supplier debit note line must resolve a default account.',
          );
        }
        creditByAccount.set(
          accountId,
          Number(((creditByAccount.get(accountId) ?? 0) + baseAmount).toFixed(2)),
        );
      }

      const taxAmount = Number(line.taxAmount);
      if (taxAmount > 0) {
        let taxAccountId: string | null = null;
        if (
          line.tax?.taxAccountId &&
          line.tax.taxAccount?.isActive &&
          line.tax.taxAccount.isPosting &&
          line.tax.taxAccount.allowManualPosting
        ) {
          taxAccountId = line.tax.taxAccountId;
        }
        if (!taxAccountId) {
          taxAccountId = await this.getPurchaseTaxAccountId();
        }
        taxByAccount.set(
          taxAccountId,
          Number(((taxByAccount.get(taxAccountId) ?? 0) + taxAmount).toFixed(2)),
        );
      }

      const totalCost = Number(line.totalCost ?? 0);
      if (line.inventoryAccountId && totalCost > 0) {
        const offsetAccountId = line.discountAccountId;
        if (offsetAccountId) {
          debitByAccount.set(
            offsetAccountId,
            Number(((debitByAccount.get(offsetAccountId) ?? 0) + totalCost).toFixed(2)),
          );
        }
        inventoryByAccount.set(
          line.inventoryAccountId,
          Number(
            ((inventoryByAccount.get(line.inventoryAccountId) ?? 0) + totalCost).toFixed(
              2,
            ),
          ),
        );
      }
    }

    lines.push(
      ...Array.from(debitByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description: `${description} inventory value adjustment`,
        debitAmount: amount,
        creditAmount: 0,
      })),
    );
    lines.push(
      ...Array.from(creditByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description,
        debitAmount: 0,
        creditAmount: amount,
      })),
    );
    lines.push(
      ...Array.from(taxByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description: `${description} tax`,
        debitAmount: 0,
        creditAmount: amount,
      })),
    );
    lines.push(
      ...Array.from(inventoryByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description: `${description} inventory return`,
        debitAmount: 0,
        creditAmount: amount,
      })),
    );

    return lines;
  }

  private async getPurchaseTaxAccountId() {
    const account = await this.prisma.account.findFirst({
      where: {
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
        type: { in: ['ASSET', 'EXPENSE'] as any },
        OR: [
          { subtype: { contains: 'tax', mode: 'insensitive' } },
          { subtype: { contains: 'vat', mode: 'insensitive' } },
          { name: { contains: 'tax', mode: 'insensitive' } },
          { name: { contains: 'vat', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!account) {
      throw new BadRequestException(
        'No active purchase tax/VAT account is configured for posting tax amounts.',
      );
    }
    return account.id;
  }

  private async applyPurchaseReturnInventoryEffects(
    tx: Prisma.TransactionClient,
    debitNoteId: string,
    reference: string,
    noteDate: Date,
  ) {
    const lines = await tx.debitNoteLine.findMany({
      where: { debitNoteId, returnToStock: true },
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
      orderBy: { lineNumber: 'asc' },
    });

    for (const line of lines) {
      if (!line.itemId || !line.item?.trackInventory || !line.warehouseId) {
        continue;
      }

      const existingMovement = await tx.inventoryStockMovement.findFirst({
        where: {
          transactionType: 'DebitNote',
          transactionLineId: line.id,
          movementType: InventoryStockMovementType.PURCHASE_RETURN,
        },
        select: { id: true },
      });
      if (existingMovement) {
        continue;
      }

      const quantity = new Prisma.Decimal(line.quantity);
      const fallbackUnitCost = new Prisma.Decimal(line.unitCost ?? 0);
      const resolvedCost = await this.inventoryPostingService.resolveIssueCost({
        tx,
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        quantity,
        fallbackUnitCost,
        reference,
        sourceType: 'DebitNote',
        sourceId: debitNoteId,
        sourceLineId: line.id,
        sourceDate: noteDate,
      });

      await tx.debitNoteLine.update({
        where: { id: line.id },
        data: {
          unitCost: resolvedCost.unitCost,
          totalCost: resolvedCost.totalAmount,
        },
      });

      await tx.inventoryItem.update({
        where: { id: line.itemId },
        data: {
          onHandQuantity: { decrement: quantity },
          valuationAmount: { decrement: resolvedCost.totalAmount },
        },
      });

      const warehouseBalance =
        await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: line.itemId,
          warehouseId: line.warehouseId,
          quantityDelta: quantity.neg(),
          valueDelta: resolvedCost.totalAmount.neg(),
        });

      await this.inventoryPostingService.createMovement(tx, {
        movementType: InventoryStockMovementType.PURCHASE_RETURN,
        transactionType: 'DebitNote',
        transactionId: debitNoteId,
        transactionLineId: line.id,
        transactionReference: reference,
        transactionDate: noteDate,
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        quantityIn: new Prisma.Decimal(0),
        quantityOut: quantity,
        unitCost: resolvedCost.unitCost,
        valueIn: new Prisma.Decimal(0),
        valueOut: resolvedCost.totalAmount,
        balanceId: warehouseBalance.id,
        runningQuantity: warehouseBalance.onHandQuantity,
        runningValuation: warehouseBalance.valuationAmount,
        description: line.description,
      });
    }
  }

  private async recomputePurchaseInvoiceAmounts(
    tx: Prisma.TransactionClient | PrismaService,
    invoiceId: string,
  ) {
    const invoice = await tx.purchaseInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, totalAmount: true, status: true },
    });
    if (!invoice) return;

    const [allocations, debitNotes] = await Promise.all([
      tx.supplierPaymentAllocation.aggregate({
        where: {
          purchaseInvoiceId: invoiceId,
          supplierPayment: { status: { not: 'CANCELLED' as any } },
        },
        _sum: { amount: true },
      }),
      tx.debitNote.aggregate({
        where: {
          purchaseInvoiceId: invoiceId,
          status: { in: [DebitNoteStatus.POSTED, DebitNoteStatus.APPLIED] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const credited = Number(debitNotes._sum.totalAmount ?? 0);
    const baseOutstanding = Math.max(
      0,
      Number((Number(invoice.totalAmount) - credited).toFixed(2)),
    );
    const allocated = Number(allocations._sum.amount ?? 0);
    const outstanding = Math.max(
      0,
      Number((baseOutstanding - allocated).toFixed(2)),
    );
    const allocationStatus: AllocationStatus =
      allocated <= 0
        ? AllocationStatus.UNALLOCATED
        : outstanding <= 0
          ? AllocationStatus.FULLY_ALLOCATED
          : AllocationStatus.PARTIAL;

    const nextStatus =
      invoice.status === PurchaseInvoiceStatus.DRAFT ||
      invoice.status === PurchaseInvoiceStatus.CANCELLED
        ? invoice.status
        : outstanding <= 0
          ? PurchaseInvoiceStatus.FULLY_PAID
          : allocated > 0
            ? PurchaseInvoiceStatus.PARTIALLY_PAID
            : PurchaseInvoiceStatus.POSTED;

    await tx.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        allocatedAmount: this.toAmount(allocated),
        outstandingAmount: this.toAmount(outstanding),
        allocationStatus,
        status: nextStatus,
      },
    });
  }

  private debitNoteInclude() {
    return {
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
          defaultCurrency: true,
          isActive: true,
        },
      },
      supplierDebitNoteType: {
        include: {
          defaultAccount: { select: this.accountSelect() },
        },
      },
      purchaseInvoice: {
        select: {
          id: true,
          reference: true,
          status: true,
          invoiceDate: true,
          totalAmount: true,
          allocatedAmount: true,
          outstandingAmount: true,
          lines: {
            orderBy: { lineNumber: 'asc' },
            select: {
              id: true,
              lineNumber: true,
              itemId: true,
              itemName: true,
              description: true,
              quantity: true,
              unitPrice: true,
              discountAmount: true,
              taxId: true,
              taxAmount: true,
              lineSubtotalAmount: true,
              lineTotalAmount: true,
              warehouseId: true,
            },
          },
        },
      },
      journalEntry: {
        select: {
          id: true,
          reference: true,
        },
      },
      lines: {
        orderBy: { lineNumber: 'asc' },
        include: {
          discountAccount: { select: this.accountSelect() },
          inventoryAccount: { select: this.accountSelect() },
          tax: {
            select: {
              id: true,
              taxCode: true,
              taxName: true,
              rate: true,
              taxType: true,
              taxAccountId: true,
            },
          },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              trackInventory: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              isActive: true,
            },
          },
          purchaseInvoiceLine: {
            select: {
              id: true,
              lineNumber: true,
              quantity: true,
            },
          },
        },
      },
    } satisfies Prisma.DebitNoteInclude;
  }

  private mapDebitNote(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      noteDate: row.noteDate.toISOString(),
      currencyCode: row.currencyCode,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      journalEntryId: row.journalEntryId ?? null,
      journalReference: row.journalEntry?.reference ?? null,
      canEdit: row.status === DebitNoteStatus.DRAFT,
      canPost: row.status === DebitNoteStatus.DRAFT,
      canCancel: row.status === DebitNoteStatus.DRAFT,
      canReverse:
        row.status === DebitNoteStatus.POSTED ||
        row.status === DebitNoteStatus.APPLIED,
      supplier: row.supplier,
      supplierDebitNoteType: row.supplierDebitNoteType
        ? {
            id: row.supplierDebitNoteType.id,
            code: row.supplierDebitNoteType.code,
            name: row.supplierDebitNoteType.name,
            effect: row.supplierDebitNoteType.effect,
            linkedInvoiceRequirement:
              row.supplierDebitNoteType.linkedInvoiceRequirement,
            affectsInventory: row.supplierDebitNoteType.affectsInventory,
            allowsTaxAdjustment: row.supplierDebitNoteType.allowsTaxAdjustment,
            helperText: row.supplierDebitNoteType.helperText,
            isActive: row.supplierDebitNoteType.isActive,
            defaultAccount: row.supplierDebitNoteType.defaultAccount,
          }
        : null,
      purchaseInvoice: row.purchaseInvoice
        ? {
            id: row.purchaseInvoice.id,
            reference: row.purchaseInvoice.reference,
            status: row.purchaseInvoice.status,
            invoiceDate: row.purchaseInvoice.invoiceDate.toISOString(),
            totalAmount: row.purchaseInvoice.totalAmount.toString(),
            allocatedAmount: row.purchaseInvoice.allocatedAmount.toString(),
            outstandingAmount: row.purchaseInvoice.outstandingAmount.toString(),
            lines: row.purchaseInvoice.lines.map((line: any) => ({
              id: line.id,
              lineNumber: line.lineNumber,
              itemId: line.itemId ?? null,
              itemName: line.itemName ?? null,
              description: line.description,
              quantity: line.quantity.toString(),
              unitPrice: line.unitPrice.toString(),
              discountAmount: line.discountAmount.toString(),
              taxId: line.taxId ?? null,
              taxAmount: line.taxAmount.toString(),
              lineSubtotalAmount: line.lineSubtotalAmount.toString(),
              lineTotalAmount: line.lineTotalAmount.toString(),
              warehouseId: line.warehouseId ?? null,
            })),
          }
        : null,
      lines: row.lines.map((line: any) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        purchaseInvoiceLineId: line.purchaseInvoiceLineId ?? null,
        itemId: line.itemId ?? null,
        warehouseId: line.warehouseId ?? null,
        itemName: line.itemName ?? null,
        description: line.description ?? null,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        amount: line.amount.toString(),
        discountAccountId: line.discountAccountId ?? null,
        discountAccount: line.discountAccount ?? null,
        taxId: line.taxId ?? null,
        tax: line.tax ?? null,
        taxAmount: line.taxAmount.toString(),
        originalUnitPrice:
          line.originalUnitPrice === null
            ? null
            : line.originalUnitPrice.toString(),
        correctedUnitPrice:
          line.correctedUnitPrice === null
            ? null
            : line.correctedUnitPrice.toString(),
        originalTaxAmount:
          line.originalTaxAmount === null
            ? null
            : line.originalTaxAmount.toString(),
        correctedTaxAmount:
          line.correctedTaxAmount === null
            ? null
            : line.correctedTaxAmount.toString(),
        returnToStock: Boolean(line.returnToStock),
        returnReason: line.returnReason ?? null,
        itemCondition: line.itemCondition ?? null,
        lineSubtotalAmount: line.lineSubtotalAmount.toString(),
        lineTotalAmount: line.lineTotalAmount.toString(),
        inventoryAccountId: line.inventoryAccountId ?? null,
        inventoryAccount: line.inventoryAccount ?? null,
        unitCost: line.unitCost === null ? null : line.unitCost.toString(),
        totalCost: line.totalCost === null ? null : line.totalCost.toString(),
        reason: line.reason,
        item: line.item ?? null,
        warehouse: line.warehouse ?? null,
        purchaseInvoiceLine: line.purchaseInvoiceLine
          ? {
              id: line.purchaseInvoiceLine.id,
              lineNumber: line.purchaseInvoiceLine.lineNumber,
              quantity: line.purchaseInvoiceLine.quantity.toString(),
            }
          : null,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private accountSelect() {
    return {
      id: true,
      code: true,
      name: true,
      nameAr: true,
      type: true,
      subtype: true,
      currencyCode: true,
      isActive: true,
      isPosting: true,
    };
  }

  private async getDebitNoteOrThrow(id: string) {
    const row = await this.prisma.debitNote.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    return row;
  }

  private parseStatus(status?: string): DebitNoteStatus | undefined {
    if (!status) return undefined;
    if (status in DebitNoteStatus) {
      return status as DebitNoteStatus;
    }
    throw new BadRequestException('Invalid debit note status.');
  }

  private dateRangeFilter(dateFrom?: string, dateTo?: string) {
    return dateFrom || dateTo
      ? {
          gte: dateFrom ? new Date(dateFrom) : undefined,
          lte: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;
  }

  private resolveSupplierPayableAccountId(note: {
    supplier: { payableAccountId: string };
    purchaseInvoice:
      | {
          journalEntry: {
            lines: Array<{
              accountId: string;
              creditAmount: { toString(): string } | number;
            }>;
          } | null;
        }
      | null;
  }) {
    const invoicePayableAccountId = note.purchaseInvoice?.journalEntry?.lines[0]?.accountId;
    return invoicePayableAccountId || note.supplier.payableAccountId;
  }

  private lineTracksInventory(
    item:
      | {
          type: string;
          trackInventory: boolean;
        }
      | null
      | undefined,
  ) {
    return Boolean(item && item.type !== 'SERVICE' && item.trackInventory);
  }

  private ensureBalancedJournal(
    lines: Array<{ debitAmount: number; creditAmount: number }>,
  ) {
    const debit = Number(
      lines.reduce((sum, line) => sum + Number(line.debitAmount), 0).toFixed(2),
    );
    const credit = Number(
      lines.reduce((sum, line) => sum + Number(line.creditAmount), 0).toFixed(2),
    );
    if (Math.abs(debit - credit) > 0.01) {
      throw new BadRequestException(
        'Supplier debit note journal preview is unbalanced.',
      );
    }
  }

  private toAmount(value: number) {
    return Number(value).toFixed(2);
  }

  private toQuantity(value: number) {
    return Number(value).toFixed(4);
  }

  private toUnitCost(value: number) {
    return Number(value).toFixed(4);
  }

  private generateReference(prefix: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private isUniqueConflict(error: unknown, field: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes(field)
    );
  }
}
