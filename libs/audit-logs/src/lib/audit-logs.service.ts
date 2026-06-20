import { Injectable } from '@nestjs/common';
import { prisma } from '@qgp/database';

@Injectable()
export class AuditLogsService {
  async logAction(params: {
    userId?: string;
    action: string;
    resource: string;
    details?: any;
    ipAddress?: string;
  }) {
    const { userId, action, resource, details, ipAddress } = params;
    
    console.log(
      `[AUDIT LOG] ${new Date().toISOString()} | User: ${userId || 'GUEST'} | Action: ${action} | Resource: ${resource} | IP: ${ipAddress || 'N/A'}`
    );

    try {
      if (process.env.DATABASE_URL) {
        await prisma.auditLog.create({
          data: {
            userId: userId || null,
            action,
            resource,
            details: details ? JSON.parse(JSON.stringify(details)) : undefined,
            ipAddress,
          },
        });
      }
    } catch (error) {
      // Graceful error handling in environments without database connection
      console.warn('⚠️ Could not persist audit log to database: ', (error as Error).message);
    }
  }
}

export const auditLogsService = new AuditLogsService();
