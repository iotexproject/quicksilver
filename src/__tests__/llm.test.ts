import { describe, it, expect } from "vitest";

import { DummyLLM, OpenAILLM, TogetherLLM } from "../llm";

describe("LLM", () => {
  describe("DummyLLM", () => {
    it("should return a response", async () => {
      const llm = new DummyLLM();
      const response = await llm.generate("Current temperature in SF?");
      expect(response).toBe(
        `{"tool":null,"tool_input":"Dummy LLM Response to the user's request."}`,
      );
    });
  });
  describe("OpenAILLM", () => {
    it("should return a response", async () => {
      const llm = new OpenAILLM();
      const response = await llm.generate("Current temperature in SF?");
      expect(response).toBe("No content in response");
    });
  });
  describe("TogetherLLM", () => {
    it("should throw if no api keys provided", async () => {
      expect(() => new TogetherLLM()).toThrow();
    });
    // it("should return a response", async () => {
    //     vi.stubEnv("TOGETHER_API_KEY", "your_together_api_key");
    //   const llm = new TogetherLLM();
    //   const response = await llm.generate("Current temperature in SF?");
    //   expect(response).toBe("No content in response");
    // });
  });
});
