import { mockLLMService, mockWeatherTools } from "./mocks";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { Agent } from "../agent";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "../tools/weatherapi";

describe("Agent", () => {
  beforeEach(() => {
    vi.mock("../services/llm-service", () => mockLLMService);
    vi.mock("../tools/weatherapi", () => mockWeatherTools);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a response", async () => {
    const agent = new Agent({
      tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
    });
    const response = await agent.execute("Current temperature in SF?");
    expect(response).toBe("+10 C");
  });
  it("should generate a prompt with twitter handle", () => {
    const agent = new Agent();
    const prompt = agent.prompt({
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
    const agent = new Agent();
    const prompt = agent.prompt({
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
  it("should fail if no tools are provided", async () => {
    const agent = new Agent();
    const response = await agent.execute("Current temperature in SF?");
    expect(response).toBe('Tool "CurrentWeatherAPITool" not found.');
  });
});
