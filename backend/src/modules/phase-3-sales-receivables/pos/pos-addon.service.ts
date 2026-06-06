import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../generated/prisma";
import { PrismaService } from "../../../common/prisma/prisma.service";
import type { AuthorizedUser } from "../../platform/auth/auth.types";
import {
  CreatePosAddonGroupDto,
  CreatePosAddonOptionDto,
  SetPosItemAddonGroupsDto,
  UpdatePosAddonGroupDto,
  UpdatePosAddonOptionDto,
} from "./dto/pos-addon.dto";
import { PosService } from "./pos.service";

@Injectable()
export class PosAddonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posService: PosService,
  ) {}

  private assertAdmin(user?: AuthorizedUser) {
    this.posService.assertPosAddonAdminPermission(user);
  }

  private assertPosRead(user?: AuthorizedUser) {
    this.posService.assertPosAddonReadPermission(user);
  }

  private mapGroup(
    group: Prisma.PosAddonGroupGetPayload<{
      include: { options: true; itemLinks: { select: { itemId: true } } };
    }>,
  ) {
    return {
      id: group.id,
      code: group.code,
      name: group.name,
      nameAr: group.nameAr,
      selectionType: group.selectionType,
      isRequired: group.isRequired,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      sortOrder: group.sortOrder,
      isActive: group.isActive,
      options: group.options
        .filter((option) => option.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((option) => ({
          id: option.id,
          groupId: option.groupId,
          name: option.name,
          nameAr: option.nameAr,
          priceAdjustment: Number(option.priceAdjustment),
          sortOrder: option.sortOrder,
          isActive: option.isActive,
        })),
      itemIds: group.itemLinks.map((link) => link.itemId),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  async listGroups(user?: AuthorizedUser, includeInactive = false) {
    this.assertAdmin(user);
    const groups = await this.prisma.posAddonGroup.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
        itemLinks: { select: { itemId: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return groups.map((group) => this.mapGroup(group));
  }

  async listGroupsAdmin(user?: AuthorizedUser) {
    this.assertAdmin(user);
    const groups = await this.prisma.posAddonGroup.findMany({
      include: {
        options: { orderBy: { sortOrder: "asc" } },
        itemLinks: { select: { itemId: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return groups.map((group) => ({
      ...this.mapGroup(group),
      options: group.options
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((option) => ({
          id: option.id,
          groupId: option.groupId,
          name: option.name,
          nameAr: option.nameAr,
          priceAdjustment: Number(option.priceAdjustment),
          sortOrder: option.sortOrder,
          isActive: option.isActive,
        })),
    }));
  }

  async createGroup(dto: CreatePosAddonGroupDto, user?: AuthorizedUser) {
    this.assertAdmin(user);
    const existing = await this.prisma.posAddonGroup.findUnique({
      where: { code: dto.code.trim() },
    });
    if (existing) {
      throw new BadRequestException(`Addon group code "${dto.code}" already exists.`);
    }
    const group = await this.prisma.posAddonGroup.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        nameAr: dto.nameAr?.trim() || null,
        selectionType: dto.selectionType ?? "SINGLE",
        isRequired: dto.isRequired ?? false,
        minSelections: dto.minSelections ?? 0,
        maxSelections: dto.maxSelections ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        options: true,
        itemLinks: { select: { itemId: true } },
      },
    });
    return this.mapGroup(group);
  }

  async updateGroup(id: string, dto: UpdatePosAddonGroupDto, user?: AuthorizedUser) {
    this.assertAdmin(user);
    const group = await this.prisma.posAddonGroup.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException("Addon group was not found.");
    }
    const updated = await this.prisma.posAddonGroup.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        nameAr: dto.nameAr === undefined ? undefined : dto.nameAr?.trim() || null,
        selectionType: dto.selectionType,
        isRequired: dto.isRequired,
        minSelections: dto.minSelections,
        maxSelections: dto.maxSelections === undefined ? undefined : dto.maxSelections,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
        itemLinks: { select: { itemId: true } },
      },
    });
    return this.mapGroup(updated);
  }

  async createOption(
    groupId: string,
    dto: CreatePosAddonOptionDto,
    user?: AuthorizedUser,
  ) {
    this.assertAdmin(user);
    const group = await this.prisma.posAddonGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException("Addon group was not found.");
    }
    const option = await this.prisma.posAddonOption.create({
      data: {
        groupId,
        name: dto.name.trim(),
        nameAr: dto.nameAr?.trim() || null,
        priceAdjustment: dto.priceAdjustment ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return {
      ...option,
      priceAdjustment: Number(option.priceAdjustment),
    };
  }

  async updateOption(
    optionId: string,
    dto: UpdatePosAddonOptionDto,
    user?: AuthorizedUser,
  ) {
    this.assertAdmin(user);
    const option = await this.prisma.posAddonOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new NotFoundException("Addon option was not found.");
    }
    const updated = await this.prisma.posAddonOption.update({
      where: { id: optionId },
      data: {
        name: dto.name?.trim(),
        nameAr: dto.nameAr === undefined ? undefined : dto.nameAr?.trim() || null,
        priceAdjustment: dto.priceAdjustment,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
    return { ...updated, priceAdjustment: Number(updated.priceAdjustment) };
  }

  async setItemAddonGroups(
    itemId: string,
    dto: SetPosItemAddonGroupsDto,
    user?: AuthorizedUser,
  ) {
    this.assertAdmin(user);
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId.trim() },
      select: { id: true },
    });
    if (!item) {
      throw new NotFoundException("Inventory item was not found.");
    }
    const groupIds = [...new Set(dto.groupIds.map((id) => id.trim()).filter(Boolean))];
    if (groupIds.length) {
      const found = await this.prisma.posAddonGroup.count({
        where: { id: { in: groupIds }, isActive: true },
      });
      if (found !== groupIds.length) {
        throw new BadRequestException("One or more addon groups were not found or are inactive.");
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.posItemAddonGroup.deleteMany({ where: { itemId: item.id } });
      if (groupIds.length) {
        await tx.posItemAddonGroup.createMany({
          data: groupIds.map((groupId, index) => ({
            itemId: item.id,
            groupId,
            sortOrder: index,
          })),
        });
      }
    });
    return this.getItemAddonConfig(item.id, user);
  }

  async getItemAddonConfig(itemId: string, user?: AuthorizedUser) {
    this.assertPosRead(user);
    const links = await this.prisma.posItemAddonGroup.findMany({
      where: { itemId: itemId.trim() },
      include: {
        group: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    return {
      itemId: itemId.trim(),
      groups: links
        .filter((link) => link.group.isActive)
        .map((link) => ({
          id: link.group.id,
          code: link.group.code,
          name: link.group.name,
          nameAr: link.group.nameAr,
          selectionType: link.group.selectionType,
          isRequired: link.group.isRequired,
          minSelections: link.group.minSelections,
          maxSelections: link.group.maxSelections,
          options: link.group.options.map((option) => ({
            id: option.id,
            name: option.name,
            nameAr: option.nameAr,
            priceAdjustment: Number(option.priceAdjustment),
          })),
        })),
    };
  }

  async getAddonCatalog(itemIds: string[], user?: AuthorizedUser) {
    this.assertPosRead(user);
    const normalized = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))];
    if (!normalized.length) {
      return { items: [] as Array<{ itemId: string; groups: unknown[] }> };
    }
    const links = await this.prisma.posItemAddonGroup.findMany({
      where: { itemId: { in: normalized } },
      include: {
        group: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
      orderBy: [{ itemId: "asc" }, { sortOrder: "asc" }],
    });
    const byItem = new Map<string, typeof links>();
    for (const link of links) {
      if (!link.group.isActive) continue;
      const bucket = byItem.get(link.itemId) ?? [];
      bucket.push(link);
      byItem.set(link.itemId, bucket);
    }
    return {
      items: normalized.map((itemId) => {
        const itemLinks = byItem.get(itemId) ?? [];
        return {
          itemId,
          groups: itemLinks.map((link) => ({
            id: link.group.id,
            code: link.group.code,
            name: link.group.name,
            nameAr: link.group.nameAr,
            selectionType: link.group.selectionType,
            isRequired: link.group.isRequired,
            minSelections: link.group.minSelections,
            maxSelections: link.group.maxSelections,
            options: link.group.options.map((option) => ({
              id: option.id,
              name: option.name,
              nameAr: option.nameAr,
              priceAdjustment: Number(option.priceAdjustment),
            })),
          })),
        };
      }),
    };
  }
}
