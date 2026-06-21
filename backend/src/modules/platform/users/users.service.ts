import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PosAccessRoleCode,
  PosPermissionOverrideEffect,
  Prisma,
  UserRole,
} from "../../../generated/prisma";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { POS_ROLE_PERMISSIONS } from "../auth/access-control.constants";
import type { PosPermissionCode } from "../auth/auth.types";
import { CreateUserDto, PermissionOverrideDto, UpdateUserDto } from "./dto/users.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        posAccessRoles: {
          include: { role: true },
        },
        _count: {
          select: { posPermissionOverrides: true },
        },
      },
    });

    return users.map((user) => this.mapUserSummary(user));
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userDetailInclude(),
    });

    if (!user) {
      throw new NotFoundException("User was not found.");
    }

    return this.mapUserDetail(user);
  }

  async createUser(dto: CreateUserDto) {
    await this.authService.ensurePosAccessBaselineForAdmin();
    return this.authService.registerUser({
      username: dto.username,
      email: dto.email,
      password: dto.password,
      name: dto.name,
      posRoles: dto.posRoles,
    }).then(async (created) => {
      if (dto.isActive === false || dto.permissionOverrides?.length) {
        await this.prisma.$transaction(async (tx) => {
          if (dto.isActive === false) {
            await tx.user.update({
              where: { id: created.id },
              data: { isActive: false },
            });
          }
          if (dto.permissionOverrides?.length) {
            await this.replacePermissionOverrides(tx, created.id, dto.permissionOverrides);
          }
        });
      }
      return this.getUser(created.id);
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("User was not found.");
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const conflict = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException("A user with this email already exists.");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.UserUpdateInput = {};
      if (dto.email !== undefined) {
        data.email = dto.email.trim().toLowerCase();
      }
      if (dto.name !== undefined) {
        data.name = dto.name.trim() || null;
      }
      if (dto.isActive !== undefined) {
        data.isActive = dto.isActive;
      }
      if (dto.password) {
        data.password = await this.authService.hashPassword(dto.password);
      }

      if (Object.keys(data).length) {
        await tx.user.update({ where: { id }, data });
      }

      if (dto.posRoles !== undefined) {
        await this.replacePosRoles(tx, id, dto.posRoles);
      }

      if (dto.permissionOverrides !== undefined) {
        await this.replacePermissionOverrides(tx, id, dto.permissionOverrides);
      }
    });

    return this.getUser(id);
  }

  getPermissionCatalog() {
    return this.authService.getPermissionCatalog();
  }

  private async replacePosRoles(
    tx: Prisma.TransactionClient,
    userId: string,
    posRoles: PosAccessRoleCode[],
  ) {
    await tx.userPosAccessRole.deleteMany({ where: { userId } });

    if (!posRoles.length) {
      return;
    }

    const roleRecords = await tx.posAccessRole.findMany({
      where: { code: { in: posRoles } },
      select: { id: true },
    });

    for (const roleRecord of roleRecords) {
      await tx.userPosAccessRole.create({
        data: {
          userId,
          roleId: roleRecord.id,
        },
      });
    }
  }

  private async replacePermissionOverrides(
    tx: Prisma.TransactionClient,
    userId: string,
    overrides: PermissionOverrideDto[],
  ) {
    await tx.userPosPermissionOverride.deleteMany({ where: { userId } });

    if (!overrides.length) {
      return;
    }

    const permissions = await tx.posPermission.findMany({
      where: {
        code: { in: overrides.map((entry) => entry.code) },
      },
      select: { id: true, code: true },
    });
    const permissionByCode = new Map(permissions.map((row) => [row.code, row.id]));

    for (const override of overrides) {
      const permissionId = permissionByCode.get(override.code);
      if (!permissionId) {
        continue;
      }
      await tx.userPosPermissionOverride.create({
        data: {
          userId,
          permissionId,
          effect: override.effect,
        },
      });
    }
  }

  private userDetailInclude() {
    return {
      posAccessRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      posPermissionOverrides: {
        include: { permission: true },
      },
    } satisfies Prisma.UserInclude;
  }

  private mapUserSummary(
    user: Prisma.UserGetPayload<{
      include: {
        posAccessRoles: { include: { role: true } };
        _count: { select: { posPermissionOverrides: true } };
      };
    }>,
  ) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      posRoles: user.posAccessRoles.map((entry) => entry.role.code),
      overrideCount: user._count.posPermissionOverrides,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private mapUserDetail(
    user: Prisma.UserGetPayload<{ include: ReturnType<UsersService["userDetailInclude"]> }>,
  ) {
    const rolePermissions = new Set<PosPermissionCode>();
    for (const assignment of user.posAccessRoles) {
      for (const rolePermission of assignment.role.permissions) {
        rolePermissions.add(rolePermission.permission.code as PosPermissionCode);
      }
    }

    if (user.role === UserRole.ADMIN) {
      rolePermissions.add("SYS_MANAGE_USERS");
    }

    const overrides = user.posPermissionOverrides.map((entry) => ({
      code: entry.permission.code,
      effect: entry.effect,
    }));

    const effectivePermissions = new Set(rolePermissions);
    for (const override of user.posPermissionOverrides) {
      const code = override.permission.code as PosPermissionCode;
      if (override.effect === PosPermissionOverrideEffect.GRANT) {
        effectivePermissions.add(code);
      } else {
        effectivePermissions.delete(code);
      }
    }

    const catalog = this.authService.getPermissionCatalog();
    const permissionBreakdown = catalog.map((entry) => {
      const inherited = rolePermissions.has(entry.code as PosPermissionCode);
      const override = overrides.find((row) => row.code === entry.code);
      const effective = effectivePermissions.has(entry.code as PosPermissionCode);
      return {
        ...entry,
        inherited,
        override: override?.effect ?? null,
        effective,
      };
    });

    return {
      ...this.mapUserSummary({
        ...user,
        _count: { posPermissionOverrides: user.posPermissionOverrides.length },
      }),
      permissionOverrides: overrides,
      rolePermissions: Array.from(rolePermissions),
      effectivePermissions: Array.from(effectivePermissions),
      permissionBreakdown,
      rolePermissionTemplates: POS_ROLE_PERMISSIONS,
    };
  }
}
