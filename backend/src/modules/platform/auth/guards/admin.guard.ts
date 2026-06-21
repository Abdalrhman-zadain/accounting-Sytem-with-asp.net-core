import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { UserRole } from "../../../../generated/prisma";
import type { AuthorizedUser } from "../auth.types";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthorizedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication is required.");
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Administrator access is required.");
    }

    return true;
  }
}
