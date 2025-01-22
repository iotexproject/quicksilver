import { vi } from "vitest";

export const mockLLMService = {
  LLMService: vi.fn().mockImplementation(() => ({
    fastllm: {
      generate: vi.fn().mockResolvedValue(currentWeatherOutput),
    },
    llm: {
      generate: vi.fn().mockResolvedValue("+10 C"),
    },
  })),
};

export const mockWeatherTools = {
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
};

export const currentWeatherOutput = `
<tool_selection>
["CurrentWeatherAPITool"]
</tool_selection>
`;
