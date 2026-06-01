import { Body, Controller, Get, Param, Put, Post, Req, UseGuards, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { UpdateTableStatusDto, UpdateTableWaiterDto, TransferTableDto, MergeTablesDto, SplitTableDto } from "./dto/pos.dto";
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
    return this.prisma.posTable.findMany({
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
      orderBy: { tableNumber: "asc" },
    });
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
}
