import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CreditNoteLinkedInvoiceRequirement,
  CreditNoteTypeEffect,
  Prisma,
} from '../../../../generated/prisma';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  CreateCreditNoteTypeDto,
  UpdateCreditNoteTypeDto,
} from './credit-note-types.dto';

@Injectable()
export class CreditNoteTypesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.creditNoteType.findMany({
      include: { defaultAccount: { select: this.accountSelect() } },
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });
  }

  listActive() {
    return this.prisma.creditNoteType.findMany({
      where: { isActive: true },
      include: { defaultAccount: { select: this.accountSelect() } },
      orderBy: [{ code: 'asc' }],
    });
  }

  async create(dto: CreateCreditNoteTypeDto) {
    const data = await this.validateInput(dto);

    try {
      return await this.prisma.creditNoteType.create({
        data,
        include: { defaultAccount: { select: this.accountSelect() } },
      });
    } catch (error) {
      this.throwHelpfulMigrationErrorIfNeeded(error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Credit note type code already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCreditNoteTypeDto) {
    const existing = await this.prisma.creditNoteType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Credit note type not found.');
    }

    const data = await this.validateInput({
      code: dto.code ?? existing.code,
      name: dto.name ?? existing.name,
      effect: dto.effect ?? existing.effect,
      linkedInvoiceRequirement:
        dto.linkedInvoiceRequirement ?? existing.linkedInvoiceRequirement,
      affectsInventory: dto.affectsInventory ?? existing.affectsInventory,
      allowsTaxAdjustment:
        dto.allowsTaxAdjustment ?? existing.allowsTaxAdjustment,
      defaultAccountId: dto.defaultAccountId ?? existing.defaultAccountId,
      helperText:
        dto.helperText === undefined
          ? (existing.helperText ?? undefined)
          : dto.helperText,
      isActive: dto.isActive ?? existing.isActive,
    });

    try {
      return await this.prisma.creditNoteType.update({
        where: { id },
        data,
        include: { defaultAccount: { select: this.accountSelect() } },
      });
    } catch (error) {
      this.throwHelpfulMigrationErrorIfNeeded(error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Credit note type code already exists.');
      }
      throw error;
    }
  }

  private async validateInput(
    dto: CreateCreditNoteTypeDto,
  ): Promise<Prisma.CreditNoteTypeUncheckedCreateInput> {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    const helperText = dto.helperText?.trim() || null;

    if (!code) {
      throw new BadRequestException('Code is required.');
    }
    if (!name) {
      throw new BadRequestException('Name is required.');
    }
    if (!Object.values(CreditNoteTypeEffect).includes(dto.effect as CreditNoteTypeEffect)) {
      throw new BadRequestException('Effect is required.');
    }
    if (
      !Object.values(CreditNoteLinkedInvoiceRequirement).includes(
        dto.linkedInvoiceRequirement as CreditNoteLinkedInvoiceRequirement,
      )
    ) {
      throw new BadRequestException('Linked invoice requirement is required.');
    }

    const defaultAccount = await this.prisma.account.findFirst({
      where: {
        id: dto.defaultAccountId,
        isPosting: true,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
      },
    });
    if (!defaultAccount) {
      throw new BadRequestException(
        'Default account must be an active posting account.',
      );
    }

    if (dto.effect === CreditNoteTypeEffect.TAX_ONLY && defaultAccount.type !== 'LIABILITY') {
      throw new BadRequestException(
        'Tax-only credit note types should use a liability tax account.',
      );
    }

    return {
      code,
      name,
      effect: dto.effect as CreditNoteTypeEffect,
      linkedInvoiceRequirement:
        dto.linkedInvoiceRequirement as CreditNoteLinkedInvoiceRequirement,
      affectsInventory: dto.affectsInventory,
      allowsTaxAdjustment: dto.allowsTaxAdjustment,
      defaultAccountId: dto.defaultAccountId,
      helperText,
      isActive: dto.isActive ?? true,
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
      isPosting: true,
      isActive: true,
      currentBalance: true,
      currencyCode: true,
    };
  }

  private throwHelpfulMigrationErrorIfNeeded(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;
    if (error.code === 'P2021' || error.code === 'P2022') {
      throw new ServiceUnavailableException(
        'Database is missing the CreditNoteType table. Apply Prisma migrations and restart the backend.',
      );
    }
  }
}
