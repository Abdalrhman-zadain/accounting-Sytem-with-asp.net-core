import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly restaurantCashierAllowedPrefixes = [
        '/api/pos',
        '/api/inventory/items',
        '/api/inventory/item-groups',
        '/api/inventory/warehouses',
        '/api/bank-cash-accounts',
    ];

    private readonly marketCashierAllowedPrefixes = [
        '/api/pos-market',
        '/api/inventory/items',
        '/api/inventory/item-groups',
        '/api/inventory/warehouses',
        '/api/bank-cash-accounts',
    ];

    private isRestaurantCashierApiAllowed(url: string) {
        if (url.startsWith('/api/pos-market')) {
            return false;
        }

        return this.restaurantCashierAllowedPrefixes.some((prefix) => url.startsWith(prefix));
    }

    private isMarketCashierApiAllowed(url: string) {
        return this.marketCashierAllowedPrefixes.some((prefix) => url.startsWith(prefix));
    }

    async canActivate(context: ExecutionContext) {
        const result = await super.canActivate(context);
        const request = context.switchToHttp().getRequest<{
            path?: string;
            originalUrl?: string;
            user?: {
                isActive?: boolean;
                isCashierOnly?: boolean;
                isMarketCashierOnly?: boolean;
                isMarketPosOperatorOnly?: boolean;
            };
        }>();
        const path = request.path ?? '';
        const url = request.originalUrl ?? path;

        if (request.user?.isActive === false) {
            throw new ForbiddenException('This user account is inactive.');
        }

        if (request.user?.isCashierOnly && !this.isRestaurantCashierApiAllowed(url)) {
            throw new ForbiddenException('Cashier access is limited to restaurant POS routes only.');
        }

        const isMarketPosOperator =
            request.user?.isMarketPosOperatorOnly ?? request.user?.isMarketCashierOnly;
        if (isMarketPosOperator && !this.isMarketCashierApiAllowed(url)) {
            throw new ForbiddenException('Market POS access is limited to market POS routes only.');
        }

        return result as boolean;
    }
}
