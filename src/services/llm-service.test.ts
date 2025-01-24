import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { LLMService } from "./llm-service";
import { AnthropicLLM } from "../llm";

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
    it("should use TogetherLLM for fastllm when TOGETHER_API_KEY is set", () => {
      process.env.TOGETHER_API_KEY = "test-key";
      process.env.FAST_LLM_MODEL = undefined;
      process.env.LLM_MODEL = undefined;

      const service = new LLMService();

      expect(service.fastllm).instanceOf(AnthropicLLM);
      expect(service.llm).instanceOf(AnthropicLLM);
      expect((service.fastllm as AnthropicLLM).model).toBe(
        "claude-3-5-haiku-latest",
      );
      expect((service.llm as AnthropicLLM).model).toBe(
        "claude-3-5-sonnet-latest",
      );
    });
  });
});
