import { Role } from '@prisma/client';
import { Permission } from '../permission.enum';
import { PERMISSION_MATRIX } from '../permission.matrix';

/**
 * Checks if a given role possesses a specific permission.
 */
export function hasPermission(role: Role | string, permission: Permission): boolean {
  const allowed = PERMISSION_MATRIX[role as Role];
  return allowed ? allowed.includes(permission) : false;
}

/**
 * Checks if a role has at least one of the specified permissions.
 */
export function hasAnyPermission(role: Role | string, permissions: Permission[]): boolean {
  const allowed = PERMISSION_MATRIX[role as Role] || [];
  return permissions.some((perm) => allowed.includes(perm));
}

/**
 * Checks if a role has all of the specified permissions.
 */
export function hasAllPermissions(role: Role | string, permissions: Permission[]): boolean {
  const allowed = PERMISSION_MATRIX[role as Role] || [];
  return permissions.every((perm) => allowed.includes(perm));
}
