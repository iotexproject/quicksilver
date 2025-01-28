import { mockLLMService } from "./mocks";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { QueryOrchestrator } from "../workflow";
import { CurrentWeatherAPITool, ForecastWeatherAPITool } from "../tools/nubila";
import { LLMService } from "../services/llm-service";
import { APITool } from "../tools/tool";

class TestAPITool extends APITool<any> {
  async execute(_: string): Promise<string> {
    return "<response>test</response>";
  }

  async parseInput(_: string): Promise<any> {
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
        generate: vi.fn().mockResolvedValue("<response>+10 C</response>"),
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
    vi.mock("../services/llm-service", () => mockLLMService);
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
          fastLLMProvider: "anthropic",
          llmProvider: "anthropic",
        }),
      });
      const res = await workflow.process("Current temperature in SF?");
      console.log("result is: ", res);
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
          fastLLMProvider: "deepseek",
          llmProvider: "deepseek",
        }),
      });
      const res = await workflow.process(
        "Rephrase the following sentence'Current temperature in SF?'",
      );
      expect(res).toBe("What is the weather in SF?");
    });
  });
  describe("selectTools", () => {
    it("should return correct single tool", async () => {
      const workflow = new QueryOrchestrator({
        tools: [tool],
        llmService: new LLMService({
          fastLLMProvider: "deepseek",
          llmProvider: "deepseek",
        }),
      });
      const res = await workflow.selectTools("Current temperature in SF?");

      expect(res.length).toEqual(1);
      expect(res[0].name).toEqual("Test Tool");
      expect(res[0].description).toEqual("A test tool");
      expect(res[0].execute).toBeDefined();
    });
    it("should return correct multiple tools", async () => {
      // @ts-ignore no need to mock private methods
      vi.mocked(LLMService).mockImplementationOnce(() => ({
        fastllm: {
          generate: vi.fn().mockResolvedValue(multipleTools),
        },
        llm: {
          generate: vi.fn().mockResolvedValue("+10 C"),
        },
      }));
      const workflow = new QueryOrchestrator({
        tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
        llmService: new LLMService({
          fastLLMProvider: "deepseek",
          llmProvider: "deepseek",
        }),
      });
      const res = await workflow.selectTools("Current temperature in SF?");

      expect(res.length).toEqual(2);
      expect(res[0].name).toEqual("CurrentWeatherAPITool");
      expect(res[1].name).toEqual("ForecastWeatherAPITool");
    });
  });
});

const multipleTools = `
<response>
["CurrentWeatherAPITool", "ForecastWeatherAPITool"]
</response>
`;
const noTools = `
<response>
[]
</response>
`;
