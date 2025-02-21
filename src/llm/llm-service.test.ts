import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { LLMService } from "./llm-service";
import { AnthropicLLM, OpenAILLM, DummyLLM } from "./llm";

// Mock environment variables
const originalEnv = process.env;

describe("LLMService", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should initialize with Anthropic providers", () => {
      const service = new LLMService({
        fastLLMProvider: "anthropic",
        llmProvider: "anthropic",
      });

      expect(service.fastllm).toBeInstanceOf(AnthropicLLM);
      expect(service.llm).toBeInstanceOf(AnthropicLLM);
      expect(service.fastLLMProvider).toBe("anthropic");
      expect(service.llmProvider).toBe("anthropic");
    });

    it("should initialize with OpenAI providers", () => {
      process.env.OPENAI_API_KEY = "test-key";
      const service = new LLMService({
        fastLLMProvider: "openai",
        llmProvider: "openai",
      });

      expect(service.fastllm).toBeInstanceOf(OpenAILLM);
      expect(service.llm).toBeInstanceOf(OpenAILLM);
      expect(service.fastLLMProvider).toBe("openai");
      expect(service.llmProvider).toBe("openai");
    });

    it("should initialize with Deepseek providers", () => {
      process.env.DEEPSEEK_API_KEY = "test-key";
      const service = new LLMService({
        fastLLMProvider: "deepseek",
        llmProvider: "deepseek",
      });

      expect(service.fastllm).toBeInstanceOf(OpenAILLM);
      expect(service.llm).toBeInstanceOf(OpenAILLM);
      expect(service.fastLLMProvider).toBe("deepseek");
      expect(service.llmProvider).toBe("deepseek");
    });

    it("should use DummyLLM for unknown providers", () => {
      const service = new LLMService({
        fastLLMProvider: "unknown",
        llmProvider: "unknown",
      });

      expect(service.fastllm).toBeInstanceOf(DummyLLM);
      expect(service.llm).toBeInstanceOf(DummyLLM);
    });

    it("should use custom models when provided in environment", () => {
      process.env.FAST_LLM_MODEL = "custom-fast-model";
      process.env.LLM_MODEL = "custom-model";

      const service = new LLMService({
        fastLLMProvider: "anthropic",
        llmProvider: "anthropic",
      });

      expect((service.fastllm as AnthropicLLM).model).toBe("custom-fast-model");
      expect((service.llm as AnthropicLLM).model).toBe("custom-model");
    });

    it("should use default models when not provided in environment", () => {
      process.env.FAST_LLM_MODEL = undefined;
      process.env.LLM_MODEL = undefined;

      const service = new LLMService({
        fastLLMProvider: "anthropic",
        llmProvider: "anthropic",
      });

      expect((service.fastllm as AnthropicLLM).model).toBe(
        "claude-3-5-haiku-latest",
      );
      expect((service.llm as AnthropicLLM).model).toBe(
        "claude-3-5-haiku-latest",
      );
    });

    it("should mix different providers for fast and main LLMs", () => {
      process.env.OPENAI_API_KEY = "test-key";

      const service = new LLMService({
        fastLLMProvider: "anthropic",
        llmProvider: "openai",
      });

      expect(service.fastllm).toBeInstanceOf(AnthropicLLM);
      expect(service.llm).toBeInstanceOf(OpenAILLM);
      expect(service.fastLLMProvider).toBe("anthropic");
      expect(service.llmProvider).toBe("openai");
    });
  });
});
