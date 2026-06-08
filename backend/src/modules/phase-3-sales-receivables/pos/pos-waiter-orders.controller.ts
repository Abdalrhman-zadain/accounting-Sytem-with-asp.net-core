import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
import { WaiterFoodStatus } from "../../../generated/prisma";
import type { AuthorizedUser } from "../../platform/auth/auth.types";
import { UpdateWaiterOrderStatusDto } from "./dto/pos.dto";
import { PosService } from "./pos.service";

@UseGuards(JwtAuthGuard)
@Controller("pos/waiter/orders")
export class PosWaiterOrdersController {
  constructor(private readonly posService: PosService) {}

  @Get()
  listOrders(
    @Req() req: { user?: AuthorizedUser },
    @Query("status") status?: WaiterFoodStatus,
  ) {
    return this.posService.listWaiterOrders(req.user, status);
  }

  @Put(":id/status")
  updateOrderStatus(
    @Req() req: { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: UpdateWaiterOrderStatusDto,
  ) {
    return this.posService.updateWaiterOrderStatus(id, dto.status, req.user);
  }
}
