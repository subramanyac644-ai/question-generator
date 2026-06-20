import { Controller, Get, Post, Delete, Body, Param, UseGuards, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { JwtAuthGuard, CurrentUser, TokenPayload } from '@qgp/auth';
import { PermissionsGuard, RequirePermissions, Permission } from '@qgp/role-permission';
import { DatabaseService } from '@qgp/database';

@ApiTags('RBAC Demo Endpoints')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  // 1. TEACHER ROUTE (Generate Questions)
  @Post('questions/generate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.GENERATE_QUESTIONS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate quiz questions (TEACHER role required)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  generateQuestions(@CurrentUser() user: TokenPayload) {
    return {
      message: 'Successfully generated questions using AI model',
      triggeredBy: user.email,
      timestamp: new Date().toISOString(),
    };
  }

  // 2. HOD ROUTE (Approve Question Set)
  @Post('question-sets/:id/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_QUESTION_SETS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending question set (HOD role required)' })
  async approveQuestionSet(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    const questionSet = await this.databaseService.questionSet.findUnique({
      where: { id },
    });

    if (!questionSet) {
      throw new NotFoundException(`Question Set with ID "${id}" not found`);
    }

    const updated = await this.databaseService.questionSet.update({
      where: { id },
      data: {
        status: 'approved',
        hodComment: null,
      },
    });

    // Create notification
    await this.databaseService.notification.create({
      data: {
        userId: questionSet.createdById,
        message: `Your question set "${questionSet.title}" has been approved by the HOD.`,
      },
    });

    return {
      message: `Question Set with ID "${id}" has been approved.`,
      approvedBy: user.email,
      timestamp: new Date().toISOString(),
      questionSet: updated,
    };
  }

  // HOD/Principal Reject Question Set
  @Post('question-sets/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending question set (HOD/Principal required)' })
  async rejectQuestionSet(@Param('id') id: string, @Body() body: { comment?: string }, @CurrentUser() user: TokenPayload) {
    const questionSet = await this.databaseService.questionSet.findUnique({
      where: { id },
    });

    if (!questionSet) {
      throw new NotFoundException(`Question Set with ID "${id}" not found`);
    }

    const updated = await this.databaseService.questionSet.update({
      where: { id },
      data: {
        status: 'rejected',
        hodComment: body.comment || 'No explanation provided.',
      },
    });

    // Create notification
    await this.databaseService.notification.create({
      data: {
        userId: questionSet.createdById,
        message: `Your question set "${questionSet.title}" has been rejected. Reason: ${body.comment || 'No explanation provided.'}`,
      },
    });

    return {
      message: `Question Set with ID "${id}" has been rejected.`,
      rejectedBy: user.email,
      timestamp: new Date().toISOString(),
      questionSet: updated,
    };
  }

  // HOD/Principal Request Regeneration
  @Post('question-sets/:id/regenerate-request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request regeneration for a question set (HOD/Principal required)' })
  async regenerateRequestQuestionSet(@Param('id') id: string, @Body() body: { comment?: string }, @CurrentUser() user: TokenPayload) {
    const questionSet = await this.databaseService.questionSet.findUnique({
      where: { id },
    });

    if (!questionSet) {
      throw new NotFoundException(`Question Set with ID "${id}" not found`);
    }

    const updated = await this.databaseService.questionSet.update({
      where: { id },
      data: {
        status: 'regeneration_requested',
        hodComment: body.comment || 'Regeneration requested.',
      },
    });

    // Create notification
    await this.databaseService.notification.create({
      data: {
        userId: questionSet.createdById,
        message: `Regeneration has been requested for your question set "${questionSet.title}". Details: ${body.comment || 'No details provided.'}`,
      },
    });

    return {
      message: `Regeneration request submitted for Question Set with ID "${id}".`,
      requestedBy: user.email,
      timestamp: new Date().toISOString(),
      questionSet: updated,
    };
  }

  // HOD/Principal List all question sets in their department/globally
  @Get('hod/question-sets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all question sets for HOD department or Principal global' })
  async getHodQuestionSets(@CurrentUser() user: TokenPayload) {
    const dbUser = await this.databaseService.user.findUnique({
      where: { id: user.userId },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const whereClause: any = { deletedAt: null };

    if (dbUser.role === 'HOD') {
      if (!dbUser.departmentId) {
        return [];
      }
      whereClause.departmentId = dbUser.departmentId;
    } else if (dbUser.role !== 'PRINCIPAL') {
      throw new UnauthorizedException('Access denied. Only HOD and Principal can view this.');
    }

    return this.databaseService.questionSet.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        questions: {
          orderBy: {
            order: 'asc',
          },
          include: {
            question: true,
          },
        },
      },
    });
  }

  // GET attempts / marks of all users for a given question set
  @Get('question-sets/:id/attempts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve assessment attempts and student marks for a question set' })
  async getQuestionSetAttempts(@Param('id') id: string) {
    return this.databaseService.assessmentAttempt.findMany({
      where: { questionSetId: id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  // GET notifications
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent notifications for user' })
  async getNotifications(@CurrentUser() user: TokenPayload) {
    return this.databaseService.notification.findMany({
      where: { userId: user.userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }

  // Mark notifications as read
  @Post('notifications/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async readNotifications(@CurrentUser() user: TokenPayload) {
    await this.databaseService.notification.updateMany({
      where: { userId: user.userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  // 3. PRINCIPAL ROUTE (Audit Logs)
  @Get('admin/audit-logs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve audit logs history (PRINCIPAL role required)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAuditLogs(@CurrentUser() user: TokenPayload) {
    return {
      message: 'Retrieved 100 historical logs',
      accessedBy: user.email,
      logs: [
        { id: 1, action: 'REGISTER_USER', operator: 'admin@qgp.edu', time: '10 mins ago' },
        { id: 2, action: 'GENERATE_QUESTIONS', operator: 'teacher@qgp.edu', time: '12 mins ago' },
      ],
    };
  }

  // Developer database seeding route (bypass terminal restriction)
  @Get('dev/seed')
  @ApiOperation({ summary: 'Seed the database programmatically (development only)' })
  async devSeed() {
    try {
      const bcrypt = require('bcryptjs');
      const hashPassword = (pwd: string) => bcrypt.hashSync(pwd, 10);

      // Clean existing database records
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "audit_logs" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "export_logs" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "generation_runs" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "type_requests" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "question_set_questions" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "question_sets" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "questions" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "source_documents" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "users" CASCADE;`);
      await this.databaseService.$executeRawUnsafe(`TRUNCATE TABLE "departments" CASCADE;`);

      // 1. Create Departments
      const cseDept = await this.databaseService.department.create({
        data: {
          name: 'Computer Science and Engineering',
          code: 'CSE',
        },
      });

      // 2. Create Users
      const defaultPassword = 'Password123!';
      const teacher = await this.databaseService.user.create({
        data: {
          email: 'cse.teacher@qgp.edu',
          name: 'Prof. Charles Xavier',
          passwordHash: hashPassword(defaultPassword),
          role: 'TEACHER',
          departmentId: cseDept.id,
        },
      });

      const principalUser = await this.databaseService.user.create({
        data: {
          email: 'principal@questiongenerator.com',
          name: 'Institutional Principal',
          passwordHash: hashPassword('Principal@123'),
          role: 'PRINCIPAL',
          departmentId: null,
        },
      });

      const hodUser = await this.databaseService.user.create({
        data: {
          email: 'hod@questiongenerator.com',
          name: 'Department HOD',
          passwordHash: hashPassword('HodHod@123'),
          role: 'HOD',
          departmentId: cseDept.id,
        },
      });

      const teacherUser = await this.databaseService.user.create({
        data: {
          email: 'teacher@questiongenerator.com',
          name: 'Official Teacher',
          passwordHash: hashPassword('Teacher@123'),
          role: 'TEACHER',
          departmentId: cseDept.id,
        },
      });

      // Also seed test@questiongenerator.com as a teacher with the same password
      await this.databaseService.user.create({
        data: {
          email: 'test@questiongenerator.com',
          name: 'Test Teacher',
          passwordHash: hashPassword('Teacher@123'),
          role: 'TEACHER',
          departmentId: cseDept.id,
        },
      });

      const studentUser = await this.databaseService.user.create({
        data: {
          email: 'cse.student@qgp.edu',
          name: 'Alan Turing',
          passwordHash: hashPassword('Password123!'),
          role: 'STUDENT',
          departmentId: cseDept.id,
        },
      });

      // 3. Create Source Document
      const document = await this.databaseService.sourceDocument.create({
        data: {
          title: 'Advanced Web Architecture and Clean Code Practices.pdf',
          fileUrl: 'https://storage.qgp.edu/docs/adv-web-arch-2026.pdf',
          fileType: 'PDF',
          fileSize: 4589020,
          departmentId: cseDept.id,
          uploadedById: teacherUser.id,
        },
      });

      // 4. Create Questions
      const qMultipleChoice = await this.databaseService.question.create({
        data: {
          type: 'multipleChoice',
          difficulty: 'MEDIUM',
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

      const qTrueFalse = await this.databaseService.question.create({
        data: {
          type: 'trueFalse',
          difficulty: 'EASY',
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

      const qFillInBlanks = await this.databaseService.question.create({
        data: {
          type: 'fillInBlanks',
          difficulty: 'EASY',
          prompt: 'Complete the statement regarding Nx workspace caching.',
          content: {
            question: {
              hide_text: false,
              text: "Nx utilizes local and remote computation ______ to speed up task runs.",
              read_text: true,
              image: ""
            },
            correctAnswer: "caching",
            alternatives: ["cache", "caches"],
            explanation: "Nx builds a directed acyclic graph and caches computation outputs."
          },
          tags: ['nx', 'monorepo'],
          sourceDocumentId: document.id,
        },
      });

      // 5. Create Question Set (Assessment)
      const quizSet = await this.databaseService.questionSet.create({
        data: {
          title: 'CSE Comprehensive Assessment - Fall 2026',
          description: 'Exam covering monorepos, PostgreSQL, RBAC and system architecture.',
          timeLimitSeconds: 3600,
          status: 'approved',
          departmentId: cseDept.id,
          createdById: teacher.id,
        },
      });

      // 6. Map Questions to Set
      const questionsToMap = [qMultipleChoice, qTrueFalse, qFillInBlanks];
      for (let i = 0; i < questionsToMap.length; i++) {
        await this.databaseService.questionSetQuestion.create({
          data: {
            questionSetId: quizSet.id,
            questionId: questionsToMap[i].id,
            order: i + 1,
          },
        });
      }

      return {
        success: true,
        message: 'Database seeded successfully with CSE Comprehensive Assessment!',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  // 4. STUDENT ROUTE (List all published/approved assignments)
  @Get('assignments')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_ASSESSMENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all published/approved assignments (STUDENT role required)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAssignments() {
    return this.databaseService.questionSet.findMany({
      where: {
        status: { in: ['approved', 'published'] },
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        questions: {
          include: {
            question: true,
          },
        },
      },
    });
  }

  // 5. STUDENT ROUTE (View Assessment)
  @Get('assessments/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_ASSESSMENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View assessment details and questions (STUDENT role required)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getAssessment(@Param('id') id: string) {
    const questionSet = await this.databaseService.questionSet.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
          include: {
            question: {
              select: {
                id: true,
                type: true,
                difficulty: true,
                prompt: true,
                content: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    if (!questionSet) {
      throw new NotFoundException(`Assessment with ID "${id}" not found`);
    }

    return questionSet;
  }

  // 6.0 TEACHER ROUTE (Delete Question Set / Assignment)
  @Delete('question-sets/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EXPORT_JSON)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete (soft-delete) an assignment/question set' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async deleteQuestionSet(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ) {
    const questionSet = await this.databaseService.questionSet.findFirst({
      where: { id, deletedAt: null },
    });

    if (!questionSet) {
      throw new NotFoundException(`Assignment with ID "${id}" not found`);
    }

    // Soft delete the question set
    await this.databaseService.questionSet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: `Assignment with ID "${id}" deleted successfully`,
    };
  }

  // 6. TEACHER ROUTE (Create/Save Question Set as assignment)
  @Post('question-sets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save generated question set as an active assignment' })
  async saveQuestionSet(@Body() body: any, @CurrentUser() user: TokenPayload) {
    try {
      const { title, description, timeLimitSeconds, questions, difficulty, testDuration, startDate, endDate, negativeMarking, randomizeOrder, questionCreationMode } = body;

      const parseDateSafely = (dateStr: any): Date | null => {
        if (!dateStr) return null;
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) {
          return null;
        }
        return parsed;
      };

      const validateUuidSafely = (uuidStr: any): string | null => {
        if (!uuidStr || typeof uuidStr !== 'string') return null;
        const trimmed = uuidStr.trim();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(trimmed)) {
          return trimmed;
        }
        return null;
      };

      const stripUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) {
          return obj.map(item => stripUndefined(item));
        }
        if (typeof obj === 'object') {
          const clean: any = {};
          for (const key of Object.keys(obj)) {
            if (obj[key] !== undefined) {
              clean[key] = stripUndefined(obj[key]);
            }
          }
          return clean;
        }
        return obj;
      };

      const parsedTimeLimitSeconds = parseInt(timeLimitSeconds || (testDuration ? testDuration * 60 : 1800), 10);
      const parsedTestDuration = parseInt(testDuration || Math.round((timeLimitSeconds || 1800) / 60), 10);

      const safeCreatedById = validateUuidSafely(user.userId);
      if (!safeCreatedById) {
        throw new UnauthorizedException('Invalid user ID in authentication token.');
      }

      // Retrieve departmentId of teacher
      const dbUser = await this.databaseService.user.findUnique({
        where: { id: safeCreatedById },
      });

      let finalDeptId = validateUuidSafely(dbUser?.departmentId || user.departmentId);

      if (!finalDeptId) {
        // Auto-assign the user to the first department or create one if none exists
        let dept = await this.databaseService.department.findFirst();
        if (!dept) {
          dept = await this.databaseService.department.create({
            data: {
              name: 'Computer Science and Engineering',
              code: 'CSE',
            },
          });
        }
        finalDeptId = dept.id;
        if (dbUser) {
          await this.databaseService.user.update({
            where: { id: safeCreatedById },
            data: { departmentId: dept.id },
          });
        }
      }

      // Create the QuestionSet
      const questionSet = await this.databaseService.questionSet.create({
        data: {
          title: title || 'Generated Assessment',
          description: description || 'Generated Assignment',
          timeLimitSeconds: parsedTimeLimitSeconds,
          testDuration: parsedTestDuration,
          startDate: parseDateSafely(startDate),
          endDate: parseDateSafely(endDate),
          negativeMarking: parseFloat(negativeMarking) || 0,
          randomizeOrder: randomizeOrder === true || String(randomizeOrder) === 'true',
          status: 'pending_approval',
          departmentId: finalDeptId,
          createdById: safeCreatedById,
          questionCreationMode: questionCreationMode === 'MANUAL' ? 'MANUAL' : 'AI',
        },
      });

      const mapToPrismaQuestionType = (typeStr: string): any => {
        const t = (typeStr || '').toLowerCase().trim();
        if (t === 'multiplechoice' || t === 'multiple_choice' || t === 'mcq') return 'multipleChoice';
        if (t === 'multiselect' || t === 'multi_select') return 'multiSelect';
        if (t === 'fillinblanks' || t === 'fill_in_blanks') return 'fillInBlanks';
        if (t === 'truefalse' || t === 'true_false') return 'trueFalse';
        if (t === 'matchthefollowing' || t === 'match_the_following') return 'matchTheFollowing';
        if (t === 'reordering') return 'reordering';
        if (t === 'sorting') return 'sorting';
        return 'multipleChoice';
      };

      const mapToPrismaDifficulty = (diffStr: string): any => {
        const d = (diffStr || '').toUpperCase().trim();
        if (d === 'EASY') return 'EASY';
        if (d === 'HARD') return 'HARD';
        return 'MEDIUM';
      };

      // Create all Questions in parallel
      const createdQuestions = await Promise.all(
        (questions || []).map(async (q: any, i: number) => {
          const contentSource = q.content || {};
          const content: any = {
            marks: q.marks ?? contentSource.marks ?? 0,
            question: q.question || contentSource.question || { text: q.prompt || q.questionText || '', hide_text: false, read_text: true, image: '' },
            options: q.options || contentSource.options || [],
            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : contentSource.correctAnswer ?? null,
            explanation: q.explanation ?? contentSource.explanation ?? '',
          };

          if (q.leftItems !== undefined && q.leftItems !== null) content.leftItems = q.leftItems;
          else if (contentSource.leftItems !== undefined && contentSource.leftItems !== null) content.leftItems = contentSource.leftItems;

          if (q.rightItems !== undefined && q.rightItems !== null) content.rightItems = q.rightItems;
          else if (contentSource.rightItems !== undefined && contentSource.rightItems !== null) content.rightItems = contentSource.rightItems;

          if (q.items !== undefined && q.items !== null) content.items = q.items;
          else if (contentSource.items !== undefined && contentSource.items !== null) content.items = contentSource.items;

          if (q.categories !== undefined && q.categories !== null) content.categories = q.categories;
          else if (contentSource.categories !== undefined && contentSource.categories !== null) content.categories = contentSource.categories;

          if (q.alternatives !== undefined && q.alternatives !== null) content.alternatives = q.alternatives;
          else if (contentSource.alternatives !== undefined && contentSource.alternatives !== null) content.alternatives = contentSource.alternatives;

          const cleanedContent = stripUndefined(content);
          const questionType = mapToPrismaQuestionType(q.type || body.type);
          const questionDiff = mapToPrismaDifficulty(q.difficulty || difficulty);
          const safeDocId = validateUuidSafely(q.sourceDocumentId || body.sourceDocumentId);

          const question = await this.databaseService.question.create({
            data: {
              type: questionType,
              difficulty: questionDiff,
              prompt: q.question?.text || q.prompt || q.questionText || 'Generated Question',
              content: cleanedContent,
              tags: (q.tags || []).filter((t: any) => typeof t === 'string'),
              sourceDocumentId: safeDocId,
            },
          });

          return {
            questionId: question.id,
            order: i + 1,
          };
        })
      );

      // Link questions to the question set in parallel
      await Promise.all(
        createdQuestions.map((item) =>
          this.databaseService.questionSetQuestion.create({
            data: {
              questionSetId: questionSet.id,
              questionId: item.questionId,
              order: item.order,
            },
          })
        )
      );

      return {
        success: true,
        message: 'Question set exported successfully!',
        questionSetId: questionSet.id,
      };
    } catch (err: any) {
      console.error('Error in saveQuestionSet:', err);
      try {
        const fs = require('fs');
        const path = require('path');
        const logPath = 'c:\\Users\\subramanya c\\OneDrive\\Documents\\Desktop\\Question paper\\export-error.log';
        const logContent = `[${new Date().toISOString()}]\nError: ${err.message}\nStack: ${err.stack}\nBody: ${JSON.stringify(body, null, 2)}\n\n`;
        fs.appendFileSync(logPath, logContent);
      } catch (logErr) {
        console.error('Failed to write log file:', logErr);
      }
      throw new BadRequestException(err.message || 'Failed to export assessment');
    }
  }

  // 7.1 STUDENT ROUTE (Start / Resume Attempt)
  @Post('assessments/:id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start or resume assessment attempt' })
  async startAssessment(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ) {
    const now = new Date();

    const questionSet = await this.databaseService.questionSet.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!questionSet) {
      throw new NotFoundException(`Assessment with ID "${id}" not found`);
    }

    // Check Date & Time restrictions
    if (questionSet.startDate && now < new Date(questionSet.startDate)) {
      return {
        success: false,
        error: 'TEST_NOT_STARTED',
        message: `This assessment starts at ${questionSet.startDate.toISOString()}`,
      };
    }

    if (questionSet.endDate && now > new Date(questionSet.endDate)) {
      return {
        success: false,
        error: 'TEST_EXPIRED',
        message: 'This assessment has already ended.',
      };
    }

    let attempt = await this.databaseService.assessmentAttempt.findFirst({
      where: {
        userId: user.userId,
        questionSetId: id,
        submissionStatus: 'ongoing',
      },
    });

    if (attempt) {
      if (now > new Date(attempt.expiresAt)) {
        attempt = await this.autoSubmitAttemptInternal(attempt, questionSet);
      }
      return {
        success: true,
        attempt,
      };
    }

    const existingSubmitted = await this.databaseService.assessmentAttempt.findFirst({
      where: {
        userId: user.userId,
        questionSetId: id,
        submissionStatus: { in: ['submitted', 'auto_submitted'] },
      },
    });

    if (existingSubmitted) {
      return {
        success: true,
        attempt: existingSubmitted,
        message: 'Assessment already completed.',
      };
    }

    const duration = questionSet.testDuration || 30;
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

    const questionsList = questionSet.questions || [];
    let questionIds = questionsList.map((item: any) => item.question.id);

    if (questionSet.randomizeOrder) {
      const copy = [...questionIds];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      questionIds = copy;
    }

    const newAttempt = await this.databaseService.assessmentAttempt.create({
      data: {
        userId: user.userId,
        questionSetId: id,
        testDuration: duration,
        startedAt: now,
        expiresAt,
        submissionStatus: 'ongoing',
        answers: {},
        questionOrder: questionIds,
      },
    });

    return {
      success: true,
      attempt: newAttempt,
    };
  }

  // 7.2 STUDENT ROUTE (Get Active Attempt / Remaining Time)
  @Get('assessments/:id/attempt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active assessment attempt and remaining time' })
  async getAssessmentAttempt(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ) {
    const attempt = await this.databaseService.assessmentAttempt.findFirst({
      where: {
        userId: user.userId,
        questionSetId: id,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!attempt) {
      return {
        success: false,
        message: 'No attempt found',
      };
    }

    const now = new Date();
    let remainingSeconds = 0;

    if (attempt.submissionStatus === 'ongoing') {
      const expiresAt = new Date(attempt.expiresAt);
      remainingSeconds = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 1000));

      if (remainingSeconds === 0) {
        const questionSet = await this.databaseService.questionSet.findUnique({
          where: { id },
          include: {
            questions: {
              include: {
                question: true,
              },
            },
          },
        });
        const updatedAttempt = await this.autoSubmitAttemptInternal(attempt, questionSet);
        return {
          success: true,
          attempt: updatedAttempt,
          remainingSeconds: 0,
        };
      }
    }

    return {
      success: true,
      attempt,
      remainingSeconds,
    };
  }

  // 7.3 STUDENT ROUTE (Save Intermediate Answers)
  @Post('assessments/:id/save-answers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save intermediate answers (autosave)' })
  async saveAnswers(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: TokenPayload
  ) {
    const { answers } = body;
    const now = new Date();

    const attempt = await this.databaseService.assessmentAttempt.findFirst({
      where: {
        userId: user.userId,
        questionSetId: id,
        submissionStatus: 'ongoing',
      },
    });

    if (!attempt) {
      return {
        success: false,
        message: 'No active attempt found to save answers',
      };
    }

    if (now > new Date(attempt.expiresAt)) {
      const questionSet = await this.databaseService.questionSet.findUnique({
        where: { id },
        include: {
          questions: {
            include: {
              question: true,
            },
          },
        },
      });
      const updatedAttempt = await this.autoSubmitAttemptInternal(attempt, questionSet);
      return {
        success: true,
        autoSubmitted: true,
        attempt: updatedAttempt,
      };
    }

    const updatedAttempt = await this.databaseService.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        answers: answers || {},
      },
    });

    return {
      success: true,
      attempt: updatedAttempt,
    };
  }

  // 7. STUDENT ROUTE (Submit assessment results)
  @Post('assessments/:id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit student assessment results' })
  async submitAssessment(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: TokenPayload
  ) {
    const { answers } = body;
    const now = new Date();

    let attempt = await this.databaseService.assessmentAttempt.findFirst({
      where: {
        userId: user.userId,
        questionSetId: id,
        submissionStatus: 'ongoing',
      },
    });

    const questionSet = await this.databaseService.questionSet.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!questionSet) {
      throw new NotFoundException(`Assessment with ID "${id}" not found`);
    }

    const { score, maxScore } = this.calculateAttemptScore(questionSet, answers || {});

    const dbUser = await this.databaseService.user.findUnique({
      where: { id: user.userId },
    });

    const studentName = dbUser?.name || user.email;

    if (attempt) {
      const isExpired = now > new Date(attempt.expiresAt);
      const submissionStatus = isExpired ? 'auto_submitted' : 'submitted';
      const submittedAt = isExpired ? attempt.expiresAt : now;
      const timeTaken = Math.round((new Date(submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000);

      attempt = await this.databaseService.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          submissionStatus,
          submittedAt,
          timeTaken,
          score,
          maxScore,
          answers: answers || {},
        },
      });
    } else {
      const duration = questionSet.testDuration || 30;
      attempt = await this.databaseService.assessmentAttempt.create({
        data: {
          userId: user.userId,
          questionSetId: id,
          testDuration: duration,
          startedAt: now,
          expiresAt: now,
          submittedAt: now,
          timeTaken: 0,
          submissionStatus: 'submitted',
          answers: answers || {},
          score,
          maxScore,
        },
      });
    }

    // Save submission to AuditLog
    await this.databaseService.auditLog.create({
      data: {
        userId: user.userId,
        action: 'SUBMIT_ASSESSMENT',
        resource: 'question_sets',
        details: {
          questionSetId: id,
          score,
          maxScore,
          studentName,
          answers,
          autoSubmitted: attempt.submissionStatus === 'auto_submitted',
        },
      },
    });

    return {
      success: true,
      message: 'Assessment results submitted successfully!',
      attempt,
    };
  }

  private async autoSubmitAttemptInternal(attempt: any, questionSet: any) {
    const answers = attempt.answers as Record<string, any>;
    const { score, maxScore } = this.calculateAttemptScore(questionSet, answers);
    const timeTaken = Math.round((new Date(attempt.expiresAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000);

    const updated = await this.databaseService.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        submissionStatus: 'auto_submitted',
        submittedAt: attempt.expiresAt,
        timeTaken,
        score,
        maxScore,
      },
    });

    const dbUser = await this.databaseService.user.findUnique({
      where: { id: attempt.userId },
    });

    await this.databaseService.auditLog.create({
      data: {
        userId: attempt.userId,
        action: 'SUBMIT_ASSESSMENT',
        resource: 'question_sets',
        details: {
          questionSetId: attempt.questionSetId,
          score,
          maxScore,
          studentName: dbUser?.name || dbUser?.email || 'Student',
          answers,
          autoSubmitted: true,
        },
      },
    });

    return updated;
  }

  private calculateAttemptScore(questionSet: any, answers: Record<string, any>) {
    let score = 0;
    let maxScore = 0;
    const questionsList = questionSet.questions || [];

    questionsList.forEach((item: any) => {
      const q = item.question;
      const studentAns = answers[q.id];
      let isCorrect = false;

      const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
      const correctVal = content.correctAnswer;
      const qMarks = content.marks !== undefined ? Number(content.marks) : 1;
      maxScore += qMarks;

      if (studentAns !== undefined && studentAns !== null && String(studentAns).trim() !== '') {
        if (q.type === 'multipleChoice') {
          isCorrect = String(studentAns).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
        } else if (q.type === 'trueFalse') {
          const sBool = typeof studentAns === 'boolean' ? studentAns : (String(studentAns).trim().toLowerCase() === 'true');
          const cBool = typeof correctVal === 'boolean' ? correctVal : (String(correctVal).trim().toLowerCase() === 'true');
          isCorrect = sBool === cBool;
        } else if (q.type === 'fillInBlanks') {
          const primaryMatch = String(studentAns || '').trim().toLowerCase() === String(correctVal || '').trim().toLowerCase();
          const altMatches = Array.isArray(content.alternatives)
            ? content.alternatives.some((alt: string) => String(studentAns || '').trim().toLowerCase() === String(alt || '').trim().toLowerCase())
            : false;
          isCorrect = primaryMatch || altMatches;
        } else if (q.type === 'multiSelect') {
          if (Array.isArray(studentAns) && Array.isArray(correctVal)) {
            const sSet = new Set(studentAns.map(v => String(v).trim().toLowerCase()));
            const cSet = new Set(correctVal.map(v => String(v).trim().toLowerCase()));
            isCorrect = sSet.size === cSet.size && [...sSet].every(v => cSet.has(v));
          }
        } else {
          isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctVal);
        }

        if (isCorrect) {
          score += qMarks;
        } else {
          score -= (questionSet.negativeMarking || 0);
        }
      }
    });

    // Cap the score at 0 so it doesn't go negative
    score = Math.max(0, score);

    return { score, maxScore };
  }

  // 8. TEACHER ROUTE (Retrieve assessment submissions/scores)
  @Get('question-sets/:id/scores')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve assessment submissions for a question set' })
  async getQuestionSetScores(@Param('id') id: string) {
    const logs = await this.databaseService.auditLog.findMany({
      where: {
        action: 'SUBMIT_ASSESSMENT',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Filter by questionSetId in the JSON payload
    const filtered = logs
      .filter((log) => {
        const details = log.details as any;
        return details && details.questionSetId === id;
      })
      .map((log) => {
        const details = log.details as any;
        return {
          studentName: log.user?.name || details.studentName || 'Unknown Student',
          studentEmail: log.user?.email || 'Unknown Email',
          score: details.score,
          maxScore: details.maxScore,
          timestamp: log.timestamp,
        };
      });

    return filtered;
  }

  // 9. PUBLIC ROUTE (List all active departments)
  @Get('departments')
  @ApiOperation({ summary: 'List all active departments' })
  async getDepartments() {
    return this.databaseService.department.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });
  }
}
