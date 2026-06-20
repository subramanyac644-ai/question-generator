import { Injectable } from '@nestjs/common';
import { Role } from '@qgp/database';
import { Permission } from './permission.enum';
import { PERMISSION_MATRIX } from './permission.matrix';

@Injectable()
export class RolePermissionService {
  /**
   * Check if a role is authorized for a specific permission.
   */
  isAllowed(role: Role, permission: Permission): boolean {
    const rolePermissions = PERMISSION_MATRIX[role];
    return rolePermissions ? rolePermissions.includes(permission) : false;
  }

  /**
   * Get all active permissions for a specific role.
   */
  getPermissionsForRole(role: Role): Permission[] {
    return PERMISSION_MATRIX[role] || [];
  }
}
export const rolePermissionService = new RolePermissionService();
