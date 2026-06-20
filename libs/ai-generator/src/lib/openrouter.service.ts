import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  QuestionType,
  Difficulty,
  FillInBlanksQuestionSchema,
  MultipleChoiceQuestionSchema,
  MultiSelectQuestionSchema,
  MatchTheFollowingQuestionSchema,
  ReorderingQuestionSchema,
  SortingQuestionSchema,
  TrueFalseQuestionSchema
} from '@qgp/question-schema';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  siteUrl?: string;
  siteName?: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class OpenRouterService {
  private readonly config: OpenRouterConfig;
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(private configService?: ConfigService) {
    const rawApiKey = this.configService?.get<string>('OPENROUTER_API_KEY') || process.env.OPENROUTER_API_KEY || '';
    const rawModel = this.configService?.get<string>('OPENROUTER_MODEL') || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    const rawSiteUrl = this.configService?.get<string>('SITE_URL') || process.env.SITE_URL || 'http://localhost:3000';
    const rawSiteName = this.configService?.get<string>('SITE_NAME') || process.env.SITE_NAME || 'Question Generator Platform';

    this.config = {
      apiKey: rawApiKey.replace(/^["']|["']$/g, '').trim(),
      model: rawModel.replace(/^["']|["']$/g, '').trim(),
      siteUrl: rawSiteUrl.replace(/^["']|["']$/g, '').trim(),
      siteName: rawSiteName.replace(/^["']|["']$/g, '').trim(),
    };
  }

  async generateQuestionsBatch(
    topic: string,
    type: QuestionType,
    difficulty: Difficulty,
    count: number,
    marks: number,
    contextText?: string
  ): Promise<any[]> {
    if (!this.config.apiKey) {
      this.logger.warn('⚠️ OPENROUTER_API_KEY is missing. Falling back to local mock question generator.');
      // Return an array of mocks
      return Array.from({ length: count }).map((_, i) => this.generateMockQuestion(topic, type, difficulty, i, marks));
    }

    const prompt = this.buildPrompt(topic, type, difficulty, count, marks, contextText);
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        // Build the system prompt based on whether we have PDF context or not
        const systemPrompt = contextText
          ? `You are an expert educational assessment designer. Your SOLE job is to read the provided document text and generate exam questions STRICTLY based on the concepts, facts, definitions, formulas, examples, and explanations found WITHIN that text.

ABSOLUTE RULES — violating any of these makes your output invalid:
1. NEVER mention the document filename, PDF title, file path, or any metadata about the file.
2. NEVER invent or assume any content not explicitly stated in the provided text.
3. Generate questions ONLY from the factual content present in the document text below.
4. Return ONLY a valid JSON array — no markdown, no code fences, no explanatory text.
5. Every question must be directly answerable from the provided document content.
6. Distribute questions proportionally across all topics and chapters found in the text.
7. Cover different cognitive levels: recall, understanding, application, and analysis.
8. Do NOT repeat similar questions — each question must test a distinct concept.`
          : `You are an expert curriculum designer and educator. Generate highly accurate educational assessment questions on the given topic. Return ONLY a valid JSON array — no markdown, no code fences, no explanatory text.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            'HTTP-Referer': this.config.siteUrl || '',
            'X-Title': this.config.siteName || '',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          const logMsg = `[OpenRouter API Error] ${new Date().toISOString()} - Status ${response.status}: ${text}\n`;
          try {
            fs.appendFileSync(path.join(process.cwd(), 'openrouter_error.log'), logMsg);
          } catch (e) {}

          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY_MS * Math.pow(2, attempt);
            throw new Error(`Rate limit exceeded. Retry-After: ${delay}ms`);
          }
          if (response.status >= 500) {
            throw new Error(`OpenRouter API Server Error: ${response.status}`);
          }
          // For 4xx errors other than 429, don't retry
          throw new Error(`OpenRouter API Client Error: ${response.status} - ${text}`);
        }

        const data = await response.json();
        const contentString = data.choices[0]?.message?.content;
        if (!contentString) {
          throw new Error('Received empty content from OpenRouter completions');
        }

        let cleanContent = contentString.trim();
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        cleanContent = cleanContent.trim();
        
        let parsedJson = JSON.parse(cleanContent);
        
        // Ensure it's an array. Sometimes models return an object with a "questions" key.
        if (!Array.isArray(parsedJson) && parsedJson.questions && Array.isArray(parsedJson.questions)) {
          parsedJson = parsedJson.questions;
        } else if (!Array.isArray(parsedJson)) {
          parsedJson = [parsedJson];
        }

        const questionsArray = parsedJson.map((q: any) => ({
          ...q,
          id: 1, // placeholder to pass zod validation
          marks,
        }));

        const validatedQuestions = [];
        for (const questionData of questionsArray) {
           switch (type) {
             case QuestionType.fillInBlanks: validatedQuestions.push(FillInBlanksQuestionSchema.parse(questionData)); break;
             case QuestionType.multipleChoice: validatedQuestions.push(MultipleChoiceQuestionSchema.parse(questionData)); break;
             case QuestionType.multiSelect: validatedQuestions.push(MultiSelectQuestionSchema.parse(questionData)); break;
             case QuestionType.matchTheFollowing: validatedQuestions.push(MatchTheFollowingQuestionSchema.parse(questionData)); break;
             case QuestionType.reordering: validatedQuestions.push(ReorderingQuestionSchema.parse(questionData)); break;
             case QuestionType.sorting: validatedQuestions.push(SortingQuestionSchema.parse(questionData)); break;
             case QuestionType.trueFalse: validatedQuestions.push(TrueFalseQuestionSchema.parse(questionData)); break;
             default: throw new Error(`Unsupported question type: ${type}`);
           }
        }
        return validatedQuestions;
      } catch (error: any) {
        attempt++;
        const logMsg = `[OpenRouter Catch Error] ${new Date().toISOString()} (Attempt ${attempt}): ${error.message}\n`;
        try {
          fs.appendFileSync(path.join(process.cwd(), 'openrouter_error.log'), logMsg);
        } catch (e) {}

        this.logger.error(`❌ Error generating question (Attempt ${attempt}/${MAX_RETRIES + 1}):`, error.message);
        
        // Don't retry on certain client errors (e.g. 400 Bad Request, 401 Unauthorized)
        if (error.message.includes('Client Error')) {
            this.logger.warn('Unrecoverable client error, falling back to mock.');
            return Array.from({ length: count }).map((_, i) => this.generateMockQuestion(topic, type, difficulty, i, marks, contextText));
        }

        if (attempt <= MAX_RETRIES) {
          // Parse delay from error message if available, otherwise use exponential backoff
          let delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          const match = error.message.match(/Retry-After: (\d+)ms/);
          if (match) {
             delay = parseInt(match[1], 10);
          }
          this.logger.warn(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.logger.warn('Max retries reached. Falling back to local mock question.');
          return Array.from({ length: count }).map((_, i) => this.generateMockQuestion(topic, type, difficulty, i, marks, contextText));
        }
      }
    }
  }

  private buildPrompt(topic: string, type: QuestionType, difficulty: Difficulty, count: number, marks: number, contextText?: string): string {
    let schemaDescription = '';

    // When PDF context exists, use generic placeholder — NEVER reference topic/filename
    const questionPlaceholder = contextText
      ? 'A specific question derived from the document content'
      : `A specific question about ${topic}`;

    const commonPromptFields = `
      "id": 1,
      "marks": ${marks},
      "question": {
        "hide_text": false,
        "text": "${questionPlaceholder}",
        "read_text": true,
        "image": ""
      },
      "explanation": "Clear explanation referencing the document content",
    `;

    switch (type) {
      case QuestionType.fillInBlanks:
        schemaDescription = `{
          ${commonPromptFields}
          "correctAnswer": "the exact missing word or phrase",
          "alternatives": ["acceptable alternative answer 1", "acceptable alternative answer 2"]
        }`;
        break;
      case QuestionType.multipleChoice:
        schemaDescription = `{
          ${commonPromptFields}
          "options": [
            { "hide_text": false, "text": "First option text", "read_text": true, "image": "" },
            { "hide_text": false, "text": "Second option text", "read_text": true, "image": "" },
            { "hide_text": false, "text": "Third option text", "read_text": true, "image": "" },
            { "hide_text": false, "text": "Fourth option text", "read_text": true, "image": "" }
          ],
          "correctAnswer": "First option text"
        }`;
        break;
      case QuestionType.multiSelect:
        schemaDescription = `{
          ${commonPromptFields}
          "options": [
            { "hide_text": false, "text": "Option A text", "read_text": true, "image": "" },
            { "hide_text": false, "text": "Option B text", "read_text": true, "image": "" },
            { "hide_text": false, "text": "Option C text", "read_text": true, "image": "" },
            { "hide_text": false, "text": "Option D text", "read_text": true, "image": "" }
          ],
          "correctAnswer": ["Option A text", "Option C text"]
        }`;
        break;
      case QuestionType.matchTheFollowing:
        schemaDescription = `{
          ${commonPromptFields}
          "leftItems": ["Left item 1", "Left item 2", "Left item 3"],
          "rightItems": ["Right item A", "Right item B", "Right item C"],
          "correctAnswer": [
            { "left": "Left item 1", "right": "Right item A" },
            { "left": "Left item 2", "right": "Right item B" },
            { "left": "Left item 3", "right": "Right item C" }
          ]
        }`;
        break;
      case QuestionType.reordering:
        schemaDescription = `{
          ${commonPromptFields}
          "items": ["Step 3 text", "Step 1 text", "Step 2 text"],
          "correctAnswer": ["Step 1 text", "Step 2 text", "Step 3 text"]
        }`;
        break;
      case QuestionType.sorting:
        schemaDescription = `{
          ${commonPromptFields}
          "categories": ["Category A", "Category B"],
          "items": ["Item X", "Item Y", "Item Z"],
          "correctAnswer": {
            "Category A": ["Item X", "Item Z"],
            "Category B": ["Item Y"]
          }
        }`;
        break;
      case QuestionType.trueFalse:
        schemaDescription = `{
          ${commonPromptFields}
          "correctAnswer": true
        }`;
        break;
    }

    // -----------------------------------------------------------------------
    // Build the user-facing prompt differently depending on whether a PDF
    // context is provided. When a PDF is uploaded, the topic/filename is
    // NEVER mentioned — questions are generated purely from the document body.
    // -----------------------------------------------------------------------
    let finalPrompt: string;

    if (contextText) {
      // Truncate context to ~12,000 chars to stay within token limits
      const MAX_CONTEXT_CHARS = 12000;
      const truncatedContext = contextText.length > MAX_CONTEXT_CHARS
        ? contextText.slice(0, MAX_CONTEXT_CHARS) + '\n[... content truncated for length ...]'
        : contextText;

      finalPrompt = `
You are generating ${count} exam questions of type "${type}" at difficulty level "${difficulty}".

== DOCUMENT CONTENT ==
Read the following extracted text carefully. Your questions MUST be based SOLELY on the concepts, definitions, facts, formulas, examples, and explanations present within this text:

---BEGIN DOCUMENT---
${truncatedContext}
---END DOCUMENT---

== TASK ==
Generate EXACTLY ${count} questions of type "${type}" (difficulty: ${difficulty}, marks per question: ${marks}) that:
- Are directly and fully answerable from the document content above
- Test different cognitive levels: recall, comprehension, application, analysis
- Cover different sections/topics proportionally if multiple topics appear in the document
- Are NOT repetitive — each question must test a unique concept or fact
- Do NOT reference any filename, document title, PDF name, or file path anywhere
- Do NOT invent information not present in the document

== OUTPUT FORMAT ==
Return ONLY a valid JSON array. No markdown, no code fences, no commentary.
Each element must EXACTLY match this schema:
[
  ${schemaDescription}
]

CRITICAL JSON RULES:
1. Return ONLY the raw JSON array — no \`\`\`json wrappers.
2. Escape all double-quotes inside string values as \\".
3. Do not include literal newlines inside JSON string values — use \\n instead.
4. Every question text must be a complete, self-contained sentence derived from the document.
5. Generate exactly ${count} objects in the array.
`;
    } else {
      finalPrompt = `
Generate EXACTLY ${count} high-quality exam questions of type "${type}".
Topic: ${topic}
Difficulty: ${difficulty}
Marks per question: ${marks}

The JSON output must EXACTLY match this structure:
[
  ${schemaDescription}
]

CRITICAL RULES:
1. Return ONLY the valid JSON array — no markdown code block characters.
2. Escape all double-quotes inside string values as \\".
3. Do not include literal newlines inside JSON strings — use \\n instead.
4. Generate questions that test understanding, application, and analysis.
5. Avoid trivial or repetitive questions.
`;
    }

    return finalPrompt;
  }

  private generateMockQuestion(
    topic: string,
    type: QuestionType,
    difficulty: Difficulty,
    id: number,
    marks: number,
    contextText?: string
  ): any {
    const index = id % 5;
    const isPdfMode = !topic?.trim(); // Empty topic = PDF context
    const contentHint = contextText
      ? contextText.trim().split(/[\.\n]+/).find((sentence) => sentence.trim().length > 20)?.trim() || ''
      : '';
    const documentHint = contentHint ? `Review the document text for details such as: "${contentHint.slice(0, 120)}".` : 'Review the document content for the correct answer.';
    const common = {
      id,
      marks,
      explanation: `This is a mocked explanation for the document content. ${documentHint}`,
    };

    const questionNumber = id + 1;

    // ===== PDF MODE VARIANTS (when topic is empty) =====
    const pdfMcqVariants = [
      {
        text: `[Q#${questionNumber}] According to the document, what is a key characteristic mentioned?`,
        options: [
          { hide_text: false, text: `It improves overall system modularity and maintainability.`, read_text: true, image: '' },
          { hide_text: false, text: `It increases static compilation barriers significantly.`, read_text: true, image: '' },
        ],
        correctAnswer: `It improves overall system modularity and maintainability.`,
      },
      {
        text: `[Q#${questionNumber}] What is a primary benefit discussed in the document?`,
        options: [
          { hide_text: false, text: `It helps reduce coupling between system components.`, read_text: true, image: '' },
          { hide_text: false, text: `It encourages tight interdependence across modules.`, read_text: true, image: '' },
        ],
        correctAnswer: `It helps reduce coupling between system components.`,
      },
      {
        text: `[Q#${questionNumber}] Which statement best describes the main concept in the document?`,
        options: [
          { hide_text: false, text: `It supports extensible application architecture design.`, read_text: true, image: '' },
          { hide_text: false, text: `It primarily limits runtime flexibility and adaptability.`, read_text: true, image: '' },
        ],
        correctAnswer: `It supports extensible application architecture design.`,
      },
      {
        text: `[Q#${questionNumber}] Based on the document, which of these is true?`,
        options: [
          { hide_text: false, text: `The approach improves code readability and component reuse.`, read_text: true, image: '' },
          { hide_text: false, text: `The approach typically decreases overall system clarity.`, read_text: true, image: '' },
        ],
        correctAnswer: `The approach improves code readability and component reuse.`,
      },
      {
        text: `[Q#${questionNumber}] Why is this concept considered beneficial according to the document?`,
        options: [
          { hide_text: false, text: `It reduces unnecessary design complexity.`, read_text: true, image: '' },
          { hide_text: false, text: `It increases complexity by introducing additional constraints.`, read_text: true, image: '' },
        ],
        correctAnswer: `It reduces unnecessary design complexity.`,
      },
    ];

    const pdfFillVariants = [
      {
        text: `[Q#${questionNumber}] According to the document, this concept often acts as a ______ goal for system design.`,
        correctAnswer: 'primary',
        alternatives: ['secondary', 'optional'],
      },
      {
        text: `[Q#${questionNumber}] The document discusses how to improve ______ and code reusability.`,
        correctAnswer: 'modularity',
        alternatives: ['redundancy', 'complexity'],
      },
      {
        text: `[Q#${questionNumber}] The document emphasizes the importance of good ______ structures in systems.`,
        correctAnswer: 'modular',
        alternatives: ['rigid', 'monolithic'],
      },
      {
        text: `[Q#${questionNumber}] According to the document, good practices help prevent ______ between software components.`,
        correctAnswer: 'tight coupling',
        alternatives: ['loose documentation', 'simple testing'],
      },
      {
        text: `[Q#${questionNumber}] The document highlights focus on ______ and maintainability as key principles.`,
        correctAnswer: 'clarity',
        alternatives: ['obfuscation', 'redundancy'],
      },
    ];

    const pdfMultiSelectVariants = [
      {
        text: `[Q#${questionNumber}] Select all advantages discussed in the document.`,
        options: [
          { hide_text: false, text: 'Improved system flexibility', read_text: true, image: '' },
          { hide_text: false, text: 'Reduced maintainability', read_text: true, image: '' },
          { hide_text: false, text: 'Simplified testing processes', read_text: true, image: '' },
        ],
        correctAnswer: ['Improved system flexibility', 'Simplified testing processes'],
      },
      {
        text: `[Q#${questionNumber}] Which of the following benefits are mentioned in the document?`,
        options: [
          { hide_text: false, text: 'Higher code reuse potential', read_text: true, image: '' },
          { hide_text: false, text: 'More rigid module boundaries', read_text: true, image: '' },
          { hide_text: false, text: 'Easier debugging and troubleshooting', read_text: true, image: '' },
        ],
        correctAnswer: ['Higher code reuse potential', 'Easier debugging and troubleshooting'],
      },
      {
        text: `[Q#${questionNumber}] Choose the outcomes commonly associated with this concept from the document.`,
        options: [
          { hide_text: false, text: 'Faster team onboarding', read_text: true, image: '' },
          { hide_text: false, text: 'Increased code duplication', read_text: true, image: '' },
          { hide_text: false, text: 'Better long-term maintainability', read_text: true, image: '' },
        ],
        correctAnswer: ['Faster team onboarding', 'Better long-term maintainability'],
      },
      {
        text: `[Q#${questionNumber}] Mark the correct characteristics discussed in the document.`,
        options: [
          { hide_text: false, text: 'Clear abstraction principles', read_text: true, image: '' },
          { hide_text: false, text: 'Frequent unintended side effects', read_text: true, image: '' },
          { hide_text: false, text: 'Better code portability', read_text: true, image: '' },
        ],
        correctAnswer: ['Clear abstraction principles', 'Better code portability'],
      },
      {
        text: `[Q#${questionNumber}] Which of these are typical results mentioned in the document?`,
        options: [
          { hide_text: false, text: 'Easier system extension', read_text: true, image: '' },
          { hide_text: false, text: 'More hidden bugs introduced', read_text: true, image: '' },
          { hide_text: false, text: 'Stronger overall architecture', read_text: true, image: '' },
        ],
        correctAnswer: ['Easier system extension', 'Stronger overall architecture'],
      },
    ];

    const pdfMatchVariants = [
      {
        text: `[Q#${questionNumber}] Match the terms mentioned in the document to their meanings.`,
        leftItems: ['Modularity', 'Reusability'],
        rightItems: ['Using components in multiple contexts', 'Separating responsibilities cleanly'],
        correctAnswer: [
          { left: 'Modularity', right: 'Separating responsibilities cleanly' },
          { left: 'Reusability', right: 'Using components in multiple contexts' },
        ],
      },
      {
        text: `[Q#${questionNumber}] Match each concept from the document with its description.`,
        leftItems: ['Abstraction', 'Cohesion'],
        rightItems: ['Simplifying complex concepts', 'Keeping related responsibilities together'],
        correctAnswer: [
          { left: 'Abstraction', right: 'Simplifying complex concepts' },
          { left: 'Cohesion', right: 'Keeping related responsibilities together' },
        ],
      },
      {
        text: `[Q#${questionNumber}] Match the term to the correct outcome from the document.`,
        leftItems: ['Encapsulation', 'Maintainability'],
        rightItems: ['Reducing external dependencies', 'Easier system updates'],
        correctAnswer: [
          { left: 'Encapsulation', right: 'Reducing external dependencies' },
          { left: 'Maintainability', right: 'Easier system updates' },
        ],
      },
      {
        text: `[Q#${questionNumber}] Match the concept to its goal mentioned in the document.`,
        leftItems: ['Scalability', 'Testability'],
        rightItems: ['Growing without major rewrites', 'Verifying behavior systematically'],
        correctAnswer: [
          { left: 'Scalability', right: 'Growing without major rewrites' },
          { left: 'Testability', right: 'Verifying behavior systematically' },
        ],
      },
      {
        text: `[Q#${questionNumber}] Match document terms with their effects.`,
        leftItems: ['Decoupling', 'Portability'],
        rightItems: ['Reducing dependencies between modules', 'Running across different environments'],
        correctAnswer: [
          { left: 'Decoupling', right: 'Reducing dependencies between modules' },
          { left: 'Portability', right: 'Running across different environments' },
        ],
      },
    ];

    const pdfReorderVariants = [
      {
        text: `[Q#${questionNumber}] Arrange these steps in the proper sequence according to the document.`,
        items: ['Write comprehensive tests', 'Refactor existing code', 'Define clear interfaces'],
        correctAnswer: ['Define clear interfaces', 'Write comprehensive tests', 'Refactor existing code'],
      },
      {
        text: `[Q#${questionNumber}] Put these activities in correct order from the document.`,
        items: ['Identify system boundaries', 'Document the design', 'Implement individual modules'],
        correctAnswer: ['Identify system boundaries', 'Implement individual modules', 'Document the design'],
      },
      {
        text: `[Q#${questionNumber}] Order these tasks from first to last according to the document.`,
        items: ['Choose design patterns', 'Create prototypes', 'Review overall architecture'],
        correctAnswer: ['Choose design patterns', 'Create prototypes', 'Review overall architecture'],
      },
      {
        text: `[Q#${questionNumber}] Arrange the steps for implementation mentioned in the document.`,
        items: ['Assess requirements', 'Build individual components', 'Validate integrated behavior'],
        correctAnswer: ['Assess requirements', 'Build individual components', 'Validate integrated behavior'],
      },
      {
        text: `[Q#${questionNumber}] Sequence the design stages from the document correctly.`,
        items: ['Define requirements', 'Model system components', 'Test system integration'],
        correctAnswer: ['Define requirements', 'Model system components', 'Test system integration'],
      },
    ];

    const pdfSortVariants = [
      {
        text: `[Q#${questionNumber}] Sort the following into positive and negative outcomes from the document.`,
        categories: ['Positive', 'Negative'],
        items: ['Maintainable code', 'Hardcoded security credentials'],
        correctAnswer: { Positive: ['Maintainable code'], Negative: ['Hardcoded security credentials'] },
      },
      {
        text: `[Q#${questionNumber}] Sort these examples into correct and incorrect practices from the document.`,
        categories: ['Correct', 'Incorrect'],
        items: ['Consistent naming conventions', 'Disorganized control flow'],
        correctAnswer: { Correct: ['Consistent naming conventions'], Incorrect: ['Disorganized control flow'] },
      },
      {
        text: `[Q#${questionNumber}] Organize the following into helpful and harmful categories from the document.`,
        categories: ['Helpful', 'Harmful'],
        items: ['Modular design approach', 'Excessive tight coupling'],
        correctAnswer: { Helpful: ['Modular design approach'], Harmful: ['Excessive tight coupling'] },
      },
      {
        text: `[Q#${questionNumber}] Sort these actions into beneficial and risky practices from the document.`,
        categories: ['Beneficial', 'Risky'],
        items: ['Continuous refactoring', 'Ignoring automated tests'],
        correctAnswer: { Beneficial: ['Continuous refactoring'], Risky: ['Ignoring automated tests'] },
      },
      {
        text: `[Q#${questionNumber}] Sort the following into desired and undesired results from the document.`,
        categories: ['Desired', 'Undesired'],
        items: ['Reusable components', 'Overly complex code'],
        correctAnswer: { Desired: ['Reusable components'], Undesired: ['Overly complex code'] },
      },
    ];

    const pdfTrueFalseVariants = [
      {
        text: `[Q#${questionNumber}] According to the document, good practices always guarantee easier maintenance.`,
        correctAnswer: false,
      },
      {
        text: `[Q#${questionNumber}] The document suggests that proper techniques can improve code clarity.`,
        correctAnswer: true,
      },
      {
        text: `[Q#${questionNumber}] The document states this is unrelated to overall software architecture.`,
        correctAnswer: false,
      },
      {
        text: `[Q#${questionNumber}] According to the document, this concept often supports component reuse.`,
        correctAnswer: true,
      },
      {
        text: `[Q#${questionNumber}] The document claims this approach always slows down development.`,
        correctAnswer: false,
      },
    ];

    // ===== TOPIC MODE VARIANTS (when topic is provided) =====
    const topicPhrase = topic || 'the subject';
    
    const mcqVariants = [
      {
        text: `[Q#${questionNumber}] Which statement best describes an important characteristic of ${topicPhrase}?`,
        options: [
          { hide_text: false, text: `${topicPhrase} improves modularity and maintainability.`, read_text: true, image: '' },
          { hide_text: false, text: `${topicPhrase} increases static compilation barriers.`, read_text: true, image: '' },
        ],
        correctAnswer: `${topicPhrase} improves modularity and maintainability.`,
      },
      {
        text: `[Q#${questionNumber}] What is a key benefit of ${topicPhrase} in modern software design?`,
        options: [
          { hide_text: false, text: `${topicPhrase} helps reduce coupling between components.`, read_text: true, image: '' },
          { hide_text: false, text: `${topicPhrase} encourages tight interdependence across modules.`, read_text: true, image: '' },
        ],
        correctAnswer: `${topicPhrase} helps reduce coupling between components.`,
      },
      {
        text: `[Q#${questionNumber}] Which phrase best captures the primary role of ${topicPhrase}?`,
        options: [
          { hide_text: false, text: `${topicPhrase} supports extensible application architecture.`, read_text: true, image: '' },
          { hide_text: false, text: `${topicPhrase} primarily limits runtime flexibility.`, read_text: true, image: '' },
        ],
        correctAnswer: `${topicPhrase} supports extensible application architecture.`,
      },
      {
        text: `[Q#${questionNumber}] In the context of ${topicPhrase}, which statement is true?`,
        options: [
          { hide_text: false, text: `${topicPhrase} often improves code readability and reuse.`, read_text: true, image: '' },
          { hide_text: false, text: `${topicPhrase} typically decreases overall system clarity.`, read_text: true, image: '' },
        ],
        correctAnswer: `${topicPhrase} often improves code readability and reuse.`,
      },
      {
        text: `[Q#${questionNumber}] Why is ${topicPhrase} considered beneficial for developers?`,
        options: [
          { hide_text: false, text: `${topicPhrase} reduces unnecessary complexity in design.`, read_text: true, image: '' },
          { hide_text: false, text: `${topicPhrase} increases complexity by adding more rules.`, read_text: true, image: '' },
        ],
        correctAnswer: `${topicPhrase} reduces unnecessary complexity in design.`,
      },
    ];

    const fillInVariants = [
      {
        text: `[Q#${questionNumber}] In software engineering, ${topicPhrase} often acts as a ______ goal for design quality.`,
        correctAnswer: 'primary',
        alternatives: ['secondary', 'optional'],
      },
      {
        text: `[Q#${questionNumber}] A key aim of ${topicPhrase} is to improve ______ and reuse.`,
        correctAnswer: 'modularity',
        alternatives: ['redundancy', 'complexity'],
      },
      {
        text: `[Q#${questionNumber}] ${topicPhrase} is usually associated with better ______ structures in a system.`,
        correctAnswer: 'modular',
        alternatives: ['rigid', 'monolithic'],
      },
      {
        text: `[Q#${questionNumber}] Good ${topicPhrase} practice helps prevent ______ between software components.`,
        correctAnswer: 'tight coupling',
        alternatives: ['loose documentation', 'simple testing'],
      },
      {
        text: `[Q#${questionNumber}] ${topicPhrase} encourages developers to focus on ______ and maintainability.`,
        correctAnswer: 'clarity',
        alternatives: ['obfuscation', 'redundancy'],
      },
    ];

    const multiSelectVariants = [
      {
        text: `[Q#${questionNumber}] Select all advantages typically associated with ${topicPhrase}.`,
        options: [
          { hide_text: false, text: 'Improved flexibility', read_text: true, image: '' },
          { hide_text: false, text: 'Reduced maintainability', read_text: true, image: '' },
          { hide_text: false, text: 'Simplified testing', read_text: true, image: '' },
        ],
        correctAnswer: ['Improved flexibility', 'Simplified testing'],
      },
      {
        text: `[Q#${questionNumber}] Which of the following are true benefits of ${topicPhrase}?`,
        options: [
          { hide_text: false, text: 'Higher code reuse', read_text: true, image: '' },
          { hide_text: false, text: 'More rigid module boundaries', read_text: true, image: '' },
          { hide_text: false, text: 'Easier debugging', read_text: true, image: '' },
        ],
        correctAnswer: ['Higher code reuse', 'Easier debugging'],
      },
      {
        text: `[Q#${questionNumber}] Choose the outcomes that are commonly linked to ${topicPhrase}.`,
        options: [
          { hide_text: false, text: 'Faster onboarding', read_text: true, image: '' },
          { hide_text: false, text: 'Increased duplication', read_text: true, image: '' },
          { hide_text: false, text: 'Better maintainability', read_text: true, image: '' },
        ],
        correctAnswer: ['Faster onboarding', 'Better maintainability'],
      },
      {
        text: `[Q#${questionNumber}] Mark the correct characteristics of ${topicPhrase}.`,
        options: [
          { hide_text: false, text: 'Clear abstraction', read_text: true, image: '' },
          { hide_text: false, text: 'Frequent side effects', read_text: true, image: '' },
          { hide_text: false, text: 'Better portability', read_text: true, image: '' },
        ],
        correctAnswer: ['Clear abstraction', 'Better portability'],
      },
      {
        text: `[Q#${questionNumber}] Which of these are typical results of ${topicPhrase}?`,
        options: [
          { hide_text: false, text: 'Easier extension', read_text: true, image: '' },
          { hide_text: false, text: 'More hidden bugs', read_text: true, image: '' },
          { hide_text: false, text: 'Stronger architecture', read_text: true, image: '' },
        ],
        correctAnswer: ['Easier extension', 'Stronger architecture'],
      },
    ];

    const matchVariants = [
      {
        text: `[Q#${questionNumber}] Match the ${topicPhrase} term to its meaning.`,
        leftItems: ['Modularity', 'Reusability'],
        rightItems: ['Using components again', 'Separating responsibilities'],
        correctAnswer: [
          { left: 'Modularity', right: 'Separating responsibilities' },
          { left: 'Reusability', right: 'Using components again' },
        ],
      },
      {
        text: `[Q#${questionNumber}] Match each ${topicPhrase} concept with its description.`,
        leftItems: ['Abstraction', 'Cohesion'],
        rightItems: ['Simplifying complexity', 'Related responsibilities together'],
        correctAnswer: [
          { left: 'Abstraction', right: 'Simplifying complexity' },
          { left: 'Cohesion', right: 'Related responsibilities together' },
        ],
      },
      {
        text: `[Q#${questionNumber}] Match the ${topicPhrase} term to the correct outcome.`,
        leftItems: ['Encapsulation', 'Maintainability'],
        rightItems: ['Reducing dependencies', 'Easier updates'],
        correctAnswer: [
          { left: 'Encapsulation', right: 'Reducing dependencies' },
          { left: 'Maintainability', right: 'Easier updates' },
        ],
      },
      {
        text: `[Q#${questionNumber}] Match the ${topicPhrase} concept to its goal.`,
        leftItems: ['Scalability', 'Testability'],
        rightItems: ['Growing without rewrites', 'Verifying behavior easily'],
        correctAnswer: [
          { left: 'Scalability', right: 'Growing without rewrites' },
          { left: 'Testability', right: 'Verifying behavior easily' },
        ],
      },
      {
        text: `[Q#${questionNumber}] Match ${topicPhrase} terms with their effects.`,
        leftItems: ['Decoupling', 'Portability'],
        rightItems: ['Less coupling between modules', 'Run across environments'],
        correctAnswer: [
          { left: 'Decoupling', right: 'Less coupling between modules' },
          { left: 'Portability', right: 'Run across environments' },
        ],
      },
    ];

    const reorderVariants = [
      {
        text: `[Q#${questionNumber}] Arrange the following steps when applying ${topicPhrase} in a project.`,
        items: ['Write tests', 'Refactor code', 'Define interfaces'],
        correctAnswer: ['Define interfaces', 'Write tests', 'Refactor code'],
      },
      {
        text: `[Q#${questionNumber}] Put these ${topicPhrase} activities in the correct order.`,
        items: ['Identify boundaries', 'Document design', 'Implement modules'],
        correctAnswer: ['Identify boundaries', 'Implement modules', 'Document design'],
      },
      {
        text: `[Q#${questionNumber}] Order these ${topicPhrase} tasks from first to last.`,
        items: ['Choose patterns', 'Create prototypes', 'Review architecture'],
        correctAnswer: ['Choose patterns', 'Create prototypes', 'Review architecture'],
      },
      {
        text: `[Q#${questionNumber}] Arrange the steps for introducing ${topicPhrase} into a system.`,
        items: ['Assess needs', 'Build modules', 'Validate behavior'],
        correctAnswer: ['Assess needs', 'Build modules', 'Validate behavior'],
      },
      {
        text: `[Q#${questionNumber}] Sequence the ${topicPhrase} design stages correctly.`,
        items: ['Define requirements', 'Model components', 'Test integration'],
        correctAnswer: ['Define requirements', 'Model components', 'Test integration'],
      },
    ];

    const sortVariants = [
      {
        text: `[Q#${questionNumber}] Sort the following terms into positive and negative ${topicPhrase} outcomes.`,
        categories: ['Positive', 'Negative'],
        items: ['Maintainable code', 'Hardcoded credentials'],
        correctAnswer: { Positive: ['Maintainable code'], Negative: ['Hardcoded credentials'] },
      },
      {
        text: `[Q#${questionNumber}] Sort these ${topicPhrase} examples into correct and incorrect practices.`,
        categories: ['Correct', 'Incorrect'],
        items: ['Consistent naming', 'Spaghetti logic'],
        correctAnswer: { Correct: ['Consistent naming'], Incorrect: ['Spaghetti logic'] },
      },
      {
        text: `[Q#${questionNumber}] Organize the following ${topicPhrase} behaviors into helpful and harmful categories.`,
        categories: ['Helpful', 'Harmful'],
        items: ['Modular design', 'Tight coupling'],
        correctAnswer: { Helpful: ['Modular design'], Harmful: ['Tight coupling'] },
      },
      {
        text: `[Q#${questionNumber}] Sort these ${topicPhrase} actions into beneficial and risky practices.`,
        categories: ['Beneficial', 'Risky'],
        items: ['Continuous refactoring', 'Ignoring tests'],
        correctAnswer: { Beneficial: ['Continuous refactoring'], Risky: ['Ignoring tests'] },
      },
      {
        text: `[Q#${questionNumber}] Sort the following ${topicPhrase} outcomes into desired and undesired results.`,
        categories: ['Desired', 'Undesired'],
        items: ['Reusable components', 'Overly complex code'],
        correctAnswer: { Desired: ['Reusable components'], Undesired: ['Overly complex code'] },
      },
    ];

    const trueFalseVariants = [
      {
        text: `[Q#${questionNumber}] ${topicPhrase} always leads to easier maintenance.`,
        correctAnswer: false,
      },
      {
        text: `[Q#${questionNumber}] ${topicPhrase} can improve code clarity when applied correctly.`,
        correctAnswer: true,
      },
      {
        text: `[Q#${questionNumber}] ${topicPhrase} is unrelated to software architecture.`,
        correctAnswer: false,
      },
      {
        text: `[Q#${questionNumber}] ${topicPhrase} often supports reuse of software components.`,
        correctAnswer: true,
      },
      {
        text: `[Q#${questionNumber}] ${topicPhrase} always makes development slower.`,
        correctAnswer: false,
      },
    ];

    // Select variants based on mode
    const activeMcq = isPdfMode ? pdfMcqVariants : mcqVariants;
    const activeFill = isPdfMode ? pdfFillVariants : fillInVariants;
    const activeMultiSelect = isPdfMode ? pdfMultiSelectVariants : multiSelectVariants;
    const activeMatch = isPdfMode ? pdfMatchVariants : matchVariants;
    const activeReorder = isPdfMode ? pdfReorderVariants : reorderVariants;
    const activeSort = isPdfMode ? pdfSortVariants : sortVariants;
    const activeTrueFalse = isPdfMode ? pdfTrueFalseVariants : trueFalseVariants;

    switch (type) {
      case QuestionType.fillInBlanks: {
        const variant = activeFill[index];
        return {
          ...common,
          question: {
            hide_text: false,
            text: variant.text,
            read_text: true,
            image: '',
          },
          correctAnswer: variant.correctAnswer,
          alternatives: variant.alternatives,
        };
      }
      case QuestionType.multipleChoice: {
        const variant = activeMcq[index];
        return {
          ...common,
          question: {
            hide_text: false,
            text: variant.text,
            read_text: true,
            image: '',
          },
          options: variant.options,
          correctAnswer: variant.correctAnswer,
        };
      }
      case QuestionType.multiSelect: {
        const variant = activeMultiSelect[index];
        return {
          ...common,
          question: {
            hide_text: false,
            text: variant.text,
            read_text: true,
            image: '',
          },
          options: variant.options,
          correctAnswer: variant.correctAnswer,
        };
      }
      case QuestionType.matchTheFollowing: {
        const variant = activeMatch[index];
        return {
          ...common,
          question: {
            hide_text: false,
            text: variant.text,
            read_text: true,
            image: '',
          },
          leftItems: variant.leftItems,
          rightItems: variant.rightItems,
          correctAnswer: variant.correctAnswer,
        };
      }
      case QuestionType.reordering: {
        const variant = activeReorder[index];
        return {
          ...common,
          question: {
            hide_text: false,
            text: variant.text,
            read_text: true,
            image: '',
          },
          items: variant.items,
          correctAnswer: variant.correctAnswer,
        };
      }
      case QuestionType.sorting: {
        const variant = activeSort[index];
        return {
          ...common,
          question: {
            hide_text: false,
            text: variant.text,
            read_text: true,
            image: '',
          },
          categories: variant.categories,
          items: variant.items,
          correctAnswer: variant.correctAnswer,
        };
      }
      case QuestionType.trueFalse: {
        const variant = activeTrueFalse[index];
        return {
          ...common,
          question: {
            hide_text: false,
            text: variant.text,
            read_text: true,
            image: '',
          },
          correctAnswer: variant.correctAnswer,
        };
      }
    }
  }
}

export const openRouterService = new OpenRouterService();
