import { Body, Controller, Get, Header, HttpCode, Post, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../../modules/platform/auth/guards/jwt-auth.guard";
import { QzSignRequestDto } from "./dto/qz-tray.dto";
import { QzTrayService } from "./qz-tray.service";

@UseGuards(JwtAuthGuard)
@Controller("qz")
export class QzTrayController {
  constructor(private readonly qzTrayService: QzTrayService) {}

  @Get("certificate")
  @Header("Content-Type", "text/plain; charset=utf-8")
  getCertificate(): string {
    return this.qzTrayService.getCertificate();
  }

  @Post("sign")
  @HttpCode(200)
  @Header("Content-Type", "text/plain; charset=utf-8")
  signMessage(@Body() dto: QzSignRequestDto): string {
    return this.qzTrayService.signMessage(dto.request);
  }
}
