import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CreateUserDto, UpdateUserDto } from "./dto/users.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("permission-catalog")
  getPermissionCatalog() {
    return this.usersService.getPermissionCatalog();
  }

  @Get()
  listUsers() {
    return this.usersService.listUsers();
  }

  @Get(":id")
  getUser(@Param("id") id: string) {
    return this.usersService.getUser(id);
  }

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch(":id")
  updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }
}
