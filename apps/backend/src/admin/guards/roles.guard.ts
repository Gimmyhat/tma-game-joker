import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Role hierarchy: SUPERADMIN > ADMIN > MODERATOR > OPERATOR
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  SUPERADMIN: 4,
  ADMIN: 3,
  MODERATOR: 2,
  OPERATOR: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.adminRole) {
      throw new ForbiddenException('Access denied: Admin role required');
    }

    const userRoleLevel = ROLE_HIERARCHY[user.adminRole as AdminRole] || 0;
    const requiredMinLevel = Math.min(...requiredRoles.map((r) => ROLE_HIERARCHY[r] || 0));

    if (userRoleLevel < requiredMinLevel) {
      throw new ForbiddenException(`Access denied: Requires ${requiredRoles.join(' or ')} role`);
    }

    return true;
  }
}
