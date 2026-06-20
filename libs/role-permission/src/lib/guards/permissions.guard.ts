import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@qgp/database';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PERMISSION_MATRIX } from '../permission.matrix';
import { Permission } from '../permission.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permission metadata is specified, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: Authentication required for permission check');
    }

    const role = user.role as Role;
    const userPermissions = PERMISSION_MATRIX[role] || [];

    // Verify user possesses all required permissions for this route
    const hasRequired = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasRequired) {
      const missing = requiredPermissions.filter((perm) => !userPermissions.includes(perm));
      throw new ForbiddenException(
        `Access denied: Missing required permission(s): ${missing.join(', ')}`
      );
    }

    return true;
  }
}
