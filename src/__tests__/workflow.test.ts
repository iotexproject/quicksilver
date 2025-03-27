import { mockLLMService } from "./mocks";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { QueryOrchestrator } from "../workflow";
import { LLMService } from "../llm/llm-service";
import { APITool } from "../tools/tool";
import { Tool } from "ai";

class TestAPITool extends APITool<any> {
  schema: { name: string; tool: Tool }[] = [
    {
      name: "Test Tool",
      // @ts-ignore only serves as a mock
      tool: vi.fn().mockResolvedValue("test"),
    },
  ];

  async execute(_: string): Promise<string> {
    return "<response>test</response>";
  }

  async parseInput(_: string): Promise<any> {
    return "test";
  }

  async getRawData(_: any): Promise<any> {
    return "test";
  }
}

describe("Workflow", () => {
  const name = "Test Tool";
  const description = "A test tool";
  const twitterAccount = "test-twitter-account";
  const baseUrl = "https://test-api.com";
  let tool: TestAPITool;
  let workflow: QueryOrchestrator;
  const setupMockLLM = () => {
    // @ts-ignore no need to mock private methods
    vi.mocked(LLMService).mockImplementation(() => ({
      fastllm: {
        generate: vi.fn().mockResolvedValue(""),
        stream: vi.fn().mockResolvedValue(""),
      },
      llm: {
        generate: vi.fn().mockResolvedValue("+10 C"),
        stream: vi.fn().mockResolvedValue("+10 C"),
      },
    }));
  };

  beforeEach(() => {
    tool = new TestAPITool({
      name,
      description,
      baseUrl,
      twitterAccount,
    });
    vi.mock("../llm/llm-service", () => mockLLMService);
    setupMockLLM();
    workflow = new QueryOrchestrator({
      toolSet: {
        "Test Tool": tool.schema[0].tool,
      },
      llmService: new LLMService({
        fastLLMModel: "claude-3-5-haiku-latest",
        LLMModel: "claude-3-5-haiku-latest",
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("process", () => {
    it("should call llm generate with the correct tool", async () => {
      const res = await workflow.process("Current temperature in SF?");
      expect(res).toBe("+10 C");
    });
  });

  describe("processStream", () => {
    it("should call llm stream with the correct tool", async () => {
      const res = await workflow.processStream("Current temperature in SF?");
      expect(res).toBe("+10 C");
    });
  });
});
