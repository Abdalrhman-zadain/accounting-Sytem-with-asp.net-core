import { Module } from "@nestjs/common";

import { AuthModule } from "../../modules/platform/auth/auth.module";
import { QzTrayController } from "./qz-tray.controller";
import { QzTrayService } from "./qz-tray.service";

@Module({
  imports: [AuthModule],
  controllers: [QzTrayController],
  providers: [QzTrayService],
  exports: [QzTrayService],
})
export class QzTrayModule {}
