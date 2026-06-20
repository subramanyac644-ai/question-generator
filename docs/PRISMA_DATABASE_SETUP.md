# PostgreSQL & Prisma Production Database Guide (PRD v2.0)

This guide details the commands, seeding procedures, and production best practices for the database engine of the **Question Generator Platform (Version 2.0)**.

---

## 1. Database Schema Overview

The database contains nine models optimized with indexes, cascade rules, and soft delete fields:
1. **`Department`**: Organizational academic blocks (e.g., Computer Science).
2. **`User`**: Admin, Principal, HOD, Teacher, and Student credentials.
3. **`SourceDocument`**: Reference documents (PDF, DOCX) uploaded as references for questions.
4. **`Question`**: Structured items containing JSON payloads matching one of the 7 supported types.
5. **`QuestionSet`**: Collections of questions forming assignments or tests, tracking review status.
6. **`QuestionSetQuestion`**: Sorting index junction table.
7. **`TypeRequest`**: Independent budget tracker mapping count targets per question type.
8. **`GenerationRun`**: Audit logs tracking exact requested vs actual generation outcome counts.
9. **`ExportLog`**: Audit tracking of export events containing file names and verification results.
10. **`AuditLog`**: Security action logging.

---

## 2. Migration Commands

Execute these commands from the root of the workspace.

### A. Local Development: Create and Apply Migration
Scans `schema.prisma` for changes, compiles a PostgreSQL SQL migration file, and updates your local DB:
```bash
npx prisma migrate dev --name update_schema_to_prd_v2 --schema=libs/database/prisma/schema.prisma
```

### B. Production Deployment: Apply Pending SQL Migrations
Applies compiled migrations to your production database without generating files:
```bash
npx prisma migrate deploy --schema=libs/database/prisma/schema.prisma
```

### C. Check Migration Sync Status
```bash
npx prisma migrate status --schema=libs/database/prisma/schema.prisma
```

### D. Generate Prisma Client Types
```bash
npx prisma generate --schema=libs/database/prisma/schema.prisma
```

---

## 3. Database Seeding

The seed script at [libs/database/prisma/seed.ts](file:///c:/Users/subramanya%20c/OneDrive/Documents/Desktop/Question%20paper/libs/database/prisma/seed.ts) populates test departments, pre-hashed user credentials for all roles, uploaded documents, questions of all 7 types, assessment sets, budget targets, and audit log tables.

To seed the database:
```bash
npx prisma db seed
```

---

## 4. Production Best Practices

### A. Soft Delete Implementation (Prisma Client Extension)
Update your database provider wrapper (e.g., `DatabaseService`) to automatically filter out rows where `deletedAt != null`:

```typescript
import { PrismaClient } from '@prisma/client';

const baseClient = new PrismaClient();

// Client filtering out soft-deleted items automatically
export const prisma = baseClient.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findFirst({ model, operation, args, query }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async count({ model, operation, args, query }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
    },
  },
  model: {
    $allModels: {
      async softDelete<T>(this: T, id: string) {
        const context = this as any;
        return context.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      },
    },
  },
});
```

### B. Connection Pooling (PgBouncer)
For next.js API servers, connect using PgBouncer pooling parameters in `.env`:
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&pgbouncer=true&connection_limit=10"
```

### C. SQL Indexing Strategy
To ensure optimal performance:
- `deletedAt` is indexed on all soft-deleted models since almost every SQL SELECT includes this filter.
- Unique lookups (`email`, `code`) are indexed.
- Foreign keys (`departmentId`, `uploadedById`, `sourceDocumentId`, `createdById`, `questionSetId`, `exportedById`, `userId`) are indexed for fast relational joins.
