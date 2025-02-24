import { mockLLMService } from "./mocks";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { QueryOrchestrator } from "../workflow";
import { CurrentWeatherAPITool } from "../tools/nubila";
import { LLMService } from "../llm/llm-service";
import { APITool } from "../tools/tool";
import { Tool } from "ai";

class TestAPITool extends APITool<any> {
  schema: Tool;

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
  const output = "test-output";
  const twitterAccount = "test-twitter-account";
  const baseUrl = "https://test-api.com";
  let tool: TestAPITool;

  const setupMockLLM = (queryResponse: string) => {
    // @ts-ignore no need to mock private methods
    vi.mocked(LLMService).mockImplementation(() => ({
      fastllm: {
        generate: vi.fn().mockResolvedValue(queryResponse),
      },
      llm: {
        generate: vi.fn().mockResolvedValue("+10 C"),
      },
    }));
  };

  beforeEach(() => {
    tool = new TestAPITool({
      name,
      description,
      output,
      baseUrl,
      twitterAccount,
    });
    vi.mock("../llm/llm-service", () => mockLLMService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("process", () => {
    it("should return tool output if tool was provided", async () => {
      setupMockLLM('<response>["Test Tool"]</response>');
      const workflow = new QueryOrchestrator({
        tools: [tool],
        llmService: new LLMService({
          fastLLMModel: "claude-3-5-haiku-latest",
          LLMModel: "claude-3-5-haiku-latest",
        }),
      });
      const res = await workflow.process("Current temperature in SF?");
      expect(res).toBe("+10 C");
    });
    it("should process user input without tools if no tools are selected", async () => {
      // @ts-ignore no need to mock private methods
      vi.mocked(LLMService).mockImplementationOnce(() => ({
        fastllm: {
          generate: vi.fn().mockResolvedValue(noTools),
        },
        llm: {
          generate: vi.fn().mockResolvedValue("What is the weather in SF?"),
        },
      }));
      const workflow = new QueryOrchestrator({
        tools: [new CurrentWeatherAPITool()],
        llmService: new LLMService({
          fastLLMModel: "deepseek-chat",
          LLMModel: "deepseek-chat",
        }),
      });
      const res = await workflow.process(
        "Rephrase the following sentence'Current temperature in SF?'"
      );
      expect(res).toBe("What is the weather in SF?");
    });
  });
});

const noTools = `
<response>
[]
</response>
`;
