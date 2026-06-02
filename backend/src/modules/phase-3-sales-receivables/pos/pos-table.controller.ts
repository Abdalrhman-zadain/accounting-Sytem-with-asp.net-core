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
import {
  CancelTableReservationDto,
  CreateTableDto,
  CreateTableReservationDto,
  MergeTablesDto,
  SplitTableDto,
  TransferTableDto,
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
    const now = new Date();
    const rows = await this.prisma.posTable.findMany({
      include: {
        assignedWaiter: {
          select: { id: true, name: true, email: true },
        },
        reservations: {
          where: {
            status: "ACTIVE",
            reservedTo: { gt: now },
          },
          orderBy: { reservedFrom: "asc" },
          take: 1,
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

    return rows;
  }

  @Post(":id/reservations")
  createReservation(@Param("id") tableId: string, @Body() dto: CreateTableReservationDto, @Req() req: any) {
    return this.posService.createTableReservation(tableId, dto, req.user);
  }
  
  @Post("reservations/:reservationId/cancel")
  cancelReservation(@Param("reservationId") reservationId: string, @Body() dto: CancelTableReservationDto, @Req() req: any) {
    return this.posService.cancelTableReservation(reservationId, dto, req.user);
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
        activeInvoice: true
      }
    });
    if (!table) {
      throw new NotFoundException(`Table not found / الطاولة غير موجودة`);
    }
    if (table.activeInvoice) {
      throw new BadRequestException(`Cannot delete a table with an active order / لا يمكن حذف طاولة عليها طلب نشط`);
    }
    return this.prisma.posTable.delete({
      where: { id }
    });
  }
}
