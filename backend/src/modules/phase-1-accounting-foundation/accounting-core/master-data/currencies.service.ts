import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.currency.findMany({
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });
  }

  async create(dto: {
    code: string;
    name?: string;
    nameAr?: string;
    symbol?: string;
    decimalPlaces?: number;
    isBase?: boolean;
  }) {
    const code = dto.code?.trim().toUpperCase();
    if (!code) throw new BadRequestException('Currency code is required.');

    try {
      // If isBase is true, unset other base currencies
      if (dto.isBase) {
        await this.prisma.currency.updateMany({
          where: { isBase: true },
          data: { isBase: false },
        });
      }

      return await this.prisma.currency.create({
        data: {
          code,
          name: dto.name?.trim(),
          nameAr: dto.nameAr?.trim(),
          symbol: dto.symbol?.trim(),
          decimalPlaces: dto.decimalPlaces ?? 3,
          isBase: dto.isBase ?? false,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Currency code already exists.');
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: {
      code?: string;
      name?: string;
      nameAr?: string;
      symbol?: string;
      decimalPlaces?: number;
      isActive?: boolean;
      isBase?: boolean;
    },
  ) {
    const code = dto.code?.trim().toUpperCase();
    if (dto.code !== undefined && !code) throw new BadRequestException('Currency code cannot be empty.');

    try {
      if (dto.isBase) {
        await this.prisma.currency.updateMany({
          where: { isBase: true },
          data: { isBase: false },
        });
      }

      return await this.prisma.currency.update({
        where: { id },
        data: {
          code: code ?? undefined,
          name: dto.name?.trim() ?? undefined,
          nameAr: dto.nameAr?.trim() ?? undefined,
          symbol: dto.symbol?.trim() ?? undefined,
          decimalPlaces: dto.decimalPlaces ?? undefined,
          isActive: dto.isActive,
          isBase: dto.isBase,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Currency code already exists.');
      }
      throw e;
    }
  }

  deactivate(id: string) {
    return this.prisma.currency.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
