import { mockLLMService } from "../../__tests__/mocks";

import { describe, it, expect, beforeEach, vi } from "vitest";
import { logger } from "../../logger/winston";

import { LLMService } from "../../llm/llm-service";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
  Coordinates,
} from "../nubila";

const llmServiceParams = {
  fastLLMModel: "fast-test-model",
  LLMModel: "test-model",
};

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

    vi.mock("../../llm/llm-service", () => mockLLMService);
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
    const consoleSpy = vi.spyOn(logger, "error");
    new CurrentWeatherAPITool();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Please set the NUBILA_API_KEY environment variable.",
    );
  });

  it("should return error for invalid input", async () => {
    setupMockLLM(invalidLocation);
    const consoleSpy = vi.spyOn(logger, "error");

    const res = await tool.execute(
      "How's the weather is LA",
      new LLMService(llmServiceParams),
    );

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
        uv: 5,
        luminance: 50000,
        elevation: 100,
        rain: 0,
        wet_bulb: 20,
        location_name: "San Francisco",
      },
    };

    mockWeatherAPIResponse(mockWeatherData);

    const result = await tool.execute(
      "How's the weather in SF?",
      new LLMService(llmServiceParams),
    );

    expect(result).toBe(`
The current weather in San Francisco (37.7749, -122.4194) is:
Condition: Sunny,
Temperature: 25°C (Feels like 27°C),
Humidity: 60%,
Pressure: 1013 hPa,
Wind Speed: 5 m/s,
Wind Direction: 180°,
UV: 5,
Luminance: 50000,
Elevation: 100 m,
Rain: 0,
Wet Bulb: 20°C,
`);
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
    const consoleSpy = vi.spyOn(logger, "error");

    const result = await tool.execute(
      "How's the weather in SF?",
      new LLMService(llmServiceParams),
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "Weather API Error: API request failed with status: 404 Not Found",
    );
    expect(result).toBe("Skipping weather currentweatherapitool fetch.");
  });

  it("should handle network errors", async () => {
    setupMockLLM(validLocation);
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const consoleSpy = vi.spyOn(logger, "error");

    const result = await tool.execute(
      "How's the weather in SF?",
      new LLMService(llmServiceParams),
    );

    expect(result).toBe("Skipping weather currentweatherapitool fetch.");
    expect(consoleSpy).toHaveBeenCalledWith("Network error");
  });

  it("should handle missing optional weather data fields", async () => {
    setupMockLLM(validLocation);
    const mockWeatherData = {
      data: {
        condition: "Sunny",
        temperature: 25,
        humidity: 60,
        pressure: 1013,
        wind_speed: 5,
        location_name: "San Francisco",
        // Missing: feels_like, wind_direction, uv, luminance, elevation, rain, wet_bulb
      },
    };

    mockWeatherAPIResponse(mockWeatherData);

    const result = await tool.execute(
      "How's the weather in SF?",
      new LLMService(llmServiceParams),
    );

    expect(result).toContain("The current weather in San Francisco");
    expect(result).toContain("Temperature: 25°C");
    expect(result).not.toContain("Feels like");
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
    const consoleSpy = vi.spyOn(logger, "error");
    new ForecastWeatherAPITool();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Please set the NUBILA_API_KEY environment variable.",
    );
  });

  it("should return error for invalid input", async () => {
    setupMockLLM(invalidLocation);
    const consoleSpy = vi.spyOn(logger, "error");

    const res = await tool.execute(
      "How's the weather is LA",
      new LLMService(llmServiceParams),
    );

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
          condition: "Clear",
          condition_desc: "Sunny",
          wind_speed: 5,
          pressure: 1013,
          humidity: 60,
          uv: 5,
          luminance: 50000,
          rain: 0,
          wet_bulb: 20,
          location_name: "San Francisco",
        },
        {
          timestamp: 1234571490,
          temperature: 23,
          condition: "Clouds",
          condition_desc: "Cloudy",
          wind_speed: 6,
          pressure: 1015,
          humidity: 65,
          uv: 3,
          luminance: 30000,
          rain: 0,
          wet_bulb: 19,
          location_name: "San Francisco",
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
      new LLMService(llmServiceParams),
    );

    expect(result).toContain(
      "Weather Forecast Data for San Francisco (37.7749, -122.4194):",
    );
    expect(result).toContain(
      "temperature,condition,condition_desc,wind_speed,pressure,humidity,uv,luminance,rain,wet_bulb",
    );
    expect(result).toContain(
      "25°C, Clear, Sunny, 5 m/s, 1013 hPa, 60%, 5, 50000, 0, 20°C",
    );
    expect(result).toContain(
      "23°C, Clouds, Cloudy, 6 m/s, 1015 hPa, 65%, 3, 30000, 0, 19°C",
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
    const consoleSpy = vi.spyOn(logger, "error");

    const result = await tool.execute(
      {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      new LLMService(llmServiceParams),
    );
    expect(result).toBe("Skipping weather forecastweatherapitool fetch.");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Weather API Error: API request failed with status: 404 Not Found",
    );
  });

  it("should handle network errors", async () => {
    setupMockLLM(validLocation);
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const consoleSpy = vi.spyOn(logger, "error");

    const result = await tool.execute(
      {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      new LLMService(llmServiceParams),
    );

    expect(result).toBe("Skipping weather forecastweatherapitool fetch.");
    expect(consoleSpy).toHaveBeenCalledWith("Network error");
  });
});

