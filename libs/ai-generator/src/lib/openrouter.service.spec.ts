import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenRouterService } from './openrouter.service';
import { QuestionType, Difficulty } from '@qgp/question-schema';

describe('OpenRouterService', () => {
  let service: OpenRouterService;
  let mockFetch: jest.Mock;
  let setTimeoutSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENROUTER_API_KEY') return 'mock-openrouter-key';
      if (key === 'OPENROUTER_MODEL') return 'google/gemini-2.5-flash';
      if (key === 'SITE_URL') return 'http://localhost:3000';
      if (key === 'SITE_NAME') return 'Question Generator Platform';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock the global setTimeout to trigger immediately so tests run instantly
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      if (typeof cb === 'function') cb();
      return {} as any;
    });

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenRouterService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenRouterService>(OpenRouterService);
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateQuestionsBatch - Fallback to mock when API key is missing', () => {
    it('should return mock questions and not invoke fetch if apiKey is missing', async () => {
      const originalApiKey = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      try {
        // Create service instance with empty key
        const serviceNoKey = new OpenRouterService({
          get: jest.fn().mockReturnValue(undefined)
        } as any);

        const result = await serviceNoKey.generateQuestionsBatch(
          'NodeJS',
          QuestionType.trueFalse,
          Difficulty.EASY,
          2,
          5
        );

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.length).toBe(2);
        expect(result[0].question.text).toContain('NodeJS');
        expect(result[0].marks).toBe(5);
      } finally {
        process.env.OPENROUTER_API_KEY = originalApiKey;
      }
    });
  });

  describe('generateQuestionsBatch - Happy Path', () => {
    it('should successfully call OpenRouter API and validate multipleChoice questions', async () => {
      const mockQuestionsResponse = [
        {
          id: 1,
          marks: 5,
          question: {
            hide_text: false,
            text: 'What is the main advantage of TypeScript?',
            read_text: true,
            image: '',
          },
          options: [
            { hide_text: false, text: 'Static typing', read_text: true, image: '' },
            { hide_text: false, text: 'Dynamic speed', read_text: true, image: '' },
          ],
          correctAnswer: 'Static typing',
          explanation: 'TypeScript adds static type definitions to enhance safety.',
        },
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockQuestionsResponse),
              },
            },
          ],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.generateQuestionsBatch(
        'TypeScript',
        QuestionType.multipleChoice,
        Difficulty.MEDIUM,
        1,
        5,
        'TypeScript context description'
      );

      // Verify fetch details
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-openrouter-key',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Question Generator Platform',
          }),
        })
      );

      // Check request body matches Gemini prompt details
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe('google/gemini-2.5-flash');
      expect(requestBody.response_format).toEqual({ type: 'json_object' });
      expect(requestBody.max_tokens).toBe(1500);
      expect(requestBody.messages[1].content).toContain('TypeScript');

      // Verify return value
      expect(result).toEqual(mockQuestionsResponse);
    });
  });

  describe('generateQuestionsBatch - Error Handling, Retries and Rate Limiting', () => {
    it('should retry on 429 Rate Limit using the Retry-After header if provided', async () => {
      const mockQuestionsResponse = [
        {
          id: 1,
          marks: 3,
          question: { hide_text: false, text: 'Mock True/False', read_text: true, image: '' },
          correctAnswer: true,
          explanation: 'Reasoning',
        },
      ];

      // First call: 429 rate limit
      const headers = new Map();
      headers.set('Retry-After', '2'); // 2 seconds
      const mock429Response = {
        ok: false,
        status: 429,
        headers,
      };

      // Second call: 200 success
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockQuestionsResponse),
              },
            },
          ],
        }),
      };

      mockFetch
        .mockResolvedValueOnce(mock429Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await service.generateQuestionsBatch(
        'AI',
        QuestionType.trueFalse,
        Difficulty.EASY,
        1,
        3
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000); // 2 seconds parsed to 2000ms
      expect(result).toEqual(mockQuestionsResponse);
    });

    it('should retry on 500 Server Error and fall back to local mock generator if all retries fail', async () => {
      const mock500Response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      mockFetch.mockResolvedValue(mock500Response);

      const result = await service.generateQuestionsBatch(
        'Retry Topic',
        QuestionType.trueFalse,
        Difficulty.EASY,
        2,
        3
      );

      // Initial call + 3 retries = 4 total calls
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Verify it fell back to mock generation
      expect(result.length).toBe(2);
      expect(result[0].question.text).toContain('Retry Topic');
      expect(result[0].marks).toBe(3);
    });

    it('should immediately fall back to local mock generator on 400/401 Client Errors without retrying', async () => {
      const mock400Response = {
        ok: false,
        status: 400,
        text: async () => 'Bad Request payload details',
      };

      mockFetch.mockResolvedValue(mock400Response);

      const result = await service.generateQuestionsBatch(
        'TypeScript',
        QuestionType.trueFalse,
        Difficulty.EASY,
        1,
        4
      );

      // No retries should occur for Client Errors (except 429)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.length).toBe(1);
      expect(result[0].marks).toBe(4);
    });
  });
});
