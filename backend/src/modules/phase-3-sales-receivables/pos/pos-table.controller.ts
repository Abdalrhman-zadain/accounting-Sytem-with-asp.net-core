import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TableStatus } from "../../../generated/prisma";
import {
  CancelTableReservationDto,
  CreateTableDto,
  CreateTableReservationDto,
  MergeTablesDto,
  SplitTableDto,
  TransferTableDto,
  UpdateTableReservationDto,
  UpdateTableStatusDto,
  UpdateTableWaiterDto,
} from "./dto/pos.dto";
import { PosService } from "./pos.service";

@UseGuards(JwtAuthGuard)
@Controller("pos/tables")
export class PosTableController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posService: PosService,
  ) {}

  @Get()
  async listTables() {
    const rows = await this.prisma.posTable.findMany({
      include: {
        assignedWaiter: {
          select: { id: true, name: true, email: true },
        },
        reservations: {
          where: {
            status: "ACTIVE",
          },
          orderBy: { reservedFrom: "asc" },
          take: 20,
          select: {
            id: true,
            reservedFrom: true,
            reservedTo: true,
            status: true,
            notes: true,
            createdByUserId: true,
            createdAt: true,
          },
        },
        activeInvoice: {
          select: {
            id: true,
            reference: true,
            totalAmount: true,
            status: true,
            posOperationalStatus: true,
          },
        },
      },
      orderBy: { tableNumber: "asc" },
    });

    for (const table of rows) {
      await this.healStuckTable(table);
    }

    // Collect all preOrderSaleIds for a single batch enrichment query
    const allParsed = rows.flatMap((table) =>
      (table.reservations ?? []).map((r: any) =>
        this.posService.parseReservationNotes(typeof r.notes === "string" ? r.notes : null),
      ),
    );
    const preOrderSaleIds = allParsed
      .map((p) => p.preOrderSaleId)
      .filter((id): id is string => Boolean(id));

    const preOrderSalesMap = new Map<string, any>();
    if (preOrderSaleIds.length) {
      const sales = await this.prisma.salesInvoice.findMany({
        where: {
          id: { in: preOrderSaleIds },
          posOperationalStatus: { in: ["DRAFT", "HELD"] as any },
        },
        include: {
          lines: {
            select: { itemName: true, quantity: true },
            orderBy: { lineNumber: "asc" as any },
            take: 5,
          },
        },
      });
      for (const s of sales) {
        preOrderSalesMap.set(s.id, s);
      }
    }

    return rows.map((table) => ({
      ...table,
      reservations: (table.reservations ?? []).map((r: any) => {
        const parsed = this.posService.parseReservationNotes(
          typeof r.notes === "string" ? r.notes : null,
        );
        const preOrderSale = parsed.preOrderSaleId
          ? preOrderSalesMap.get(parsed.preOrderSaleId) ?? null
          : null;

        return {
          ...r,
          notes: parsed.notes,
          orderNotes: parsed.orderNotes,
          attendanceStatus: parsed.attendanceStatus,
          attendanceMarkedAt: parsed.attendanceMarkedAt,
          preOrderSaleId: parsed.preOrderSaleId,
          preOrder: preOrderSale
            ? {
                saleId: preOrderSale.id,
                lineCount: preOrderSale.lines.length,
                totalAmount: preOrderSale.totalAmount.toString(),
                itemsPreview: preOrderSale.lines.map((l: any) => ({
                  name: l.itemName ?? "",
                  quantity: Number(l.quantity),
                })),
              }
            : null,
        };
      }),
    }));
  }

  @Post("reservations/:reservationId/pre-order")
  openPreOrder(@Param("reservationId") reservationId: string, @Req() req: any) {
    return this.posService.openReservationPreOrder(reservationId, req.user);
  }

  @Post(":id/reservations")
  createReservation(@Param("id") tableId: string, @Body() dto: CreateTableReservationDto, @Req() req: any) {
    return this.posService.createTableReservation(tableId, dto, req.user);
  }
  
  @Post("reservations/:reservationId/cancel")
  cancelReservation(@Param("reservationId") reservationId: string, @Body() dto: CancelTableReservationDto, @Req() req: any) {
    return this.posService.cancelTableReservation(reservationId, dto, req.user);
  }

  @Put("reservations/:reservationId")
  updateReservation(
    @Param("reservationId") reservationId: string,
    @Body() dto: UpdateTableReservationDto,
    @Req() req: any,
  ) {
    return this.posService.updateTableReservation(reservationId, dto, req.user);
  }



  @Get(":id")
  async getTable(@Param("id") id: string) {
    const table = await this.prisma.posTable.findUnique({
      where: { id },
      include: {
        assignedWaiter: {
          select: { id: true, name: true, email: true },
        },
        activeInvoice: {
          select: {
            id: true,
            reference: true,
            totalAmount: true,
            status: true,
            posOperationalStatus: true,
          },
        },
      },
    });
    if (!table) {
      throw new NotFoundException(`Table with ID ${id} was not found.`);
    }
    await this.healStuckTable(table);
    return table;
  }

  @Put(":id/status")
  async updateStatus(@Param("id") id: string, @Body() dto: UpdateTableStatusDto) {
    const table = await this.prisma.posTable.findUnique({
      where: { id },
    });
    if (!table) {
      throw new NotFoundException(`Table with ID ${id} was not found.`);
    }
    return this.prisma.posTable.update({
      where: { id },
      data: { status: dto.status },
      include: {
        assignedWaiter: {
          select: { id: true, name: true, email: true },
        },
        activeInvoice: true,
      },
    });
  }

  @Put(":id/waiter")
  async updateWaiter(@Param("id") id: string, @Body() dto: UpdateTableWaiterDto) {
    const table = await this.prisma.posTable.findUnique({
      where: { id },
    });
    if (!table) {
      throw new NotFoundException(`Table with ID ${id} was not found.`);
    }
    return this.prisma.posTable.update({
      where: { id },
      data: { assignedWaiterId: dto.assignedWaiterId || null },
      include: {
        assignedWaiter: {
          select: { id: true, name: true, email: true },
        },
        activeInvoice: true,
      },
    });
  }

  @Post("transfer")
  async transferTable(@Body() dto: TransferTableDto, @Req() req: any) {
    return this.posService.transferTable(dto, req.user);
  }

  @Post("merge")
  async mergeTables(@Body() dto: MergeTablesDto, @Req() req: any) {
    return this.posService.mergeTables(dto, req.user);
  }

  @Post("split")
  async splitTable(@Body() dto: SplitTableDto, @Req() req: any) {
    return this.posService.splitTable(dto, req.user);
  }

  @Post()
  async createTable(@Body() dto: CreateTableDto) {
    const exists = await this.prisma.posTable.findUnique({
      where: { tableNumber: dto.tableNumber }
    });
    if (exists) {
      throw new BadRequestException(`Table number ${dto.tableNumber} already exists / رقم الطاولة موجود مسبقاً`);
    }
    return this.prisma.posTable.create({
      data: {
        tableNumber: dto.tableNumber,
        capacity: dto.capacity,
        status: "AVAILABLE",
      }
    });
  }

  @Delete(":id")
  async deleteTable(@Param("id") id: string) {
    const table = await this.prisma.posTable.findUnique({
      where: { id },
      include: {
        activeInvoice: true,
        _count: {
          select: { invoices: true },
        },
      }
    });
    if (!table) {
      throw new NotFoundException(`Table not found / الطاولة غير موجودة`);
    }
    if (table.activeInvoice) {
      throw new BadRequestException(`Cannot delete a table with an active order / لا يمكن حذف طاولة عليها طلب نشط`);
    }
    if (table._count.invoices > 0) {
      throw new BadRequestException(`Cannot delete a table with invoice history / لا يمكن حذف طاولة لديها سجل فواتير`);
    }
    return this.prisma.posTable.delete({
      where: { id }
    });
  }

  private async healStuckTable(table: any) {
    if (table.status === TableStatus.OCCUPIED && !table.activeInvoice) {
      const now = new Date();
      // Only heal if the table was last updated more than 5 minutes ago to allow normal order-taking locks
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      if (new Date(table.updatedAt) < fiveMinutesAgo) {
        let hasArrivedReservation = false;

        if (table.reservations) {
          hasArrivedReservation = table.reservations.some((r: any) => {
            const parsed = this.posService.parseReservationNotes(typeof r.notes === "string" ? r.notes : null);
            return (
              now >= new Date(r.reservedFrom) &&
              now <= new Date(r.reservedTo) &&
              parsed.attendanceStatus === "ARRIVED"
            );
          });
        } else {
          const reservations = await this.prisma.posTableReservation.findMany({
            where: {
              tableId: table.id,
              status: "ACTIVE",
              reservedFrom: { lte: now },
              reservedTo: { gte: now },
            },
          });
          hasArrivedReservation = reservations.some((r) => {
            const parsed = this.posService.parseReservationNotes(r.notes);
            return parsed.attendanceStatus === "ARRIVED";
          });
        }

        if (!hasArrivedReservation) {
          await this.prisma.posTable.update({
            where: { id: table.id },
            data: { status: TableStatus.AVAILABLE },
          });
          table.status = TableStatus.AVAILABLE;
        }
      }
    }
    return table;
  }
}
