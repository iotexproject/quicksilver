import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SentientAI } from "../sentientAI";

const currentWeatherOutput = `
<response>
["CurrentWeatherAPITool"]
</response>
`;

describe("SentientAI", () => {
  beforeEach(() => {
    // Save original env vars
    process.env.FAST_LLM_PROVIDER = "test-fast-provider";
    process.env.LLM_PROVIDER = "test-provider";

    vi.mock("../services/llm-service", () => ({
      LLMService: vi.fn().mockImplementation(() => ({
        fastllm: {
          generate: vi.fn().mockResolvedValue(currentWeatherOutput),
        },
        llm: {
          generate: vi.fn().mockResolvedValue("<response>+10 C</response>"),
        },
      })),
    }));
    vi.mock("../tools/weather/nubila", () => ({
      CurrentWeatherAPITool: vi.fn().mockImplementation(() => ({
        name: "CurrentWeatherAPITool",
        description:
          "Gets the current weather from Nubila API. Input is json with latitude and longitude to retrieve weather data.",
        twitterAccount: "nubilanetwork",
        execute: vi.fn().mockResolvedValue("+10 C"),
      })),
      ForecastWeatherAPITool: vi.fn().mockImplementation(() => ({
        name: "ForecastWeatherAPITool",
        description:
          "Gets the forecast weather from Nubila API. Input is json with latitude and longitude to retrieve weather data.",
        execute: vi.fn().mockResolvedValue("+10 C"),
      })),
    }));
  });

  afterEach(() => {
    // Clean up env vars
    delete process.env.FAST_LLM_PROVIDER;
    delete process.env.LLM_PROVIDER;
    vi.clearAllMocks();
  });

  it("should throw if FAST_LLM_PROVIDER is not set", () => {
    delete process.env.FAST_LLM_PROVIDER;
    expect(() => new SentientAI()).toThrow(
      "FAST_LLM_PROVIDER and LLM_PROVIDER must be set",
    );
  });

  it("should throw if LLM_PROVIDER is not set", () => {
    delete process.env.LLM_PROVIDER;
    expect(() => new SentientAI()).toThrow(
      "FAST_LLM_PROVIDER and LLM_PROVIDER must be set",
    );
  });

  it("should throw if both providers are not set", () => {
    delete process.env.FAST_LLM_PROVIDER;
    delete process.env.LLM_PROVIDER;
    expect(() => new SentientAI()).toThrow(
      "FAST_LLM_PROVIDER and LLM_PROVIDER must be set",
    );
  });

  it("should return a response", async () => {
    const sentai = new SentientAI();
    const response = await sentai.execute("Current temperature in SF?");
    expect(response).toBe("+10 C");
  });
});
