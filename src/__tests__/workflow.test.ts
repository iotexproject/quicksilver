import { mockLLMService } from "./mocks";

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { QueryOrchestrator } from "../workflow";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "../tools/weatherapi";

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
    const workflow = new QueryOrchestrator({ tools: [new CurrentWeatherAPITool()] });
    const res = await workflow.process("Current temperature in SF?");
    expect(res).toBe("+10 C");
  });
  it("should generate a prompt with twitter handle", () => {
    const workflow = new QueryOrchestrator({
      tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
    });
    const prompt = workflow.prompt({
      tool: new CurrentWeatherAPITool(),
      toolOutput: "+10 C",
      toolInput: '{"latitude": 37.7749, "longitude": -122.4194}',
      input: "Current temperature in SF?",
    });
    expect(prompt).toBe(`
User Input: Current temperature in SF?
Tool Used: CurrentWeatherAPITool
Tool Input: {"latitude": 37.7749, "longitude": -122.4194}
Tool Output: +10 C

Generate a human-readable response based on the tool output and mention x handle nubilanetwork in the end.`);
  });
  it("should generate a prompt without twitter handle", () => {
    const workflow = new QueryOrchestrator({
      tools: [new ForecastWeatherAPITool()],
    });
    const prompt = workflow.prompt({
      tool: new ForecastWeatherAPITool(),
      toolOutput: "+10 C",
      toolInput: '{"latitude": 37.7749, "longitude": -122.4194}',
      input: "Current temperature in SF?",
    });
    expect(prompt).toBe(`
User Input: Current temperature in SF?
Tool Used: ForecastWeatherAPITool
Tool Input: {"latitude": 37.7749, "longitude": -122.4194}
Tool Output: +10 C

Generate a human-readable response based on the tool output`);
  });
});
