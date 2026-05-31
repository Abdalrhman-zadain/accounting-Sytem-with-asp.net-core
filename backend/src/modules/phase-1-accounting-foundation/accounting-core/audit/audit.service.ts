import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuditAction } from '../../../../generated/prisma';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(data: {
        userId?: string;
        entity: string;
        entityId?: string;
        action: AuditAction;
        details?: object;
    }) {
        const details =
            data.details && typeof data.details === 'object' ? data.details : {};
        const createInput = {
            userId: data.userId ?? null,
            entity: data.entity,
            entityId: data.entityId,
            action: data.action,
            details: details as never,
        };

        try {
            return await this.prisma.auditLog.create({
                data: createInput,
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2003' &&
                createInput.userId
            ) {
                return this.prisma.auditLog.create({
                    data: {
                        ...createInput,
                        userId: null,
                        details: {
                            ...details,
                            skippedUserId: createInput.userId,
                            loggingWarning:
                                'Audit log user reference was missing at write time.',
                        } as never,
                    },
                });
            }

            throw error;
        }
    }

    async find(filters?: { entity?: string; entityId?: string; userId?: string; limit?: number }) {
        return this.prisma.auditLog.findMany({
            where: {
                entity: filters?.entity,
                entityId: filters?.entityId,
                userId: filters?.userId,
            },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: filters?.limit ?? 100,
        });
    }
}
