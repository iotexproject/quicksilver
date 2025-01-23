import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { LLMService } from "../llm-service";
import { OpenAILLM, TogetherLLM } from "../../llm";

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
    it("should initialize with OpenAI LLMs when TOGETHER_API_KEY is not set", () => {
      process.env.TOGETHER_API_KEY = undefined;
      process.env.FAST_LLM_MODEL = undefined;
      process.env.LLM_MODEL = undefined;

      const service = new LLMService();

      expect(service.fastllm).instanceOf(OpenAILLM);
      expect(service.llm).instanceOf(OpenAILLM);
      expect((service.fastllm as OpenAILLM).model).toBe("gpt-3.5-turbo");
      expect((service.llm as OpenAILLM).model).toBe("gpt-3.5-turbo");
    });

    it("should use TogetherLLM for fastllm when TOGETHER_API_KEY is set", () => {
      process.env.TOGETHER_API_KEY = "test-key";
      process.env.FAST_LLM_MODEL = undefined;
      process.env.LLM_MODEL = undefined;

      const service = new LLMService();

      expect(service.fastllm).instanceOf(TogetherLLM);
      expect(service.llm).instanceOf(OpenAILLM);
      expect((service.fastllm as TogetherLLM).model).toBe(
        "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      );
      expect((service.llm as OpenAILLM).model).toBe("gpt-3.5-turbo");
    });

    it("should respect custom model names from environment variables", () => {
      process.env.TOGETHER_API_KEY = "test-key";
      process.env.FAST_LLM_MODEL = "custom-fast-model";
      process.env.LLM_MODEL = "custom-model";

      const service = new LLMService();

      expect((service.fastllm as TogetherLLM).model).toBe("custom-fast-model");
      expect((service.llm as OpenAILLM).model).toBe("custom-model");
    });
  });
});
