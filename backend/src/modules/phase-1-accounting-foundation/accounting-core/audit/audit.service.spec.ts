import { Prisma } from "../../../../generated/prisma";
import { AuditService } from "./audit.service";
import { AuditAction } from "../../../../generated/prisma";

describe("AuditService", () => {
  it("retries with a null user reference when the audit-log user FK is stale", async () => {
    const staleUserError = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint violated on the constraint: `AuditLog_userId_fkey`",
      {
        code: "P2003",
        clientVersion: "test",
      },
    );

    const prisma = {
      auditLog: {
        create: jest
          .fn()
          .mockRejectedValueOnce(staleUserError)
          .mockResolvedValueOnce({ id: "audit-1" }),
      },
    };

    const service = new AuditService(prisma as never);

    const result = await service.log({
      userId: "stale-user-id",
      entity: "SalesInvoice",
      entityId: "inv-1",
      action: AuditAction.POST,
      details: { reference: "INV-001" },
    });

    expect(result).toEqual({ id: "audit-1" });
    expect(prisma.auditLog.create).toHaveBeenNthCalledWith(1, {
      data: {
        userId: "stale-user-id",
        entity: "SalesInvoice",
        entityId: "inv-1",
        action: AuditAction.POST,
        details: { reference: "INV-001" },
      },
    });
    expect(prisma.auditLog.create).toHaveBeenNthCalledWith(2, {
      data: {
        userId: null,
        entity: "SalesInvoice",
        entityId: "inv-1",
        action: AuditAction.POST,
        details: {
          reference: "INV-001",
          skippedUserId: "stale-user-id",
          loggingWarning: "Audit log user reference was missing at write time.",
        },
      },
    });
  });
});
