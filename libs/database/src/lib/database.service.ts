import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    // Attempt connection but do NOT crash the server if DB is unreachable
    this.$connect()
      .then(async () => {
        this.logger.log('✅ Database connected successfully');
        
        // Seed exclusive teacher account and institutional roles
        try {
          // Ensure default department exists for HOD/Teacher relations
          let cseDept = await this.department.findUnique({ where: { code: 'CSE' } }).catch(() => null);
          if (!cseDept) {
            cseDept = await this.department.create({
              data: {
                name: 'Computer Science and Engineering',
                code: 'CSE'
              }
            }).catch(() => null);
          }

          // Upsert Principal (creates or updates password on every restart)
          await this.user.upsert({
            where: { email: 'principal@questiongenerator.com' },
            update: { passwordHash: bcrypt.hashSync('Principal@123', 10) },
            create: {
              email: 'principal@questiongenerator.com',
              name: 'Institutional Principal',
              passwordHash: bcrypt.hashSync('Principal@123', 10),
              role: 'PRINCIPAL',
              departmentId: null
            }
          });
          this.logger.log('🔑 Upserted Principal Account: principal@questiongenerator.com');

          // Upsert HOD (creates or updates password on every restart)
          await this.user.upsert({
            where: { email: 'hod@questiongenerator.com' },
            update: {
              passwordHash: bcrypt.hashSync('HodHod@123', 10),
              departmentId: cseDept ? cseDept.id : null
            },
            create: {
              email: 'hod@questiongenerator.com',
              name: 'Department HOD',
              passwordHash: bcrypt.hashSync('HodHod@123', 10),
              role: 'HOD',
              departmentId: cseDept ? cseDept.id : null
            }
          });
          this.logger.log('🔑 Upserted HOD Account: hod@questiongenerator.com / HodHod@123');

          // Upsert Teacher (creates or updates password on every restart)
          await this.user.upsert({
            where: { email: 'teacher@questiongenerator.com' },
            update: {
              passwordHash: bcrypt.hashSync('Teacher@123', 10),
              departmentId: cseDept ? cseDept.id : null
            },
            create: {
              email: 'teacher@questiongenerator.com',
              name: 'Official Teacher',
              passwordHash: bcrypt.hashSync('Teacher@123', 10),
              role: 'TEACHER',
              departmentId: cseDept ? cseDept.id : null
            }
          });
          this.logger.log('🔑 Upserted Teacher Account: teacher@questiongenerator.com');
        } catch (seedErr: any) {
          this.logger.error(`Failed to seed accounts: ${seedErr.message}`);
        }
      })
      .catch((error) => {
        this.logger.warn('⚠️ Database connection failed. The API will start but DB queries will fail.');
        this.logger.warn(`Reason: ${error?.message}`);
      });
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // Ignore disconnect errors on shutdown
    }
  }
}

export { PrismaClient };
export * from '@prisma/client';
