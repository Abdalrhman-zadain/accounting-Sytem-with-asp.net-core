import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthorizedUser } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'your_highly_secret_key_change_in_production',
        });
    }

    async validate(payload: any): Promise<AuthorizedUser> {
        return {
            userId: payload.sub,
            username: payload.username,
            email: payload.email,
            name: payload.name ?? null,
            role: payload.role,
            isActive: Boolean(payload.isActive),
            posRoles: Array.isArray(payload.posRoles) ? payload.posRoles : [],
            permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
            allowedRoutes: Array.isArray(payload.allowedRoutes) ? payload.allowedRoutes : [],
            defaultRoute: payload.defaultRoute ?? '/dashboard',
            isCashierOnly: Boolean(payload.isCashierOnly),
            isMarketCashierOnly: Boolean(payload.isMarketCashierOnly),
            isMarketRepOnly: Boolean(payload.isMarketRepOnly),
            isMarketPosOperatorOnly: Boolean(payload.isMarketPosOperatorOnly),
            salesRepId: typeof payload.salesRepId === 'string' ? payload.salesRepId : null,
            isKitchenOnly: Boolean(payload.isKitchenOnly),
            isWaiterOnly: Boolean(payload.isWaiterOnly),
        };
    }
}
