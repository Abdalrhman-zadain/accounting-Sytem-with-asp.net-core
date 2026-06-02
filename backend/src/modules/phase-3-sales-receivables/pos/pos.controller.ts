import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
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
  UpdatePosSettingsDto,
  SavePosDraftDto,
  SetPosFavoriteItemsDto,
  VoidPosSaleDto,
  CorrectOrderTypeDto,
  CorrectPaymentMethodDto,
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

  @Get("settings")
  getSettings(@Req() req: Request & { user?: any }) {
    return this.service.getSettings(req.user);
  }

  @Put("settings")
  updateSettings(@Req() req: Request & { user?: any }, @Body() dto: UpdatePosSettingsDto) {
    return this.service.updateSettings(dto, req.user);
  }

  @Get("favorites/items")
  listFavoriteItems(@Req() req: Request & { user?: any }) {
    return this.service.listFavoriteItemIds(req.user);
  }

  @Put("favorites/items")
  setFavoriteItems(@Req() req: Request & { user?: any }, @Body() dto: SetPosFavoriteItemsDto) {
    return this.service.setFavoriteItemIds(dto, req.user);
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
  listHeldSales(@Req() req: Request & { user?: any }, @Query("sessionId") sessionId: string) {
    return this.service.listHeldSales(sessionId, req.user);
  }

  @Get("sales/drafts")
  listDraftSales(@Req() req: Request & { user?: any }, @Query("sessionId") sessionId: string) {
    return this.service.listDraftSales(sessionId, req.user);
  }

  @Get("sales/completed")
  listCompletedSales(@Req() req: Request & { user?: any }) {
    return this.service.listCompletedSales(req.user);
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

  @Get("reports/time-window")
  getTimeWindow(
    @Req() req: Request & { user?: any },
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.service.getTimeWindowReport({ from, to }, req.user);
  }

  @Get("returns")
  listReturns(@Req() req: Request & { user?: any }) {
    return this.service.listReturns(req.user);
  }

  @Post("sales/hold")
  holdSale(@Req() req: Request & { user?: any }, @Body() dto: HoldPosSaleDto) {
    return this.service.holdSale(dto, req.user);
  }

  @Post("sales/draft")
  saveDraft(@Req() req: Request & { user?: any }, @Body() dto: SavePosDraftDto) {
    return this.service.saveDraft(dto, req.user);
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

  @Post("sessions/:id/accounting-approve")
  approveSessionAccounting(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.approveSessionAccounting(id, dto, req.user);
  }

  @Post("sessions/:id/accounting-reject")
  rejectSessionAccounting(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.rejectSessionAccounting(id, dto, req.user);
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

  @Post("sales/:id/correct-payment-method")
  correctPaymentMethod(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: CorrectPaymentMethodDto,
  ) {
    return this.service.correctPaymentMethod(id, dto, req.user);
  }

  @Post("sales/:id/reprint")
  reprintReceipt(@Req() req: Request & { user?: any }, @Param("id") id: string) {
    return this.service.reprintReceipt(id, req.user);
  }

  @Post("sessions/:id/print-roll-report")
  printSessionRollReport(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: { printType: "SESSION_ROLL_REPORT" | "INVOICE_LIST_ROLL" | "ALL_RECEIPTS_ROLL" },
  ) {
    return this.service.printSessionRollReport(id, dto.printType ?? "SESSION_ROLL_REPORT", req.user);
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

  @Post("sales/:id/correct-order-type")
  correctOrderType(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: CorrectOrderTypeDto,
  ) {
    return this.service.correctOrderType(id, dto, req.user);
  }

  @Get("delivery/companies")
  listDeliveryCompanies(@Req() req: Request & { user?: any }) {
    return this.service.listDeliveryCompanies(req.user);
  }

  @Get("delivery/drivers")
  listDeliveryDrivers(@Req() req: Request & { user?: any }) {
    return this.service.listDeliveryDrivers(req.user);
  }

  @Post("sales/:id/assign-driver")
  assignDriver(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: { driverId: string | null },
  ) {
    return this.service.assignDriver(id, dto.driverId, req.user);
  }

  @Post("sales/:id/delivery-status")
  updateDeliveryStatus(
    @Req() req: Request & { user?: any },
    @Param("id") id: string,
    @Body() dto: { status: any },
  ) {
    return this.service.updateDeliveryStatus(id, dto.status, req.user);
  }

  @Get("waiters")
  listWaiters(@Req() req: Request & { user?: any }) {
    return this.service.listWaiters(req.user);
  }
}
