import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import type { AuthorizedUser } from "../../platform/auth/auth.types";
import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
import {
  ClosePosSessionDto,
  CollectMarketReceivablesDto,
  CompletePosSaleDto,
  CreatePosReturnDto,
  HoldPosSaleDto,
  OpenPosSessionDto,
  PosReverseAccountingDto,
  PosReviewDecisionDto,
  SavePosDraftDto,
  SetPosFavoriteItemsDto,
  UpdatePosSettingsDto,
  VoidPosSaleDto,
  CorrectPaymentMethodDto,
} from "./dto/pos-market.dto";
import {
  CreateRepCarLoadDto,
  CreateRepCarStocktakeDto,
  UpdateRepCarLoadDto,
  UpdateRepCarStocktakeDto,
} from "./rep-car-stock/dto/rep-car-stock.dto";
import { PosMarketService } from "./pos-market.service";

@UseGuards(JwtAuthGuard)
@Controller("pos-market")
export class PosMarketController {
  constructor(private readonly service: PosMarketService) {}

  @Get("health")
  getHealth(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getHealth(req.user!);
  }

  @Get("sessions/active")
  getActiveSession(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getActiveSession(req.user);
  }

  @Get("destination-markets")
  listDestinationMarkets(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.listDestinationMarkets(req.user);
  }

  @Get("receivables/sales-reps")
  listMarketReceivableSalesReps(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.listMarketReceivableSalesReps(req.user);
  }

  @Get("receivables")
  listMarketReceivables(
    @Req() req: Request & { user?: AuthorizedUser },
    @Query("salesRepId") salesRepId?: string,
    @Query("search") search?: string,
  ) {
    return this.service.listMarketReceivables({ salesRepId, search }, req.user);
  }

  @Get("receivables/:customerId/detail")
  getMarketReceivableDetail(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("customerId") customerId: string,
  ) {
    return this.service.getMarketReceivableDetail(customerId, req.user);
  }

  @Get("receivables/:customerId/invoices")
  listMarketReceivableInvoices(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("customerId") customerId: string,
  ) {
    return this.service.listMarketReceivableInvoices(customerId, req.user);
  }

  @Post("receivables/collect")
  collectMarketReceivables(
    @Req() req: Request & { user?: AuthorizedUser },
    @Body() dto: CollectMarketReceivablesDto,
  ) {
    return this.service.collectMarketReceivables(dto, req.user);
  }

  @Get("settings")
  getSettings(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getSettings(req.user);
  }

  @Put("settings")
  updateSettings(@Req() req: Request & { user?: AuthorizedUser }, @Body() dto: UpdatePosSettingsDto) {
    return this.service.updateSettings(dto, req.user);
  }

  @Get("favorites/items")
  listFavoriteItems(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.listFavoriteItemIds(req.user);
  }

  @Put("favorites/items")
  setFavoriteItems(@Req() req: Request & { user?: AuthorizedUser }, @Body() dto: SetPosFavoriteItemsDto) {
    return this.service.setFavoriteItemIds(dto, req.user);
  }

  @Get("sessions")
  listSessions(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.listSessions(req.user);
  }

  @Post("sessions/open")
  openSession(@Req() req: Request & { user?: AuthorizedUser }, @Body() dto: OpenPosSessionDto) {
    return this.service.openSession(dto, req.user);
  }

  @Post("sessions/:id/close")
  closeSession(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: ClosePosSessionDto,
  ) {
    return this.service.closeSession(id, dto, req.user);
  }

  @Get("sessions/:id/report")
  getSessionReport(@Req() req: Request & { user?: AuthorizedUser }, @Param("id") id: string) {
    return this.service.getSessionReport(id, req.user);
  }

  @Get("sales/held")
  listHeldSales(@Req() req: Request & { user?: AuthorizedUser }, @Query("sessionId") sessionId: string) {
    return this.service.listHeldSales(sessionId, req.user);
  }

  @Get("sales/drafts")
  listDraftSales(@Req() req: Request & { user?: AuthorizedUser }, @Query("sessionId") sessionId: string) {
    return this.service.listDraftSales(sessionId, req.user);
  }

  @Get("sales/completed")
  listCompletedSales(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.listCompletedSales(req.user);
  }

