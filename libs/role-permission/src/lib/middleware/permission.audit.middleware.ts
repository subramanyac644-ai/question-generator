import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Role } from '@qgp/database';
import { PERMISSION_MATRIX } from '../permission.matrix';

@Injectable()
export class PermissionAuditMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Check if user has been authenticated (e.g. by previous guards/strategies)
    let user = (req as any).user;

    // Since middleware runs before guards, user won't be set yet.
    // Try to safely decode the JWT token payload from the Authorization header for auditing.
    if (!user) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token) {
          try {
            const payloadParts = token.split('.');
            if (payloadParts.length === 3) {
              const payloadJson = Buffer.from(payloadParts[1], 'base64').toString('utf-8');
              user = JSON.parse(payloadJson);
            }
          } catch {
            // Ignore parse errors, user remains undefined/Guest
          }
        }
      }
    }

    if (user && user.role) {
      const role = user.role as Role;
      const permissions = PERMISSION_MATRIX[role] || [];
      console.log(
        `[PermissionAudit] Req: ${req.method} ${req.originalUrl} | User: ${user.email} | Role: ${role} | Permissions: ${permissions.length}`
      );
    } else {
      console.log(`[PermissionAudit] Req: ${req.method} ${req.originalUrl} | User: Guest`);
    }

    next();
  }
}
