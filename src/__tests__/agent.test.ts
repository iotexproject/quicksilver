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
      name: "SentientAI",
      description: "SentientAI is a tool that can help you with your tasks.",
      tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
    });
    const response = await agent.execute("Current temperature in SF?");
    expect(response).toBe("+10 C");
  });
  it("should fail if no tools are provided", async () => {
    const agent = new Agent({
      name: "SentientAI",
      description: "SentientAI is a tool that can help you with your tasks.",
      tools: [],
    });
    const response = await agent.execute("Current temperature in SF?");
    expect(response).toBe('Tool "CurrentWeatherAPITool" not found.');
  });
});
