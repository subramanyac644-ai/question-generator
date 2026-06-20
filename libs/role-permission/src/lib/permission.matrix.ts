import { Role } from '@qgp/database';
import { Permission } from './permission.enum';

export const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  [Role.TEACHER]: [
    Permission.UPLOAD_PDF,
    Permission.GENERATE_QUESTIONS,
    Permission.EDIT_QUESTIONS,
    Permission.EXPORT_JSON,
    Permission.VIEW_ASSESSMENT,
  ],
  [Role.HOD]: [
    Permission.REVIEW_QUESTION_SETS,
    Permission.APPROVE_QUESTION_SETS,
    Permission.REJECT_QUESTION_SETS,
    Permission.VIEW_ASSESSMENT,
  ],
  [Role.PRINCIPAL]: [
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [Role.STUDENT]: [
    Permission.VIEW_ASSESSMENT,
  ],
};

/**
 * Checks if a specific role is allowed to perform a permission.
 */
export function checkRolePermission(role: Role, permission: Permission): boolean {
  const allowedPermissions = PERMISSION_MATRIX[role];
  return allowedPermissions ? allowedPermissions.includes(permission) : false;
}
