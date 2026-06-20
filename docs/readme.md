# Question Generator Platform

The **Question Generator Platform (QGP)** is an AI-powered educational application built in a modern Nx monorepo. It enables school administrators (Principals, HODs) and teachers to upload syllabus documents, automatically generate structured assessments, manage multi-format question banks, and export exams, while students take quizzes and receive instant feedback.

## Key Applications
1. **`web-admin` (Next.js)**: Dashboard for HODs, Teachers, and Principals to upload reference files, configure LLM generation settings, compile test sheets, review audit trails, and manage departments.
2. **`web-student` (Next.js)**: Student-facing portal to take quizzes, complete custom practice sessions, and track performance scores.
3. **`api` (NestJS)**: Backend REST API routing authentication, resource permissions, audit logs, and integrations with the OpenRouter AI engine.

## Modular Domain Libraries
- `@qgp/question-schema`: Discriminated Zod union shapes and TS type inferences.
- `@qgp/database`: PostgreSQL Prisma Client wrapper with automated soft-delete query extensions.
- `@qgp/auth`: Custom PBKDF2 password hashing and JWT encoding/decoding.
- `@qgp/ai-generator`: Fetch client for OpenRouter LLM completions and test mock fallbacks.
- `@qgp/export-json`: Zod-validated serialization for importing and exporting quizzes.
- `@qgp/audit-logs`: User activity tracking and database persistence.
- `@qgp/role-permission`: Synchronous Role-Based Access Control policies.
- `@qgp/shared-ui`: Styled Tailwind CSS React components.

## Getting Started
```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables (.env)
cp .env.example .env

# 3. Deploy PostgreSQL migration
npx nx run database:migrate

# 4. Seed database
npx prisma db seed

# 5. Start development servers
npx nx run-many --target=serve --all
```
