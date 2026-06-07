import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly cashierAllowedPrefixes = [
        '/api/pos',
        '/api/inventory/items',
        '/api/inventory/item-groups',
        '/api/inventory/warehouses',
        '/api/bank-cash-accounts',
    ];

    async canActivate(context: ExecutionContext) {
        const result = await super.canActivate(context);
        const request = context.switchToHttp().getRequest<{ path?: string; originalUrl?: string; user?: { isActive?: boolean; isCashierOnly?: boolean } }>();
        const path = request.path ?? '';
        const url = request.originalUrl ?? path;

        if (request.user?.isActive === false) {
            throw new ForbiddenException('This user account is inactive.');
        }

        if (
            request.user?.isCashierOnly &&
            !this.cashierAllowedPrefixes.some((prefix) => url.startsWith(prefix))
        ) {
            throw new ForbiddenException('Cashier access is limited to POS routes only.');
        }

        return result as boolean;
    }
}
