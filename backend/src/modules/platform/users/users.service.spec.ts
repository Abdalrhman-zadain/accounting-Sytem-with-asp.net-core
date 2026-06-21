import { Test } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuthService } from "../auth/auth.service";

describe("UsersService", () => {
  const prismaMock: any = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prismaMock)),
    userPosAccessRole: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    userPosPermissionOverride: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    posAccessRole: {
      findMany: jest.fn(),
    },
    posPermission: {
      findMany: jest.fn(),
    },
  };

  const authServiceMock = {
    ensurePosAccessBaselineForAdmin: jest.fn(),
    registerUser: jest.fn(),
    hashPassword: jest.fn().mockResolvedValue("hashed"),
    getPermissionCatalog: jest.fn().mockReturnValue([
      {
        code: "POS_ADD_ITEM_AFTER_WAITER_CONFIRM",
        name: "Add items after waiter confirm",
        description: "Add new cart lines after confirm.",
        category: "cart",
      },
    ]),
  };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it("maps effective permissions with deny override winning", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      username: "waiter2",
      email: "waiter2@test.com",
      name: "Waiter Two",
      role: "USER",
      isActive: true,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      posAccessRoles: [
        {
          role: {
            code: "WAITER",
            permissions: [
              {
                permission: { code: "POS_ADD_ITEM_AFTER_WAITER_CONFIRM" },
              },
              {
                permission: { code: "POS_REMOVE_ITEM_FROM_CART" },
              },
            ],
          },
        },
      ],
      posPermissionOverrides: [
        {
          effect: "DENY",
          permission: { code: "POS_REMOVE_ITEM_FROM_CART" },
        },
      ],
    });

    const detail = await service.getUser("u1");

    expect(detail.effectivePermissions).toContain("POS_ADD_ITEM_AFTER_WAITER_CONFIRM");
    expect(detail.effectivePermissions).not.toContain("POS_REMOVE_ITEM_FROM_CART");
    expect(detail.permissionBreakdown[0]?.effective).toBe(true);
  });
});
