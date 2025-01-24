import { mockLLMService } from "../../../__tests__/mocks";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { LLMService } from "../../../services/llm-service";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
  Coordinates,
} from "../nubila";

describe("CurrentWeatherAPITool", () => {
  let tool: CurrentWeatherAPITool;
  let mockFetch: any;

  const setupMockLLM = (locationResponse: string) => {
    // @ts-ignore no need to mock private methods
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

    const res = await tool.execute("How's the weather is LA", new LLMService());

    expect(consoleSpy).toHaveBeenCalledWith(
      "Could not extract latitude and longitude from query.",
    );
    expect(res).toBe("Skipping weather currentweatherapitool fetch.");
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

    const result = await tool.execute("How's the weather in SF?", new LLMService());

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

    const result = await tool.execute("How's the weather in SF?", new LLMService());

    expect(consoleSpy).toHaveBeenCalledWith(
      "Weather API Error: API request failed with status: 404 Not Found",
    );
    expect(result).toBe("Skipping weather currentweatherapitool fetch.");
  });

  it("should handle network errors", async () => {
    setupMockLLM(validLocation);
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const consoleSpy = vi.spyOn(console, "error");

    const result = await tool.execute("How's the weather in SF?", new LLMService());

    expect(result).toBe("Skipping weather currentweatherapitool fetch.");
    expect(consoleSpy).toHaveBeenCalledWith("Network error");
  });
});

describe("ForecastWeatherAPITool", () => {
  let tool: ForecastWeatherAPITool;
  let mockFetch: any;

  const setupMockLLM = (locationResponse: string) => {
    // @ts-ignore no need to mock private methods
    vi.mocked(LLMService).mockImplementation(() => ({
      fastllm: {
        generate: vi.fn().mockResolvedValue(locationResponse),
      },
      llm: {
        generate: vi.fn().mockResolvedValue("+10 C"),
      },
    }));
  };

  beforeEach(() => {
    process.env.NUBILA_API_KEY = "test-api-key";
    tool = new ForecastWeatherAPITool();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe("ForecastWeatherAPITool");
    expect(tool.description).toContain(
      "Get weather forecast data from the Nubila API",
    );
  });

  it("should return error message when API key is not set", () => {
    delete process.env.NUBILA_API_KEY;
    const consoleSpy = vi.spyOn(console, "error");
    new ForecastWeatherAPITool();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Please set the NUBILA_API_KEY environment variable.",
    );
  });

  it("should return error for invalid input", async () => {
    setupMockLLM(invalidLocation);
    const consoleSpy = vi.spyOn(console, "error");

    const res = await tool.execute("How's the weather is LA", new LLMService());

    expect(consoleSpy).toHaveBeenCalledWith(
      "Could not extract latitude and longitude from query.",
    );
    expect(res).toBe("Skipping weather forecastweatherapitool fetch.");
  });

  it("should handle successful API response", async () => {
    setupMockLLM(validLocation);
    const mockForecastData = {
      data: [
        {
          timestamp: 1234567890,
          temperature: 25,
          condition_desc: "Sunny",
          wind_speed: 5,
        },
        {
          timestamp: 1234571490,
          temperature: 23,
          condition_desc: "Cloudy",
          wind_speed: 6,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockForecastData),
    });

    const result = await tool.execute(
      {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      new LLMService(),
    );

    expect(result).toContain("Weather Forecast Data for 37.7749, -122.4194:");
    expect(result).toContain("the temperature is 25°C, the weather is Sunny");
    expect(result).toContain("the temperature is 23°C, the weather is Cloudy");
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

    const result = await tool.execute(
      {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      new LLMService(),
    );
    expect(result).toBe("Skipping weather forecastweatherapitool fetch.");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Weather API Error: API request failed with status: 404 Not Found",
    );
  });

  it("should handle network errors", async () => {
    setupMockLLM(validLocation);
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const consoleSpy = vi.spyOn(console, "error");

    const result = await tool.execute(
      {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      new LLMService(),
    );

    expect(result).toBe("Skipping weather forecastweatherapitool fetch.");
    expect(consoleSpy).toHaveBeenCalledWith("Network error");
  });
});

describe("Coordinates", () => {
  let mockLLMInstance: any;

  beforeEach(() => {
    vi.mock("../../../services/llm-service", () => mockLLMService);
    mockLLMInstance = {
      fastllm: {
        generate: vi.fn().mockResolvedValue(validLocation),
      },
      llm: {
        generate: vi.fn(),
      },
    };
    vi.mocked(LLMService).mockImplementation(() => mockLLMInstance);
  });

  it("should extract coordinates from query", async () => {
    const coordinates = await Coordinates.extractFromQuery(
      "Current temperature in SF?",
      new LLMService(),
    );
    expect(coordinates).toEqual({ lat: 37.7749, lon: -122.4194 });
    expect(mockLLMInstance.fastllm.generate).toHaveBeenCalled();
  });

  it("should throw error for invalid location response", async () => {
    mockLLMInstance.fastllm.generate.mockResolvedValueOnce(invalidLocation);
    await expect(
      Coordinates.extractFromQuery("Invalid location", new LLMService()),
    ).rejects.toThrow("Could not extract latitude and longitude from query.");
  });

  it("should throw error when LLM fails", async () => {
    mockLLMInstance.fastllm.generate.mockRejectedValueOnce(
      new Error("LLM error"),
    );
    await expect(
      Coordinates.extractFromQuery("Error case", new LLMService()),
    ).rejects.toThrow("LLM error");
  });
});

const invalidLocation =
  '<response>{"invalid": 37.7749, "data": -122.4194}</response>';
const validLocation = '<response>{"lat": 37.7749, "lon": -122.4194}</response>';
