import { mockLLMService, mockWeatherTools } from "./mocks";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { QueryOrchestrator } from "../workflow";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "../tools/weatherapi";
import { LLMService } from "../services/llm-service";

describe("Workflow", () => {
  beforeEach(() => {
    vi.mock("../services/llm-service", () => mockLLMService);
    vi.mock("../tools/weatherapi", () => mockWeatherTools);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("process", () => {
    it("should return tool not found if tool was not provided", async () => {
      const workflow = new QueryOrchestrator({ tools: [] });
      const res = await workflow.process("Current temperature in SF?");
      expect(res).toBe("No tools selected");
    });
    it("should return tool output if tool was provided", async () => {
      const workflow = new QueryOrchestrator({
        tools: [new CurrentWeatherAPITool()],
      });
      const res = await workflow.process("Current temperature in SF?");
      expect(res).toBe("+10 C");
    });
  });
  describe("selectTools", () => {
    it("should return correct single tool", async () => {
      const workflow = new QueryOrchestrator({
        tools: [new CurrentWeatherAPITool()],
      });
      const res = await workflow.selectTools("Current temperature in SF?");

      expect(res.length).toEqual(1);
      expect(res[0].name).toEqual("CurrentWeatherAPITool");
      expect(res[0].description).toEqual(
        "Gets the current weather from Nubila API. Input is json with latitude and longitude to retrieve weather data.",
      );
      expect(res[0].execute).toBeDefined();
    });
    it("should return correct multiple tools", async () => {
      vi.mocked(LLMService).mockImplementation(() => ({
        fastllm: {
          generate: vi.fn().mockResolvedValue(multipleTools),
        },
        llm: {
          generate: vi.fn().mockResolvedValue("+10 C"),
        },
      }));
      const workflow = new QueryOrchestrator({
        tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
      });
      const res = await workflow.selectTools("Current temperature in SF?");

      expect(res.length).toEqual(2);
      expect(res[0].name).toEqual("CurrentWeatherAPITool");
      expect(res[1].name).toEqual("ForecastWeatherAPITool");
    });
  });
});

const multipleTools = `
<tool_selection>
["CurrentWeatherAPITool", "ForecastWeatherAPITool"]
</tool_selection>
`;