  @Get("sales/review")
  listPendingReview(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.listPendingReview(req.user);
  }

  @Get("reports/overview")
  getOverview(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getReportsOverview(req.user);
  }

  @Get("reports/sales-by-payment-method")
  getSalesByPaymentMethod(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getSalesByPaymentMethodReport(req.user);
  }

  @Get("reports/sales-by-cashier")
  getSalesByCashier(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getSalesByCashierReport(req.user);
  }

  @Get("reports/sales-by-branch")
  getSalesByBranch(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getSalesByBranchReport(req.user);
  }

  @Get("reports/sales-by-item")
  getSalesByItem(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getSalesByItemReport(req.user);
  }

  @Get("reports/inventory-impact")
  getInventoryImpact(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getInventoryImpactReport(req.user);
  }

  @Get("reports/tax-summary")
  getTaxSummary(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.getTaxSummaryReport(req.user);
  }

  @Get("reports/time-window")
  getTimeWindow(
    @Req() req: Request & { user?: AuthorizedUser },
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.service.getTimeWindowReport({ from, to }, req.user);
  }

  @Get("returns")
  listReturns(@Req() req: Request & { user?: AuthorizedUser }) {
    return this.service.listReturns(req.user);
  }

  @Post("sales/hold")
  holdSale(@Req() req: Request & { user?: AuthorizedUser }, @Body() dto: HoldPosSaleDto) {
    return this.service.holdSale(dto, req.user);
  }

  @Post("sales/draft")
  saveDraft(@Req() req: Request & { user?: AuthorizedUser }, @Body() dto: SavePosDraftDto) {
    return this.service.saveDraft(dto, req.user);
  }

  @Post("sales/complete")
  completeSale(@Req() req: Request & { user?: AuthorizedUser }, @Body() dto: CompletePosSaleDto) {
    return this.service.completeSale(dto, req.user);
  }

  @Post("sales/:id/void")
  voidSale(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: VoidPosSaleDto,
  ) {
    return this.service.voidSale(id, dto, req.user);
  }

  @Post("sales/:id/accounting-approve")
  approveAccounting(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.approveAccounting(id, dto, req.user);
  }

  @Post("sessions/:id/accounting-approve")
  approveSessionAccounting(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.approveSessionAccounting(id, dto, req.user);
  }

  @Post("sessions/:id/accounting-reject")
  rejectSessionAccounting(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.rejectSessionAccounting(id, dto, req.user);
  }

  @Post("sales/:id/accounting-reject")
  rejectAccounting(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.rejectAccounting(id, dto, req.user);
  }

  @Post("sales/:id/accounting-reverse")
  reverseAccounting(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: PosReverseAccountingDto,
  ) {
    return this.service.reverseAccounting(id, dto, req.user);
  }

  @Post("sales/:id/correct-payment-method")
  correctPaymentMethod(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: CorrectPaymentMethodDto,
  ) {
    return this.service.correctPaymentMethod(id, dto, req.user);
  }

  @Post("sales/:id/reprint")
  reprintReceipt(@Req() req: Request & { user?: AuthorizedUser }, @Param("id") id: string) {
    return this.service.reprintReceipt(id, req.user);
  }

  @Post("sessions/:id/print-roll-report")
  printSessionRollReport(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: { printType: "SESSION_ROLL_REPORT" | "INVOICE_LIST_ROLL" | "ALL_RECEIPTS_ROLL" },
  ) {
    return this.service.printSessionRollReport(id, dto.printType ?? "SESSION_ROLL_REPORT", req.user);
  }

  @Post("returns")
  createReturn(@Req() req: Request & { user?: AuthorizedUser }, @Body() dto: CreatePosReturnDto) {
    return this.service.createReturn(dto, req.user);
  }

  @Post("returns/:id/accounting-approve")
  approveReturnAccounting(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.approveReturnAccounting(id, dto, req.user);
  }

  @Post("returns/:id/accounting-reject")
  rejectReturnAccounting(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: PosReviewDecisionDto,
  ) {
    return this.service.rejectReturnAccounting(id, dto, req.user);
  }

  @Post("returns/:id/accounting-reverse")
  reverseReturnAccounting(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: PosReverseAccountingDto,
  ) {
    return this.service.reverseReturnAccounting(id, dto, req.user);
  }

