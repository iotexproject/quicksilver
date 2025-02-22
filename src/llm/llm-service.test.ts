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
    it("should initialize with Anthropic models", () => {
      const service = new LLMService({
        fastLLMModel: "claude-3-5-haiku-latest",
        LLMModel: "claude-3-5-sonnet-latest",
      });

      expect(service.fastllm).toBeInstanceOf(AnthropicLLM);
      expect(service.llm).toBeInstanceOf(AnthropicLLM);
      expect((service.fastllm as AnthropicLLM).model).toBe(
        "claude-3-5-haiku-latest"
      );
      expect((service.llm as AnthropicLLM).model).toBe(
        "claude-3-5-sonnet-latest"
      );
    });

    it("should initialize with OpenAI models", () => {
      process.env.OPENAI_API_KEY = "test-key";
      const service = new LLMService({
        fastLLMModel: "gpt-4o",
        LLMModel: "gpt-4o-mini",
      });

      expect(service.fastllm).toBeInstanceOf(OpenAILLM);
      expect(service.llm).toBeInstanceOf(OpenAILLM);
      expect((service.fastllm as OpenAILLM).model).toBe("gpt-4o");
      expect((service.llm as OpenAILLM).model).toBe("gpt-4o-mini");
    });

    it("should initialize with Deepseek models", () => {
      process.env.OPENAI_API_KEY = "test-key";
      const service = new LLMService({
        fastLLMModel: "deepseek-chat",
        LLMModel: "deepseek-reasoner",
      });

      expect(service.fastllm).toBeInstanceOf(OpenAILLM);
      expect(service.llm).toBeInstanceOf(OpenAILLM);
      expect((service.fastllm as OpenAILLM).model).toBe("deepseek-chat");
      expect((service.llm as OpenAILLM).model).toBe("deepseek-reasoner");
    });

    it("should mix different providers based on models", () => {
      process.env.LLM_API_KEY = "test-key";
      const service = new LLMService({
        fastLLMModel: "claude-3-5-haiku-latest",
        LLMModel: "gpt-4o",
      });

      expect(service.fastllm).toBeInstanceOf(AnthropicLLM);
      expect(service.llm).toBeInstanceOf(OpenAILLM);
      expect((service.fastllm as AnthropicLLM).model).toBe(
        "claude-3-5-haiku-latest"
      );
      expect((service.llm as OpenAILLM).model).toBe("gpt-4o");
    });
  });
});
