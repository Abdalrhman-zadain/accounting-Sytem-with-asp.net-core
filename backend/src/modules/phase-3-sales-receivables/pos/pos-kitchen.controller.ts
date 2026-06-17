import { Body, Controller, Get, Param, Put, Post, Req, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { UpdateKitchenOrderStatusDto, UpdateKitchenOrderItemStatusDto, ReprintKotDto } from "./dto/pos.dto";
import { KitchenStatus } from "../../../generated/prisma";
import type { AuthorizedUser } from "../../platform/auth/auth.types";
import { PosService } from "./pos.service";

@UseGuards(JwtAuthGuard)
@Controller("pos/kitchen")
export class PosKitchenController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posService: PosService,
  ) {}

  @Get("orders")
  async listOrders(@Req() req: { user?: AuthorizedUser }, @Query("status") status?: KitchenStatus) {
    this.posService.assertKitchenOrdersListPermission(req.user);
    return this.prisma.kitchenOrder.findMany({
      where: status ? { status } : undefined,
      include: {
        items: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  @Get("orders/:id")
  async getOrder(@Req() req: { user?: AuthorizedUser }, @Param("id") id: string) {
    this.posService.assertKitchenViewPermission(req.user);
    const order = await this.prisma.kitchenOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Kitchen order with ID ${id} was not found.`);
    }
    return order;
  }

  @Put("orders/:id/status")
  async updateOrderStatus(@Param("id") id: string, @Body() dto: UpdateKitchenOrderStatusDto) {
    const order = await this.prisma.kitchenOrder.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(`Kitchen order with ID ${id} was not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === KitchenStatus.READY || dto.status === KitchenStatus.SERVED) {
        await tx.kitchenOrderItem.updateMany({
          where: { kitchenOrderId: id },
          data: { status: dto.status },
        });
      }

      return tx.kitchenOrder.update({
        where: { id: id },
        data: { status: dto.status },
        include: {
          items: true,
        },
      });
    });
  }

  @Put("items/:itemId/status")
  async updateOrderItemStatus(
    @Req() req: { user?: AuthorizedUser },
    @Param("itemId") itemId: string,
    @Body() dto: UpdateKitchenOrderItemStatusDto,
  ) {
    this.posService.assertKitchenUpdatePermission(req.user);
    const item = await this.prisma.kitchenOrderItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException(`Kitchen order item with ID ${itemId} was not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.kitchenOrderItem.update({
        where: { id: itemId },
        data: { status: dto.status },
      });

      const allItems = await tx.kitchenOrderItem.findMany({
        where: { kitchenOrderId: item.kitchenOrderId },
      });

      let nextStatus: KitchenStatus = KitchenStatus.NEW;
      const statuses = allItems.map((i) => i.status);

      if (statuses.every((s) => s === KitchenStatus.SERVED)) {
        nextStatus = KitchenStatus.SERVED;
      } else if (statuses.every((s) => s === KitchenStatus.READY || s === KitchenStatus.SERVED)) {
        nextStatus = KitchenStatus.READY;
      } else if (statuses.some((s) => s === KitchenStatus.PREPARING || s === KitchenStatus.READY)) {
        nextStatus = KitchenStatus.PREPARING;
      }

      await tx.kitchenOrder.update({
        where: { id: item.kitchenOrderId },
        data: { status: nextStatus },
      });

      return updatedItem;
    });
  }

  @Post("orders/:id/reprint")
  async reprintKot(
    @Param("id") id: string,
    @Body() dto: ReprintKotDto,
    @Req() req: { user?: AuthorizedUser },
  ) {
    this.posService.assertKitchenUpdatePermission(req.user);
    return this.posService.auditKotReprint(id, dto, req.user);
  }

  @Put("orders/:id/dismiss-notification")
  async dismissNotification(
    @Param("id") id: string,
    @Req() req: { user?: AuthorizedUser },
  ) {
    this.posService.assertKitchenViewPermission(req.user);
    const order = await this.prisma.kitchenOrder.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(`Kitchen order with ID ${id} was not found.`);
    }
    return this.prisma.kitchenOrder.update({
      where: { id },
      data: { hasUpdateNotification: false },
    });
  }
}
