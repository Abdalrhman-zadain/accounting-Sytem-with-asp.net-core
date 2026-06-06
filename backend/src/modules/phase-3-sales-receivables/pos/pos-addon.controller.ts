import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
import type { AuthorizedUser } from "../../platform/auth/auth.types";
import {
  CreatePosAddonGroupDto,
  CreatePosAddonOptionDto,
  SetPosItemAddonGroupsDto,
  UpdatePosAddonGroupDto,
  UpdatePosAddonOptionDto,
} from "./dto/pos-addon.dto";
import { PosAddonService } from "./pos-addon.service";

@UseGuards(JwtAuthGuard)
@Controller("pos/addons")
export class PosAddonController {
  constructor(private readonly addonService: PosAddonService) {}

  @Get("groups")
  listGroupsAdmin(@Req() req: { user?: AuthorizedUser }) {
    return this.addonService.listGroupsAdmin(req.user);
  }

  @Post("groups")
  createGroup(
    @Req() req: { user?: AuthorizedUser },
    @Body() dto: CreatePosAddonGroupDto,
  ) {
    return this.addonService.createGroup(dto, req.user);
  }

  @Put("groups/:id")
  updateGroup(
    @Req() req: { user?: AuthorizedUser },
    @Param("id") id: string,
    @Body() dto: UpdatePosAddonGroupDto,
  ) {
    return this.addonService.updateGroup(id, dto, req.user);
  }

  @Post("groups/:groupId/options")
  createOption(
    @Req() req: { user?: AuthorizedUser },
    @Param("groupId") groupId: string,
    @Body() dto: CreatePosAddonOptionDto,
  ) {
    return this.addonService.createOption(groupId, dto, req.user);
  }

  @Put("options/:optionId")
  updateOption(
    @Req() req: { user?: AuthorizedUser },
    @Param("optionId") optionId: string,
    @Body() dto: UpdatePosAddonOptionDto,
  ) {
    return this.addonService.updateOption(optionId, dto, req.user);
  }

  @Get("items/:itemId")
  getItemAddons(
    @Req() req: { user?: AuthorizedUser },
    @Param("itemId") itemId: string,
  ) {
    return this.addonService.getItemAddonConfig(itemId, req.user);
  }

  @Put("items/:itemId")
  setItemAddons(
    @Req() req: { user?: AuthorizedUser },
    @Param("itemId") itemId: string,
    @Body() dto: SetPosItemAddonGroupsDto,
  ) {
    return this.addonService.setItemAddonGroups(itemId, dto, req.user);
  }

  @Get("catalog")
  getCatalog(
    @Req() req: { user?: AuthorizedUser },
    @Query("itemIds") itemIds?: string,
  ) {
    const ids = itemIds?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
    return this.addonService.getAddonCatalog(ids, req.user);
  }
}
