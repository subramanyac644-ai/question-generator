import { PrismaClient, Role, QuestionType, Difficulty, QuestionSetStatus, ExportValidationResult, TypeRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to hash password matching the @qgp/auth format
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

async function main() {
  console.log('🌱 Starting database seeding conforming to PRD v2.0...');

  // Clean existing database records
  console.log('Cleaning existing records...');
  await prisma.auditLog.deleteMany();
  await prisma.exportLog.deleteMany();
  await prisma.generationRun.deleteMany();
  await prisma.typeRequest.deleteMany();
  await prisma.questionSetQuestion.deleteMany();
  await prisma.questionSet.deleteMany();
  await prisma.question.deleteMany();
  await prisma.sourceDocument.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 1. Create Departments
  console.log('Seeding Departments...');
  const cseDept = await prisma.department.create({
    data: {
      name: 'Computer Science and Engineering',
      code: 'CSE',
    },
  });

  const eceDept = await prisma.department.create({
    data: {
      name: 'Electronics and Communication Engineering',
      code: 'ECE',
    },
  });

  // 2. Create Users with different Roles
  console.log('Seeding Users...');
  const defaultPassword = 'Password123!';

  const principal = await prisma.user.create({
    data: {
      email: 'principal@qgp.edu',
      name: 'Dr. Arthur Vance',
      passwordHash: hashPassword(defaultPassword),
      role: Role.PRINCIPAL,
      departmentId: null, // Global scope
    },
  });

  const hod = await prisma.user.create({
    data: {
      email: 'cse.hod@qgp.edu',
      name: 'Dr. Sarah Connor',
      passwordHash: hashPassword(defaultPassword),
      role: Role.HOD,
      departmentId: cseDept.id,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: 'cse.teacher@qgp.edu',
      name: 'Prof. Charles Xavier',
      passwordHash: hashPassword(defaultPassword),
      role: Role.TEACHER,
      departmentId: cseDept.id,
    },
  });

  const student = await prisma.user.create({
    data: {
      email: 'cse.student@qgp.edu',
      name: 'Alan Turing',
      passwordHash: hashPassword(defaultPassword),
      role: Role.STUDENT,
      departmentId: cseDept.id,
    },
  });

  // 3. Create Source Document
  console.log('Seeding Source Documents...');
  const document = await prisma.sourceDocument.create({
    data: {
      title: 'Advanced Web Architecture and Clean Code Practices.pdf',
      fileUrl: 'https://storage.qgp.edu/docs/adv-web-arch-2026.pdf',
      fileType: 'PDF',
      fileSize: 4589020,
      departmentId: cseDept.id,
      uploadedById: teacher.id,
    },
  });

  // 4. Create Questions matching the seven PRD v2.0 shapes
  console.log('Seeding Questions of 7 Types...');

  // Type 1: fillInBlanks
  const qFillInBlanks = await prisma.question.create({
    data: {
      type: QuestionType.fillInBlanks,
      difficulty: Difficulty.EASY,
      prompt: 'Complete the statement regarding Nx workspace compilation caching.',
      content: {
        question: {
          hide_text: false,
          text: "Nx utilizes local and remote computation ______ to speed up task runs.",
          read_text: true,
          image: ""
        },
        correctAnswer: "caching",
        alternatives: ["cache", "caches"],
        explanation: "Nx builds a directed acyclic graph and caches computation outputs of targets."
      },
      tags: ['nx', 'monorepo'],
      sourceDocumentId: document.id,
    },
  });

  // Type 2: multipleChoice
  const qMultipleChoice = await prisma.question.create({
    data: {
      type: QuestionType.multipleChoice,
      difficulty: Difficulty.MEDIUM,
      prompt: 'Identify the benefit of transaction pooling.',
      content: {
        question: {
          hide_text: false,
          text: "What is the primary purpose of PgBouncer in production?",
          read_text: true,
          image: ""
        },
        options: [
          { hide_text: false, text: "It intercepts database queries and caches SQL results.", read_text: true, image: "" },
          { hide_text: false, text: "It manages connection pooling to prevent overloading PostgreSQL.", read_text: true, image: "" },
          { hide_text: false, text: "It compiles schemas automatically into local ORM code.", read_text: true, image: "" }
        ],
        correctAnswer: "It manages connection pooling to prevent overloading PostgreSQL.",
        explanation: "PgBouncer acts as a connection pooler, keeping connection limits under control."
      },
      tags: ['postgresql', 'database'],
      sourceDocumentId: document.id,
    },
  });

  // Type 3: multiSelect
  const qMultiSelect = await prisma.question.create({
    data: {
      type: QuestionType.multiSelect,
      difficulty: Difficulty.MEDIUM,
      prompt: 'Select multiple correct tools.',
      content: {
        question: {
          hide_text: false,
          text: "Which of the following are valid applications in our Question Generator monorepo?",
          read_text: true,
          image: ""
        },
        options: [
          { hide_text: false, text: "web-admin", read_text: true, image: "" },
          { hide_text: false, text: "web-student", read_text: true, image: "" },
          { hide_text: false, text: "api", read_text: true, image: "" },
          { hide_text: false, text: "web-parent", read_text: true, image: "" }
        ],
        correctAnswer: ["web-admin", "web-student", "api"],
        explanation: "Our platform consists of next.js frontends (web-admin, web-student) and the NestJS api backend."
      },
      tags: ['workspace', 'architecture'],
      sourceDocumentId: document.id,
    },
  });

  // Type 4: matchTheFollowing
  const qMatchTheFollowing = await prisma.question.create({
    data: {
      type: QuestionType.matchTheFollowing,
      difficulty: Difficulty.MEDIUM,
      prompt: 'Match roles to scopes.',
      content: {
        question: {
          hide_text: false,
          text: "Match the following roles to their corresponding capabilities in QGP.",
          read_text: true,
          image: ""
        },
        leftItems: ["Principal", "Teacher"],
        rightItems: ["Generate & Export", "Read-Only Aggregate Views"],
        correctAnswer: [
          { "left": "Principal", "right": "Read-Only Aggregate Views" },
          { "left": "Teacher", "right": "Generate & Export" }
        ],
        explanation: "Teachers trigger generation and exports; Principals have aggregate audit oversight."
      },
      tags: ['rbac', 'security'],
      sourceDocumentId: document.id,
    },
  });

  // Type 5: reordering
  const qReordering = await prisma.question.create({
    data: {
      type: QuestionType.reordering,
      difficulty: Difficulty.HARD,
      prompt: 'Arrange build sequence.',
      content: {
        question: {
          hide_text: false,
          text: "Order the command pipeline steps from start to finish for a new local deployment.",
          read_text: true,
          image: ""
        },
        items: ["npx prisma db seed", "npm install", "npx nx run database:migrate"],
        correctAnswer: ["npm install", "npx nx run database:migrate", "npx prisma db seed"],
        explanation: "First install root modules, run migrations to generate tables, and finally run seeders."
      },
      tags: ['setup', 'devops'],
      sourceDocumentId: document.id,
    },
  });

  // Type 6: sorting
  const qSorting = await prisma.question.create({
    data: {
      type: QuestionType.sorting,
      difficulty: Difficulty.HARD,
      prompt: 'Categorize files by scope.',
      content: {
        question: {
          hide_text: false,
          text: "Sort the following folders into their proper monorepo structural areas.",
          read_text: true,
          image: ""
        },
        categories: ["Applications", "Shared Libraries"],
        items: ["web-admin", "api", "database", "shared-ui"],
        correctAnswer: {
          "Applications": ["web-admin", "api"],
          "Shared Libraries": ["database", "shared-ui"]
        },
        explanation: "Next.js/NestJS are applications; database services and UI primitives are structured as libraries."
      },
      tags: ['nx', 'structuring'],
      sourceDocumentId: document.id,
    },
  });

  // Type 7: trueFalse
  const qTrueFalse = await prisma.question.create({
    data: {
      type: QuestionType.trueFalse,
      difficulty: Difficulty.EASY,
      prompt: 'Verify soft delete statements.',
      content: {
        question: {
          hide_text: false,
          text: "Soft deletes delete PostgreSQL rows immediately from disc.",
          read_text: true,
          image: ""
        },
        correctAnswer: false,
        explanation: "Soft deletes flag rows via the deletedAt column without physical removal from storage."
      },
      tags: ['prisma', 'database'],
      sourceDocumentId: document.id,
    },
  });

  // 5. Create Question Set (Assessment)
  console.log('Seeding Question Sets...');
  const quizSet = await prisma.questionSet.create({
    data: {
      title: 'CSE Comprehensive Assessment - Fall 2026',
      description: 'Exam covering monorepos, PostgreSQL, RBAC and system architecture.',
      timeLimitSeconds: 3600,
      status: QuestionSetStatus.approved,
      departmentId: cseDept.id,
      createdById: teacher.id,
    },
  });

  // 6. Map Questions to Set
  console.log('Mapping Questions...');
  const questionsToMap = [
    qFillInBlanks,
    qMultipleChoice,
    qMultiSelect,
    qMatchTheFollowing,
    qReordering,
    qSorting,
    qTrueFalse
  ];

  await prisma.questionSetQuestion.createMany({
    data: questionsToMap.map((q, idx) => ({
      questionSetId: quizSet.id,
      questionId: q.id,
      order: idx + 1,
    })),
  });

  // 7. Seeding Type Requests (FR-1.10 tracking)
  console.log('Seeding Type Requests budget records...');
  await prisma.typeRequest.createMany({
    data: [
      {
        questionSetId: quizSet.id,
        questionType: QuestionType.multipleChoice,
        requestedCount: 1,
        status: TypeRequestStatus.success,
      },
      {
        questionSetId: quizSet.id,
        questionType: QuestionType.fillInBlanks,
        requestedCount: 1,
        status: TypeRequestStatus.success,
      },
      {
        questionSetId: quizSet.id,
        questionType: QuestionType.trueFalse,
        requestedCount: 1,
        status: TypeRequestStatus.success,
      },
      {
        questionSetId: quizSet.id,
        questionType: QuestionType.reordering,
        requestedCount: 0,
        status: TypeRequestStatus.skipped,
      }
    ]
  });

  // 8. Seeding Generation Runs (for NFR-3 auditing)
  console.log('Seeding Generation Runs logs...');
  await prisma.generationRun.create({
    data: {
      questionSetId: quizSet.id,
      triggeredById: teacher.id,
      perTypeOutcomes: [
        { questionType: 'multipleChoice', requestedCount: 1, actualCount: 1, status: 'success' },
        { questionType: 'fillInBlanks', requestedCount: 1, actualCount: 1, status: 'success' },
        { questionType: 'trueFalse', requestedCount: 1, actualCount: 1, status: 'success' }
      ]
    }
  });

  // 9. Seeding Export Logs (Export events)
  console.log('Seeding Export Logs...');
  await prisma.exportLog.create({
    data: {
      questionSetId: quizSet.id,
      exportedById: teacher.id,
      fileName: `questions_${Math.floor(Date.now() / 1000)}.json`,
      validationResult: ExportValidationResult.passed,
    },
  });

  // 10. Seeding System Audits
  console.log('Seeding AuditLogs...');
  await prisma.auditLog.create({
    data: {
      userId: teacher.id,
      action: 'EXPORT_QUESTIONS',
      resource: 'question_sets',
      details: {
        format: 'JSON',
        questionSetId: quizSet.id,
        validation: 'passed',
      },
      ipAddress: '192.168.1.105',
    },
  });

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
