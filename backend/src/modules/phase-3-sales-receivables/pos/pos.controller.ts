import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
import {
  ClosePosSessionDto,
  CompletePosSaleDto,
  CreatePosReturnDto,
  HoldPosSaleDto,
  OpenPosSessionDto,
  PosReverseAccountingDto,
  PosReviewDecisionDto,
  VoidPosSaleDto,
} from "./dto/pos.dto";
import { PosService } from "./pos.service";

@UseGuards(JwtAuthGuard)
@Controller("pos")
export class PosController {
  constructor(private readonly service: PosService) {}

  @Get("sessions/active")
  getActiveSession(@Req() req: Request & { user?: any }) {
    return this.service.getActiveSession(req.user);
  }

  @Get("sessions")
  listSessions(@Req() req: Request & { user?: any }) {
    return this.service.listSessions(req.user);
  }

  @Post("sessions/open")
  openSession(@Req() req: Request & { user?: any }, @Body() dto: OpenPosSessionDto) {
    return this.service.openSession(dto, req.user);
  }

  @Post("sessions/:id/close")
  closeSession(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: ClosePosSessionDto,
  ) {
    return this.service.closeSession(id, dto, req.user);
  }

  @Get("sessions/:id/report")
  getSessionReport(@Req() req: Request & { user?: any }, @Param("id") id: string) {
    return this.service.getSessionReport(id, req.user);
  }

  @Get("sales/held")
  listHeldSales(@Query("sessionId") sessionId: string) {
    return this.service.listHeldSales(sessionId);
  }

  @Get("sales/review")
  listPendingReview(@Req() req: Request & { user?: any }) {
    return this.service.listPendingReview(req.user);
  }

  @Get("reports/overview")
  getOverview(@Req() req: Request & { user?: any }) {
    return this.service.getReportsOverview(req.user);
  }

  @Get("reports/sales-by-payment-method")
  getSalesByPaymentMethod(@Req() req: Request & { user?: any }) {
    return this.service.getSalesByPaymentMethodReport(req.user);
  }

  @Get("reports/sales-by-cashier")
  getSalesByCashier(@Req() req: Request & { user?: any }) {
    return this.service.getSalesByCashierReport(req.user);
  }

  @Get("reports/sales-by-branch")
  getSalesByBranch(@Req() req: Request & { user?: any }) {
    return this.service.getSalesByBranchReport(req.user);
  }

  @Get("reports/sales-by-item")
  getSalesByItem(@Req() req: Request & { user?: any }) {
    return this.service.getSalesByItemReport(req.user);
  }

  @Get("reports/inventory-impact")
  getInventoryImpact(@Req() req: Request & { user?: any }) {
    return this.service.getInventoryImpactReport(req.user);
  }

  @Get("reports/tax-summary")
  getTaxSummary(@Req() req: Request & { user?: any }) {
    return this.service.getTaxSummaryReport(req.user);
  }

  @Get("returns")
  listReturns(@Req() req: Request & { user?: any }) {
    return this.service.listReturns(req.user);
  }

  @Post("sales/hold")
  holdSale(@Req() req: Request & { user?: any }, @Body() dto: HoldPosSaleDto) {
    return this.service.holdSale(dto, req.user);
  }

  @Post("sales/complete")
  completeSale(@Req() req: Request & { user?: any }, @Body() dto: CompletePosSaleDto) {
    return this.service.completeSale(dto, req.user);
  }

  @Post("sales/:id/void")
  voidSale(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: VoidPosSaleDto,
  ) {
    return this.service.voidSale(id, dto, req.user);
  }

  @Post("sales/:id/accounting-approve")
  approveAccounting(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.approveAccounting(id, dto, req.user);
  }

  @Post("sales/:id/accounting-reject")
  rejectAccounting(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.rejectAccounting(id, dto, req.user);
  }

  @Post("sales/:id/accounting-reverse")
  reverseAccounting(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: PosReverseAccountingDto,
  ) {
    return this.service.reverseAccounting(id, dto, req.user);
  }

  @Post("sales/:id/reprint")
  reprintReceipt(@Req() req: Request & { user?: any }, @Param("id") id: string) {
    return this.service.reprintReceipt(id, req.user);
  }

  @Post("returns")
  createReturn(@Req() req: Request & { user?: any }, @Body() dto: CreatePosReturnDto) {
    return this.service.createReturn(dto, req.user);
  }

  @Post("returns/:id/accounting-approve")
  approveReturnAccounting(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.approveReturnAccounting(id, dto, req.user);
  }

  @Post("returns/:id/accounting-reject")
  rejectReturnAccounting(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.rejectReturnAccounting(id, dto, req.user);
  }

  @Post("returns/:id/accounting-reverse")
  reverseReturnAccounting(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: PosReverseAccountingDto,
  ) {
    return this.service.reverseReturnAccounting(id, dto, req.user);
  }
}
