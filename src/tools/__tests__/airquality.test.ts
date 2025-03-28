import { mockLLMService } from "../../__tests__/mocks";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AirQualityTool, AIRVISUAL_BASE_URL } from "../airquality";
import { LLMService } from "../../llm/llm-service";

const llmServiceParams = {
  fastLLMModel: "test-fast-provider",
  llmModel: "test-provider",
};

describe("AirQualityTool", () => {
  let airQualityTool: AirQualityTool;
  const mockAirVisualResponse = {
    status: "success",
    data: {
      city: "Voghera",
      state: "Lombardy",
      country: "Italy",
      location: {
        type: "Point",
        coordinates: [9.00844961, 44.99955481],
      },
      current: {
        pollution: {
          ts: "2025-03-28T09:00:00.000Z",
          aqius: 60,
          mainus: "p2",
          aqicn: 20,
          maincn: "p2",
        },
        weather: {
          ts: "2025-03-28T10:00:00.000Z",
          tp: 17,
          pr: 1007,
          hu: 59,
          ws: 0.99,
          wd: 259,
          ic: "04d",
        },
      },
    },
  };

  beforeEach(() => {
    // Save original env
    const originalEnv = process.env.AIRVISUAL_API_KEY;

    // Set mock API key
    process.env.AIRVISUAL_API_KEY = "test-api-key";

    airQualityTool = new AirQualityTool();
    vi.stubGlobal("fetch", vi.fn());
    vi.mock("../../llm/llm-service", () => mockLLMService);

    // Restore original env
    process.env.AIRVISUAL_API_KEY = originalEnv;
  });

  it("should initialize with correct properties", () => {
    expect(airQualityTool.name).toBe("get_nearest_city_air_quality");
    expect(airQualityTool.description).toContain(
      "Fetches air quality data for the nearest city"
    );
    expect(airQualityTool.schema).toHaveLength(1);
    expect(airQualityTool.schema[0].name).toBe("get_nearest_city_air_quality");
  });

  it("should throw error when API key is not set", () => {
    // Temporarily remove API key
    const originalKey = process.env.AIRVISUAL_API_KEY;
    delete process.env.AIRVISUAL_API_KEY;

    expect(() => new AirQualityTool()).toThrow(
      "AIRVISUAL_API_KEY environment variable is required"
    );

    // Restore API key
    process.env.AIRVISUAL_API_KEY = originalKey;
  });

  describe("execute", () => {
    const executionOptions = {
      toolCallId: "test-call-id",
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAirVisualResponse),
      } as Response);
    });

    it("should fetch air quality data for given coordinates", async () => {
      const result = await airQualityTool.schema[0].tool.execute(
        {
          latitude: 44.99955481,
          longitude: 9.00844961,
        },
        executionOptions
      );

      expect(result).toEqual({
        city: "Voghera",
        state: "Lombardy",
        country: "Italy",
        location: {
          type: "Point",
          coordinates: [9.00844961, 44.99955481],
        },
        current: {
          pollution: {
            timestamp: "2025-03-28T09:00:00.000Z",
            aqiUS: 60,
            mainPollutantUS: "p2",
            aqiCN: 20,
            mainPollutantCN: "p2",
          },
        },
        units: {
          pollutants: {
            p2: { name: "PM2.5 (Fine particulate matter)", unit: "µg/m³" },
            p1: { name: "PM10 (Coarse particulate matter)", unit: "µg/m³" },
            o3: { name: "Ozone (O3)", unit: "ppb" },
            n2: { name: "Nitrogen dioxide (NO2)", unit: "ppb" },
            s2: { name: "Sulfur dioxide (SO2)", unit: "ppb" },
            co: { name: "Carbon monoxide (CO)", unit: "ppm" },
          },
          aqi: {
            aqius: "US EPA standard (0-500 scale)",
            aqicn: "China MEP standard (0-500 scale)",
            pollutantCodes: {
              p1: "PM10",
              p2: "PM2.5",
              o3: "Ozone",
              n2: "NO2",
              s2: "SO2",
              co: "CO",
            },
          },
        },
      });

      expect(fetch).toHaveBeenCalledWith(
        `${AIRVISUAL_BASE_URL}/nearest_city?lat=44.99955481&lon=9.00844961&key=${process.env.AIRVISUAL_API_KEY}`
      );
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await airQualityTool.schema[0].tool.execute(
        {
          latitude: 44.99955481,
          longitude: 9.00844961,
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_nearest_city_air_quality tool");
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await airQualityTool.schema[0].tool.execute(
        {
          latitude: 44.99955481,
          longitude: 9.00844961,
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_nearest_city_air_quality tool");
    });

    it("should handle invalid response format", async () => {
      const invalidResponse = {
        status: "error",
        data: null,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponse),
      } as Response);

      const result = await airQualityTool.schema[0].tool.execute(
        {
          latitude: 44.99955481,
          longitude: 9.00844961,
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_nearest_city_air_quality tool");
    });
  });
});
