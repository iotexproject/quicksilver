import { mockLLMService } from "../../../__tests__/mocks";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { CurrentWeatherAPITool } from "../nubila";
import { LLMService } from "../../../services/llm-service";

describe("CurrentWeatherAPITool", () => {
  let tool: CurrentWeatherAPITool;
  let mockFetch: any;

  const setupMockLLM = (locationResponse: string) => {
    vi.mocked(LLMService).mockImplementation(() => ({
      fastllm: {
        generate: vi.fn().mockResolvedValue(locationResponse),
      },
      llm: {
        generate: vi.fn().mockResolvedValue("+10 C"),
      },
    }));
  };

  const mockWeatherAPIResponse = (response: any) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(response),
    });
  };

  beforeEach(() => {
    // Reset environment and create new tool instance
    process.env.NUBILA_API_KEY = "test-api-key";
    tool = new CurrentWeatherAPITool();

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    vi.mock("../../../services/llm-service", () => mockLLMService);
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe("CurrentWeatherAPITool");
    expect(tool.description).toContain(
      "Gets the current weather from Nubila API",
    );
    expect(tool.twitterAccount).toBe("nubilanetwork");
  });

  it("should return error message when API key is not set", () => {
    delete process.env.NUBILA_API_KEY;
    const consoleSpy = vi.spyOn(console, "error");
    new CurrentWeatherAPITool();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Please set the NUBILA_API_KEY environment variable.",
    );
  });

  it("should return error for invalid input", async () => {
    setupMockLLM(invalidLocation);
    const consoleSpy = vi.spyOn(console, "error");

    const res = await tool.execute("How's the weather is LA");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Could not extract latitude and longitude from query.",
    );
    expect(res).toBe("Skipping weather data fetch.");
  });

  it("should handle successful API response", async () => {
    setupMockLLM(validLocation);
    const mockWeatherData = {
      data: {
        condition: "Sunny",
        temperature: 25,
        feels_like: 27,
        humidity: 60,
        pressure: 1013,
        wind_speed: 5,
        wind_direction: 180,
      },
    };

    mockWeatherAPIResponse(mockWeatherData);

    const result = await tool.execute("How's the weather in SF?");

    expect(result).toBe(
      "The current weather in 37.7749, -122.4194 is Sunny with a temperature of 25°C (Feels like 27°C). Humidity: 60% Pressure: 1013 hPa Wind Speed: 5 m/s Wind Direction: 180°",
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("lat=37.7749&lon=-122.4194"),
      expect.objectContaining({
        headers: { "x-api-key": "test-api-key" },
      }),
    );
  });

  it("should handle API error response", async () => {
    setupMockLLM(validLocation);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    const consoleSpy = vi.spyOn(console, "error");

    const result = await tool.execute("How's the weather in SF?");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Weather API Error: API request failed with status: 404 Not Found",
    );
    expect(result).toBe("Skipping weather data fetch.");
  });

  it("should handle network errors", async () => {
    setupMockLLM(validLocation);
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const consoleSpy = vi.spyOn(console, "error");

    const result = await tool.execute("How's the weather in SF?");

    expect(result).toBe("Skipping weather data fetch.");
    expect(consoleSpy).toHaveBeenCalledWith("Network error");
  });
});

const invalidLocation =
  '<location>{"invalid": 37.7749, "data": -122.4194}</location>';
const validLocation = '<location>{"lat": 37.7749, "lon": -122.4194}</location>';
