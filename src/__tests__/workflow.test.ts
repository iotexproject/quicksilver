import { mockLLMService } from "./mocks";

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { QueryOrchestrator } from "../workflow";
import { CurrentWeatherAPITool } from "../tools/weatherapi";

describe("Workflow", () => {
  beforeEach(() => {
    vi.mock("../services/llm-service", () => mockLLMService);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  it("should return tool not found if tool was not provided", async () => {
    const workflow = new QueryOrchestrator({ tools: [] });
    const res = await workflow.process("Current temperature in SF?");
    expect(res).toBe('Tool "CurrentWeatherAPITool" not found.');
  });
  it("should return tool output if tool was provided", async () => {
    const workflow = new QueryOrchestrator({
      tools: [new CurrentWeatherAPITool()],
    });
    const res = await workflow.process("Current temperature in SF?");
    expect(res).toBe("+10 C");
  });
});