  @Get("sales-reps")
  listMarketSalesReps() {
    return this.service.listMarketSalesReps();
  }

  @Get("catalog")
  getMarketCatalog(
    @Req() req: Request & { user?: AuthorizedUser },
    @Query("salesRepId") salesRepId: string,
  ) {
    return this.service.getMarketCatalog(salesRepId, req.user);
  }

  @Get("rep-car-stock")
  listRepCarStock(
    @Req() req: Request & { user?: AuthorizedUser },
    @Query("salesRepId") salesRepId: string,
  ) {
    return this.service.listRepCarStock(salesRepId, req.user);
  }

  @Get("rep-car-stock/movements")
  listRepCarStockMovements(
    @Req() req: Request & { user?: AuthorizedUser },
    @Query("salesRepId") salesRepId?: string,
    @Query("itemId") itemId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.listRepCarStockMovements(
      { salesRepId, itemId, dateFrom, dateTo, page, limit },
      req.user,
    );
  }

  @Get("rep-car-loads")
  listRepCarLoads(
    @Req() req: Request & { user?: AuthorizedUser },
    @Query("status") status?: string,
    @Query("salesRepId") salesRepId?: string,
    @Query("warehouseId") warehouseId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.listRepCarLoads(
      { status, salesRepId, warehouseId, dateFrom, dateTo, search, page, limit },
      req.user,
    );
  }

  @Get("rep-car-loads/:id")
  getRepCarLoad(@Req() req: Request & { user?: AuthorizedUser }, @Param("id") id: string) {
    return this.service.getRepCarLoad(id, req.user);
  }

  @Post("rep-car-loads")
  createRepCarLoad(
    @Req() req: Request & { user?: AuthorizedUser },
    @Body() dto: CreateRepCarLoadDto,
  ) {
    return this.service.createRepCarLoad(dto, req.user);
  }

  @Patch("rep-car-loads/:id")
  updateRepCarLoad(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: UpdateRepCarLoadDto,
  ) {
    return this.service.updateRepCarLoad(id, dto, req.user);
  }

  @Post("rep-car-loads/:id/post")
  postRepCarLoad(@Req() req: Request & { user?: AuthorizedUser }, @Param("id") id: string) {
    return this.service.postRepCarLoad(id, req.user);
  }

  @Post("rep-car-loads/:id/cancel")
  cancelRepCarLoad(@Req() req: Request & { user?: AuthorizedUser }, @Param("id") id: string) {
    return this.service.cancelRepCarLoad(id, req.user);
  }

  @Get("rep-car-stocktakes")
  listRepCarStocktakes(
    @Req() req: Request & { user?: AuthorizedUser },
    @Query("status") status?: string,
    @Query("salesRepId") salesRepId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.listRepCarStocktakes(
      { status, salesRepId, dateFrom, dateTo, search, page, limit },
      req.user,
    );
  }

  @Get("rep-car-stocktakes/:id")
  getRepCarStocktake(@Req() req: Request & { user?: AuthorizedUser }, @Param("id") id: string) {
    return this.service.getRepCarStocktake(id, req.user);
  }

  @Post("rep-car-stocktakes")
  createRepCarStocktake(
    @Req() req: Request & { user?: AuthorizedUser },
    @Body() dto: CreateRepCarStocktakeDto,
  ) {
    return this.service.createRepCarStocktake(dto, req.user);
  }

  @Patch("rep-car-stocktakes/:id")
  updateRepCarStocktake(
    @Req() req: Request & { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: UpdateRepCarStocktakeDto,
  ) {
    return this.service.updateRepCarStocktake(id, dto, req.user);
  }

  @Post("rep-car-stocktakes/:id/post")
  postRepCarStocktake(@Req() req: Request & { user?: AuthorizedUser }, @Param("id") id: string) {
    return this.service.postRepCarStocktake(id, req.user);
  }

  @Post("rep-car-stocktakes/:id/cancel")
  cancelRepCarStocktake(@Req() req: Request & { user?: AuthorizedUser }, @Param("id") id: string) {
    return this.service.cancelRepCarStocktake(id, req.user);
  }
}
