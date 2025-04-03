import { describe, it, expect, beforeEach, afterAll } from 'vitest';

import { ModelAdapter } from './llm';
import { LLMService } from './llm-service';

// Mock environment variables
const originalEnv = process.env;

describe('LLMService', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with Anthropic models', () => {
      const service = new LLMService({
        fastLLMModel: 'claude-3-5-haiku-latest',
        LLMModel: 'claude-3-5-sonnet-latest',
      });

      expect((service.fastllm as ModelAdapter).model.modelId).toBe('claude-3-5-haiku-latest');
      expect((service.llm as ModelAdapter).model.modelId).toBe('claude-3-5-sonnet-latest');
    });

    it('should initialize with OpenAI models', () => {
      const service = new LLMService({
        fastLLMModel: 'gpt-4o',
        LLMModel: 'gpt-4o-mini',
      });

      expect((service.fastllm as ModelAdapter).model.modelId).toBe('gpt-4o');
      expect((service.llm as ModelAdapter).model.modelId).toBe('gpt-4o-mini');
    });

    it('should initialize with Deepseek models', () => {
      const service = new LLMService({
        fastLLMModel: 'deepseek-chat',
        LLMModel: 'deepseek-reasoner',
      });

      expect((service.fastllm as ModelAdapter).model.modelId).toBe('deepseek-chat');
      expect((service.llm as ModelAdapter).model.modelId).toBe('deepseek-reasoner');
    });

    it('should mix different providers based on models', () => {
      const service = new LLMService({
        fastLLMModel: 'claude-3-5-haiku-latest',
        LLMModel: 'gpt-4o',
      });

      expect((service.fastllm as ModelAdapter).model.modelId).toBe('claude-3-5-haiku-latest');
      expect((service.llm as ModelAdapter).model.modelId).toBe('gpt-4o');
    });
  });
});