describe("Coordinates", () => {
  let mockLLMInstance: any;

  beforeEach(() => {
    vi.mock("../../../llm/llm-service", () => mockLLMService);
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
      new LLMService(llmServiceParams),
    );
    expect(coordinates).toEqual({ lat: 37.7749, lon: -122.4194 });
    expect(mockLLMInstance.fastllm.generate).toHaveBeenCalled();
  });

  it("should throw error for invalid location response", async () => {
    mockLLMInstance.fastllm.generate.mockResolvedValueOnce(invalidLocation);
    await expect(
      Coordinates.extractFromQuery(
        "Invalid location",
        new LLMService(llmServiceParams),
      ),
    ).rejects.toThrow("Could not extract latitude and longitude from query.");
  });

  it("should throw error when LLM fails", async () => {
    mockLLMInstance.fastllm.generate.mockRejectedValueOnce(
      new Error("LLM error"),
    );
    await expect(
      Coordinates.extractFromQuery(
        "Error case",
        new LLMService(llmServiceParams),
      ),
    ).rejects.toThrow("LLM error");
  });

  it("should throw error when extracted coordinates are undefined", async () => {
    mockLLMInstance.fastllm.generate.mockResolvedValueOnce("");
    await expect(
      Coordinates.extractFromQuery(
        "Current temperature in SF?",
        new LLMService(llmServiceParams),
      ),
    ).rejects.toThrow("Could not extract latitude and longitude from query.");
  });
});

describe("BaseWeatherAPITool", () => {
  let tool: CurrentWeatherAPITool;
  let mockFetch: any;

  beforeEach(() => {
    process.env.NUBILA_API_KEY = "test-api-key";
    tool = new CurrentWeatherAPITool();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe("getRawData", () => {
    it("should throw error when latitude or longitude is missing", async () => {
      const invalidCoords = { lat: undefined, lon: -122.4194 };
      // @ts-ignore: check the behavior in runtime
      await expect(tool.getRawData(invalidCoords)).rejects.toThrow(
        "Latitude and longitude are required.",
      );

      const invalidCoords2 = { lat: 37.7749, lon: undefined };
      // @ts-ignore: check the behavior in runtime
      await expect(tool.getRawData(invalidCoords2)).rejects.toThrow(
        "Latitude and longitude are required.",
      );
    });

    it("should make API request with correct parameters", async () => {
      const coords = { lat: 37.7749, lon: -122.4194 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      await tool.getRawData(coords);

      expect(mockFetch).toHaveBeenCalledWith(
        `${tool.baseUrl}?lat=37.7749&lon=-122.4194`,
        {
          headers: { "x-api-key": "test-api-key" },
          signal: expect.any(AbortSignal),
        },
      );
    });

    it("should handle malformed API response", async () => {
      const coords = { lat: 37.7749, lon: -122.4194 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // Missing data property
      });

      await expect(tool.getRawData(coords)).resolves.toBeUndefined();
    });
  });
});

const invalidLocation =
  '<response>{"invalid": 37.7749, "data": -122.4194}</response>';
const validLocation = '<response>{"lat": 37.7749, "lon": -122.4194}</response>';
